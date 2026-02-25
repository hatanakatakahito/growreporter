# メール送信の設定（拡張不要・SMTP 直接送信）

## 概要

GROW REPORTERでは、**Trigger Email 拡張は使わず**、Cloud Functions から **AWS SES（SMTP）で直接**メールを送信しています。

- メンバー招待（承認メール）
- プラン変更通知
- メンバー削除通知・オーナー譲渡通知
- サイト改善相談フォーム
- 管理者アラート

**必要な作業は「環境変数の設定」だけです。** Extensions のインストールや Firestore の `mail` コレクションは不要です。

---

## 設定手順（これだけ）

### 1. Firebase の環境変数に SES SMTP を設定

Firebase Console で次の環境変数を設定します。

1. [Firebase Console](https://console.firebase.google.com/) → プロジェクト **growgroupreporter** を選択
2. 左メニュー **「ビルド」** → **「Functions」**
3. **「環境変数」**（または「構成」）を開く
4. 次の変数を追加（値は AWS SES の SMTP 認証情報に合わせてください）

| 変数名 | 説明 | 例（AWS SES） |
|--------|------|-------------------------------|
| `SES_SMTP_HOST` | SMTP ホスト | `email-smtp.ap-northeast-1.amazonaws.com` |
| `SES_SMTP_PORT` | ポート（587=STARTTLS, 465=SSL） | `587` |
| `SES_SMTP_USER` | SMTP ユーザー名 | SES の SMTP 認証情報のユーザー名（例: AKIA...） |
| `SES_SMTP_PASSWORD` | SMTP パスワード | SES の SMTP 認証情報のパスワード |
| `SES_FROM_EMAIL` | 送信元（任意・未設定時は info@grow-reporter.com） | `info@grow-reporter.com` |
| `SES_FROM_NAME` | 差出人表示名（任意・未設定時は グローレポータ） | `グローレポータ` |

※ Firebase Authentication の SMTP で使っているのと同じ SES 認証情報で問題ありません。

### 2. デプロイ

環境変数を保存したあと、Functions を再デプロイすると反映されます。

```bash
firebase deploy --only functions
```

---

## 注意事項

- **AWS SES** で送信元 `info@grow-reporter.com` を使う場合、SES 側でそのメールアドレス（またはドメイン）を**検証済み**にしておいてください。
- 環境変数は **Firebase Console → Functions → 環境変数** で設定するか、`functions/.env` に書いてデプロイすると読み込まれます（`.env` は git に含めないでください。機密は Secret Manager の利用を推奨）。

---

## トラブルシューティング

### メールが届かない場合

1. **環境変数**が正しく設定されているか確認（Functions の画面で確認可能）
2. **AWS SES** で送信元アドレスが検証済みか確認
3. **迷惑メール**フォルダを確認
4. Functions のログでエラーが出ていないか確認:  
   `firebase functions:log --project=growgroupreporter`

### 「SES SMTP not configured」が出る場合

`SES_SMTP_HOST` / `SES_SMTP_USER` / `SES_SMTP_PASSWORD` のいずれかが未設定です。上記の環境変数を設定し、Functions を再デプロイしてください。

---

## （参考）Trigger Email 拡張を使う場合

拡張を使う方式に戻す場合は、[Firebase Extensions「Trigger Email from Firestore」](https://extensions.dev/extensions/firebase/firestore-send-email) をインストールし、Mail collection を `mail` に設定します。  
現在のコードは **拡張なしの直接送信** に統一されています。
