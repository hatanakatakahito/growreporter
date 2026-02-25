# Cloud Functions 一覧・使用状況

最終更新: 2025年

## 種別

- **Callable**: フロントから `httpsCallable(functions, '関数名')` で呼び出し
- **Scheduled**: スケジュール実行（Cloud Scheduler）
- **Trigger**: Firestore ドキュメント変更などで実行

---

## Callable（フロントから呼ばれるもの）

| 関数名 | 用途 | 呼び出し元（例） |
|--------|------|------------------|
| fetchGA4Data | GA4 データ取得 | useGA4Data, comprehensiveDataFetcher |
| fetchGA4MonthlyData | GA4 月次データ | useGA4MonthlyData, comprehensiveDataFetcher |
| fetchGA4MonthlyConversionData | 月次コンバージョン | ConversionList, comprehensiveDataFetcher |
| fetchGA4DailyConversionData | 日別コンバージョン | Day.jsx |
| fetchGA4WeeklyConversionData | 曜日別コンバージョン | Week.jsx |
| fetchGA4HourlyConversionData | 時間帯別コンバージョン | Hour.jsx |
| fetchGA4ChannelConversionData | チャネル別コンバージョン | AcquisitionChannels.jsx |
| fetchGA4ReferralConversionData | 参照元別コンバージョン | Referrals.jsx |
| fetchGA4LandingPageConversionData | LP別コンバージョン | LandingPages.jsx |
| fetchGA4ReverseFlowData | 逆算フロー | ReverseFlow.jsx |
| fetchGA4PagePaths | ページパス一覧 | PageFlow, ReverseFlow |
| fetchGA4PageTransition | ページ遷移分析 | PageFlow.jsx |
| fetchGSCData | GSC データ取得 | useGSCData, comprehensiveDataFetcher |
| captureScreenshot | スクリーンショット取得 | Improve, ImprovementDialog, Step1BasicInfo |
| generateAISummary | AI要約・改善案生成 | AIAnalysisSection, generateAndAddImprovements, AIAnalysisModal |
| fetchMetadata | メタデータ取得 | Step1BasicInfo |
| refreshSiteMetadataAndScreenshots | メタ・スクショ再取得 | Dashboard.jsx |
| fetchGA4UserDemographics | ユーザー属性 | comprehensiveDataFetcher, useGA4UserDemographics |
| exchangeOAuthCode | OAuth 認可コード交換 | Step2GA4Connect, Step3GSCConnect |
| getAdminStats | 管理者統計 | useAdminStats |
| getAdminUsers | 管理者用ユーザー一覧 | useAdminUsers |
| updateUserPlan | プラン変更 | PlanChangeModal |
| getUserDetail | ユーザー詳細 | useAdminUserDetail |
| getActivityLogs | アクティビティログ | useActivityLogs |
| logUserRegistration | 登録ログ | CompleteProfile.jsx |
| logUserLogin | ログインログ | Login.jsx |
| logSiteCreated | サイト作成ログ | SiteRegistration/index.jsx |
| logSiteDeleted | サイト削除ログ | SiteList.jsx |
| getAdminSites | 管理者用サイト一覧 | useAdminSites |
| getSiteDetail | サイト詳細 | useAdminSiteDetail |
| setCustomLimits | 個別制限設定 | useCustomLimits |
| getCustomLimits | 個別制限取得 | useCustomLimits |
| removeCustomLimits | 個別制限削除 | useCustomLimits |
| getAdminList | 管理者一覧 | useAdminManagement |
| updateAdminRole | 管理者ロール変更 | useAdminManagement |
| addAdmin | 管理者追加 | useAdminManagement |
| deleteAdmin | 管理者削除 | useAdminManagement |
| deleteUser | ユーザー削除 | UserDetail.jsx |
| getPlanConfig | プラン設定取得 | usePlanConfig |
| updatePlanConfig | プラン設定更新 | usePlanConfig |
| scrapeTop100Pages | 上位100ページスクレイピング | Admin Sites/SiteDetail.jsx |
| sendTestReportEmail | テストメール送信 | EmailNotifications.jsx |
| submitImprovementConsultation | 改善相談フォーム送信 | ConsultationFormModal.jsx |

---

## Callable（現状フロント未使用 → export から除外済み）

以下の関数は **フロントから一度も呼ばれていない** ため、デプロイ対象から外しています。  
必要になったら `src/index.js` に import/export を追加してください。実装ファイルは `src/callable/` に残してあります。

| 関数名 | 用途 | 備考 |
|--------|------|------|
| testSheetsConnection | スプレッドシート接続テスト | 管理・デバッグ用 |
| fetchImprovementKnowledge | 改善施策ナレッジ取得（スプレッドシート） | 現在は generateAISummary で改善案を生成 |
| analyzePageQuality | ページ品質分析 | UI から未使用 |
| clearAllAICache | 全AI分析キャッシュクリア | 管理者用・画面にボタンなし |
| getAdminGA4Properties | 管理者の GA4 プロパティ一覧 | 管理画面で未使用 |
| getAdminGSCSites | 管理者の GSC サイト一覧 | 管理画面で未使用 |
| setupSiteConnections | サイトに GA4/GSC を管理者経由で設定 | 管理画面で未使用 |

---

## Scheduled

| 関数名 | スケジュール | 用途 |
|--------|--------------|------|
| cleanupCache | 毎日 3:00 JST | キャッシュクリーンアップ |
| exportToSheets | 毎日 4:00 JST | 前月データをスプレッドシートへエクスポート |
| resetMonthlyLimits | 毎月1日 0:00 | 月次制限リセット |
| updatePageScrapingDataScheduled | 毎日 3:00 | 30日以上経過サイトの再スクレイピング |
| sendWeeklyReports | スケジュール | 週次レポート送信 |
| sendMonthlyReports | スケジュール | 月次レポート送信 |

---

## Trigger

| 関数名 | トリガー | 用途 |
|--------|----------|------|
| siteCreatedSheetsExport | sites/{siteId} 書き込み | サイト登録完了時にシートエクスポート＋スクレイピング |
| onSiteChanged | カスタム | サイト作成・URL変更時のメタ・スクショ取得 |
| onScrapingJobCreated | カスタム | スクレイピングジョブ実行 |
