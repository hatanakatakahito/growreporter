# Firebase Functions 環境変数設定ガイド

## 必要な環境変数

Firebase Functionsが正常に動作するには、以下の環境変数を設定する必要があります。

### Google OAuth Credentials

GA4とSearch ConsoleのAPIアクセスに必要です。

```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## 設定手順

### 1. Google Cloud Consoleで認証情報を取得

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. プロジェクト `growgroupreporter` を選択
3. 「APIとサービス」→「認証情報」
4. 既存のOAuth 2.0クライアントIDを選択（フロントエンドで使用しているもの）
5. クライアントIDとクライアントシークレットをコピー

### 2. Firebase Functionsに環境変数を設定

#### 方法1: `.env`ファイルを使用（ローカル開発用）

`functions`ディレクトリに`.env`ファイルを作成：

```bash
cd functions
```

`.env`ファイルを作成して以下を記述：

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

#### 方法2: Firebase CLIで設定（本番環境用）

```bash
# functionsディレクトリで実行
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
```

または、`.env`ファイルをデプロイ時に自動的に読み込ませる：

```bash
firebase deploy --only functions
```

## 確認方法

環境変数が正しく設定されているか確認：

```bash
# ローカル
cat functions/.env

# 本番（Secrets Manager）
firebase functions:secrets:access GOOGLE_CLIENT_ID
```

## トラブルシューティング

### エラー: "Failed to refresh OAuth token: invalid_request"

- `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が設定されていない
- 設定後、Firebase Functionsを再デプロイ：
  ```bash
  firebase deploy --only functions
  ```

### エラー: "invalid_client"

- クライアントシークレットが間違っている
- Google Cloud Consoleで正しい値を確認

## 注意事項

- `.env`ファイルは`.gitignore`に含まれており、Gitにコミットされません
- 本番環境では、Firebase Secrets Managerの使用を推奨
- クライアントシークレットは絶対に公開しないでください


