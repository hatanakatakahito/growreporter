# GrowReporter v1.1.0 実装計画

## 📋 現在の状態（v1.0.0）

### ✅ 完成済み機能
- Firebase Authentication（Google SSO、Email/Password）
- ユーザー登録・ログイン画面
- プロフィール情報補完画面
- サイト登録（5ステップ）
  - STEP 1: 基本情報入力
  - STEP 2: GA4連携（リフレッシュトークン対応）
  - STEP 3: Search Console連携（リフレッシュトークン対応）
  - STEP 4: コンバージョン設定
  - STEP 5: KPI設定
- サイト一覧・編集・削除
- サイト切り替え機能
- 基本的なレイアウト（Header、Sidebar、MainLayout）
- TailGrids React Pro UIコンポーネント統合
- react-select による検索可能なセレクトボックス

### 🔧 技術スタック
- React 19.0.0
- Vite 6.2.0
- Tailwind CSS 3.4.18
- Firebase (Authentication, Firestore)
- React Router DOM 7.2.0
- react-select

---

## 🎯 v1.1.0 実装計画

### 目標
**API都度呼び出し + 賢いキャッシュ戦略によるダッシュボード構築**

v1.1.0では、画面表示時にGA4とSearch Console APIから直接データを取得し、多層キャッシュ戦略でパフォーマンスとコストを最適化します。

### アーキテクチャの特徴
- ✅ **リアルタイムデータ**: 常に最新のデータを表示
- ✅ **シンプル**: 定期的なデータ収集が不要
- ✅ **低コスト**: 多層キャッシュでAPI呼び出しを最小化（月額 $0.07）
- ✅ **スケーラブル**: 1,000アカウント × 3サイトまで対応

### 多層キャッシュ戦略
```
ユーザーリクエスト
    ↓
[Layer 1] TanStack Query（フロントエンド）
    ↓ キャッシュミス
[Layer 2] Firestore軽量キャッシュ（1時間有効）
    ↓ キャッシュミス
[Layer 3] GA4/GSC API呼び出し
```

**キャッシュヒット率: 80%以上を目標**

---

## 📦 Phase 1: Firebase Functions 実装（優先度: 最高）

### 1.1 Firebase Functions のセットアップ
**目的**: Callable Functionsの基盤構築

#### タスク
- [ ] Firebase Functions の初期化
  ```bash
  cd functions
  npm install firebase-functions firebase-admin googleapis
  ```

- [ ] 環境変数の設定
  ```bash
  # functions/.env
  GOOGLE_CLIENT_ID=your_client_id
  GOOGLE_CLIENT_SECRET=your_client_secret
  ```

- [ ] `functions/package.json` の依存関係
  ```json
  {
    "dependencies": {
      "firebase-functions": "^5.0.0",
      "firebase-admin": "^12.0.0",
      "googleapis": "^134.0.0"
    }
  }
  ```

- [ ] ローカルエミュレータの設定
  ```bash
  firebase emulators:start --only functions,firestore
  ```

#### 成果物
- `functions/` ディレクトリの完全なセットアップ
- デプロイ可能な状態

---

### 1.2 GA4データ取得 Callable Function
**目的**: GA4 APIからリアルタイムデータを取得

#### タスク
- [ ] **基本構造の実装**
  ```javascript
  // functions/src/ga4/fetchGA4Data.js
  const functions = require('firebase-functions');
  const { google } = require('googleapis');
  const admin = require('firebase-admin');
  
  exports.fetchGA4Data = functions.https.onCall(async (data, context) => {
    // 1. 認証チェック
    // 2. サイト所有権確認
    // 3. キャッシュチェック
    // 4. トークン取得・更新
    // 5. GA4 API呼び出し
    // 6. データ整形
    // 7. キャッシュ保存
    // 8. 結果返却
  });
  ```

- [ ] **認証とセキュリティ**
  ```javascript
  // ユーザー認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'ユーザー認証が必要です'
    );
  }
  
  // サイト所有権確認
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists || siteDoc.data().userId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'このサイトにアクセスする権限がありません'
    );
  }
  ```

