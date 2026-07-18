"use strict";

const PASSCODE_WORDS = /pass\s*code|パスコード|暗証番号|\bpin\b/i;
const ACTION_WORDS = /unlock|continue|next|submit|enter|confirm|開く|解除|続ける|次へ|確認/i;
const CHECK_INTERVAL_MS = 350;
const RETRY_COOLDOWN_MS = 2500;

let checkTimer = null;
let lastAttemptAt = 0;
let lastLocation = location.href;
let stopped = false;

const observer = new MutationObserver(scheduleCheck);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("popstate", scheduleCheck);
window.addEventListener("hashchange", scheduleCheck);
scheduleCheck();

function scheduleCheck() {
  if (stopped || !isExtensionContextAvailable()) return;
  if (checkTimer !== null) return;
  checkTimer = window.setTimeout(() => {
    checkTimer = null;
    checkForPasscodeScreen();
  }, CHECK_INTERVAL_MS);
}

function checkForPasscodeScreen() {
  if (stopped || !isExtensionContextAvailable()) return;

  if (location.href !== lastLocation) {
    lastLocation = location.href;
    lastAttemptAt = 0;
  }

  if (Date.now() - lastAttemptAt < RETRY_COOLDOWN_MS) return;

  readSettings(({ enabled, passcode }) => {
    if (stopped || !enabled || !/^\d{4}$/.test(passcode)) return;

    const root = findPasscodeRoot();
    if (!root) return;

    const inputs = findCodeInputs(root);
    if (inputs.length === 0) return;

    lastAttemptAt = Date.now();
    if (!fillInputs(inputs, passcode)) return;

    window.setTimeout(() => submitPasscode(root, inputs[inputs.length - 1]), 120);
  });
}

function isExtensionContextAvailable() {
  try {
    return typeof chrome !== "undefined" &&
      Boolean(chrome.runtime?.id) &&
      Boolean(chrome.storage?.local?.get);
  } catch {
    return false;
  }
}

function readSettings(callback) {
  try {
    if (!isExtensionContextAvailable()) {
      stopScript();
      return;
    }

    chrome.storage.local.get({ enabled: true, passcode: "" }, (settings) => {
      try {
        // runtime.lastErrorへのアクセス自体が、無効化後には例外になる場合がある。
        if (chrome.runtime?.lastError) {
          stopScript();
          return;
        }
        callback(settings || {});
      } catch {
        stopScript();
      }
    });
  } catch {
    // 拡張機能の更新・再読み込み後に残った古いスクリプトを静かに停止する。
    stopScript();
  }
}

function stopScript() {
  if (stopped) return;
  stopped = true;
  observer.disconnect();
  if (checkTimer !== null) {
    window.clearTimeout(checkTimer);
    checkTimer = null;
  }
  window.removeEventListener("popstate", scheduleCheck);
  window.removeEventListener("hashchange", scheduleCheck);
}

function findPasscodeRoot() {
  const candidates = [
    ...document.querySelectorAll('[role="dialog"], dialog, main, form')
  ].filter(isVisible);

  for (const candidate of candidates) {
    const text = candidate.innerText || "";
    if (PASSCODE_WORDS.test(text)) return candidate;
  }

  // XChatが独立した全面画面を使う場合のフォールバック。
  if (PASSCODE_WORDS.test(document.body?.innerText || "")) return document.body;
  return null;
}

function findCodeInputs(root) {
  const visibleInputs = [...root.querySelectorAll("input")].filter(isVisible);
  const likelyInputs = visibleInputs.filter((input) => {
    const type = (input.type || "text").toLowerCase();
    const inputMode = (input.inputMode || "").toLowerCase();
    const autocomplete = (input.autocomplete || "").toLowerCase();
    const maxLength = input.maxLength;
    const labelText = getAccessibleLabel(input);

    return (
      ["password", "tel", "number"].includes(type) ||
      inputMode === "numeric" ||
      autocomplete === "one-time-code" ||
      maxLength === 1 ||
      maxLength === 4 ||
      PASSCODE_WORDS.test(labelText)
    );
  });

  const oneCharacterInputs = likelyInputs.filter((input) => input.maxLength === 1);
  if (oneCharacterInputs.length >= 4) return oneCharacterInputs.slice(0, 4);
  return likelyInputs.length > 0 ? [likelyInputs[0]] : [];
}

function fillInputs(inputs, passcode) {
  if (inputs.length === 4) {
    inputs.forEach((input, index) => setNativeInputValue(input, passcode[index]));
    inputs[3].focus();
    return true;
  }

  const input = inputs[0];
  input.focus();
  setNativeInputValue(input, passcode);
  return input.value === passcode;
}

function setNativeInputValue(input, value) {
  const prototype = input instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertText",
    data: value
  }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function submitPasscode(root, input) {
  const buttons = [...root.querySelectorAll('button, [role="button"]')].filter(isVisible);
  const actionButton = buttons.find((button) => {
    const text = `${button.innerText || ""} ${button.getAttribute("aria-label") || ""}`;
    return ACTION_WORDS.test(text) && !button.disabled && button.getAttribute("aria-disabled") !== "true";
  });

  if (actionButton) {
    actionButton.click();
    return;
  }

  input.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }));
}

function getAccessibleLabel(input) {
  const labelledBy = (input.getAttribute("aria-labelledby") || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.innerText || "")
    .join(" ");

  return [
    input.getAttribute("aria-label"),
    input.placeholder,
    labelledBy,
    input.labels ? [...input.labels].map((label) => label.innerText).join(" ") : ""
  ].filter(Boolean).join(" ");
}

function isVisible(element) {
  if (!(element instanceof Element)) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}
