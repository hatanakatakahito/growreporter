# GrowReporter 要件定義書

最終更新: 2026-04-22 / 対象コミット: `master` 88b2d9b 時点

本ドキュメントは、散在していた計画書・仕様書・モックを整理し、現状のソースコードから再構築した単一の要件定義書です。ここに書かれている内容が唯一正としての要件・仕様であり、`CLAUDE.md` はClaude向けの運用指針として併用されます。

---

## 1. プロダクト概要

GrowReporter は、Google Analytics 4 (GA4) と Google Search Console (GSC) のデータを一元表示し、AI による分析・改善提案・効果測定を自動化する日本語の Web アナリティクス SaaS。React SPA フロントエンド + Firebase サーバーレスバックエンドで構成される。

- 対象ユーザー: 中小企業のWeb担当者、マーケ代行会社、コンサル
- コア価値: 「見る → 改善する → 評価する」を1画面で完結させる
- 言語: UI・メール・AI出力すべて日本語
- プロジェクトID (Firebase): `growgroupreporter` / リージョン: `asia-northeast1`

---

## 2. プラン体系

`src/constants/plans.js` / `functions/src/utils/planManager.js` に定義。

| 項目 | Free | Business |
|---|---|---|
| 月額(税込) | 0円 | 54,780円 (本体49,800円) |
| 最大サイト数 | 1 | 3 |
| 最大メンバー数 | 3 | 無制限 |
| AI要約(月次) | 不可 | 無制限 |
| AI改善提案(月次) | 不可 | 無制限 |
| AIチャット(月次) | 不可 | 無制限 |
| Excel/PPTX出力(月次) | 不可 | 無制限 |
| 改善案評価・タスク管理 | 不可 | 可 |
| サポート | なし | メール・Web会議 |

- 旧プランID (`standard` / `premium` / `paid`) は自動で `business` に正規化(後方互換)
- 個別上書き: `customLimits/{userId}` ドキュメントで `validUntil` / `isActive` 付きで有効値を上書き可(管理者用)
- 制限エンフォースはクライアント (`usePlan` フック) とサーバー (`planManager.js`) の二重チェック

---

## 3. アクター / ロール

### 3.1 アカウント側ロール (サイトメンバー)
- **owner**: アカウントの所有者。サイトCRUD、メンバー招待、所有権譲渡、アカウント削除が可能
- **editor**: 閲覧+編集(改善案・メモ)、サイト設定編集
- **viewer**: 閲覧のみ
- サイトはアカウント配下に紐づく。メンバーは `users/{uid}/memberships/{accountOwnerId}` または `accountMembers` コレクションで管理

### 3.2 プラットフォーム管理者ロール (`adminUsers` コレクション)
- **admin**: 全操作可 (プラン変更、ユーザー/サイト/管理者CRUD、個別制限設定)
- **editor**: 閲覧+編集(管理者追加・削除は不可)
- **viewer**: 閲覧のみ

両ロールは直交する(一人のユーザーが「あるアカウントのowner」と「プラットフォームのadmin」の両方を兼ねうる)。

---

## 4. 認証・認可

### 4.1 認証方法 (Firebase Auth)
- メール/パスワード
- Google OAuth (Firebase provider)
- Microsoft OAuth (Firebase provider)
- パスワードリセット (`/reset-password`)
- 招待状トークン経由の参加 (`/accept-invitation`)

### 4.2 認可
- 公開ルート: ログイン・登録・規約・プライバシー・特商法・OAuthコールバック・招待受諾
- 認証必須ルート: `<ProtectedRoute>` でラップ。`MainLayout` 内に配置
- 管理者ルート: `<AdminRoute>` + `<AdminLayout>` でラップ、`/admin/*` 配下

### 4.3 GA4/GSC 接続用 OAuth
- 認可コード交換は `exchangeOAuthCode` callable
- リフレッシュトークンは `users/{uid}/oauth_tokens/{tokenId}` に保存
- `tokenManager.js` が有効期限5分前に自動リフレッシュ
- 複数Google アカウント連携に対応(tokenId で分離)

