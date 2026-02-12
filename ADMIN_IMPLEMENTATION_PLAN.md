# GROW REPORTER アドミン画面 実装計画書

作成日: 2025年1月24日  
対象バージョン: v2.0.0

---

## 📋 実装概要

GROW REPORTERの運用を効率化するため、管理者向けのアドミン画面を実装します。

### 目的
- ユーザー管理の効率化
- プラン変更の迅速化
- システム全体の監視
- 運用負荷の軽減

### スコープ
Phase 1（最優先機能）を実装し、運用しながらPhase 2、Phase 3へ段階的に拡張します。

---

## 🎯 Phase 1: 基本機能（最優先）

**実装期間：** 2-3週間  
**目標：** 日常的なユーザー管理とプラン変更を効率化

### 1.1 ダッシュボード

**画面構成：**
```
┌──────────────────────────────────────────────────┐
│ システムダッシュボード                2025/01/24 │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📊 ユーザー統計                                   │
│ ┌────────────┬────────────┬────────────┐        │
│ │ 無料プラン  │ スタンダード │ プレミアム  │        │
│ │    1,234   │     156     │     42     │        │
│ │   (86.2%)  │   (10.9%)   │   (2.9%)   │        │
│ └────────────┴────────────┴────────────┘        │
│                                                  │
│ 💰 収益統計（月次）                               │
│ MRR: ¥2,361,600                                  │
│ スタンダード: ¥1,528,800 (64.7%)                 │
│ プレミアム:   ¥832,800 (35.3%)                   │
│                                                  │
│ 🔥 AI使用状況（当月）                             │
│ AI分析サマリー: 3,456回                          │
│ AI改善提案: 1,234回                              │
│ キャッシュヒット率: 68.5%                        │
│                                                  │
│ 🌐 サイト統計                                     │
│ 総登録サイト数: 789サイト                         │
│ アクティブサイト: 654サイト (82.9%)              │
│                                                  │
│ 📈 成長率（前月比）                               │
│ ユーザー増加: +12.3% (152人増)                   │
│ 有料プラン転換率: 14.2%                          │
└──────────────────────────────────────────────────┘
```

**必要なデータ：**
- Firestoreの`users`コレクションから集計
- 月次の統計データ
- リアルタイム更新は不要（ページロード時に取得）

**実装タスク：**
- [ ] ダッシュボードレイアウトの作成
- [ ] 統計データ取得のCloud Function作成
- [ ] カード型UIコンポーネントの作成
- [ ] グラフ表示（Recharts使用）

---

### 1.2 ユーザー一覧

**画面構成：**
```
┌────────────────────────────────────────────────────────────┐
│ ユーザー管理                                   [CSVエクスポート] │
├────────────────────────────────────────────────────────────┤
│ 🔍 検索: [________________]  プラン: [全て▼]  期間: [___]  │
├────────────────────────────────────────────────────────────┤
│ □  名前        メール         プラン    サイト数  登録日       │
│ □  畑中 孝仁   hatanaka@...  Premium  5        2025/01/24  │
│ □  山田 太郎   yamada@...    Standard 3        2025/01/20  │
│ □  鈴木 花子   suzuki@...    Free      1        2025/01/15  │
│ ... (ページネーション)                                        │
└────────────────────────────────────────────────────────────┘
```

**必要な機能：**
- ✅ ユーザーリストの取得（ページネーション対応）
- ✅ 検索（メール、組織名、UID）
- ✅ フィルタ（プラン別、ステータス別、登録日範囲）
- ✅ ソート（登録日、最終ログイン、プラン）
- ✅ CSVエクスポート
- ✅ ユーザー詳細へのリンク

**実装タスク：**
- [ ] ユーザー一覧テーブルコンポーネント
- [ ] 検索・フィルタUIの実装
- [ ] ページネーション機能
- [ ] Cloud Function: `listUsers`の実装
- [ ] CSVエクスポート機能

---

### 1.3 ユーザー詳細画面

