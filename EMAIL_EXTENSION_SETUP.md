# Firebase Extensions "Trigger Email" セットアップガイド

## 概要

GROW REPORTERでは、プラン変更時にユーザーへメール通知を送信するために、Firebase Extensions の **Trigger Email** を使用します。

## セットアップ手順

### 1. Firebase Extensions のインストール

Firebase Consoleから、以下の手順でExtensionをインストールします。

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. `growgroupreporter` プロジェクトを選択
3. 左メニューから「Extensions」を選択
4. 「Trigger Email」を検索してインストール

または、Firebase CLIから：

```bash
firebase ext:install firestore-send-email --project=growgroupreporter
```

### 2. SMTP設定

Extension インストール時に以下の情報を設定します：

#### Gmail を使用する場合

- **SMTP connection URI**: 
  ```
  smtps://username@gmail.com:password@smtp.gmail.com:465
  ```
  
  ⚠️ Gmailの場合は「アプリパスワード」を生成する必要があります：
  1. Googleアカウント > セキュリティ
  2. 2段階認証を有効化
  3. 「アプリパスワード」を生成

#### SendGrid を使用する場合

- **SMTP connection URI**: 
  ```
  smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465
  ```

#### その他のSMTPサービス

- **SMTP connection URI**: 
  ```
  smtps://username:password@smtp.example.com:465
  ```

### 3. Extension設定

- **Default FROM address**: `noreply@grow-group.jp`
- **Default REPLY-TO address**: `support@grow-group.jp`
- **Users collection**: `users` (オプション)
- **Templates collection**: （空欄でOK）
- **Mail collection**: `mail` ← **重要！この名前を使用してください**

### 4. Firestoreセキュリティルール

`firestore.rules` に以下のルールを追加（既に含まれている場合はスキップ）：

```javascript
// メールコレクション（Firebase Extensions用）
match /mail/{mailId} {
  // 書き込みはCloud Functionsのみ
  allow write: if false;
  // 読み取りも禁止
  allow read: if false;
}
```

### 5. 動作確認

プラン変更を実行して、メールが送信されることを確認します：

1. アドミンパネルにログイン
2. ユーザー一覧からユーザーを選択
3. プラン変更を実行
4. ユーザーのメールアドレスに通知メールが届くことを確認

## トラブルシューティング

### メールが届かない場合

1. **Extensionのログを確認**
   ```bash
   firebase functions:log --project=growgroupreporter
   ```

2. **Firestoreの `mail` コレクションを確認**
   - ドキュメントが作成されているか
   - `delivery` フィールドに成功/失敗の情報があるか

3. **SMTP設定を再確認**
   - ユーザー名・パスワードが正しいか
   - SMTPサーバー・ポートが正しいか

### Gmail のアプリパスワード生成

1. [Googleアカウント](https://myaccount.google.com/) にログイン
2. 「セキュリティ」タブを選択
3. 「2段階認証プロセス」を有効化
4. 「アプリパスワード」を選択
5. 「その他」を選択し、「GROW REPORTER」と入力
6. 生成されたパスワードをコピー

## 参考リンク

- [Trigger Email Extension](https://extensions.dev/extensions/firebase/firestore-send-email)
- [Firebase Extensions ドキュメント](https://firebase.google.com/docs/extensions)

## 注意事項

- 本番環境では、独自ドメインのメールアドレスを使用することを推奨します
- 無料プランの場合、Extensionの実行回数に制限があります
- メール送信に失敗しても、プラン変更自体は成功します（ログにエラーが記録されます）