### 4.4 Firestore セキュリティルール (`firestore.rules`)
- ヘルパー: `isAuthenticated()`, `isAdminUser()`, `isEditorOrAdmin()`, `isAccountMember()`, `getMemberRole()`, `isOwnerOrEditor()`, `isSiteOwner()`
- コレクショングループクエリ (improvements / pageNotes / aiAnalysisCache / aiSummaries) は管理者のみ横断読取可
- `mail`, `adminActivityLogs` はクライアント直書き不可(Cloud Functions 経由のみ)

---

## 5. 画面構成 (ルーティング)

### 5.1 公開
| パス | コンポーネント | 用途 |
|---|---|---|
| `/login` | Login | ログイン |
| `/register` | Register | 新規登録 |
| `/reset-password` | ForgotPassword | パスワードリセット |
| `/accept-invitation` | AcceptInvitation | 招待受諾 |
| `/oauth/callback` | OAuthCallback | Google/MS OAuth 戻り |
| `/terms`, `/privacy`, `/commercial-transaction` | - | 規約類 |

### 5.2 認証必須 (一般)
| パス | コンポーネント | 用途 |
|---|---|---|
| `/dashboard` | Dashboard | KPIサマリー・アラート・改善案サマリー |
| `/sites/new`, `/sites/:id/edit` | SiteRegistration | サイト登録/編集ウィザード (5ステップ) |
| `/sites/complete` | Complete | 登録完了 |
| `/sites/list` | SiteList | サイト一覧 |
| `/sites/:siteId` | SiteDetail | サイト詳細 |
| `/improve` | Improve | 改善案一覧・評価・効果測定・相談 |
| `/improve/consultation/thanks` | ImproveConsultationThanks | 相談送信完了 |
| `/reports` | Reports | 完了改善の実績評価(カードアコーディオン型) |
| `/thanks`, `/register/complete` | UpgradeThanks / CompleteProfile | 各種完了 |
| `/ai-chat` | AIChat | Gemini ベース対話型分析 |
| `/account/settings`, `/account/profile` | AccountSettings / ProfileEdit | アカウント管理 |
| `/members` | Members | メンバー招待・権限管理・譲渡 |

### 5.3 分析画面 (`/analysis/*`)
| パス | 主要ディメンション |
|---|---|
| `summary` | サマリー (主要指標/CV内訳/目標予実 の3タブ) |
| `month` / `day` / `week` / `hour` | 月別/日別/曜日別/時間帯別 |
| `users` | 地域/デバイス/OS/性別/年代 |
| `channels` / `keywords` / `referrals` | チャネル/GSC検索語/参照元 |
| `pages` / `content` / `page-categories` / `landing-pages` | ページ系 |
| `file-downloads` / `external-links` | ファイルDL/外部リンク |
| `page-flow` / `reverse-flow` | ページ遷移/逆引きフロー |
| `conversions` | CV一覧 |
| `comprehensive` | 包括的AI分析 |

全分析画面は共通で: 期間ピッカー / ディメンションフィルタ / データテーブル(ソート・カラムトグル・前期比較) / グラフ / AI分析ブロック / ユーザーメモ / Excel・PPTXエクスポート を持つ。

### 5.4 管理画面 (`/admin/*`)
| パス | 内容 |
|---|---|
| `dashboard` | 全体統計、バッチAI生成 |
| `users`, `users/:uid` | ユーザー一覧/詳細、プラン変更、個別制限 |
| `sites`, `sites/:siteId` | サイト一覧/詳細 |
| `plans` | プラン管理 |
| `inquiries` | アップグレード問い合わせ(board連携) |
| `logs` | アクティビティログ |
| `settings` | 管理者設定(管理者CRUD含む) |
| `mail` | メール通知設定 |

---

## 6. 機能要件

### 6.1 データ取得・可視化
- **データソース**: GA4 Data API v1、GSC Search Analytics API
- **期間**: 単一期間 + 前期比較。localStorage に保存、月跨ぎで自動リセット
- **キャッシュ**: `api_cache` コレクションに1時間TTL。キーは `{type}_{siteId}_{startDate}_{endDate}_{dimensions}_{metrics}`
- **メトリクス定義**: `shared/metrics.json` が唯一の正。`sync-metrics.mjs` で `functions/src/constants/` と `functions-python/shared/` に生成同期(`prebuild` で実行)
  - 14指標: sessions / totalUsers / newUsers / screenPageViews / pageViewsPerSession / engagementRate / bounceRate / averageSessionDuration / conversions / conversionRate / clicks / impressions / ctr / position
  - `invertColor` で「低いほど良い」指標の表示色を反転
