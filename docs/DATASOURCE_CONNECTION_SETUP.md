# データソース接続セットアップガイド

GrowReporterでGA4とSearch Consoleを接続するための設定手順です。

## 📋 必要な環境変数

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください。

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side only)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Google OAuth (Unified - GA4 + Search Console)
NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_UNIFIED_CLIENT_SECRET=your_google_client_secret

# Encryption Key for OAuth Tokens (AES-256-GCM)
ENCRYPTION_KEY=ZmvyxjvxXRxfTrmpo2XCnjAOhpralCwOo5fCuNpwgos=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI API (for AI Analysis)
OPENAI_API_KEY=your_openai_api_key
```

## 🔧 Google Cloud Console設定

### 1. プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成

### 2. OAuth 2.0 認証情報の作成

1. **APIとサービス** > **認証情報** に移動
2. **認証情報を作成** > **OAuth クライアント ID** を選択
3. アプリケーションの種類: **ウェブアプリケーション**
4. 名前: `GrowReporter OAuth Client`
5. **承認済みのリダイレクト URI** に以下を追加:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-production-domain.com/api/auth/callback/google
   ```
6. **作成** をクリック
7. クライアントIDとクライアントシークレットをコピーして `.env.local` に設定

### 3. 必要なAPIの有効化

以下のAPIを有効化してください:

1. **Google Analytics Data API (GA4)**
   - [GA4 API Console](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
   - 「有効にする」をクリック

2. **Google Analytics Admin API**
   - [Admin API Console](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com)
   - 「有効にする」をクリック

3. **Google Search Console API**
   - [Search Console API Console](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com)
   - 「有効にする」をクリック

### 4. OAuth同意画面の設定

1. **APIとサービス** > **OAuth同意画面** に移動
2. ユーザータイプ: **外部** を選択（本番環境では内部も可）
3. アプリ情報を入力:
   - アプリ名: `GrowReporter`
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
4. **スコープ** セクションで以下を追加:
   - `openid`
   - `profile`
   - `email`
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/analytics.manage.users.readonly`
   - `https://www.googleapis.com/auth/webmasters.readonly`
5. **保存して次へ**

### 5. テストユーザーの追加（開発中）

1. OAuth同意画面の **テストユーザー** セクション
2. **ユーザーを追加** をクリック
3. 接続テストに使用するGoogleアカウントのメールアドレスを追加

## 🔐 暗号化キーの生成

OAuth トークンを安全に保存するための暗号化キーを生成します。

```bash
# Node.jsで暗号化キーを生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

生成されたキーを `.env.local` の `ENCRYPTION_KEY` に設定してください。

## 🚀 接続手順

### 1. サーバーを起動

```bash
npm run dev
```

### 2. データソース接続ページにアクセス

ブラウザで `http://localhost:3000/datasources` にアクセス

### 3. GA4/Search Consoleに接続

1. **GA4に接続** または **Search Consoleに接続** ボタンをクリック
2. Googleアカウントでログイン
3. 必要な権限を許可
4. 自動的にダッシュボードにリダイレクトされます

### 4. 接続状態の確認

- データソース接続ページで接続状態が「接続済み」になっていることを確認
- プロパティ数/サイト数が表示されていることを確認

## 🔍 トラブルシューティング

### エラー: `NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID が設定されていません`

**原因**: `.env.local` ファイルが正しく読み込まれていない

**解決策**:
1. `.env.local` ファイルがプロジェクトルートに存在することを確認
2. サーバーを再起動: `npm run dev`
3. 環境変数が正しく設定されているか確認

### エラー: `insufficient_scopes`

**原因**: 必要なAPIスコープが許可されていない

**解決策**:
1. Google Cloud ConsoleでOAuth同意画面のスコープを確認
2. 必要なAPIが有効化されているか確認
3. 再度接続を試行（既存の接続を解除してから再接続）

### エラー: `Token exchange failed`

**原因**: クライアントシークレットが間違っている、またはリダイレクトURIが一致しない

**解決策**:
1. `.env.local` の `GOOGLE_UNIFIED_CLIENT_SECRET` を確認
2. Google Cloud Consoleでリダイレクト URIが正しく設定されているか確認
3. リダイレクト URIは完全一致する必要があります（末尾のスラッシュも含む）

### 接続状態が「確認中...」のまま

**原因**: Firestoreへの接続に問題がある、またはFirebase設定が間違っている

**解決策**:
1. ブラウザのコンソールでエラーメッセージを確認
2. Firebase設定（`.env.local`）を再確認
3. Firestoreのセキュリティルールを確認

## 📚 関連ドキュメント

- [Firebase設定ガイド](./FIREBASE_SETUP.md)
- [暗号化設定ガイド](./ENCRYPTION_SETUP.md)
- [Firestoreスキーマ](./FIRESTORE_SCHEMA.md)

## 🎯 次のステップ

接続が完了したら:

1. **データ分析ページ** (`/analysis`) でGA4/GSCデータを取得
2. **KPI管理ページ** (`/kpi`) でKPIを設定
3. **ダッシュボード** (`/dashboard`) で統計を確認

---

**注意**: 本番環境にデプロイする際は、必ず `.env.local` の内容を本番環境の環境変数として設定してください。`.env.local` ファイル自体はGitにコミットしないでください。
