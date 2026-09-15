# XChat Passcode Autofill

XChatのパスコード入力画面を検出し、保存した4桁の数字を自動入力・送信するChrome拡張機能です。

## ダウンロード

最新版は[GitHub Releases](https://github.com/nyanz00/XChat-Passcode-Autofill/releases)からZIPをダウンロードできます。展開後、`XChat-Passcode-Autofill` フォルダをChromeに読み込んでください。

現在のバージョン: **1.0.2**

## インストール

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパー モード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」を押す
4. リポジトリ内の `XChat-Passcode-Autofill` フォルダを選ぶ
5. ツールバーの拡張機能一覧から「XChat Passcode Autofill」を開く
6. 4桁を入力して「保存」を押す

すでにXを開いていた場合は、最初の1回だけXのタブを再読み込みしてください。

## 注意

- パスコードはChromeの拡張機能用ローカルストレージに平文で保存されます。
- X/XChatの画面構造が変わると動かなくなる場合があります。
- `x.com`、`twitter.com`、`chat.x.com` 以外のサイトでは動作しません。
