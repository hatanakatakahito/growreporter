# Gemini APIキー取得・設定手順

## 問題
現在のAPIキーが無効（403 Forbidden）のため、AI分析機能が動作していません。

## 解決方法：新しいAPIキーの取得

### 方法1: Google AI Studio（推奨・簡単）

1. **Google AI Studioにアクセス**
   - https://aistudio.google.com/app/apikey
   - Googleアカウントでログイン

2. **APIキーを作成**
   - 「Create API Key」ボタンをクリック
   - 既存のGoogle Cloud プロジェクトを選択、または新規作成
   - APIキーが生成されます

3. **APIキーをコピー**
   - 生成されたAPIキーをコピー（1回しか表示されないので注意）

### 方法2: Google Cloud Console

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/
   - プロジェクトを選択または作成

2. **Gemini APIを有効化**
   - 「APIとサービス」→「ライブラリ」
   - "Generative Language API" を検索
   - 「有効にする」をクリック

3. **認証情報を作成**
   - 「APIとサービス」→「認証情報」
   - 「認証情報を作成」→「APIキー」
   - APIキーが生成されます

4. **APIキーを制限（推奨）**
   - 生成されたAPIキーの「編集」をクリック
   - 「APIの制限」→「キーを制限」
   - "Generative Language API" のみを選択
   - 保存

## APIキーの設定

### 1. フロントエンド（開発環境）
`.env` ファイルを編集：

\`\`\`
VITE_GEMINI_API_KEY=<新しいAPIキー>
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
\`\`\`

### 2. バックエンド（Firebase Functions・開発環境）
`functions/.env` ファイルを編集：

\`\`\`
GEMINI_API_KEY=<新しいAPIキー>
GEMINI_MODEL=gemini-2.5-flash-lite
\`\`\`

### 3. 本番環境（Firebase Functions）

Firebase環境変数に設定：

\`\`\`bash
firebase functions:config:set gemini.api_key="<新しいAPIキー>"
firebase functions:config:set gemini.model="gemini-2.5-flash-lite"
firebase deploy --only functions
\`\`\`

## 動作確認

### ローカルテスト（PowerShell）

\`\`\`powershell
$apiKey = "<新しいAPIキー>"
$model = "gemini-2.5-flash-lite"
$url = "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}"
$body = @{
  contents = @(
    @{
      parts = @(
        @{ text = "こんにちは" }
      )
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
\`\`\`

成功すると、AIからの応答が返ってきます。

## トラブルシューティング

### 403 Forbidden エラー
- APIキーが無効または期限切れ
- Gemini APIが有効化されていない
- APIキーの制限設定を確認

### 404 Not Found エラー
- モデル名が間違っている
- APIエンドポイントが間違っている

### 429 Too Many Requests エラー
- レート制限に達している
- 少し待ってから再試行

## 利用可能なモデル（2026年2月時点）

- `gemini-2.5-flash-lite` - 最新の軽量モデル（推奨）
- `gemini-1.5-flash` - 安定版の高速モデル
- `gemini-1.5-pro` - より高性能なモデル

## 注意事項

1. **APIキーの管理**
   - `.env` ファイルは `.gitignore` に含める
   - APIキーを公開リポジトリにコミットしない
   - 定期的にAPIキーをローテーション

2. **コスト管理**
   - Google AI Studioの無料枠を確認
   - 必要に応じてクォータ制限を設定

3. **セキュリティ**
   - APIキーの制限を設定（特定のAPIのみ許可）
   - 本番環境では環境変数で管理