- **UI**: DataTable (ソート・カラム選択・比較) / Recharts・Highcharts・ApexCharts / DateRangePicker / MonthPicker / DimensionFilters

### 6.2 AI 機能 (Gemini 一本化)
`functions/src/prompts/templates.js` にページタイプ別のプロンプト。
- **AI要約 (`generateAISummary`)**: 各ページで期間データを要約。pageType別に最適化
  - ページ種別: dashboard / summary / day / week / hour / month / users / channels / keywords / referrals / landing-pages / pages / page-flow / page-categories / file-downloads / external-links / conversions / content / reverse-flow / comprehensive
- **AI改善提案 (`generateImprovements`)**: 包括的データ + サイト属性(industry / siteType / sitePurpose)を絶対的前提に改善提案。Jaccard類似度 >0.5 で重複排除、URLパス自動抽出、非ビジュアル判定(CWV・メタデータ系)
- **AI改善モックアップ (`generateImprovementMockup`)**: Gemini 2.5 Flash で改善案のモック文言・構成生成
- **AIチャット (`aiChat`)**: ChatGPT型UI、Markdown出力 + インライン Recharts チャート生成
- **AIキャッシュ (`aiAnalysisCache`)**: 7日TTL、pageType × 期間 × 比較期間で重複排除。月次リセット時に全削除(`resetMonthlyLimits`)
- **共通ルール**: 冒頭2-3文要約 + 箇条書き3-5個、「ポイント」表現禁止、具体的数値必須、装飾禁止

### 6.3 改善案ライフサイクル
Firestore `sites/{siteId}/improvements/{id}`
- 状態遷移: `draft → reviewing → approved → completed → (effect_measured)` / `draft → rejected` / `draft → archived (90日経過で自動)`
- カード型UI(C案: アコーディオン)
- `ImprovementDialog` (3カラムモーダル) で詳細、`EvaluationModal` で評価・状態変更
- `archiveStaleImprovements` スケジュール関数: 毎日5:00 JST、90日超の draft を自動アーカイブ

### 6.4 改善効果測定
実装済み(5フェーズ完了)。
1. **Beforeスナップショット** (`fetchBeforeMetrics` / `captureBeforeScreenshot` / `preheatSitePageScreenshots`): 改善 completed 時に自動取得
2. **After計測** (`measureImprovementEffects` スケジュール関数): 毎日4:00 JST、`emNextMeasurementAt` に達したタスクの期間データを取得
3. **AI評価** (`generateEffectEvaluation`): achievementLevel / overallScore を Gemini で算出
4. **状態**: `emStatus` = pending / measuring / measured / error。`retryEffectMeasurement`, `scheduleRemeasurement` で再試行可
5. **UI**: Reports 画面で完了タスクの効果をカードアコーディオン表示

### 6.5 スクレイピング・スクリーンショット
- **ジョブキュー**: `scrapingJobs` コレクションに `onScrapingJobCreated` Firestore トリガー (16GiB / maxInstances 3 / concurrency 1)
- **スクレイパー**: Puppeteer-core + @sparticuz/chromium + Cheerio (`unifiedPageScraper.js`)
- **IPブロック対策**: Cloudflare Worker (`workers/fetch-proxy/worker.js`) を HTML プロキシとして利用。`X-Proxy-Secret` で認証
- **スクリーンショット**: Puppeteer + PageSpeed Insights API。GCSに保存、`sites/{siteId}/pageScreenshots` にメタデータ
- **月次再スクレイピング**: `monthlyRescrapeAllSites` が毎月1日0:00 JSTに全サイトジョブ投入
- **上位ページ抽出**: `scrapeTop100Pages` (GA4 PV上位100ページを対象)

### 6.6 レポート出力 (Excel / PowerPoint)
- **実行**: `useAnalysisExport` → `incrementExportUsage` callable で制限チェック → Python Functions 呼び出し
- **Python Cloud Functions** (`functions-python/`, codebase: `python-export`, Node非依存)
  - `generate_analysis_excel` (1GiB / 120s): xlsxwriter。シート: cover / summary / users / conversions / improvements / reverse_flow + 動的カスタムシート
  - `generate_analysis_pptx` (1GiB / 120s): python-pptx
