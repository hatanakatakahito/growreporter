# GrowReporter Firebase Functions

このディレクトリには、GrowReporterのバックエンド処理を行うFirebase Functionsが含まれています。

## 📁 ディレクトリ構成

```
functions/
├── src/
│   ├── index.js              # メインエントリーポイント
│   ├── ga4/
│   │   ├── fetchGA4Data.js   # GA4データ取得
│   │   └── refreshToken.js   # GA4トークン更新
│   └── gsc/
│       ├── fetchGSCData.js   # GSCデータ取得
│       └── refreshToken.js   # GSCトークン更新
├── package.json
└── README.md
```

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd functions
npm install
```

### 2. 環境変数の設定

Firebase Consoleで環境変数を設定します。

```bash
firebase functions:config:set google.client_id="YOUR_CLIENT_ID"
firebase functions:config:set google.client_secret="YOUR_CLIENT_SECRET"
```

または、ローカル開発用に`.env`ファイルを作成します（`.env.example`を参考）。

### 3. デプロイ

```bash
# すべてのFunctionsをデプロイ
npm run deploy

# 特定のFunctionのみデプロイ
firebase deploy --only functions:dailyDataFetch
```

## 📊 Functions一覧

### 1. `dailyDataFetch` (スケジュール実行)

- **トリガー**: 毎日午前3時（JST）
- **処理内容**: 
  - すべての登録済みサイトのGA4/GSCデータを取得
  - Firestoreに保存
- **タイムアウト**: 540秒（9分）
- **メモリ**: 512MB

### 2. `manualDataFetch` (HTTPS呼び出し可能)

- **トリガー**: クライアントからの手動呼び出し
- **パラメータ**: `{ siteId: string }`
- **処理内容**:
  - 指定されたサイトのGA4/GSCデータを取得
  - Firestoreに保存
- **タイムアウト**: 300秒（5分）
- **メモリ**: 512MB

**使用例（フロントエンド）:**

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const manualDataFetch = httpsCallable(functions, 'manualDataFetch');

const result = await manualDataFetch({ siteId: 'your-site-id' });
console.log(result.data);
```

### 3. `refreshTokens` (HTTPS呼び出し可能)

- **トリガー**: クライアントからの手動呼び出し
- **パラメータ**: `{ tokenId: string, type: 'ga4' | 'gsc' }`
- **処理内容**:
  - OAuthトークンを更新
  - Firestoreに保存
- **タイムアウト**: 60秒
- **メモリ**: 256MB

## 🔧 ローカル開発

### Emulatorの起動

```bash
npm run serve
```

### ログの確認

```bash
# リアルタイムログ
firebase functions:log

# 特定のFunctionのログ
firebase functions:log --only dailyDataFetch
```

## 📝 データ構造

### GA4データ (`sites/{siteId}/ga4_data`)

#### 日次データ (`{YYYY-MM-DD}`)

```javascript
{
  date: "2025-10-24",
  sessions: 1234,
  users: 567,
  pageViews: 3456,
  engagementRate: 0.65,
  bounceRate: 0.35,
  avgSessionDuration: 180.5,
  byDevice: {
    desktop: { sessions: 800, users: 400 },
    mobile: { sessions: 400, users: 150 },
    tablet: { sessions: 34, users: 17 }
  },
  byChannel: {
    "Organic Search": { sessions: 600, users: 300 },
    "Direct": { sessions: 400, users: 200 },
    "Social": { sessions: 234, users: 67 }
  },
  fetchedAt: Timestamp
}
```

#### サマリーデータ (`_summary`)

```javascript
{
  totalSessions: 37020,
  totalUsers: 17010,
  totalPageViews: 103680,
  avgEngagementRate: 0.65,
  avgBounceRate: 0.35,
  avgSessionDuration: 180.5,
  lastFetchedAt: Timestamp,
  period: {
    startDate: "2025-09-24",
    endDate: "2025-10-24"
  }
}
```

### GSCデータ (`sites/{siteId}/gsc_data`)

#### 日次データ (`{YYYY-MM-DD}`)

```javascript
{
  date: "2025-10-24",
  clicks: 123,
  impressions: 4567,
  ctr: 0.027,
  position: 12.5,
  byDevice: {
    desktop: { clicks: 80, impressions: 3000 },
    mobile: { clicks: 40, impressions: 1500 },
    tablet: { clicks: 3, impressions: 67 }
  },
  fetchedAt: Timestamp
}
```

#### トップクエリ (`_top_queries`)

```javascript
{
  queries: [
    {
      query: "example keyword",
      clicks: 45,
      impressions: 890,
      ctr: 0.051,
      position: 5.2
    },
    // ... 上位100件
  ],
  lastFetchedAt: Timestamp,
  period: { startDate: "...", endDate: "..." }
}
```

#### トップページ (`_top_pages`)

```javascript
{
  pages: [
    {
      page: "https://example.com/page1",
      clicks: 123,
      impressions: 2345,
      ctr: 0.052,
      position: 4.8
    },
    // ... 上位100件
  ],
  lastFetchedAt: Timestamp,
  period: { startDate: "...", endDate: "..." }
}
```

#### サマリーデータ (`_summary`)

```javascript
{
  totalClicks: 3690,
  totalImpressions: 137010,
  avgCtr: 0.027,
  avgPosition: 12.5,
  lastFetchedAt: Timestamp,
  period: { startDate: "...", endDate: "..." }
}
```

## 🔐 セキュリティ

- すべてのHTTPS呼び出し可能Functionsは、Firebase Authenticationで認証されたユーザーのみアクセス可能
- `manualDataFetch`は、リクエストしたユーザーが所有するサイトのみアクセス可能
- OAuthトークンは暗号化されてFirestoreに保存
- Refresh tokenを使用して、アクセストークンを自動更新

## 🐛 トラブルシューティング

### トークンエラー

```
Error: Token refresh failed
```

**解決策**: 
1. Firebase Consoleで環境変数が正しく設定されているか確認
2. Google Cloud Consoleで、OAuth 2.0クライアントIDが有効か確認
3. ユーザーに再認証を依頼

### タイムアウトエラー

```
Error: Function execution took longer than 540000ms
```

**解決策**:
1. データ取得期間を短縮（30日 → 7日など）
2. メモリを増やす（512MB → 1GB）
3. 並列処理を減らす

### データが取得できない

**確認事項**:
1. GA4/GSCのAPIが有効化されているか
2. トークンの有効期限が切れていないか
3. プロパティ/サイトのアクセス権限があるか
4. Firestore Rulesで書き込み権限があるか

## 📚 参考リンク

- [Firebase Functions ドキュメント](https://firebase.google.com/docs/functions)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Search Console API](https://developers.google.com/webmaster-tools/search-console-api-original)