**画面構成：**
```
┌─────────────────────────────────────────────────┐
│ ユーザー詳細: 畑中 孝仁                          │
├─────────────────────────────────────────────────┤
│ 基本情報                                         │
│ UID: MmvJRYa8GTafpodTY5YcOBTKEjS2                │
│ メール: hatanaka@grow-group.jp                   │
│ 組織: GrowGroup株式会社                          │
│ 電話: 09012345678                                │
│ 業界: インターネット、通信事業                    │
│                                                  │
│ プラン情報                            [変更▼]    │
│ 現在のプラン: プレミアムプラン                    │
│ 料金: ¥19,800/月                                 │
│ 契約開始日: 2025/01/24                           │
│                                                  │
│ 使用状況（当月）                                  │
│ AI分析サマリー: 23回 / 無制限                    │
│ AI改善提案: 8回 / 無制限                         │
│ 登録サイト数: 5サイト / 10サイト                 │
│                                                  │
│ 登録サイト一覧                                    │
│ 1. GrowGroup株式会社                             │
│ 2. GROW ACADEMY                                  │
│ 3. テストサイトA                                 │
│ ...                                              │
│                                                  │
│ アクティビティログ（直近10件）                    │
│ 2025/01/24 14:30 - AI改善提案生成（サイト1）     │
│ 2025/01/24 10:15 - ログイン                      │
│ 2025/01/23 16:45 - AI分析サマリー生成（サイト2） │
│                                                  │
│ [プラン変更] [アカウント停止] [パスワードリセット] │
└─────────────────────────────────────────────────┘
```

**実装タスク：**
- [ ] ユーザー詳細画面レイアウト
- [ ] 基本情報の表示
- [ ] 使用状況の取得・表示
- [ ] 登録サイト一覧の表示
- [ ] アクティビティログの表示
- [ ] Cloud Function: `getUserDetail`

---

### 1.4 プラン変更機能

**モーダルUI：**
```
┌─────────────────────────────────────────┐
│ プラン変更                       [×]    │
├─────────────────────────────────────────┤
│ 現在のプラン: 無料プラン                 │
│                                         │
│ 新しいプラン: [スタンダードプラン ▼]    │
│                                         │
│ 変更理由:                               │
│ [________________________________]      │
│ [________________________________]      │
│                                         │
│ ※ユーザーにメール通知が送信されます     │
│                                         │
│         [キャンセル]  [変更実行]        │
└─────────────────────────────────────────┘
```

**処理フロー：**
1. 管理者が新しいプランを選択
2. 変更理由を入力（任意）
3. 確認ダイアログ表示
4. Firestoreのプランフィールドを更新
5. プラン変更履歴を記録
6. アクティビティログに記録
7. ユーザーにメール通知

**実装タスク：**
- [ ] プラン変更モーダルコンポーネント
- [ ] Cloud Function: `changePlan`
- [ ] プラン変更履歴の記録
- [ ] メール通知機能（Resendまたは SendGrid）
- [ ] エラーハンドリング

---

### 1.5 アクティビティログ

**表示項目：**
- タイムスタンプ
- 操作種別（プラン変更、アカウント停止、サイト削除など）
- 対象（ユーザーID、サイトID）
- 変更内容（before/after）
- 実行した管理者
- IPアドレス

**実装タスク：**
- [ ] ログ一覧画面
- [ ] フィルタ機能（日付範囲、操作種別）
- [ ] ログ記録関数の実装
- [ ] Firestoreの`adminLogs`コレクション設計

---

## 🚀 Phase 2: 運用効率化（中優先度）

**実装期間：** 1-2週間  
**開始条件：** Phase 1完了後、運用開始から2-4週間後

### 2.1 サイト管理

**機能：**
- 全サイト一覧
- サイト詳細表示
- 孤立サイトの検出・削除
- データ収集状況の確認

**実装タスク：**
- [ ] サイト一覧画面
- [ ] サイト詳細画面
- [ ] Cloud Function: `listAllSites`
- [ ] 孤立サイトの検出ロジック

---

### 2.2 AI使用状況の詳細監視

**機能：**
- ユーザー別使用回数ランキング
- 時間帯別使用グラフ
- エラー率の可視化
- コスト分析（Gemini API使用量）

