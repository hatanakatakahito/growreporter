# GrowReporter 統合仕様書 v1.1.0

## 目次
1. [概要](#概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [認証とセキュリティ](#認証とセキュリティ)
4. [データ連携](#データ連携)
5. [フロントエンド仕様](#フロントエンド仕様)
6. [バックエンド仕様](#バックエンド仕様)
7. [データベース設計](#データベース設計)
8. [API仕様](#api仕様)
9. [画面仕様](#画面仕様)
10. [デプロイメント](#デプロイメント)

---

## 概要

### プロジェクト名
**GrowReporter** - Webサイト分析レポートツール

### バージョン
v1.1.0

### 目的
Google Analytics 4（GA4）とGoogle Search Console（GSC）のデータを統合し、わかりやすいダッシュボードで表示。AI分析機能により、データから得られる洞察を自動生成します。

### 主要機能
- **ユーザー認証**: Firebase Authentication（メール/パスワード認証）
- **サイト管理**: 複数サイトの登録・管理
- **GA4データ連携**: OAuth 2.0によるAPI連携（リフレッシュトークン方式）
- **GSCデータ連携**: OAuth 2.0によるAPI連携（リフレッシュトークン方式）
- **ダッシュボード**: 主要指標の可視化
- **分析レポート**: 
  - 全体サマリー
  - 日別分析
  - 曜日別分析（ヒートマップ）
  - 時間帯別分析
- **AI分析**: Claude APIによる自動分析レポート生成

---

## システムアーキテクチャ

### 技術スタック

#### フロントエンド
- **React** 18.3.1
- **React Router DOM** 6.28.0
- **Tailwind CSS** 3.4.15
- **React Query** (@tanstack/react-query) 5.62.3
- **date-fns** 4.1.0
- **Recharts** 2.15.0
- **Vite** 6.0.1

#### バックエンド
- **Firebase**
  - Authentication: ユーザー認証
  - Firestore: データベース
  - Cloud Functions: サーバーレス関数（Node.js 20）
  - Hosting: 静的サイトホスティング

#### 外部API
- **Google Analytics Data API (GA4)**: アナリティクスデータ取得
- **Google Search Console API**: 検索パフォーマンスデータ取得
- **Anthropic Claude API**: AI分析レポート生成

### アーキテクチャ図
```
[ユーザー] 
    ↓
[React SPA (Vite)]
    ↓
[Firebase Authentication]
    ↓
[Cloud Functions]
    ↓
[Google APIs (GA4/GSC) with OAuth 2.0]
    ↓
[Firestore Database]
```

### データフロー
1. ユーザーがログイン（Firebase Auth）
2. サイト登録時にGA4/GSCのOAuth認証を実行
3. リフレッシュトークンをFirestoreに保存
4. データ取得時：
   - Cloud FunctionsがFirestoreからリフレッシュトークンを取得
   - トークンマネージャーが必要に応じてアクセストークンを更新
   - Google APIからリアルタイムでデータを取得（キャッシュなし）
   - レスポンスをクライアントに返却

---

## 認証とセキュリティ

### ユーザー認証
- **方式**: Firebase Authentication（Email/Password）
- **セッション管理**: Firebase Auth Token
- **パスワードリセット**: メール送信機能あり

### OAuth 2.0認証（GA4/GSC）
- **フロー**: Authorization Code Grant
- **スコープ**:
  - GA4: `https://www.googleapis.com/auth/analytics.readonly`
  - GSC: `https://www.googleapis.com/auth/webmasters.readonly`
- **トークン管理**:
  - アクセストークン: 1時間有効、Firestoreに保存
  - リフレッシュトークン: 長期有効、Firestoreに暗号化して保存
  - 有効期限切れ時に自動更新（`tokenManager.js`）

### Firestore セキュリティルール
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のドキュメントのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // サイトは所有者のみアクセス可能
    match /sites/{siteId} {
      allow read, write: if request.auth != null && 
        resource.data.user_uid == request.auth.uid;
    }
    
    // トークンは所有者のみアクセス可能
    match /tokens/{tokenId} {
      allow read, write: if request.auth != null && 
        resource.data.user_uid == request.auth.uid;
    }
  }
}
```

---

## データ連携

### データ取得方式
**v1.1.0ではリアルタイムAPI取得方式を採用**

#### 特徴
- データはFirestoreに保存せず、毎回Google APIから取得
- リフレッシュトークンのみFirestoreに保存
- キャッシュ機能なし（常に最新データを表示）
- トークン自動更新機能あり

#### トークン管理フロー
1. 初回OAuth認証時にリフレッシュトークンを取得
2. Firestoreの`tokens`コレクションに保存
3. データ取得時：
   - `tokenManager.getValidAccessToken()`を呼び出し
   - アクセストークンの有効期限をチェック
   - 期限切れの場合、リフレッシュトークンで新しいアクセストークンを取得
   - 新しいトークンをFirestoreに保存
   - 有効なアクセストークンを返却

### GA4データ取得
- **API**: Google Analytics Data API v1beta
- **エンドポイント**: `properties/{propertyId}:runReport`
- **データ取得範囲**: ユーザー指定の日付範囲
- **指標**:
  - `sessions`: セッション数
  - `conversions`: コンバージョン数
  - `engagedSessions`: エンゲージメントセッション数
  - `totalUsers`: 総ユーザー数
  - `screenPageViews`: ページビュー数
  - `averageSessionDuration`: 平均セッション時間
  - `bounceRate`: 直帰率
- **ディメンション**:
  - `date`: 日付
  - `dayOfWeek`: 曜日（0=日曜日、6=土曜日）
  - `hour`: 時間帯（0-23）

### GSCデータ取得
- **API**: Google Search Console API v1
- **エンドポイント**: `sites/{siteUrl}/searchAnalytics/query`
- **データ取得範囲**: ユーザー指定の日付範囲
- **指標**:
  - `clicks`: クリック数
  - `impressions`: 表示回数
  - `ctr`: クリック率
  - `position`: 平均掲載順位

---

## フロントエンド仕様

### ディレクトリ構成
```
src/
├── components/
│   ├── Analysis/           # 分析画面コンポーネント
│   │   ├── AnalysisHeader.jsx
│   │   ├── AISummarySheet.jsx
│   │   ├── ChartContainer.jsx
│   │   └── DataTable.jsx
│   ├── Dashboard/          # ダッシュボードコンポーネント
│   │   ├── MetricCard.jsx
│   │   ├── MetricCards.jsx
│   │   └── PeriodSelector.jsx
│   ├── GrowReporter/       # 認証・登録コンポーネント
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── CompleteProfile.jsx
│   │   └── SiteRegistration/
│   ├── Layout/             # レイアウトコンポーネント
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── MainLayout.jsx
│   ├── common/             # 共通コンポーネント
│   │   ├── ErrorAlert.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── FormInput.jsx
│   └── ProtectedRoute.jsx
├── contexts/
│   ├── AuthContext.jsx     # 認証コンテキスト
│   └── SiteContext.jsx     # サイト・日付範囲コンテキスト
├── hooks/
│   ├── useGA4Data.js       # GA4データ取得フック
│   ├── useGA4MonthlyData.js
│   ├── useGSCData.js       # GSCデータ取得フック
│   └── useSiteMetrics.js   # 統合メトリクスフック
├── pages/
│   ├── Dashboard.jsx       # ダッシュボードページ
│   ├── SiteList.jsx        # サイト一覧ページ
│   └── Analysis/
│       ├── AnalysisSummary.jsx  # 全体サマリー
│       ├── Day.jsx              # 日別分析
│       ├── Week.jsx             # 曜日別分析
│       └── Hour.jsx             # 時間帯別分析
├── config/
│   ├── firebase.js         # Firebase設定
│   └── queryClient.js      # React Query設定
├── constants/
│   ├── industries.js       # 業種マスタ
│   ├── siteOptions.js      # サイト設定オプション
│   └── tooltips.js         # ツールチップテキスト
└── utils/
    └── dataFetch.js        # データ取得ユーティリティ
```

### グローバルステート管理

#### AuthContext
```javascript
const AuthContext = createContext({
  user: null,           // Firebase Auth User
  loading: true,        // 初期化中フラグ
  login: async (email, password) => {},
  register: async (email, password) => {},
  logout: async () => {},
  resetPassword: async (email) => {}
});
```

#### SiteContext
```javascript
const SiteContext = createContext({
  sites: [],                    // サイト一覧
  selectedSiteId: null,         // 選択中のサイトID
  selectedSite: null,           // 選択中のサイト情報
  isSitesLoading: true,         // サイト読み込み中フラグ
  dateRange: {                  // 日付範囲
    from: Date,                 // 開始日（前月1日）
    to: Date                    // 終了日（前月末日）
  },
  selectSite: (siteId) => {},   // サイト選択関数
  updateDateRange: (range) => {},// 日付範囲更新関数
  refreshSites: () => {}        // サイト再取得関数
});
```

**localStorage連携**:
- `selectedSiteId`: 選択中のサイトを永続化
- `dateRange`: 日付範囲を永続化（各ページで共有）

### ルーティング
```javascript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/oauth/callback/ga4" element={<GA4Callback />} />
  
  {/* 認証が必要なルート */}
  <Route element={<ProtectedRoute />}>
    <Route element={<MainLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sites" element={<SiteList />} />
      <Route path="/analysis/summary" element={<AnalysisSummary />} />
      <Route path="/analysis/day" element={<Day />} />
      <Route path="/analysis/week" element={<Week />} />
      <Route path="/analysis/hour" element={<Hour />} />
    </Route>
  </Route>
</Routes>
```

### データ取得フック

#### useGA4Data
```javascript
const { data, isLoading, error, refetch } = useGA4Data(
  siteId,      // サイトID
  period,      // 期間文字列 "YYYY-MM-DD to YYYY-MM-DD"
  metrics,     // 指標配列 ["sessions", "conversions"]
  dimensions   // ディメンション配列 ["date"] (オプション)
);
```

#### useGSCData
```javascript
const { data, isLoading, error, refetch } = useGSCData(
  siteId,      // サイトID
  period       // 期間文字列 "YYYY-MM-DD to YYYY-MM-DD"
);
```

---

## バックエンド仕様

### Cloud Functions 構成
```
functions/
├── src/
│   ├── callable/
│   │   ├── fetchGA4Data.js          # GA4データ取得
│   │   ├── fetchGA4MonthlyData.js   # GA4月次データ取得
│   │   ├── fetchGSCData.js          # GSCデータ取得
│   │   ├── generateAISummary.js     # AI分析生成
│   │   └── captureScreenshot.js     # スクリーンショット取得
│   ├── scheduled/
│   │   └── cleanupCache.js          # キャッシュクリーンアップ（未使用）
│   ├── utils/
│   │   ├── tokenManager.js          # トークン管理
│   │   └── cacheManager.js          # キャッシュ管理（未使用）
│   └── index.js                     # エントリーポイント
├── package.json
└── README.md
```

### Callable Functions

#### fetchGA4Data
**用途**: GA4データをリアルタイムで取得

**パラメータ**:
```javascript
{
  siteId: string,           // サイトID
  startDate: string,        // 開始日 "YYYY-MM-DD"
  endDate: string,          // 終了日 "YYYY-MM-DD"
  metrics: string[],        // 指標配列
  dimensions?: string[]     // ディメンション配列（オプション）
}
```

**処理フロー**:
1. リクエスト検証
2. Firestoreからサイト情報とトークンを取得
3. `tokenManager.getValidAccessToken()`で有効なアクセストークンを取得
4. Google Analytics Data APIを呼び出し
5. レスポンスをフォーマットして返却

**レスポンス**:
```javascript
{
  success: true,
  data: {
    rows: [
      {
        date: "20250901",      // ディメンション指定時
        sessions: 1234,
        conversions: 56
      }
    ],
    totals: {
      sessions: 45678,
      conversions: 789
    }
  }
}
```

#### fetchGSCData
**用途**: GSCデータをリアルタイムで取得

**パラメータ**:
```javascript
{
  siteId: string,
  startDate: string,
  endDate: string
}
```

**処理フロー**:
1. リクエスト検証
2. Firestoreからサイト情報とトークンを取得
3. `tokenManager.getValidAccessToken()`で有効なアクセストークンを取得
4. Google Search Console APIを呼び出し
5. レスポンスをフォーマットして返却

**レスポンス**:
```javascript
{
  success: true,
  data: {
    clicks: 1234,
    impressions: 56789,
    ctr: 0.0217,
    position: 12.5
  }
}
```

#### generateAISummary
**用途**: Claude APIを使用してAI分析レポートを生成

**パラメータ**:
```javascript
{
  siteId: string,
  startDate: string,
  endDate: string,
  ga4Data: object,
  gscData: object
}
```

**処理フロー**:
1. GA4とGSCのデータを整形
2. Claude APIにプロンプトを送信
3. 生成されたレポートを返却

**レスポンス**:
```javascript
{
  success: true,
  summary: "AIが生成した分析レポートのテキスト..."
}
```

### トークン管理（tokenManager.js）

#### getValidAccessToken
```javascript
async function getValidAccessToken(userId, provider) {
  // 1. Firestoreからトークンを取得
  const tokenDoc = await db
    .collection('tokens')
    .where('user_uid', '==', userId)
    .where('provider', '==', provider)
    .limit(1)
    .get();
  
  // 2. トークンの有効期限をチェック
  const expiresAt = tokenData.expires_at.toDate();
  const now = new Date();
  
  // 3. 有効期限が5分以内なら更新
  if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
    return await refreshAccessToken(tokenId, tokenData.refresh_token, provider);
  }
  
  // 4. 有効なトークンを返却
  return tokenData.access_token;
}
```

#### refreshAccessToken
```javascript
async function refreshAccessToken(tokenId, refreshToken, provider) {
  // 1. Google OAuth 2.0トークンエンドポイントを呼び出し
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  // 2. 新しいアクセストークンを取得
  const data = await response.json();
  
  // 3. Firestoreを更新
  await db.collection('tokens').doc(tokenId).update({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // 4. 新しいトークンを返却
  return data.access_token;
}
```

---

## データベース設計

### Firestore コレクション

#### users
```javascript
{
  uid: string,                    // ドキュメントID（Firebase Auth UID）
  email: string,
  display_name: string,
  company_name: string,
  industry: string,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### sites
```javascript
{
  id: string,                     // 自動生成ID
  user_uid: string,               // 所有者UID
  site_url: string,
  site_name: string,
  industry: string,
  description: string,
  
  // GA4設定
  ga4_property_id: string,
  ga4_connected: boolean,
  ga4_connected_at: Timestamp,
  
  // GSC設定
  gsc_site_url: string,
  gsc_connected: boolean,
  gsc_connected_at: Timestamp,
  
  // スクリーンショット
  mobile_screenshot_url: string,
  desktop_screenshot_url: string,
  
  created_at: Timestamp,
  updated_at: Timestamp,
  status: string                  // "active" | "inactive"
}
```

#### tokens
```javascript
{
  id: string,                     // 自動生成ID
  user_uid: string,               // 所有者UID
  site_id: string,                // 関連サイトID
  provider: string,               // "google_analytics" | "google_search_console"
  google_account: string,         // Googleアカウントメール
  
  access_token: string,           // アクセストークン
  refresh_token: string,          // リフレッシュトークン
  expires_at: Timestamp,          // アクセストークン有効期限
  
  created_at: Timestamp,
  created_by: string,
  updated_at: Timestamp
}
```

### インデックス（firestore.indexes.json）
```json
{
  "indexes": [
    {
      "collectionGroup": "tokens",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_uid", "order": "ASCENDING" },
        { "fieldPath": "provider", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_uid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## API仕様

### Google Analytics Data API

#### runReport
**エンドポイント**: `POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`

**リクエスト**:
```json
{
  "dateRanges": [
    {
      "startDate": "2025-09-01",
      "endDate": "2025-09-30"
    }
  ],
  "metrics": [
    { "name": "sessions" },
    { "name": "conversions" }
  ],
  "dimensions": [
    { "name": "date" }
  ]
}
```

**レスポンス**:
```json
{
  "dimensionHeaders": [
    { "name": "date" }
  ],
  "metricHeaders": [
    { "name": "sessions" },
    { "name": "conversions" }
  ],
  "rows": [
    {
      "dimensionValues": [
        { "value": "20250901" }
      ],
      "metricValues": [
        { "value": "1234" },
        { "value": "56" }
      ]
    }
  ],
  "totals": [
    {
      "metricValues": [
        { "value": "45678" },
        { "value": "789" }
      ]
    }
  ]
}
```

### Google Search Console API

#### searchAnalytics.query
**エンドポイント**: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`

**リクエスト**:
```json
{
  "startDate": "2025-09-01",
  "endDate": "2025-09-30",
  "dimensions": ["date"]
}
```

**レスポンス**:
```json
{
  "rows": [
    {
      "keys": ["2025-09-01"],
      "clicks": 123,
      "impressions": 4567,
      "ctr": 0.0269,
      "position": 12.3
    }
  ]
}
```

---

## 画面仕様

### 共通仕様

#### 日付範囲選択
- **デフォルト**: 前月の1日から末日
- **変更可能範囲**: 過去2年間
- **フォーマット**: YYYY年MM月DD日
- **状態管理**: `SiteContext`で全画面共有
- **永続化**: `localStorage`に保存

#### サイト選択
- **ドロップダウン**: ヘッダーに配置
- **状態管理**: `SiteContext`で全画面共有
- **永続化**: `localStorage`に保存
- **URL連携**: `?siteId=xxx`パラメータで自動選択

#### レスポンシブデザイン
- **ブレークポイント**:
  - モバイル: < 640px
  - タブレット: 640px - 1024px
  - デスクトップ: > 1024px

### 画面一覧

#### 1. ログイン画面（/login）
- メールアドレス入力
- パスワード入力
- ログインボタン
- パスワードリセットリンク
- 新規登録リンク

#### 2. 新規登録画面（/register）
- メールアドレス入力
- パスワード入力
- パスワード確認入力
- 登録ボタン
- ログインリンク

#### 3. プロフィール設定画面（/complete-profile）
- 表示名入力
- 会社名入力
- 業種選択
- 保存ボタン

#### 4. ダッシュボード（/dashboard）
**表示内容**:
- 日付範囲選択
- サイト選択ドロップダウン
- メトリックカード（6つ）:
  - セッション数
  - コンバージョン数
  - エンゲージメントセッション数
  - 総ユーザー数
  - ページビュー数
  - 平均セッション時間
- GSCメトリック（4つ）:
  - クリック数
  - 表示回数
  - CTR
  - 平均掲載順位
- AI分析サマリー

**データ取得**:
- GA4: `useGA4Data(siteId, period, ['sessions', 'conversions', ...])`
- GSC: `useGSCData(siteId, period)`

#### 5. サイト一覧（/sites）
- サイトカード一覧表示
- 新規サイト登録ボタン
- 各サイトに編集・削除ボタン

#### 6. サイト登録フロー（/sites/new）
**Step 1: 基本情報**
- サイトURL
- サイト名
- 業種
- 説明

**Step 2: GA4接続**
- GA4 Property ID入力
- OAuth認証ボタン
- 接続状態表示

**Step 3: GSC接続**
- GSC Site URL入力
- OAuth認証ボタン
- 接続状態表示

**Step 4: 完了**
- 登録内容確認
- ダッシュボードへ遷移

#### 7. 分析画面共通ヘッダー
- ページタイトル
- 日付範囲選択
- サイト選択ドロップダウン
- データ更新ボタン

#### 8. 全体サマリー（/analysis/summary）
**表示内容**:
- 分析ヘッダー
- 主要指標カード
- セッション数推移グラフ
- コンバージョン数推移グラフ
- AI分析レポート

**見出しサイズ**: `h2 text-2xl`

#### 9. 日別分析（/analysis/day）
**表示内容**:
- 分析ヘッダー
- 日別データ表（昇順：1日→末日）
  - 列: 日付、曜日（日本語）、セッション数、コンバージョン数
- 日別推移グラフ
- AI分析レポート

**見出しサイズ**: `h2 text-2xl`

**データ取得**:
```javascript
useGA4Data(siteId, period, ['sessions', 'conversions'], ['date'])
```

**表示形式**:
- 日付: YYYY年MM月DD日（曜日）
- 曜日: 日本語表示（月、火、水、木、金、土、日）
- ソート: 日付昇順

#### 10. 曜日別分析（/analysis/week）
**表示内容**:
- 分析ヘッダー
- 曜日×時間帯ヒートマップ
  - 横軸: 時間帯（0-23時）
  - 縦軸: 曜日（日-土）
  - カラースケール: セッション数
- AI分析レポート

**見出しサイズ**: `h2 text-2xl`

**データ取得**:
```javascript
useGA4Data(siteId, period, ['sessions', 'conversions'], ['dayOfWeek', 'hour'])
```

#### 11. 時間帯別分析（/analysis/hour）
**表示内容**:
- 分析ヘッダー
- 時間帯別データ表（昇順：0時→23時）
  - 列: 時間帯、セッション数、コンバージョン数
- 時間帯別推移グラフ
- AI分析レポート

**見出しサイズ**: `h2 text-2xl`

**データ取得**:
```javascript
useGA4Data(siteId, period, ['sessions', 'conversions'], ['hour'])
```

**表示形式**:
- 時間帯: N時
- ソート: 時間帯昇順（0-23）

### サイドバーメニュー構成
```
├── ダッシュボード (/dashboard)
├── 全体サマリー (/analysis/summary)
├── 時系列 [アコーディオン]
│   ├── 日別 (/analysis/day)
│   ├── 曜日別 (/analysis/week)
│   └── 時間帯別 (/analysis/hour)
└── サイト管理 (/sites)
```

**メニュースタイル**:
- 非アクティブ: `text-dark` (ダークグレー)
- アクティブ: `text-primary` (ブルー)

### AI分析表示
**スタイル**:
- テキストカラー: `text-dark dark:text-white`
- 背景: `bg-white dark:bg-gray-800`
- パディング: `p-6`
- ボーダー: `border border-gray-200`

---

## デプロイメント

### 環境変数

#### フロントエンド（.env）
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

#### Cloud Functions（.env）
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
```

### デプロイコマンド

#### フロントエンド
```bash
# ビルド
npm run build

# Firebase Hostingにデプロイ
firebase deploy --only hosting
```

#### Cloud Functions
```bash
# functionsディレクトリに移動
cd functions

# 依存関係インストール
npm install

# デプロイ
firebase deploy --only functions
```

#### 全体デプロイ
```bash
# ルートディレクトリから
firebase deploy
```

### 本番URL
- **フロントエンド**: https://growgroupreporter.web.app
- **Cloud Functions**: https://asia-northeast1-growgroupreporter.cloudfunctions.net

---

## バージョン履歴

### v1.1.0 (2025-10-27)
**新機能**:
- 日付範囲とサイト選択の全画面共有機能
- 日別・曜日別・時間帯別分析画面
- AI分析レポート自動生成
- リフレッシュトークン自動更新機能

**変更**:
- デフォルト日付範囲を前月1日〜末日に変更
- 日別分析を昇順表示に変更
- 時間帯別分析を昇順表示に変更
- 曜日表示を日本語化
- サイドバーメニューを階層構造に変更
- 見出しサイズを統一（h2 text-2xl）
- テキストカラーをダークグレーに統一

**削除**:
- Firestoreベースのデータキャッシュ機能
- 旧トークン管理システム

### v0.2.8
- リアルタイムAPI取得方式の実装
- キャッシュなし実装

---

## 今後の拡張予定
- [ ] 複数サイト比較機能
- [ ] カスタムレポート作成機能
- [ ] PDF/Excel エクスポート機能
- [ ] メール通知機能
- [ ] チーム共有機能
- [ ] より詳細なAI分析

---

## サポート・お問い合わせ
- **開発**: Grow Group
- **Email**: hatanaka@grow-group.jp
- **GitHub**: [GReporter Repository]

---

**最終更新日**: 2025年10月27日

