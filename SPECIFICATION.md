# GrowReporter 統合仕様書 v1.2.0

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

## 更新履歴
### v1.2.0 (2026-02-22)
- **マルチユーザー機能追加**: アカウントへの複数ユーザー招待機能を実装
  - メンバー管理機能（招待、承認、削除、権限変更、オーナー譲渡）
  - 役割ベースのアクセス制御（オーナー/編集者/閲覧者）
  - プラン別メンバー数制限（Free: 1人、Standard: 3人、Premium: 10人）
  - 招待メール送信機能（有効期限7日間）
- **新規画面追加**:
  - メンバー管理画面（/members）
  - 招待承認画面（/accept-invitation）
  - アカウント設定画面（/account/settings）
- **データモデル拡張**:
  - `accountMembers`コレクション追加
  - `invitations`コレクション追加
  - `users`コレクションに`accountOwnerId`、`memberRole`フィールド追加
  - `sites`コレクションに`accountOwnerId`フィールド追加
- **Cloud Functions追加**:
  - `inviteMember`: メンバー招待
  - `acceptInvitation`: 招待承認
  - `resendInvitation`: 招待メール再送信
  - `removeMember`: メンバー削除
  - `updateMemberRole`: 権限変更
  - `transferOwnership`: オーナー譲渡
- **セキュリティルール更新**: 役割ベースのアクセス制御を実装

---

## 概要

### プロジェクト名
**GrowReporter** - Webサイト分析レポートツール

### バージョン
v1.2.0

### 目的
Google Analytics 4（GA4）とGoogle Search Console（GSC）のデータを統合し、わかりやすいダッシュボードで表示。AI分析機能により、データから得られる洞察を自動生成します。