- **出力**: `{サイト名}_分析レポート_{開始日}_{終了日}.xlsx|pptx` を Base64 で返却、フロントでダウンロード
- **既知の罠**: python-pptxで「コンテンツに問題」警告を避けるため罫線XMLと dLblPos=outEnd を避ける

### 6.7 メール通知
送信元: `info@grow-reporter.com` / Nodemailer + AWS SES。ユーザー側は `notificationSettings.emailNotifications` でグローバル、種別別フラグでも制御可。

- **ウェルカム** (`onUserCreated` トリガー): 新規ユーザー登録時
- **週次レポート** (`sendWeeklyReports`): 毎週月曜9:00 JST
- **月次レポート** (`sendMonthlyReports`): 毎月1日9:00 JST
- **メトリクスアラート** (`checkMetricAlertsScheduled`): 毎日8:00 JST、閾値超過検知 + 原因仮説 (`alertHypotheses.js`)
- **契約更新リマインダー** (`checkContractRenewals`): 毎月1日9:30 JST、終了2ヶ月前/1ヶ月前
- **改善効果完了通知**: 効果測定完了時
- **プラン変更通知**: 管理者変更時
- **意見箱**: `onUserFeedbackCreated` で info@grow-reporter.com へ転送
- **アップグレード問い合わせ**: `onUpgradeInquiryCreated` でメール送信

### 6.8 決済・帳票連携 (board API / Stripe 統合)
`project_payment_plan.md` で定義された4フェーズ計画。board API (案件・見積) と連携。
- `boardApiClient.js` / `boardEstimateCreator.js` 実装済み
- `syncBoardData` スケジュール関数: 毎日0:00 JST、active/estimate_created 案件を同期
- 管理画面 `/admin/inquiries` で問い合わせ管理、`retryBoardEstimate` で見積再作成
- `submitUpgradeInquiry` callable で問い合わせ送信 → 自動で board 見積作成
- Stripe 統合は今後フェーズ

### 6.9 メンバー・権限管理
- 招待送信: `inviteMember` (7日間有効なトークン付き)
- 受諾: `acceptInvitation` / `getInvitationByToken` (未ログインでも参照可)
- 再送・取消: `resendInvitation` / `cancelInvitation`
- 権限変更: `updateMemberRole` (owner のみ)
- 削除: `removeMember`
- 所有権譲渡: `transferOwnership` (重要操作、確認モーダル必須)
- 一覧取得: `getAccountMembers`

### 6.10 スプレッドシート自動出力
Google Sheets API v4 (`sheetsManager.js`)
- サイト登録完了時: 過去3ヶ月分を即時エクスポート (`siteCreatedSheetsExport` トリガー、2GiB / 540s)
- 定期: `exportToSheets` 毎日4:00 JST、全サイトの前月データ

### 6.11 コンテンツ興味度スコア (計画中)
`project_content_interest_score.md` に記載の GA4 既存データ + GTM テンプレート方式。未実装。

### 6.12 オンボーディング / ツアー
- driver.js ベース、pageType 単位でツアー定義
- `useOnboarding` / `useAutoTour` フック、`TourHelpButton` (ヘッダー? マーク)
- `seenTours` は users ドキュメントに保存、`tourGuideEnabled` で全体 ON/OFF

---

## 7. 非機能要件

### 7.1 性能
- React Query: staleTime 5分、cacheTime 30分、refetchOnWindowFocus/Mount=false
- Cloud Functions lazy loading: `lazyCallable()` でデプロイ時タイムアウト回避
- キャッシュ多層: API(1h) / AI(7d) / スクショ(GCS永続)

### 7.2 可用性・運用
- Firebase Hosting (SPA)、静的アセット1年キャッシュ
- Cloud Functions v2 / asia-northeast1
- 環境変数: フロント `VITE_*` / バックエンド Secret Manager (`GEMINI_API_KEY`)
- board API キー: `BOARD_API_KEY`, `BOARD_API_TOKEN` 環境変数
- スクレイピングプロキシシークレット: `PROXY_SECRET`

### 7.3 セキュリティ
- Firestore Rules 約326行で RBAC 完全実装
- Storage Rules: users(5MB/本人のみ) / sites(10MB/共有) / consultation_excels(xlsx限定) / exports(Admin SDK書込のみ) / feedback_attachments(本人のみ)
- OAuth トークンは Firestore サブコレクションに保存、5分前自動リフレッシュ
- 管理者操作は `adminActivityLogs` に全記録 (action / targetType / targetId / details / adminId / createdAt)

