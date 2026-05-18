# Firebase Auth アクション URL のカスタマイズ手順（v5.9.0）

## 目的

Firebase Auth が送信する以下のメールのリンクを **`grow-reporter.com`** 配下に統一する:
- パスワードリセット
- メールアドレス確認
- メールアドレス変更の取り消し

デフォルトでは `https://growgroupreporter.firebaseapp.com/__/auth/action?...` という URL になっており、ブランド統一性が失われている上、UI もデフォルトの簡素なもの。
本手順で **`https://grow-reporter.com/auth/action?...`** に切り替え、自社ブランド UI（既に実装済の `AuthAction.jsx`）が動作するようにする。

## 前提条件

- v5.9.0 以降がデプロイ済（`AuthAction.jsx` ルートが存在）
- `grow-reporter.com` が Firebase Hosting のカスタムドメインとして設定済（既存）
- Firebase Console の編集権限を持つ管理者アカウント

## 手順

### 1. Firebase Console を開く

1. https://console.firebase.google.com/ にアクセス
2. プロジェクト **`growgroupreporter`** を選択

### 2. Authentication → Templates へ移動

1. 左サイドバー「**Build**」→「**Authentication**」
2. 上部タブ「**Templates**」をクリック
3. 言語セレクタを「**日本語**」に切り替え（重要）

### 3. パスワードリセットの Action URL をカスタマイズ

1. テンプレートリストから「**パスワードの再設定**」を選択
2. 右上の **編集（鉛筆）アイコン** をクリック
3. テンプレート編集画面が開く
4. 下部の **「アクション URL のカスタマイズ」** リンクをクリック
5. 入力欄に **`https://grow-reporter.com/auth/action`** を入力
6. **「保存」** をクリック

### 4. 他のテンプレートも同様にカスタマイズ

下記すべてのテンプレートで同じ Action URL (`https://grow-reporter.com/auth/action`) を設定:

- ✅ **パスワードの再設定**（手順 3 で完了）
- ✅ **メールアドレスの確認**
- ✅ **メールアドレスの変更**

### 5. 動作確認

#### 5-1. テスト送信
1. `/admin/users/{任意のテストユーザー}` を開く
2. 「アカウント情報メール」セクションで「メールで送信」ボタンクリック
3. テストアカウントのメールを確認
4. メール内の「パスワードを設定する」ボタンをクリック
5. 遷移先 URL が **`https://grow-reporter.com/auth/action?mode=resetPassword&oobCode=...`** であることを確認
6. 自社ブランドの UI（左にロゴ・イラスト、右にパスワード入力フォーム）が表示されることを確認

#### 5-2. 旧 URL の確認
- 旧 URL `growgroupreporter.firebaseapp.com/__/auth/action?...` が表示されていたら、Console 設定が反映されていない可能性
- 設定保存後、最大 1〜2 分のキャッシュ反映時間がある場合あり

## トラブルシューティング

### Q: 設定したのに旧 URL のまま
- ブラウザキャッシュの可能性。シークレットウィンドウで再テスト
- メールテンプレートの言語が「日本語」になっていることを確認
- **ja** と **en** で別々に設定する必要があるかもしれない（多言語環境の場合）

### Q: 「URL が無効」エラーで保存できない
- `https://grow-reporter.com/auth/action` のドメインが Firebase Hosting に登録済みか確認
- `https://` を含めて入力しているか確認

### Q: リンクをクリックすると 404 エラー
- v5.9.0 以降がデプロイされているか確認
- React Router の `/auth/action` ルートが存在するか確認

### Q: パスワード設定画面で「リンクが無効です」エラー
- `oobCode` の有効期限切れ（72 時間）。再度メール送信を依頼
- 1 度使用済みの `oobCode` は再利用不可

## 設定後の挙動（期待動作）

```
[admin] /admin/users/{uid} → 「メールで送信」
   ↓
[システム] generatePasswordResetLink で URL 生成
  → https://grow-reporter.com/auth/action?mode=resetPassword&oobCode=...
   ↓
[顧客] メール受信 → リンククリック
   ↓
[grow-reporter.com/auth/action] AuthAction.jsx が処理
  - oobCode を検証
  - パスワード入力フォーム表示（自社ブランド UI）
  - 顧客が新パスワードを設定
   ↓
[システム] confirmPasswordReset 成功
   ↓
[grow-reporter.com/login] ログイン画面へ遷移
   ↓
[顧客] 設定したパスワードでログイン → ダッシュボード
```

## 関連ファイル

- `src/components/GrowReporter/AuthAction.jsx` — カスタム Auth Action ハンドラー UI
- `src/App.jsx` — `/auth/action` ルート登録
- `functions/src/callable/admin/sendAccountCredentialsEmail.js` — admin からのメール送信 callable
- `functions/src/utils/emailTemplates.js` — `generateAccountCredentialsEmail` テンプレート

## 履歴

- 2026-04-30: v5.9.0 リリース時に作成