### 主要機能
- **ユーザー認証**: Firebase Authentication（メール/パスワード認証）
- **メンバー管理**: アカウントへの複数ユーザー招待・権限管理（オーナー/編集者/閲覧者）
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
- **権限制御**: メンバーの役割に応じたアクセス制限

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
    // ヘルパー関数
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAccountMember(accountOwnerId) {
      return isAuthenticated() && 
        (request.auth.uid == accountOwnerId || 
         exists(/databases/$(database)/documents/accountMembers/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/accountMembers/$(request.auth.uid)).data.accountOwnerId == accountOwnerId &&
         get(/databases/$(database)/documents/accountMembers/$(request.auth.uid)).data.status == 'active');
    }
    
    function getMemberRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.memberRole;
    }
    
    function isOwnerOrEditor(accountOwnerId) {
      return isAccountMember(accountOwnerId) && 
        (getMemberRole() == 'owner' || getMemberRole() == 'editor');
    }
    
    // ユーザーは自分のドキュメントのみアクセス可能
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // サイトはアカウントメンバー全員が閲覧可能、編集者以上が作成・更新、オーナーのみ削除可能
    match /sites/{siteId} {
      allow read: if isAuthenticated() && isAccountMember(resource.data.accountOwnerId);
      allow create: if isAuthenticated() && isOwnerOrEditor(request.resource.data.accountOwnerId);
      allow update: if isAuthenticated() && isOwnerOrEditor(resource.data.accountOwnerId);
      allow delete: if isAuthenticated() && 
        isAccountMember(resource.data.accountOwnerId) && 
        getMemberRole() == 'owner';
    }
    
    // アカウントメンバーはアカウント内のメンバー情報を閲覧可能、オーナーのみ管理可能
    match /accountMembers/{memberId} {
      allow read: if isAuthenticated() && 
        (isAccountMember(resource.data.accountOwnerId) || 
         request.auth.uid == resource.data.accountOwnerId);
      allow create, update, delete: if isAuthenticated() && 
        request.auth.uid == resource.data.accountOwnerId && 
        getMemberRole() == 'owner';
    }
    
    // 招待情報は招待されたユーザーとオーナーが閲覧可能
    match /invitations/{invitationId} {
      allow read: if isAuthenticated() && 
        (request.auth.token.email == resource.data.email || 
         request.auth.uid == resource.data.accountOwnerId ||
         isAccountMember(resource.data.accountOwnerId));
      allow create: if isAuthenticated() && 
        request.auth.uid == request.resource.data.accountOwnerId && 
        getMemberRole() == 'owner';
      allow update: if isAuthenticated() && 
        (request.auth.token.email == resource.data.email || 
         request.auth.uid == resource.data.accountOwnerId);
    }
    
    // トークンは所有者のみアクセス可能
    match /tokens/{tokenId} {
      allow read, write: if isAuthenticated() && 
        resource.data.user_uid == request.auth.uid;
    }
    
    // 改善案は編集者以上が作成・更新・削除可能、閲覧者も閲覧可能
    match /improvements/{improvementId} {
      allow read: if isAuthenticated() && isAccountMember(resource.data.accountOwnerId);
      allow create, update, delete: if isAuthenticated() && isOwnerOrEditor(resource.data.accountOwnerId);
    }
    
    // ページメモは編集者以上が作成・更新・削除可能、閲覧者も閲覧可能
    match /pageNotes/{noteId} {
      allow read: if isAuthenticated() && isAccountMember(resource.data.accountOwnerId);
      allow create, update, delete: if isAuthenticated() && isOwnerOrEditor(resource.data.accountOwnerId);
    }
  }
}
```

### 権限管理

#### メンバーの役割（memberRole）
- **owner（オーナー）**: 全ての操作が可能
  - メンバー管理（招待、削除、権限変更、オーナー譲渡）
  - サイトの作成・編集・削除
  - AI分析の実行
  - 改善案・メモの作成・編集・削除
  - データのエクスポート

- **editor（編集者）**: 閲覧と編集が可能
  - サイトの作成・編集（削除は不可）
  - AI分析の実行
  - 改善案・メモの作成・編集・削除
  - データのエクスポート
  - メンバー管理は閲覧のみ

- **viewer（閲覧者）**: 閲覧のみ可能
  - 全データの閲覧
  - データのエクスポート
  - AI分析・改善案・メモの作成・編集は不可
  - サイトの作成・編集・削除は不可

#### プラン別メンバー数制限
- **Free**: 1人（オーナーのみ）
- **Standard**: 3人（オーナー含む）
- **Premium**: 10人（オーナー含む）

#### 招待フロー
1. オーナーがメールアドレスと権限を指定して招待
2. 招待メールが送信される（有効期限7日間）
3. 招待されたユーザーが招待リンクをクリック
4. 未登録の場合は登録画面へ誘導
5. 登録済みの場合は自動承認してアカウントに参加

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
  - `sessions`: 訪問者数
  - `conversions`: コンバージョン数
  - `engagedSessions`: エンゲージメント訪問者数
  - `totalUsers`: 総ユーザー数
  - `screenPageViews`: ページビュー数
  - `averageSessionDuration`: 平均訪問時間
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
  accountOwnerId: string,         // 所属アカウントのオーナーUID（自分がオーナーの場合は自分のUID）
  memberRole: string,             // 権限: 'owner' | 'editor' | 'viewer'
  plan: string,                   // プラン: 'free' | 'standard' | 'premium'
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### accountMembers
```javascript
{
  memberId: string,               // ドキュメントID（自動生成）
  accountOwnerId: string,         // アカウントオーナーのUID
  userId: string,                 // メンバーのUID（招待承認後に設定）
  email: string,                  // メンバーのメールアドレス
  displayName: string,            // 表示名
  role: string,                   // 権限: 'owner' | 'editor' | 'viewer'
  status: string,                 // ステータス: 'pending' | 'active' | 'removed'
  invitedAt: Timestamp,           // 招待日時
  invitedBy: string,              // 招待したユーザーのUID
  acceptedAt: Timestamp,          // 承認日時（null if pending）
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### invitations
```javascript
{
  invitationId: string,           // ドキュメントID（自動生成）
  accountOwnerId: string,         // アカウントオーナーのUID
  email: string,                  // 招待先メールアドレス
  role: string,                   // 招待時の権限: 'editor' | 'viewer'
  token: string,                  // 招待トークン（UUID）
  status: string,                 // ステータス: 'pending' | 'accepted' | 'expired'
  expiresAt: Timestamp,           // 有効期限（7日間）
  invitedBy: string,              // 招待したユーザーのUID
  invitedByName: string,          // 招待者の表示名
  accountOwnerName: string,       // アカウントオーナーの会社名
  createdAt: Timestamp
}
```

#### sites
```javascript
{
  id: string,                     // 自動生成ID
  userId: string,                 // 作成者UID
  accountOwnerId: string,         // アカウントオーナーUID（アカウント全体でサイトを共有）
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

### Cloud Functions（Callable Functions）

#### inviteMember
**説明**: アカウントに新しいメンバーを招待
**認証**: 必須（オーナーのみ）

**リクエスト**:
```javascript
{
  email: string,        // 招待先メールアドレス
  role: string          // 'editor' | 'viewer'
}
```

**レスポンス**:
```javascript
{
  success: boolean,
  message: string,
  invitationId: string
}
```

#### acceptInvitation
**説明**: 招待を承認してアカウントに参加
**認証**: 必須

**リクエスト**:
```javascript
{
  token: string         // 招待トークン（UUID）
}
```

**レスポンス**:
```javascript
{
  success: boolean,
  message: string,
  accountOwnerId: string
}
```

#### resendInvitation
**説明**: 招待メールを再送信
**認証**: 必須（オーナーのみ）

**リクエスト**:
```javascript
{
  invitationId: string  // 招待ID
}
```

**レスポンス**:
```javascript
{
  success: boolean,
  message: string
}
```

#### removeMember
**説明**: メンバーをアカウントから削除
**認証**: 必須（オーナーのみ）

**リクエスト**:
```javascript
{
  memberId: string      // メンバーID
}
```

**レスポンス**:
```javascript
{
  success: boolean,
  message: string
}
```

#### updateMemberRole
**説明**: メンバーの権限を変更
**認証**: 必須（オーナーのみ）

**リクエスト**:
```javascript
{
  memberId: string,     // メンバーID
  newRole: string       // 'editor' | 'viewer'
}
```

**レスポンス**:
```javascript
{
  success: boolean,
  message: string
}
```

#### transferOwnership
**説明**: アカウントのオーナー権限を譲渡
**認証**: 必須（オーナーのみ）

**リクエスト**:
```javascript
{
  newOwnerId: string    // 新しいオーナーのUID
}
```

**レスポンス**:
```javascript
{
  success: boolean,
  message: string
}
```

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

#### 3.5. 招待承認画面（/accept-invitation）
- 招待トークンによる自動認証
- 未登録ユーザーは登録画面へ誘導
- 登録済みユーザーは自動承認後ダッシュボードへ遷移
- エラー表示（無効なトークン、期限切れなど）

#### 3.6. アカウント設定画面（/account/settings）
- アカウント情報表示
  - 会社名
  - 業種
  - プラン情報
- メンバー管理画面へのリンク
- プラン変更リンク（将来実装予定）

#### 3.7. メンバー管理画面（/members）
**表示内容**:
- メンバー数表示（現在/上限）
- メンバー一覧テーブル
  - 表示名
  - メールアドレス
  - 権限（オーナー/編集者/閲覧者）
  - ステータス（アクティブ/招待中）
  - アクション（権限変更、削除、再送信、オーナー譲渡）
- 新規メンバー招待ボタン
- プラン上限到達時のアップグレード促進メッセージ

**権限**:
- オーナーのみアクセス可能
- 編集者・閲覧者は閲覧のみ可能

**モーダル**:
- メンバー招待モーダル
  - メールアドレス入力
  - 権限選択（編集者/閲覧者）
  - プラン制限チェック
- オーナー譲渡モーダル
  - 確認メッセージ
  - 注意事項表示
  - 譲渡確認ボタン

#### 4. ダッシュボード（/dashboard）
**表示内容**:
- 日付範囲選択
- サイト選択ドロップダウン
- メトリックカード（6つ）:
  - 訪問者数
  - コンバージョン数
  - エンゲージメント訪問者数
  - 総ユーザー数
  - ページビュー数
  - 平均訪問時間
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

**サイト登録時の自動処理（バックエンド）**
- `sites` に新規ドキュメントが作成されると、Firestore トリガー `onSiteChanged` が発火する。
- 新規作成時のみ以下を実行する：
  1. メタデータ取得（`fetchMetadata`）：タイトル・説明を `sites` に反映。
  2. PC/モバイルスクリーンショット取得（`captureScreenshot`）：画像URLを `sites` に反映。
  3. **サイトマップスクレイピング**：Cloud Tasks に `scrapeSitemapTask` を enqueue し、バックグラウンドでサイトマップ取得・ページスクレイピングを実行。結果は `sitemapData/{siteId}` および `sitemapData/{siteId}/pages` に格納し、AI改善案の精度向上に利用する。
- 補足：Cloud Tasks のキューが未作成の場合は enqueue が失敗するため、管理者はサイト詳細画面の「サイトマップ取得を実行」ボタンから `runSitemapScraping`（直接実行）で取得可能。

#### 7. 分析画面共通ヘッダー
- ページタイトル
- 日付範囲選択
- サイト選択ドロップダウン
- データ更新ボタン

#### 8. 全体サマリー（/analysis/summary）
**表示内容**:
- 分析ヘッダー
- 主要指標カード
- 訪問者数推移グラフ
- コンバージョン数推移グラフ
- AI分析レポート

**見出しサイズ**: `h2 text-2xl`

#### 9. 日別分析（/analysis/day）
**表示内容**:
- 分析ヘッダー
- 日別データ表（昇順：1日→末日）
  - 列: 日付、曜日（日本語）、訪問者数、コンバージョン数
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
  - カラースケール: 訪問者数
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
  - 列: 時間帯、訪問者数、コンバージョン数
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
├── サイト管理 (/sites)
└── アカウント設定 (/account/settings)
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
- **フロントエンド**: https://grow-reporter.com
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