### 7.4 監視・ログ
- `userActivityLogger.js`: 登録/ログイン/サイト作成/削除を `adminActivityLogs` に記録
- `activityLogs` コレクション: ユーザー自身のアクション履歴
- `planChangeHistory`: プラン変更履歴

---

## 8. データモデル (Firestore 主要コレクション)

### 8.1 ルートコレクション
- `users/{uid}`: プロフィール、`accountOwnerId`、`memberships` マップ、`notificationSettings`、`planId`、`seenTours`、`tourGuideEnabled`
  - sub: `oauth_tokens/{tokenId}`, `customLimits/{userId}`, `aiChats/{chatId}/messages`
- `sites/{siteId}`: `userId`, `ga4PropertyId`, `gscSiteUrl`, `industry`, `siteType`, `sitePurpose`, `setupCompleted` ほか
  - sub: `alerts`, `improvements`, `pageNotes`, `consultantNotes`, `pageScrapingData`, `pageScreenshots`, `aiAnalysisCache`, `aiSummaries`
- `accountMembers/{id}`: アカウントメンバー (accountOwnerId, userId, role, status, createdAt)
- `invitations/{id}`: 招待 (7日期限、token, role, status)
- `adminUsers/{uid}`: プラットフォーム管理者 (role, name, email)
- `adminActivityLogs/{id}`: 管理操作監査ログ
- `activityLogs/{id}`: ユーザー活動ログ
- `plans/{id}` / `customLimits/{userId}`: プラン定義と個別上書き
- `api_cache/{key}`: GA4/GSC APIキャッシュ (1h TTL)
- `scrapingJobs/{jobId}`: スクレイピングジョブキュー
- `scrapingErrors/{id}`: スクレイピング失敗ログ
- `upgradeInquiries/{id}`: アップグレード問い合わせ (board 連携)
- `userFeedback/{id}`: 意見箱
- `reports/{id}`: 生成済みレポート
- `planChangeHistory/{id}`: プラン変更履歴
- `promptTemplates/{id}`: AIプロンプトテンプレート (管理者編集可)
- `mail/{id}`: Firebase Email Extension 用 (直接書き込み不可)
- `systemSettings/{id}`: 管理者設定

### 8.2 主要な複合インデックス (`firestore.indexes.json`, 27個)
- `aiAnalysisCache`: 9個 (userId × siteId × pageType × period)、Collection Group 対応
- `aiSummaries`: 2個
- `pageScrapingData`: 2個 (siteId × pageViews desc / scrapedAt desc)
- `improvements` [Collection Group]: 効果測定用 (status × emStatus × emNextMeasurementAt)
- `adminActivityLogs` / `activityLogs`: (action × createdAt) (adminId × createdAt)
- `accountMembers`, `invitations`, `sites`, `reports`, `scrapingErrors`, `planChangeHistory`, `customLimits`, `promptTemplates` ほか

---

## 9. スケジュールジョブ一覧

| 関数名 | Cron (JST) | 役割 |
|---|---|---|
| `cleanupCache` | 毎日 03:00 | 24h超の api_cache 削除 |
| `exportToSheets` | 毎日 04:00 | 全サイト前月データをスプレッドシート出力 |
| `measureImprovementEffects` | 毎日 04:00 | 改善 After 指標計測 & AI評価 |
| `archiveStaleImprovements` | 毎日 05:00 | 90日超 draft を自動アーカイブ |
| `checkMetricAlertsScheduled` | 毎日 08:00 | メトリクスアラート & 原因仮説生成 |
| `syncBoardData` | 毎日 00:00 | board API から案件同期 |
| `sendWeeklyReports` | 毎週月曜 09:00 | 週次レポートメール |
| `sendMonthlyReports` | 毎月1日 09:00 | 月次レポートメール |
| `resetMonthlyLimits` | 毎月1日 00:00 | 使用制限リセット + AIキャッシュ全削除 |
| `monthlyRescrapeAllSites` | 毎月1日 00:00 | 全サイト再スクレイピングジョブ投入 |
| `checkContractRenewals` | 毎月1日 09:30 | 契約更新リマインダー |