**実装タスク：**
- [ ] AI使用状況ダッシュボード
- [ ] グラフ表示（Recharts）
- [ ] 使用状況の集計Cloud Function
- [ ] コスト計算ロジック

---

### 2.3 アラート機能

**アラート条件：**
- 異常な使用量（通常の5倍以上）
- エラー率の上昇（10%以上）
- サーバー負荷の警告

**通知方法：**
- メール通知
- Slack通知（Webhook）

**実装タスク：**
- [ ] アラート設定画面
- [ ] 監視Cloud Function（Scheduled Function）
- [ ] 通知処理の実装
- [ ] アラート履歴の記録

---

### 2.4 エラーログ表示

**機能：**
- アプリケーションエラーの一覧
- APIエラーの一覧
- データ収集エラーの一覧
- エラー詳細の表示

**実装タスク：**
- [ ] エラーログ一覧画面
- [ ] Cloud Functionsのエラーログ収集
- [ ] フィルタ・検索機能
- [ ] エラーの自動分類

---

## 🎨 Phase 3: 高度な機能（低優先度）

**実装期間：** 1週間  
**開始条件：** Phase 2完了後、必要性が確認されたら

### 3.1 個別制限のカスタマイズ

**機能：**
- 特定ユーザーの制限を個別設定
- 一時的な制限緩和
- テストユーザーの無制限許可

### 3.2 プラン制限設定UI

**機能：**
- 各プランの制限値を動的に変更
- 変更履歴の記録

### 3.3 詳細な権限管理

**機能：**
- アドミンユーザーの役割管理
- 閲覧のみ/編集可能/フル権限の設定
- IPアドレス制限

---

## 🔧 技術仕様

### アーキテクチャ

```
フロントエンド (React)
  ├── /admin/*  (管理画面ルート)
  │   ├── /admin/dashboard
  │   ├── /admin/users
  │   ├── /admin/users/:userId
  │   ├── /admin/sites
  │   ├── /admin/logs
  │   └── /admin/settings
  │
  └── AdminRoute (権限チェック)

バックエンド (Cloud Functions)
  ├── listUsers
  ├── getUserDetail
  ├── changePlan
  ├── getSystemStats
  ├── listAllSites
  └── getActivityLogs

Firestore
  ├── users
  ├── sites
  ├── adminUsers
  ├── adminLogs
  └── systemStats
```

---

### Firestoreデータ構造

#### adminUsers コレクション
```javascript
{
  adminId: string,
  email: string,
  displayName: string,
  role: 'viewer' | 'editor' | 'admin',
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

#### adminLogs コレクション
```javascript
{
  logId: string,
  type: 'plan_change' | 'account_suspend' | 'site_delete',
  userId: string,
  details: {
    before: any,
    after: any,
    reason: string
  },
  adminUserId: string,
  ipAddress: string,
  timestamp: Timestamp
}
```

#### systemStats コレクション
```javascript
{
  date: string, // YYYY-MM-DD
  userCount: {
    free: number,
    standard: number,
    premium: number,
    total: number
  },
  revenue: {
    mrr: number,
    standard: number,
    premium: number
  },
  aiUsage: {
    summaryCount: number,
    improvementCount: number,
    cacheHitRate: number
  },
  siteCount: {
    total: number,
    active: number
  }
}
```

---

### Cloud Functions

#### listUsers
```javascript
/**
 * ユーザー一覧を取得
 * @param {Object} params
 * @param {number} params.page - ページ番号
 * @param {number} params.limit - 取得件数
 * @param {string} params.searchQuery - 検索クエリ
 * @param {string} params.planFilter - プランフィルタ
 * @returns {Object} { users, total, page, limit }
 */
export const listUsersCallable = onCall({ ... });
```

#### changePlan
```javascript
/**
 * ユーザーのプランを変更
 * @param {Object} params
 * @param {string} params.userId - ユーザーID
 * @param {string} params.newPlan - 新しいプラン
 * @param {string} params.reason - 変更理由
 * @returns {Object} { success: true }
 */
