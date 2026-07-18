"use strict";

const enabledInput = document.querySelector("#enabled");
const passcodeInput = document.querySelector("#passcode");
const form = document.querySelector("#settings-form");
const showButton = document.querySelector("#show-passcode");
const status = document.querySelector("#status");

chrome.storage.local.get({ enabled: true, passcode: "" }, (settings) => {
  enabledInput.checked = settings.enabled;
  passcodeInput.value = settings.passcode;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const passcode = passcodeInput.value.trim();

  if (!/^\d{4}$/.test(passcode)) {
    setStatus("半角数字4桁で入力してください。", true);
    return;
  }

  chrome.storage.local.set(
    { enabled: enabledInput.checked, passcode },
    () => setStatus("保存しました。次回のパスコード画面から自動入力します。")
  );
});

enabledInput.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledInput.checked });
});

showButton.addEventListener("click", () => {
  const showing = passcodeInput.type === "text";
  passcodeInput.type = showing ? "password" : "text";
  showButton.textContent = showing ? "表示" : "隠す";
  showButton.setAttribute("aria-label", showing ? "パスコードを表示" : "パスコードを隠す");
});

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
