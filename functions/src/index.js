import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';

// デプロイ時のロードタイムアウト回避: callable はすべて遅延読み込み
function lazyCallable(modulePath, exportName, opts = {}) {
  return onCall({ region: 'asia-northeast1', cors: true, ...opts }, async (req) => {
    const m = await import(modulePath);
    return m[exportName](req);
  });
}

// Firebase Admin初期化
initializeApp({
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

/**
 * GA4データ取得 Callable Function
 * フロントエンドから呼び出されるAPI
 */
export const fetchGA4Data = lazyCallable('./callable/fetchGA4Data.js', 'fetchGA4DataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4月次データ取得 Callable Function
 * 過去13ヶ月の月次データを取得
 */
export const fetchGA4MonthlyData = lazyCallable('./callable/fetchGA4MonthlyData.js', 'fetchGA4MonthlyDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4月次コンバージョンデータ取得 Callable Function
 * コンバージョンイベントの月次推移データを取得
 */
export const fetchGA4MonthlyConversionData = lazyCallable('./callable/fetchGA4MonthlyConversionData.js', 'fetchGA4MonthlyConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4日別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 */
export const fetchGA4DailyConversionData = lazyCallable('./callable/fetchGA4DailyConversionData.js', 'fetchGA4DailyConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4曜日×時間帯別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 */
export const fetchGA4WeeklyConversionData = lazyCallable('./callable/fetchGA4WeeklyConversionData.js', 'fetchGA4WeeklyConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4時間帯別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 */
export const fetchGA4HourlyConversionData = lazyCallable('./callable/fetchGA4HourlyConversionData.js', 'fetchGA4HourlyConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4チャネル別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 */
export const fetchGA4ChannelConversionData = lazyCallable('./callable/fetchGA4ChannelConversionData.js', 'fetchGA4ChannelConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4参照元/メディア別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 */
export const fetchGA4ReferralConversionData = lazyCallable('./callable/fetchGA4ReferralConversionData.js', 'fetchGA4ReferralConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4ランディングページ別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 */
export const fetchGA4LandingPageConversionData = lazyCallable('./callable/fetchGA4LandingPageConversionData.js', 'fetchGA4LandingPageConversionDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4逆算フローデータ取得 Callable Function
 * フォームページからのコンバージョンフローデータを取得
 */
export const fetchGA4ReverseFlowData = lazyCallable('./callable/fetchGA4ReverseFlowData.js', 'fetchGA4ReverseFlowDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GA4ページパス一覧取得 Callable Function
 * 逆算フローのフォームページパス候補を取得
 */
export const fetchGA4PagePaths = lazyCallable('./callable/fetchGA4PagePaths.js', 'fetchGA4PagePathsCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * GA4ページ遷移分析 Callable Function
 * 特定ページの流入元、遷移先、離脱率を取得
 */
export const fetchGA4PageTransition = lazyCallable('./callable/fetchGA4PageTransition.js', 'fetchGA4PageTransitionCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * GSCデータ取得 Callable Function
 * フロントエンドから呼び出されるAPI
 */
export const fetchGSCData = lazyCallable('./callable/fetchGSCData.js', 'fetchGSCDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * スクリーンショット取得 Callable Function
 * サイトのスクリーンショットを自動取得
 */
export const captureScreenshot = lazyCallable('./callable/captureScreenshot.js', 'captureScreenshotCallable', { memory: '2GiB', timeoutSeconds: 300 });

/**
 * AI要約生成 Callable Function
 * Gemini APIを使用してGA4データの要約を生成
 */
export const generateAISummary = lazyCallable('./callable/generateAISummary.js', 'generateAISummaryCallable', { memory: '512MiB', timeoutSeconds: 60, secrets: ['GEMINI_API_KEY'] });

/**
 * サイト診断 Callable Function
 * PageSpeed Insights API + 独自データでサイト健全度を診断
 */
export const runSiteDiagnosis = lazyCallable('./callable/runSiteDiagnosis.js', 'runSiteDiagnosisCallable', { memory: '512MiB', timeoutSeconds: 120, secrets: ['PSI_API_KEY'] });

/**
 * エクスポート使用回数インクリメント Callable Function
 */
export const incrementExportUsage = lazyCallable('./callable/incrementExportUsage.js', 'incrementExportUsageCallable');

/**
 * メタデータ取得 Callable Function（遅延読み込み）
 */
export const fetchMetadata = onCall({
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1',
  cors: true,
}, async (data, context) => {
  const { fetchMetadataCallable } = await import('./callable/fetchMetadata.js');
  return fetchMetadataCallable({ data, auth: context?.auth });
});

/**
 * メタデータ・スクリーンショット再取得（遅延読み込み）
 */
export const refreshSiteMetadataAndScreenshots = onCall({
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'asia-northeast1',
  cors: true,
}, async (data, context) => {
  const { refreshSiteMetadataAndScreenshotsCallableWithCatch } = await import('./callable/refreshSiteMetadataAndScreenshots.js');
  return refreshSiteMetadataAndScreenshotsCallableWithCatch({ data, auth: context?.auth });
});

/**
 * GA4ユーザー属性データ取得 Callable Function
 * ユーザーの性別、年齢、デバイス、地域などのデモグラフィックデータを取得
 */
export const fetchGA4UserDemographics = lazyCallable('./callable/fetchGA4UserDemographics.js', 'fetchGA4UserDemographicsCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * OAuth 2.0 認可コード交換 Callable Function
 * OAuth 2.0の認可コードをアクセストークンとリフレッシュトークンに交換
 */
export const exchangeOAuthCode = lazyCallable('./callable/exchangeOAuthCode.js', 'exchangeOAuthCodeCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * キャッシュクリーンアップ Scheduled Function
 * 毎日午前3時（JST）に実行
 */
export const cleanupCache = onSchedule({
  schedule: '0 3 * * *',
  timeZone: 'Asia/Tokyo',
  memory: '256MiB',
  timeoutSeconds: 300,
  region: 'asia-northeast1',
}, async (event) => {
  const m = await import('./scheduled/cleanupCache.js');
  return m.cleanupCacheScheduled(event);
});

/**
 * Googleスプレッドシートエクスポート Scheduled Function
 * 毎日午前4時（JST）に実行
 * 全サイトの前月データをスプレッドシートに自動エクスポート
 */
export const exportToSheets = onSchedule({
  schedule: '0 4 * * *',
  timeZone: 'Asia/Tokyo',
  memory: '512MiB',
  timeoutSeconds: 540,
  region: 'asia-northeast1',
}, async (event) => {
  const m = await import('./scheduled/exportToSheets.js');
  return m.exportToSheetsScheduled(event);
});

/**
 * サイト登録完了時トリガー
 * サイト登録完了時（setupCompleted: false → true）に過去3ヶ月分のデータをスプレッドシートに自動エクスポート
 */
export const siteCreatedSheetsExport = onDocumentWritten({
  document: 'sites/{siteId}',
  region: 'asia-northeast1',
  memory: '2GiB',
  timeoutSeconds: 540,
}, async (event) => {
  const m = await import('./triggers/onSiteCreated.js');
  return m.onSiteCreatedTrigger(event);
});

/**
 * サイトメタデータ自動取得トリガー（遅延読み込み）
 * サイト作成・URL更新時にメタデータとスクリーンショットを自動取得
 */
export const onSiteChanged = onDocumentWritten(
  {
    document: 'sites/{siteId}',
    region: 'asia-northeast1',
    memory: '2GiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    const { onSiteChangedHandler } = await import('./triggers/onSiteChanged.js');
    return onSiteChangedHandler(event);
  }
);

/**
 * スクレイピングジョブ作成トリガー（遅延読み込み）
 * 手動「スクレイピング開始」で scrapingJobs に追加されたジョブをバックグラウンド実行
 */
export const onScrapingJobCreated = onDocumentCreated(
  {
    document: 'scrapingJobs/{jobId}',
    region: 'asia-northeast1',
    memory: '2GiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    const { onScrapingJobCreatedHandler } = await import('./triggers/onScrapingJobCreated.js');
    return onScrapingJobCreatedHandler(event);
  }
);

/**
 * アップグレードお問い合わせ作成トリガー（遅延読み込み）
 * upgradeInquiries に追加されたらメール送信
 */
export const onUpgradeInquiryCreated = onDocumentCreated(
  {
    document: 'upgradeInquiries/{inquiryId}',
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (event) => {
    const { onUpgradeInquiryCreatedHandler } = await import('./triggers/onUpgradeInquiryCreated.js');
    return onUpgradeInquiryCreatedHandler(event);
  }
);

/**
 * ユーザー新規登録トリガー（遅延読み込み）
 * users ドキュメント作成時にウェルカムメールを送信
 */
export const onUserCreated = onDocumentCreated(
  {
    document: 'users/{uid}',
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (event) => {
    const { onUserCreatedHandler } = await import('./triggers/onUserCreated.js');
    return onUserCreatedHandler(event);
  }
);

/**
 * 月次制限リセット Scheduled Function（遅延読み込み）
 */
export const resetMonthlyLimits = onSchedule({
  schedule: '0 0 1 * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async (event) => {
  const m = await import('./scheduled/resetMonthlyLimits.js');
  return m.resetMonthlyLimitsScheduled(event);
});

/**
 * 管理者ダッシュボード統計データ取得 Callable Function
 * 管理者のみアクセス可能
 */
export const getAdminStats = lazyCallable('./callable/admin/getAdminStats.js', 'getAdminStatsCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 管理者用ユーザー一覧取得 Callable Function
 * 検索、フィルタ、ページネーション対応
 */
export const getAdminUsers = lazyCallable('./callable/admin/getAdminUsers.js', 'getAdminUsersCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 管理者用ユーザープラン変更 Callable Function
 * プラン変更 + 履歴記録 + 使用制限リセット
 */
export const updateUserPlan = lazyCallable('./callable/admin/updateUserPlan.js', 'updateUserPlanCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者用ユーザー詳細取得 Callable Function
 * ユーザーの詳細情報、サイト一覧、プラン履歴を取得
 */
export const getUserDetail = lazyCallable('./callable/admin/getUserDetail.js', 'getUserDetailCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 管理者用アクティビティログ取得 Callable Function
 * 管理者の操作履歴を取得（フィルタ、ページネーション対応）
 */
export const getActivityLogs = lazyCallable('./callable/admin/getActivityLogs.js', 'getActivityLogsCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * ユーザー登録ログ記録 Callable Function
 * ユーザー登録時のアクティビティログを記録
 */
export const logUserRegistration = lazyCallable('./callable/logUserRegistration.js', 'logUserRegistrationCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * ユーザーログインログ記録 Callable Function
 * ユーザーログイン時のアクティビティログを記録
 */
export const logUserLogin = lazyCallable('./callable/logUserLogin.js', 'logUserLoginCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * サイト作成ログ記録 Callable Function
 * サイト作成時のアクティビティログを記録
 */
export const logSiteCreated = lazyCallable('./callable/logSiteCreated.js', 'logSiteCreatedCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * サイト削除ログ記録 Callable Function
 * サイト削除時のアクティビティログを記録
 */
export const logSiteDeleted = lazyCallable('./callable/logSiteDeleted.js', 'logSiteDeletedCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const deleteSite = lazyCallable('./callable/deleteSite.js', 'deleteSiteCallable', { memory: '512MiB', timeoutSeconds: 120 });
export const deleteAccount = lazyCallable('./callable/deleteAccount.js', 'deleteAccountCallable', { memory: '512MiB', timeoutSeconds: 120 });

/**
 * 管理者用サイト一覧取得 Callable Function
 * 全サイトの一覧を取得（検索、フィルタ、ページネーション対応）
 */
export const getAdminSites = lazyCallable('./callable/admin/getAdminSites.js', 'getAdminSitesCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 管理者用サイト詳細取得 Callable Function
 * サイトの詳細情報、データ収集状況、AI使用状況を取得
 */
export const getSiteDetail = lazyCallable('./callable/admin/getSiteDetail.js', 'getSiteDetailCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * ユーザー用サイト詳細取得（オーナーまたは同一アカウントメンバー）
 */
export const getMySiteDetail = lazyCallable('./callable/getMySiteDetail.js', 'getMySiteDetailCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者用個別制限設定 Callable Function
 * 特定ユーザーに個別の制限を設定
 */
export const setCustomLimits = lazyCallable('./callable/admin/setCustomLimits.js', 'setCustomLimitsCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者用個別制限取得 Callable Function
 * ユーザーの個別制限を取得
 */
export const getCustomLimits = lazyCallable('./callable/admin/getCustomLimits.js', 'getCustomLimitsCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者用個別制限削除 Callable Function
 * ユーザーの個別制限を削除
 */
export const removeCustomLimits = lazyCallable('./callable/admin/removeCustomLimits.js', 'removeCustomLimitsCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者用ユーザー有効サイト設定 Callable Function
 * ダウングレード時の有効サイトを管理者が変更
 */
export const setUserActiveSites = lazyCallable('./callable/admin/setUserActiveSites.js', 'setUserActiveSitesCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者一覧取得 Callable Function
 * すべての管理者情報を取得
 */
export const getAdminList = lazyCallable('./callable/admin/getAdminList.js', 'getAdminListCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者ロール変更 Callable Function
 * 管理者のロール（admin/editor/viewer）を変更
 */
export const updateAdminRole = lazyCallable('./callable/admin/updateAdminRole.js', 'updateAdminRoleCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者追加 Callable Function
 * 新しい管理者を追加
 */
export const addAdmin = lazyCallable('./callable/admin/addAdmin.js', 'addAdminCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者削除 Callable Function
 * 管理者を削除
 */
export const deleteAdmin = lazyCallable('./callable/admin/deleteAdmin.js', 'deleteAdminCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * ユーザー削除 Callable Function
 * ユーザーとすべての関連データを削除
 */
export const deleteUser = lazyCallable('./callable/admin/deleteUser.js', 'deleteUserCallable', { memory: '512MiB', timeoutSeconds: 120 });

/**
 * 管理者ユーザー作成 Callable Function
 * Firebase Auth + Firestoreにユーザーを作成
 */
export const adminCreateUser = lazyCallable('./callable/admin/adminCreateUser.js', 'adminCreateUserCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者サイト作成 Callable Function
 * 対象ユーザーに代わってサイトを登録
 */
export const adminCreateSite = lazyCallable('./callable/admin/adminCreateSite.js', 'adminCreateSiteCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const adminDeleteSite = lazyCallable('./callable/admin/adminDeleteSite.js', 'adminDeleteSiteCallable', { memory: '512MiB', timeoutSeconds: 120 });

/**
 * GA4上位100ページスクレイピング Callable Function（遅延読み込み）
 */
export const scrapeTop100Pages = onCall({
  region: 'asia-northeast1',
  memory: '256MiB',
  timeoutSeconds: 30,
  cors: true,
}, async (request) => {
  const { scrapeTop100PagesHandler } = await import('./callable/scrapeTop100Pages.js');
  return scrapeTop100PagesHandler(request);
});

/**
 * テストメール送信 Callable Function（2nd Gen）
 * ※ 既存が 1st Gen の場合は一度 npm run deploy:functions で削除→デプロイすること
 */
export const sendTestReportEmail = lazyCallable('./callable/sendTestReportEmail.js', 'sendTestReportEmailHandler', { memory: '256MiB', timeoutSeconds: 60 });

/**
 * サイト改善相談フォーム送信 Callable Function
 * 宛先: info@grow-reporter.com
 */
export const submitImprovementConsultation = lazyCallable('./callable/submitImprovementConsultation.js', 'submitImprovementConsultationCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * プランアップグレードお問い合わせ送信
 * 宛先: info@grow-reporter.com
 */
export const submitUpgradeInquiry = lazyCallable('./callable/submitUpgradeInquiry.js', 'submitUpgradeInquiryCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 管理者用：全サイト一括AI分析生成
 * GA4データ取得 → Gemini AI → キャッシュ保存
 */
export const batchGenerateAISummaries = lazyCallable('./callable/admin/batchGenerateAISummaries.js', 'batchGenerateAISummariesCallable', { memory: '1GiB', timeoutSeconds: 540, secrets: ['GEMINI_API_KEY'] });

/**
 * ページスクレイピングデータ定期更新 Scheduled Function
 * 毎日3時実行、最終スクレイピングから30日以上経過したサイトを1サイトずつ再スクレイピング
 */
/**
 * 週次レポート送信 Scheduled Function（2nd Gen、遅延読み込み）
 * Cloud Schedulerから定期実行
 */
export const sendWeeklyReports = onSchedule({
  schedule: '0 9 * * 1',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '512MiB',
  timeoutSeconds: 540,
}, async (event) => {
  const m = await import('./scheduled/sendWeeklyReports.js');
  return m.sendWeeklyReportsHandler(event);
});

/**
 * 月次レポート送信 Scheduled Function（2nd Gen、遅延読み込み）
 * Cloud Schedulerから定期実行
 */
export const sendMonthlyReports = onSchedule({
  schedule: '0 9 1 * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '512MiB',
  timeoutSeconds: 540,
}, async (event) => {
  const m = await import('./scheduled/sendMonthlyReports.js');
  return m.sendMonthlyReportsHandler(event);
});

/**
 * メトリクスアラート検知（遅延読み込み）
 */
export const checkMetricAlertsScheduled = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '512MiB',
  timeoutSeconds: 540,
  secrets: ['GEMINI_API_KEY'],
}, async (event) => {
  const m = await import('./scheduled/checkMetricAlerts.js');
  return m.runCheckMetricAlerts();
});

/**
 * メンバー招待 Callable Function
 * アカウントオーナーがメンバーを招待
 */
export const inviteMember = lazyCallable('./callable/inviteMember.js', 'inviteMemberCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 招待承認 Callable Function
 * 招待されたユーザーが招待を承認
 */
export const acceptInvitation = lazyCallable('./callable/acceptInvitation.js', 'acceptInvitationCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * トークンで招待情報取得 Callable Function（未ログインの招待画面用）
 */
export const getInvitationByToken = lazyCallable('./callable/getInvitationByToken.js', 'getInvitationByTokenCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 招待再送信 Callable Function
 * 保留中の招待を再送信
 */
export const resendInvitation = lazyCallable('./callable/resendInvitation.js', 'resendInvitationCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 招待取り消し Callable Function
 * オーナーが保留中の招待を取り消し（削除）
 */
export const cancelInvitation = lazyCallable('./callable/cancelInvitation.js', 'cancelInvitationCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * メンバー削除 Callable Function
 * アカウントオーナーがメンバーを削除
 */
export const removeMember = lazyCallable('./callable/removeMember.js', 'removeMemberCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * メンバー権限変更 Callable Function
 * アカウントオーナーがメンバーの権限を変更
 */
export const updateMemberRole = lazyCallable('./callable/updateMemberRole.js', 'updateMemberRoleCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * オーナー権限譲渡 Callable Function
 * 現在のオーナーが他のメンバーにオーナー権限を譲渡
 */
export const transferOwnership = lazyCallable('./callable/transferOwnership.js', 'transferOwnershipCallable', { memory: '256MiB', timeoutSeconds: 60 });

/**
 * データマイグレーション実行
 */
export const migrateData = lazyCallable('./callable/migrateData.js', 'migrateDataCallable', { memory: '512MiB', timeoutSeconds: 540 });

/**
 * アカウントメンバー一覧取得
 */
export const getAccountMembers = lazyCallable('./callable/getAccountMembers.js', 'getAccountMembersCallable', { memory: '256MiB', timeoutSeconds: 60 });

/**
 * ヒートマップ設定取得 HTTP エンドポイント
 * トラッキングスクリプト（gr-heatmap.js）がサンプリングレートと有効状態を取得
 */
export const heatmapConfig = onRequest(
  { region: 'asia-northeast1', cors: true, memory: '128MiB', timeoutSeconds: 5 },
  async (req, res) => {
    const m = await import('./http/heatmapConfig.js');
    return m.heatmapConfigHandler(req, res);
  }
);

/**
 * ヒートマップデータ収集 HTTP エンドポイント
 * 外部サイトのトラッキングスクリプトからクリック・スクロールデータを受信
 */
export const collectHeatmapData = onRequest(
  { region: 'asia-northeast1', cors: true, memory: '256MiB', timeoutSeconds: 10 },
  async (req, res) => {
    const m = await import('./http/collectHeatmapData.js');
    return m.collectHeatmapDataHandler(req, res);
  }
);

/**
 * ヒートマップ用フルページスクリーンショット取得
 * ヒートマップの背景画像としてページ全体をキャプチャ
 */
export const captureHeatmapScreenshot = lazyCallable(
  './callable/captureHeatmapScreenshot.js',
  'captureHeatmapScreenshotCallable',
  { memory: '2GiB', timeoutSeconds: 300 }
);