---

## 10. 主要 Cloud Functions 一覧

`lazyCallable()` パターンで `functions/src/index.js` にエクスポート。`fetchMetadata`, `refreshSiteMetadataAndScreenshots`, `scrapeTop100Pages` は独自の request shape のため直接 onCall。

### 10.1 データ取得 (全て 512MiB / 60s)
`fetchGA4Data`, `fetchGA4MonthlyData`, `fetchGA4MonthlyConversionData`, `fetchGA4DailyConversionData`, `fetchGA4WeeklyConversionData`, `fetchGA4HourlyConversionData`, `fetchGA4ChannelConversionData`, `fetchGA4ReferralConversionData`, `fetchGA4LandingPageConversionData`, `fetchGA4ReverseFlowData`, `fetchGA4PageTransition`, `fetchGA4UserDemographics`, `fetchGSCData` / `fetchGA4PagePaths` は 256MiB/30s

### 10.2 AI 系
- `generateAISummary` (512MiB / 60s)
- `generateImprovements` (2GiB / 300s)
- `generateImprovementMockup` (512MiB / 120s)
- `aiChat` (512MiB / 120s)
- `batchGenerateAISummaries` (1GiB / 540s): 管理者用一括生成
- `analyzePageQuality` / `fetchImprovementKnowledge` / `clearAllAICache`

### 10.3 スクショ・メタデータ
- `captureScreenshot` (1GiB / 120s)
- `captureBeforeScreenshot` (512MiB / 120s)
- `preheatSitePageScreenshots` (512MiB / 120s)
- `fetchMetadata` (2GiB / 120s)
- `refreshSiteMetadataAndScreenshots` (1GiB / 180s)

### 10.4 効果測定
- `fetchBeforeMetrics`, `retryEffectMeasurement`, `scheduleRemeasurement`

### 10.5 OAuth / サイト管理
- `exchangeOAuthCode`, `deleteSite`, `deleteAccount`, `getMySiteDetail`, `scrapeTop100Pages`

### 10.6 メンバー管理
`inviteMember`, `acceptInvitation`, `getInvitationByToken`, `resendInvitation`, `cancelInvitation`, `removeMember`, `updateMemberRole`, `transferOwnership`, `getAccountMembers`

### 10.7 チャット
`getChatSessions`, `deleteChatSession`, `archiveChatSession`, `endChatSession`, `updateChatSession`, `searchChatSessions`, `addImprovementFromChat`, `getChatMessages`

### 10.8 ログ / 問い合わせ
`logUserRegistration`, `logUserLogin`, `logSiteCreated`, `logSiteDeleted`, `submitImprovementConsultation`, `submitUpgradeInquiry`, `sendTestReportEmail`, `incrementExportUsage`

### 10.9 管理者用 (`callable/admin/`)
`getAdminStats`, `getAdminUsers`, `getUserDetail`, `getAdminSites`, `getSiteDetail`, `getActivityLogs`, `updateUserPlan`, `getAdminList`, `addAdmin`, `deleteAdmin`, `updateAdminRole`, `setCustomLimits`, `getCustomLimits`, `removeCustomLimits`, `setUserActiveSites`, `deleteUser`, `adminCreateUser`, `adminCreateSite`, `adminDeleteSite`, `getUpgradeInquiries`, `updateInquiryStatus`, `retryBoardEstimate`, `deleteUpgradeInquiries`, `syncBoardInquiry`, `batchRunDiagnosis`, `getAdminGA4Properties`, `getAdminGSCSites`, `setupSiteConnections`

### 10.10 Python Functions (`functions-python/`, codebase `python-export`)
`generate_analysis_excel`, `generate_analysis_pptx`

---

## 11. 技術スタック

### 11.1 フロントエンド
- React 19 + React Router DOM 7
- Vite 6 + Tailwind CSS 4 (CSSファーストtheme, `@theme {}`)
- TanStack React Query 5
- Firebase Web SDK 12
- Recharts 3 / Highcharts 12 / ApexCharts 3
- @headlessui/react 2, @heroicons/react 2, lucide-react
- date-fns 4, @holiday-jp/holiday_jp
- react-hot-toast, react-markdown + remark-gfm, react-day-picker, react-select
- driver.js (ツアー), motion (アニメ), react-confetti, swiper, jsvectormap, simpleheat
- pptxgenjs (営業資料生成のみ), xlsx-js-style