- [ ] **軽量キャッシュの実装**
  ```javascript
  // Firestoreキャッシュチェック（1時間有効）
  const cacheKey = `${siteId}_${startDate}_${endDate}`;
  const cacheDoc = await db.collection('api_cache').doc(cacheKey).get();
  
  if (cacheDoc.exists) {
    const cache = cacheDoc.data();
    const cacheAge = Date.now() - cache.timestamp.toMillis();
    
    if (cacheAge < 60 * 60 * 1000) { // 1時間
      console.log('Cache hit:', cacheKey);
      return cache.data;
    }
  }
  ```

- [ ] **OAuthトークン管理**
  ```javascript
  // トークン取得
  const tokenDoc = await db
    .collection('oauth_tokens')
    .doc(siteData.ga4OauthTokenId)
    .get();
  
  const tokenData = tokenDoc.data();
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });
  
  // トークン期限切れなら自動更新
  const expiresAt = tokenData.expires_at.toDate();
  if (expiresAt <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    await db.collection('oauth_tokens').doc(siteData.ga4OauthTokenId).update({
      access_token: credentials.access_token,
      expires_at: new Date(credentials.expiry_date),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    oauth2Client.setCredentials(credentials);
  }
  ```

- [ ] **GA4 Data API 呼び出し**
  ```javascript
  const analyticsData = google.analyticsdata('v1beta');
  
  // 基本指標の取得
  const response = await analyticsData.properties.runReport({
    auth: oauth2Client,
    property: `properties/${siteData.ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
      ],
    },
  });
  
  // コンバージョンイベントの取得
  const cvResponse = await analyticsData.properties.runReport({
    auth: oauth2Client,
    property: `properties/${siteData.ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: siteData.conversionEvents.map(e => e.eventName),
          },
        },
      },
    },
  });
  ```

- [ ] **データ整形と返却**
  ```javascript
  const metrics = {
    sessions: parseInt(response.data.rows?.[0]?.metricValues?.[0]?.value || 0),
    totalUsers: parseInt(response.data.rows?.[0]?.metricValues?.[1]?.value || 0),
    screenPageViews: parseInt(response.data.rows?.[0]?.metricValues?.[2]?.value || 0),
    engagementRate: parseFloat(response.data.rows?.[0]?.metricValues?.[3]?.value || 0),
  };
  
  // コンバージョン集計
  const conversions = {};
  cvResponse.data.rows?.forEach(row => {
    const eventName = row.dimensionValues[0].value;
    const count = parseInt(row.metricValues[0].value);
    conversions[eventName] = count;
  });
  
  const totalConversions = Object.values(conversions).reduce((sum, val) => sum + val, 0);
  const conversionRate = metrics.sessions > 0 ? totalConversions / metrics.sessions : 0;
  
  const result = {
    metrics: {
      ...metrics,
      conversions,
      totalConversions,
      conversionRate,
    },
    period: { startDate, endDate },
    fetchedAt: new Date().toISOString(),
  };
  
  // キャッシュに保存
  await db.collection('api_cache').doc(cacheKey).set({
    data: result,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    siteId,
    userId: context.auth.uid,
  });
  
  return result;
  ```

- [ ] **エラーハンドリング**
  ```javascript
  try {
    // ... 処理 ...
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    
    // エラーログをFirestoreに保存
    await db.collection('error_logs').add({
      type: 'ga4_fetch_error',
      siteId,
      userId: context.auth.uid,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    throw new functions.https.HttpsError(
      'internal',
      'GA4データの取得に失敗しました: ' + error.message
    );
  }
  ```

#### 成果物
- `functions/src/ga4/fetchGA4Data.js`
- `functions/src/utils/tokenManager.js`（トークン管理の共通化）
- `functions/src/utils/cacheManager.js`（キャッシュ管理の共通化）

#### データ構造
```typescript
// 返却データ
{
  metrics: {
    sessions: number;
    totalUsers: number;
    screenPageViews: number;
    engagementRate: number;
    conversions: {
      [eventName: string]: number;
    };
    totalConversions: number;
    conversionRate: number;
  };
  period: {
    startDate: string; // "2025-01-01"
    endDate: string;   // "2025-01-31"
  };
  fetchedAt: string; // ISO 8601
}

// Firestoreキャッシュ構造
// api_cache/{cacheKey}
{
  data: object; // 上記の返却データ
  timestamp: Timestamp;
  siteId: string;
  userId: string;
}
```

---

### 1.3 Search Console データ取得 Callable Function
**目的**: GSC APIからSEOデータを取得

#### タスク
- [ ] **基本構造の実装**（GA4と同様の構造）
  ```javascript
  // functions/src/gsc/fetchGSCData.js
  exports.fetchGSCData = functions.https.onCall(async (data, context) => {
    // GA4と同様の流れ
  });
  ```

- [ ] **Search Console API 呼び出し**
  ```javascript
  const searchConsole = google.searchconsole('v1');
  
  // 基本指標の取得
  const response = await searchConsole.searchanalytics.query({
    auth: oauth2Client,
    siteUrl: siteData.gscSiteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [], // 全体の集計
      rowLimit: 1,
    },
  });
  
  // トップクエリの取得
  const topQueriesResponse = await searchConsole.searchanalytics.query({
    auth: oauth2Client,
    siteUrl: siteData.gscSiteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 10,
    },
  });
  
  // トップページの取得
  const topPagesResponse = await searchConsole.searchanalytics.query({
    auth: oauth2Client,
    siteUrl: siteData.gscSiteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 10,
    },
  });
  ```

- [ ] **データ整形**
  ```javascript
  const result = {
    metrics: {
      clicks: response.data.rows?.[0]?.clicks || 0,
      impressions: response.data.rows?.[0]?.impressions || 0,
      ctr: response.data.rows?.[0]?.ctr || 0,
      position: response.data.rows?.[0]?.position || 0,
    },
    topQueries: topQueriesResponse.data.rows?.map(row => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })) || [],
    topPages: topPagesResponse.data.rows?.map(row => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })) || [],
    period: { startDate, endDate },
    fetchedAt: new Date().toISOString(),
  };
  ```

#### 成果物
- `functions/src/gsc/fetchGSCData.js`

---

### 1.4 キャッシュクリーンアップ Function
**目的**: 古いキャッシュを自動削除してストレージコストを最小化

#### タスク
- [ ] **定期実行の実装**
  ```javascript
  // functions/src/scheduled/cleanupCache.js
  exports.cleanupCache = functions.pubsub
    .schedule('0 3 * * *') // 毎日午前3時
    .timeZone('Asia/Tokyo')
    .onRun(async (context) => {
      const db = admin.firestore();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      const snapshot = await db
        .collection('api_cache')
        .where('timestamp', '<', new Date(oneDayAgo))
        .get();
      
      if (snapshot.empty) {
        console.log('No old cache to delete');
        return null;
      }
      
      // バッチ削除
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${snapshot.size} old cache entries`);
      
      return null;
    });
  ```

#### 成果物
- `functions/src/scheduled/cleanupCache.js`

---

### 1.5 Functions のデプロイ
**目的**: 本番環境への展開

#### タスク
- [ ] **環境変数の設定**
  ```bash
  firebase functions:config:set \
    google.client_id="YOUR_CLIENT_ID" \
    google.client_secret="YOUR_CLIENT_SECRET"
  ```

- [ ] **デプロイ**
  ```bash
  firebase deploy --only functions
  ```

- [ ] **動作確認**
  - ローカルエミュレータでテスト
  - 本番環境でテスト
  - エラーログの確認

#### 成果物
- デプロイ済みのFunctions
- 動作確認レポート

---

## 📊 Phase 2: フロントエンド実装（優先度: 高）

### 2.1 TanStack Query のセットアップ
**目的**: 効率的なデータフェッチングとキャッシュ管理

#### タスク
- [ ] **パッケージインストール**
  ```bash
  npm install @tanstack/react-query
  ```

- [ ] **QueryClient の設定**
  ```javascript
  // src/config/queryClient.js
  import { QueryClient } from '@tanstack/react-query';
  
  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 60 * 1000, // 1時間は再取得しない
        cacheTime: 24 * 60 * 60 * 1000, // 24時間キャッシュを保持
        refetchOnWindowFocus: false, // ウィンドウフォーカス時に再取得しない
        refetchOnMount: false, // マウント時に再取得しない
        retry: 2, // 失敗時に2回リトライ
      },
    },
  });
  ```

- [ ] **App.jsx への統合**
  ```javascript
  // src/App.jsx
  import { QueryClientProvider } from '@tanstack/react-query';
  import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
  import { queryClient } from './config/queryClient';
  
  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SiteProvider>
            <Router>
              {/* ... routes ... */}
            </Router>
          </SiteProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );
  }
  ```

#### 成果物
- `src/config/queryClient.js`
- 更新された `src/App.jsx`

---

### 2.2 カスタムフックの作成
**目的**: データ取得ロジックの再利用

#### タスク
- [ ] **useGA4Data フックの実装**
  ```javascript
  // src/hooks/useGA4Data.js
  import { useQuery } from '@tanstack/react-query';
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '../config/firebase';
  
  export function useGA4Data(siteId, startDate, endDate, options = {}) {
    return useQuery({
      queryKey: ['ga4-data', siteId, startDate, endDate],
      queryFn: async () => {
        const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
        const result = await fetchGA4({ siteId, startDate, endDate });
        return result.data;
      },
      enabled: !!siteId && !!startDate && !!endDate,
      ...options,
    });
  }
  ```

- [ ] **useGSCData フックの実装**
  ```javascript
  // src/hooks/useGSCData.js
  import { useQuery } from '@tanstack/react-query';
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '../config/firebase';
  
  export function useGSCData(siteId, startDate, endDate, options = {}) {
    return useQuery({
      queryKey: ['gsc-data', siteId, startDate, endDate],
      queryFn: async () => {
        const fetchGSC = httpsCallable(functions, 'fetchGSCData');
        const result = await fetchGSC({ siteId, startDate, endDate });
        return result.data;
      },
      enabled: !!siteId && !!startDate && !!endDate,
      ...options,
    });
  }
  ```

- [ ] **useSiteMetrics フックの実装**（GA4 + GSC統合）
  ```javascript
  // src/hooks/useSiteMetrics.js
  import { useGA4Data } from './useGA4Data';
  import { useGSCData } from './useGSCData';
  
  export function useSiteMetrics(siteId, startDate, endDate) {
    const ga4Query = useGA4Data(siteId, startDate, endDate);
    const gscQuery = useGSCData(siteId, startDate, endDate);
    
    return {
      ga4: ga4Query.data,
      gsc: gscQuery.data,
      isLoading: ga4Query.isLoading || gscQuery.isLoading,
      isError: ga4Query.isError || gscQuery.isError,
      error: ga4Query.error || gscQuery.error,
      refetch: () => {
        ga4Query.refetch();
        gscQuery.refetch();
      },
    };
  }
  ```

#### 成果物
- `src/hooks/useGA4Data.js`
- `src/hooks/useGSCData.js`
- `src/hooks/useSiteMetrics.js`

---

### 2.3 期間選択コンポーネント
**目的**: ユーザーが分析期間を選択できるUI

#### タスク
- [ ] **PeriodSelector コンポーネントの実装**
  ```javascript
  // src/components/Dashboard/PeriodSelector.jsx
  import React, { useState } from 'react';
  
  const PRESETS = [
    { label: '過去7日間', days: 7 },
    { label: '過去30日間', days: 30 },
    { label: '過去90日間', days: 90 },
  ];
  
  export default function PeriodSelector({ onPeriodChange }) {
    const [selectedPreset, setSelectedPreset] = useState(30);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    
    const handlePresetClick = (days) => {
      setSelectedPreset(days);
      setIsCustom(false);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      onPeriodChange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
    };
    
    const handleCustomApply = () => {
      if (customStart && customEnd) {
        onPeriodChange({
          startDate: customStart,
          endDate: customEnd,
        });
      }
    };
    
    return (
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                !isCustom && selectedPreset === preset.days
                  ? 'bg-primary text-white'
                  : 'border border-stroke text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              isCustom
                ? 'bg-primary text-white'
                : 'border border-stroke text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3'
            }`}
          >
            カスタム
          </button>
        </div>
        
        {isCustom && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                開始日
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-md border border-stroke px-4 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              />
            </div>
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                終了日
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-md border border-stroke px-4 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              適用
            </button>
          </div>
        )}
      </div>
    );
  }
  ```

#### 成果物
- `src/components/Dashboard/PeriodSelector.jsx`

---

### 2.4 主要指標カードの実装
**目的**: 6つの主要指標を視覚的に表示

#### タスク
- [ ] **MetricCard コンポーネントの実装**
  ```javascript
  // src/components/Dashboard/MetricCard.jsx
  import React from 'react';
  
  export default function MetricCard({ title, value, change, icon, isLoading }) {
    if (isLoading) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <div className="animate-pulse">
            <div className="mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-dark-3"></div>
            <div className="mb-2 h-8 w-32 rounded bg-gray-200 dark:bg-dark-3"></div>
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-dark-3"></div>
          </div>
        </div>
      );
    }
    
    const isPositive = change >= 0;
    
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-body-color">{title}</p>
            <h3 className="mt-2 text-3xl font-bold text-dark dark:text-white">
              {value.toLocaleString()}
            </h3>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={`text-sm font-medium ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                </span>
                <span className="text-xs text-body-color">前期間比</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **MetricCards コンポーネントの実装**
  ```javascript
  // src/components/Dashboard/MetricCards.jsx
  import React from 'react';
  import MetricCard from './MetricCard';
  
  export default function MetricCards({ ga4Data, isLoading }) {
    const metrics = [
      {
        title: 'セッション数',
        value: ga4Data?.metrics?.sessions || 0,
        change: 5.2, // TODO: 前期間比の計算
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
      {
        title: 'ユーザー数',
        value: ga4Data?.metrics?.totalUsers || 0,
        change: 3.8,
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        title: 'ページビュー数',
        value: ga4Data?.metrics?.screenPageViews || 0,
        change: 7.1,
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
      },
      {
        title: 'エンゲージメント率',
        value: ((ga4Data?.metrics?.engagementRate || 0) * 100).toFixed(1) + '%',
        change: 2.3,
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
      },
      {
        title: 'コンバージョン数',
        value: ga4Data?.metrics?.totalConversions || 0,
        change: 12.5,
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
      },
      {
        title: 'コンバージョン率',
        value: ((ga4Data?.metrics?.conversionRate || 0) * 100).toFixed(2) + '%',
        change: 8.9,
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ];
    
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} isLoading={isLoading} />
        ))}
      </div>
    );
  }
  ```

#### 成果物
- `src/components/Dashboard/MetricCard.jsx`
- `src/components/Dashboard/MetricCards.jsx`

---

### 2.5 ダッシュボードページの実装
**目的**: 全てのコンポーネントを統合したダッシュボード

#### タスク
- [ ] **Dashboard ページの更新**
  ```javascript
  // src/components/Dashboard.jsx
  import React, { useState, useEffect } from 'react';
  import { useNavigate, useSearchParams } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  import { useSite } from '../contexts/SiteContext';
  import { useSiteMetrics } from '../hooks/useSiteMetrics';
  import MainLayout from './Layout/MainLayout';
  import PeriodSelector from './Dashboard/PeriodSelector';
  import MetricCards from './Dashboard/MetricCards';
  
  export default function Dashboard() {
    const { currentUser } = useAuth();
    const { sites, selectedSite, selectSite } = useSite();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // 期間の状態管理
    const [period, setPeriod] = useState(() => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    });
    
    // URLのsiteIdパラメータからサイトを選択
    useEffect(() => {
      const siteIdFromUrl = searchParams.get('siteId');
      if (siteIdFromUrl && siteIdFromUrl !== selectedSite?.id) {
        selectSite(siteIdFromUrl);
      }
    }, [searchParams, selectedSite, selectSite]);
    
    // データ取得
    const { ga4, gsc, isLoading, isError, error, refetch } = useSiteMetrics(
      selectedSite?.id,
      period.startDate,
      period.endDate
    );
    
    // サイトが選択されていない場合
    if (!selectedSite) {
      return (
        <MainLayout
          title="ダッシュボード"
          subtitle="サイトを選択してください"
          showSiteSelector={true}
        >
          <div className="p-6">
            <div className="flex min-h-[60vh] items-center justify-center rounded-lg border border-stroke bg-white p-12 shadow-sm dark:border-dark-3 dark:bg-dark-2">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h2 className="mb-3 text-2xl font-bold text-dark dark:text-white">
                  サイトを選択してください
                </h2>
                <p className="mb-8 text-body-color">
                  ヘッダーのサイト選択ドロップダウンから<br />
                  分析したいサイトを選択してください。
                </p>
                {sites.length === 0 && (
                  <button
                    onClick={() => navigate('/sites/new')}
                    className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-opacity-90"
                  >
                    サイトを登録
                  </button>
                )}
              </div>
            </div>
          </div>
        </MainLayout>
      );
    }
    
    // エラー状態
    if (isError) {
      return (
        <MainLayout
          title={`${selectedSite.siteName} - ダッシュボード`}
          subtitle="サイトの分析データと改善状況を確認できます"
          showSiteSelector={true}
        >
          <div className="p-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-base font-semibold text-red-800 dark:text-red-300">
                    データの取得に失敗しました
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error?.message || 'エラーが発生しました'}
                  </p>
                  <button
                    onClick={refetch}
                    className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          </div>
        </MainLayout>
      );
    }
    
    return (
      <MainLayout
        title={`${selectedSite.siteName} - ダッシュボード`}
        subtitle="サイトの分析データと改善状況を確認できます"
        showSiteSelector={true}
      >
        <div className="p-6 space-y-6">
          {/* 期間選択 */}
          <PeriodSelector onPeriodChange={setPeriod} />
          
          {/* 主要指標カード */}
          <MetricCards ga4Data={ga4} isLoading={isLoading} />
          
          {/* TODO: トレンドグラフ（v1.2.0で実装） */}
          {/* TODO: データテーブル（v1.2.0で実装） */}
        </div>
      </MainLayout>
    );
  }
  ```

#### 成果物
- 更新された `src/components/Dashboard.jsx`

---

## 🧪 Phase 3: テストとデバッグ（優先度: 中）

### 3.1 ローカルテスト
**目的**: 開発環境での動作確認

#### タスク
- [ ] **Firebase Emulator でのテスト**
  ```bash
  firebase emulators:start
  ```

- [ ] **フロントエンドの起動**
  ```bash
  npm run dev
  ```

- [ ] **動作確認項目**
  - [ ] ログイン → サイト選択 → ダッシュボード表示
  - [ ] 期間選択の動作
  - [ ] データの表示
  - [ ] キャッシュの動作
  - [ ] エラーハンドリング

---

### 3.2 本番環境テスト
**目的**: 実際のデータでの動作確認

#### タスク
- [ ] **デプロイ**
  ```bash
  firebase deploy
  ```

- [ ] **実際のサイトでテスト**
  - [ ] GA4データの取得
  - [ ] GSCデータの取得
  - [ ] パフォーマンスの測定
  - [ ] エラーログの確認

---

## 📝 Phase 4: ドキュメント作成（優先度: 低）

### 4.1 技術ドキュメント

#### タスク
- [ ] **API仕様書の作成**
  - Callable Functionsの仕様
  - リクエスト/レスポンス形式
  - エラーコード

- [ ] **キャッシュ戦略の文書化**
  - キャッシュの仕組み
  - 有効期限の設定
  - クリーンアップの仕組み

---

## 📅 スケジュール（推定）

### Week 1: Firebase Functions 実装
- **Day 1-2**: セットアップとGA4 Function実装
- **Day 3-4**: GSC Function実装
- **Day 5**: キャッシュクリーンアップ実装
- **Day 6-7**: テストとデバッグ

### Week 2: フロントエンド実装
- **Day 1-2**: TanStack Query セットアップとカスタムフック
- **Day 3-4**: 期間選択と指標カード実装
- **Day 5-7**: ダッシュボード統合とテスト

### Week 3: 最終調整とリリース
- **Day 1-3**: バグ修正と最適化
- **Day 4-5**: 本番環境テスト
- **Day 6-7**: ドキュメント作成とv1.1.0リリース

**合計: 約3週間**

---

## 🎯 成功基準

### v1.1.0 リリース条件
- [ ] GA4データが正しく取得・表示される
- [ ] GSCデータが正しく取得・表示される
- [ ] 6つの主要指標が正しく表示される
- [ ] 期間選択が正常に動作する
- [ ] サイト切り替えが正常に動作する
- [ ] キャッシュが正常に機能する（ヒット率80%以上）
- [ ] エラーハンドリングが適切に機能する
- [ ] レスポンシブデザインが正しく動作する
- [ ] パフォーマンスが良好（初回ロード3秒以内）

---

## 💰 コスト試算（1,000アカウント × 3サイト）

### Firebase Functions
```
実行回数: 6,000回/月（キャッシュヒット率80%）
実行時間: 平均3秒
コスト: 6,000 × 3秒 × $0.0000025 × 12 = $0.54/年
```

### Firestore（軽量キャッシュ）
```
書き込み: 6,000回/月 × 12 = 72,000回/年 = $0.13/年
読み取り: 30,000回/月 × 12 = 360,000回/年 = $0.22/年
ストレージ: ほぼゼロ（1時間で削除）
```

### 合計
```
$0.89/年 ≈ $0.07/月
```

**驚異的に低コスト！🎉**

---

## 🔮 v1.2.0 以降の予定（参考）

### v1.2.0: 詳細分析機能
- トレンドグラフ（ApexCharts）
- ページ別分析
- チャネル別分析
- デバイス別分析
- データテーブル

### v1.3.0: AI分析機能（Gemini 2.5 Flash）
- データの自動分析
- インサイト抽出
- 改善提案の生成

### v1.4.0: 改善管理機能
- カンバンボード
- 改善課題の管理
- 効果測定

### v1.5.0: レポート機能
- PDF/Excel出力
- 定期レポート配信
- カスタムレポート

---

## 📌 注意事項

### API制限対策
- **多層キャッシュ**: フロントエンド（1時間） + Firestore（1時間）
- **キャッシュヒット率**: 80%以上を目標
- **モニタリング**: API呼び出し数を監視

### セキュリティ
- **OAuth トークン**: Firestoreに安全に保存
- **Firestore Rules**: 厳格なアクセス制御
- **Callable Functions**: 認証とサイト所有権の確認

### パフォーマンス
- **初回ロード**: 3秒以内を目標
- **キャッシュヒット**: 1秒以内
- **エラーハンドリング**: ユーザーフレンドリーなメッセージ

---

## 🚀 開始方法

1. **この実装計画を確認**
2. **Phase 1 から順番に実装**
3. **各タスク完了時にチェックマークを付ける**
4. **問題が発生したら記録して対応**
5. **全Phase完了後にv1.1.0をリリース**

---

**作成日**: 2025-10-24  
**バージョン**: v1.1.0 実装計画（API都度呼び出し戦略）  
**次回更新**: Phase 1 完了時
