# ビルドから App Store 提出までの手順

ビルドは、**指示があるまで実行しない**（`~/.claude/CLAUDE.md` のルール）。ここは、指示が出たときの手順の控え。

## 準備が済んでいるもの（ビルド前）
- `app.json`：バンドルID `jp.chokanuranai.app`、iPad対応（`requireFullScreen`）、起動画面（濃い青 `#10172a` ＋ アイコン）、輸出コンプライアンス（`ITSAppUsesNonExemptEncryption: false`）
- `eas.json`：`production`（ビルド番号の自動加算）、提出先のアプリID（`ascAppId: 6835385589`）
- アイコン：1024×1024・透明なし（確認済み）
- `expo-doctor`：20項目すべて合格／型チェック：合格
- App Store Connect：アプリ登録、サブスク商品（`jp.chokanuranai.app.premium.monthly`、月額450円、日本のみ）、プライバシー（データ収集なし）、年齢制限（4+）、URL（サポート・プライバシー）、説明文・キーワード、審査メモ、審査連絡先、サブスクの審査用画像

## あなたの操作が必要なもの（私は代われない）
1. Expo のアカウントで、`eas login`（パスワードの入力があるため）
2. 初回だけ、`eas init`（プロジェクトを Expo のアカウントに登録）
3. 初回のビルドで、Apple のサインインを求められたら、Apple ID・2段階認証コードを入力（証明書とプロビジョニングの自動作成）

## 手順
```
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production --latest
```
ビルドは、EAS の画面でも、進み具合を見られる。

## ビルド後にやること
1. **TestFlight で、実機確認**（Sandbox テスターで、課金・復元・解約）
   - 確認：無料のとき鍵がかかる／申込みで開く／再起動しても開いたまま／「購入を復元する」で戻る／フォントが出る／振動／共有メニュー／iPad の表示
2. App Store Connect の「バージョン 1.0」で、
   - ビルドを選ぶ
   - **スクリーンショットをアップロード**：`store-assets/screenshots/iphone-6.9/` と `ipad-13/`（各6枚）
   - 「App内課金およびサブスクリプション」に、サブスク（Premium Monthly）を追加（最初のサブスクは、アプリのバージョンと一緒に審査へ）
3. 「審査用に追加」→ 提出

## 決めておくこと
- **リリース方法**：いまは「承認後に、自動でリリース」。公開日を、自分で決めたいなら「手動」に変える。

## 注意
- 評価依頼のダイアログ（`expo-store-review`）は、実機で確認する。開発中のビルドでは出て、TestFlight や本番では、出ないことがある（Apple の仕様）。
- ネイティブ部品（`expo-iap`、`expo-store-review`、`expo-splash-screen`）が入っているため、Expo Go では動かない。