### 11.2 バックエンド (Node)
- Firebase Functions v2 / Node 20 / ESM
- firebase-admin, googleapis, nodemailer
- puppeteer-core + @sparticuz/chromium, cheerio
- @sendgrid/mail は依存残るが AWS SES に移行済み
- highcharts (メール用チャート画像生成)

### 11.3 バックエンド (Python)
- firebase-functions, firebase-admin
- xlsxwriter, python-pptx
- google-cloud-storage

### 11.4 インフラ
- Firebase Hosting (dist/) + SPA fallback + `/lp` 静的
- Firebase Functions (Node + Python 2コードベース)
- Firestore + Storage + Auth
- Cloudflare Workers (fetch-proxy)
- GCS (スクリーンショット永続化)

### 11.5 ルート `scripts/`
- `sync-metrics.mjs`: `shared/metrics.json` を Node/Python 用に複製(prebuild)
- `build-sales-deck.mjs` / `build-sales-deck-v2.mjs`: 営業資料 PPTX テンプレート更新
- `generate-sales-pptx.mjs`: pptxgenjs で営業資料生成
- `check-metrics-parity.mjs`: メトリクス定義整合性チェック
- `insertSampleEffectMeasurement.js`: 効果測定サンプル挿入
- `resetTourHistory.js`: ツアー履歴リセット

### 11.6 `functions/scripts/` 運用スクリプト
`bulk-rescrape-all-sites.js`, `check-meta.js`, `check-site-screenshots.js`, `find-sites.js`, `scraping-diagnosis.js`, `test-screenshot-5.js`, `trigger-scraping.js`

---

## 12. UI/UX 規約

### 12.1 デザイントークン (Tailwind v4 `@theme`)
- primary: #3758F9、blue #3B82F6、purple #8B5CF6 (AIグラデ)
- secondary: #13C296
- dark スケール #111928 → #E5E7EB (8段)
- カスタムアニメ: `bounce-once`, `dot-wave`
- AIグラデ背景: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`

### 12.2 UI原則
- 文字色は濃色優先(薄いグレー回避)
- レポート内リンクは別タブで開く (`target="_blank" rel="noopener"`)
- 法的リンク(規約・プライバシー)はSSOボタン下など控えめに配置
- Meta Description は画面名を主語、160文字以内
- 改善/評価画面はC案カードアコーディオン型で確定

### 12.3 言語
- UI テキスト、コメント、メール本文、AI プロンプト・出力すべて日本語
- ESLint flat config、Prettier + prettier-plugin-tailwindcss

---

## 13. 既存ドキュメント方針

- 単一要件定義: 本ドキュメント (`REQUIREMENTS.md`) が唯一の正
- Claude 向け開発指針: `CLAUDE.md`
- デプロイ手順: `DEPLOYMENT.md`
- スクレイピング運用コスト: `docs/scraping-cost-impact.md`
- サブディレクトリ README: `functions/src/README.md`, `functions/src/ENVIRONMENT_SETUP.md`, `functions/src/FUNCTIONS.md`, `functions/src/EMAIL_NOTIFICATION_SETUP.md`

計画書・進捗管理・モック・アドホック分析スクリプトは要件整理のため削除済み。今後新たな計画が必要な場合は本ドキュメントに追記 or `/CLAUDE/plans` のPlanモードを使用する。

---

## 14. 既知の未実装・バックログ

- コンテンツ興味度スコア機能 (GA4 + GTM)
- Stripe 決済統合 (board 連携は実装済み、課金処理は未実装)
- テストフレームワーク導入(現状、ユニット/統合テストなし)
- `callable/consultant/` ディレクトリは空(廃止 or 未使用)

---

## 15. 変更管理

本ドキュメントを変更する場合:
1. `shared/metrics.json` の変更時は必ず `npm run build` (または `sync-metrics.mjs` 実行) で生成物を更新
2. Firestore ルール/インデックス変更時は `firebase deploy --only firestore:rules,firestore:indexes`
3. プラン変更時は `src/constants/plans.js` と `functions/src/utils/planManager.js` の両方を更新
4. AI プロンプト変更時は `functions/src/prompts/templates.js` と、該当すれば `promptTemplates` コレクション(管理画面編集)も確認
