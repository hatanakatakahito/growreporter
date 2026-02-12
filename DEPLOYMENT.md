# GrowReporter デプロイ手順書

このドキュメントでは、GrowReporterをFirebaseにデプロイする手順を説明します。

## 📋 前提条件

- Node.js 20.x以上がインストールされていること
- Firebase CLIがインストールされていること (`npm install -g firebase-tools`)
- Firebaseプロジェクトが作成されていること
- Google Cloud Consoleで以下のAPIが有効化されていること:
  - Google Analytics Data API
  - Google Search Console API
  - Cloud Functions API
  - Cloud Scheduler API

## 🔧 初期セットアップ

### 1. Firebase CLIでログイン

```bash
firebase login
```

### 2. Firebaseプロジェクトを選択

```bash
firebase use --add
```

プロジェクトを選択し、エイリアス名（例: `production`）を設定します。

### 3. 環境変数の設定

Firebase Functionsで使用する環境変数を設定します。

```bash
firebase functions:config:set google.client_id="YOUR_GOOGLE_CLIENT_ID"
firebase functions:config:set google.client_secret="YOUR_GOOGLE_CLIENT_SECRET"
```

設定を確認:

```bash
firebase functions:config:get
```

### 4. Firebase Functionsの依存関係をインストール

```bash
cd functions
npm install
cd ..
```

## 🚀 デプロイ手順

### 1. フロントエンドのビルド

```bash
npm run build
```

ビルドが成功すると、`dist/`ディレクトリが生成されます。

### 2. Firestore RulesとIndexesのデプロイ

```bash
firebase deploy --only firestore
```

### 3. Firebase Functionsのデプロイ

```bash
firebase deploy --only functions
```

初回デプロイ時は、Cloud Schedulerの設定が必要です:

```bash
# Cloud Schedulerを有効化（初回のみ）
gcloud app create --region=asia-northeast1
```

### 4. Firebase Hostingのデプロイ

```bash
firebase deploy --only hosting
```

### 5. すべてを一度にデプロイ

```bash
firebase deploy
```

## 🔄 更新デプロイ

### フロントエンドのみ更新

```bash
npm run build
firebase deploy --only hosting
```

### Functionsのみ更新

```bash
firebase deploy --only functions
```

### 特定のFunctionのみ更新

```bash
firebase deploy --only functions:dailyDataFetch
firebase deploy --only functions:manualDataFetch
```

### Firestore Rulesのみ更新

```bash
firebase deploy --only firestore:rules
```

### Firestore Indexesのみ更新

```bash
firebase deploy --only firestore:indexes
```

## 🔍 デプロイ後の確認

### 1. Hosting URLの確認

```bash
firebase hosting:channel:list
```

または、Firebase Consoleで確認:
https://console.firebase.google.com/project/YOUR_PROJECT_ID/hosting/main

### 2. Functionsの動作確認

```bash
# ログを確認
firebase functions:log

# 特定のFunctionのログ
firebase functions:log --only dailyDataFetch
```

### 3. Firestore Rulesのテスト

Firebase Console > Firestore Database > Rules タブで、シミュレーターを使用してテストできます。

## 🐛 トラブルシューティング

### ビルドエラー

```
Error: Build failed
```

**解決策**:
1. `node_modules`を削除して再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. キャッシュをクリア
   ```bash
   npm run build -- --force
   ```

### Functionsデプロイエラー

```
Error: HTTP Error: 403, The caller does not have permission
```

**解決策**:
1. Firebase Blaze（従量課金）プランにアップグレード
2. 必要な権限を付与
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member=user:YOUR_EMAIL \
     --role=roles/cloudfunctions.developer
   ```

### Cloud Schedulerエラー

```
Error: Cloud Scheduler location must be set
```

**解決策**:
```bash
gcloud app create --region=asia-northeast1
```

### 環境変数が反映されない

**解決策**:
1. 環境変数を再設定
   ```bash
   firebase functions:config:set google.client_id="YOUR_CLIENT_ID"
   ```
2. Functionsを再デプロイ
   ```bash
   firebase deploy --only functions
   ```

## 📊 デプロイ後の設定

### 1. Cloud Schedulerの確認

Firebase Console > Functions > ダッシュボード で、スケジュールされたFunctionsが正しく設定されているか確認します。

または、Google Cloud Consoleで確認:
https://console.cloud.google.com/cloudscheduler

### 2. カスタムドメインの設定（オプション）

Firebase Console > Hosting > ドメインを追加 から、カスタムドメインを設定できます。

### 3. 分析の有効化（オプション）

Firebase Console > Analytics から、Google Analyticsを有効化できます。

## 🔐 セキュリティチェックリスト

デプロイ後、以下を確認してください:

- [ ] Firestore Rulesが正しく設定されている
- [ ] OAuth認証情報が環境変数に設定されている
- [ ] APIキーが公開されていない
- [ ] カスタムドメインでHTTPSが有効
- [ ] Firebase Authenticationの認証プロバイダーが有効
- [ ] Cloud Functionsのタイムアウトとメモリが適切

## 📝 ロールバック手順

問題が発生した場合、以前のバージョンにロールバックできます。

### Hostingのロールバック

```bash
# デプロイ履歴を確認
firebase hosting:channel:list

# 特定のバージョンにロールバック
firebase hosting:rollback
```

### Functionsのロールバック

Google Cloud Consoleから、以前のバージョンに戻すことができます:
https://console.cloud.google.com/functions/list

## 🔄 CI/CDパイプライン（推奨）

GitHub Actionsを使用した自動デプロイの例:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Install Functions dependencies
        run: cd functions && npm ci
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Firebase Tokenの取得:

```bash
firebase login:ci
```

生成されたトークンをGitHub Secretsに `FIREBASE_TOKEN` として保存します。

## 📚 参考リンク

- [Firebase Hosting ドキュメント](https://firebase.google.com/docs/hosting)
- [Firebase Functions ドキュメント](https://firebase.google.com/docs/functions)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [Cloud Scheduler ドキュメント](https://cloud.google.com/scheduler/docs)