export const changePlanCallable = onCall({ ... });
```

---

### セキュリティ

#### 管理者権限のチェック
```javascript
// Firestoreルール
match /adminUsers/{adminId} {
  allow read: if request.auth != null && 
    request.auth.uid == adminId;
}

// Cloud Function内でのチェック
const isAdmin = async (userId) => {
  const adminDoc = await getDoc(doc(db, 'adminUsers', userId));
  if (!adminDoc.exists()) return false;
  return ['editor', 'admin'].includes(adminDoc.data().role);
};

// すべてのアドミンCloud Functionで実行
if (!isAdmin(request.auth.uid)) {
  throw new HttpsError('permission-denied', '管理者権限が必要です');
}
```

#### IPアドレス制限（オプション）
```javascript
// 許可するIPアドレスのリスト
const ALLOWED_IPS = [
  '123.456.789.0', // オフィスIP
];

// リクエスト元IPをチェック
const clientIp = request.headers['x-forwarded-for'] || request.ip;
if (!ALLOWED_IPS.includes(clientIp)) {
  throw new HttpsError('permission-denied', 'アクセスが拒否されました');
}
```

---

### UIコンポーネント設計

#### レイアウト構成
```jsx
<AdminLayout>
  <AdminSidebar />
  <AdminContent>
    <Outlet />
  </AdminContent>
</AdminLayout>
```

#### 共通コンポーネント
- `AdminTable` - データテーブル
- `AdminCard` - 統計カード
- `AdminModal` - モーダルダイアログ
- `AdminButton` - ボタン
- `SearchFilter` - 検索・フィルタコンポーネント

---

## 📅 実装スケジュール

### Week 1-2: Phase 1 基本機能
- Day 1-2: プロジェクト構成、ルーティング設定
- Day 3-4: ダッシュボード実装
- Day 5-7: ユーザー一覧・詳細画面
- Day 8-10: プラン変更機能
- Day 11-12: アクティビティログ
- Day 13-14: テスト・バグ修正

### Week 3: Phase 1 完成・本番反映
- Day 15-16: 統合テスト
- Day 17-18: セキュリティ確認
- Day 19: デプロイ準備
- Day 20: 本番環境へデプロイ
- Day 21: 動作確認・ドキュメント作成

### Week 4-5: Phase 2 運用効率化（オプション）
- 運用状況を見て判断

---

## ✅ 承認項目

実装開始前に以下をご確認・承認ください：

### 1. スコープの確認
- [ ] Phase 1の機能範囲に同意
- [ ] Phase 2、Phase 3は様子を見て判断することに同意

### 2. 技術スタックの確認
- [ ] React + TailwindCSS の使用に同意
- [ ] Firebase Cloud Functions の使用に同意
- [ ] Recharts（グラフライブラリ）の使用に同意

### 3. セキュリティの確認
- [ ] 管理者権限チェックの実装方法に同意
- [ ] アクティビティログの記録に同意

### 4. 実装期間の確認
- [ ] Phase 1を2-3週間で実装することに同意

### 5. 初期管理者アカウント
- [ ] 初期管理者として設定するメールアドレスを指定
  - 例: hatanaka@grow-group.jp

---

## 📝 備考

### 初期セットアップ手順
実装完了後、以下の手順で初期管理者を設定します：

1. Firestoreの`adminUsers`コレクションに手動で管理者を追加
```javascript
{
  adminId: "your-uid-here",
  email: "hatanaka@grow-group.jp",
  displayName: "畑中 孝仁",
  role: "admin",
  createdAt: serverTimestamp(),
  lastLoginAt: null
}
```

2. `/admin`にアクセスして動作確認

### 追加コスト
- メール送信: Resend（無料枠: 月3,000通）または SendGrid
- 追加のCloud Functions実行コスト（月$10-30程度）

---

## 🎯 成功指標

Phase 1実装後の目標：
- ✅ プラン変更の所要時間: 5分 → 30秒
- ✅ ユーザー情報の確認: 3分 → 10秒
- ✅ 月次レポート作成: 2時間 → 5分（CSVエクスポート）

---

**承認後、v2.0.0 ブランチを作成して実装を開始します。**

