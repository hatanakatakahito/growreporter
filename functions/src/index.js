import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten, onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';

/**
 * 共通シークレット集合
 *
 * これらは多くの Callable / Trigger / Scheduled で必要になるため、
 * lazyCallable のデフォルトとしてバインドしておく。
 *
 * 個別の Function で追加シークレットが必要な場合は opts.secrets で渡せる
 * （重複は自動で除外される）。
 *
 * 各シークレット値は Firebase Secret Manager で管理:
 *   firebase functions:secrets:set CF_PROXY_SECRET
 *   firebase functions:secrets:set GOOGLE_CLIENT_SECRET
 *   firebase functions:secrets:set SES_SMTP_USER
 *   firebase functions:secrets:set SES_SMTP_PASSWORD
 */
const SHARED_SECRETS = [
  'CF_PROXY_SECRET',       // Cloudflare Workers proxy 認証
  'GOOGLE_CLIENT_SECRET',  // OAuth 2.0 (GA4/GSC) トークン交換・更新
  'SES_SMTP_USER',         // AWS SES SMTP 認証 (メール送信)
  'SES_SMTP_PASSWORD',     // AWS SES SMTP 認証 (メール送信)
];

// デプロイ時のロードタイムアウト回避: callable はすべて遅延読み込み
function lazyCallable(modulePath, exportName, opts = {}) {
  const { secrets: extraSecrets = [], ...restOpts } = opts;
  const mergedSecrets = [...new Set([...SHARED_SECRETS, ...extraSecrets])];
  return onCall({
    region: 'asia-northeast1',
    cors: true,
    ...restOpts,
    secrets: mergedSecrets,
  }, async (req) => {
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
 * GA4 ユーザージャーニーデータ取得 Callable Function
 * 5層フロー (流入元 → KW → LP → 中間 → 結果) を GA4 + GSC から構築
 */
export const fetchGA4UserJourneyData = lazyCallable('./callable/fetchGA4UserJourneyData.js', 'fetchGA4UserJourneyDataCallable', { memory: '512MiB', timeoutSeconds: 120, secrets: ['GEMINI_API_KEY'] });

/**
 * GSCデータ取得 Callable Function
 * フロントエンドから呼び出されるAPI
 */
export const fetchGSCData = lazyCallable('./callable/fetchGSCData.js', 'fetchGSCDataCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 流入キーワード V2: ファネル分類 + クラスタリング + CV 貢献スコア計算
 * Gemini API を使うため secrets / timeout は十分に確保
 */
export const fetchGSCKeywordsV2Data = lazyCallable(
  './callable/fetchGSCKeywordsV2Data.js',
  'fetchGSCKeywordsV2DataCallable',
  { memory: '1GiB', timeoutSeconds: 540, secrets: ['GEMINI_API_KEY'] }
);

/**
 * 流入キーワード V2: AI 再分類（オンデマンド）
 */
export const classifyKeywordsV2 = lazyCallable(
  './callable/classifyKeywordsV2.js',
  'classifyKeywordsV2Callable',
  { memory: '256MiB', timeoutSeconds: 60 }
);

/**
 * 流入キーワード V2: Title/Description 改善案 3 パターン生成（オンデマンド）
 */
export const generateKeywordTitleSuggestionsV2 = lazyCallable(
  './callable/generateKeywordTitleSuggestionsV2.js',
  'generateKeywordTitleSuggestionsV2Callable',
  { memory: '512MiB', timeoutSeconds: 60, secrets: ['GEMINI_API_KEY'] }
);

/**
 * 改善モーダル Before 枠用のオンデマンドスクショ取得 (CF Worker Browser Rendering 経由)
 */
export const captureBeforeScreenshot = lazyCallable('./callable/captureBeforeScreenshot.js', 'captureBeforeScreenshotCallable', { memory: '512MiB', timeoutSeconds: 120, secrets: ['CF_PROXY_SECRET'] });

/**
 * サイトPV上位10ページのBefore予熱（方針選択モーダル開時に呼出）
 */
export const preheatSitePageScreenshots = lazyCallable('./callable/preheatSitePageScreenshots.js', 'preheatSitePageScreenshotsCallable', { memory: '512MiB', timeoutSeconds: 540, secrets: ['CF_PROXY_SECRET'] });


/**
 * AI要約生成 Callable Function
 * Gemini APIを使用してGA4データの要約を生成
 */
export const generateAISummary = lazyCallable('./callable/generateAISummary.js', 'generateAISummaryCallable', { memory: '512MiB', timeoutSeconds: 60, secrets: ['GEMINI_API_KEY'] });

/**
 * URL からタクソノミー V2 (businessModel / industryMajor / industryMinor / siteRole) を
 * Gemini で自動判定する Callable。サイト登録時の入力補助・移行スクリプト両方から利用する。
 */
export const inferSiteTaxonomy = lazyCallable('./callable/inferSiteTaxonomy.js', 'inferSiteTaxonomyCallable', { memory: '512MiB', timeoutSeconds: 120, secrets: ['GEMINI_API_KEY'] });

/**
 * エクスポート使用回数インクリメント Callable Function
 */
export const incrementExportUsage = lazyCallable('./callable/incrementExportUsage.js', 'incrementExportUsageCallable');

/**
 * メタデータ取得 Callable Function（遅延読み込み）
 */
export const fetchMetadata = onCall({
  memory: '2GiB',
  timeoutSeconds: 120,
  region: 'asia-northeast1',
  cors: true,
  secrets: ['CF_PROXY_SECRET'],
}, async (request) => {
  const { fetchMetadataCallable } = await import('./callable/fetchMetadata.js');
  return fetchMetadataCallable(request);
});

/**
 * メタデータ・スクリーンショット再取得（遅延読み込み）
 */
export const refreshSiteMetadataAndScreenshots = onCall({
  memory: '1GiB',
  timeoutSeconds: 180,
  region: 'asia-northeast1',
  cors: true,
  // CF_PROXY_SECRET: Worker proxy 経由メタデータ取得 + Browser Rendering スクショ取得
  secrets: ['CF_PROXY_SECRET'],
}, async (request) => {
  const { refreshSiteMetadataAndScreenshotsCallableWithCatch } = await import('./callable/refreshSiteMetadataAndScreenshots.js');
  return refreshSiteMetadataAndScreenshotsCallableWithCatch(request);
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
 * レート制限イベントの古いエントリをクリーンアップ (Phase 4-A-2 補完)
 * 毎日午前3時30分（JST）に実行。
 * rate_limits/{uid_action}/events/{eventId} で 24h より古い document を削除し、
 * Firestore コスト増を抑える。
 */
export const cleanupRateLimits = onSchedule({
  schedule: '30 3 * * *',
  timeZone: 'Asia/Tokyo',
  memory: '256MiB',
  timeoutSeconds: 300,
  region: 'asia-northeast1',
}, async () => {
  const m = await import('./scheduled/cleanupRateLimits.js');
  return m.cleanupRateLimitsHandler();
});

/**
 * サイト登録完了時トリガー
 * setupCompleted: false → true の変更を受けて、
 *   - 上位100ページスクレイピングジョブを投入
 *   - PC/モバイルのスクリーンショットを即時取得
 *   - サイト登録完了メールを送信
 */
export const siteCreatedSheetsExport = onDocumentWritten({
  document: 'sites/{siteId}',
  region: 'asia-northeast1',
  memory: '2GiB',
  timeoutSeconds: 540,
  // CF_PROXY_SECRET: スクレイピング/メタデータ/Browser Rendering スクショ取得 (Worker proxy 経由)
  // GOOGLE_CLIENT_SECRET: GA4/GSC OAuth リフレッシュ (tokenManager 経由)
  // SES_SMTP_USER/PASSWORD: 完了通知メール送信
  secrets: ['CF_PROXY_SECRET', 'GOOGLE_CLIENT_SECRET', 'SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
}, async (event) => {
  const m = await import('./triggers/onSiteCreated.js');
  return m.onSiteCreatedTrigger(event);
});

// onSiteChanged は廃止（v5.6.1）
// メタデータ・スクショ取得は onScrapingJobCreated に統合済み
// 手動再取得は refreshSiteMetadataAndScreenshots で対応

/**
 * スクレイピングジョブ作成トリガー（遅延読み込み）
 * 手動「スクレイピング開始」で scrapingJobs に追加されたジョブをバックグラウンド実行
 */
export const onScrapingJobCreated = onDocumentCreated(
  {
    document: 'scrapingJobs/{jobId}',
    region: 'asia-northeast1',
    memory: '16GiB',
    cpu: 8,
    timeoutSeconds: 540,
    maxInstances: 3,
    concurrency: 1,
    // GEMINI_API_KEY: スクレイピング完了時のタクソノミー V2 自動判定(Phase E)で使用
    // CF_PROXY_SECRET: Worker proxy 経由のスクレイピングフォールバック + Browser Rendering スクショ取得
    // GOOGLE_CLIENT_SECRET: GA4 fetch 内部呼出時に使用される可能性
    secrets: ['GEMINI_API_KEY', 'CF_PROXY_SECRET', 'GOOGLE_CLIENT_SECRET'],
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
    timeoutSeconds: 60,
    // BOARD: 見積/請求書連携 / SES: 通知メール送信
    secrets: ['BOARD_API_KEY', 'BOARD_API_TOKEN', 'SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
  },
  async (event) => {
    const { onUpgradeInquiryCreatedHandler } = await import('./triggers/onUpgradeInquiryCreated.js');
    return onUpgradeInquiryCreatedHandler(event);
  }
);

/**
 * 意見箱（userFeedback）作成トリガー（遅延読み込み）
 * userFeedback に追加されたら info@grow-reporter.com へメール送信
 */
export const onUserFeedbackCreated = onDocumentCreated(
  {
    document: 'userFeedback/{feedbackId}',
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
  },
  async (event) => {
    const { onUserFeedbackCreatedHandler } = await import('./triggers/onUserFeedbackCreated.js');
    return onUserFeedbackCreatedHandler(event);
  }
);

/**
 * サイト削除トリガー（遅延読み込み）
 * sites/{siteId} 削除時に viewer の allowedSiteIds から自動除去
 */
export const onSiteDeleted = onDocumentDeleted(
  {
    document: 'sites/{siteId}',
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const { onSiteDeletedHandler } = await import('./triggers/onSiteDeleted.js');
    return onSiteDeletedHandler(event);
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
    secrets: ['SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
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
  return m.resetMonthlyLimitsHandler(event);
});

/**
 * 月次全サイト再スクレイピング Scheduled Function
 * 毎月1日 2:00に全サイトのスクレイピングジョブをキュー登録
 * （スクレイピング完了後にスクリーンショット撮影も自動実行される）
 */
export { monthlyRescrapeAllSites } from './scheduled/monthlyRescrapeAllSites.js';
export { monthlyKeywordReclassify } from './scheduled/monthlyKeywordReclassify.js';

/**
 * 管理者ダッシュボード統計データ取得 Callable Function
 * 管理者のみアクセス可能
 */
export const getAdminStats = lazyCallable('./callable/admin/getAdminStats.js', 'getAdminStatsCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 管理者用問い合わせ一覧取得
 */
export const getUpgradeInquiries = lazyCallable('./callable/admin/getUpgradeInquiries.js', 'getUpgradeInquiriesCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * 問い合わせステータス更新（active時にプラン自動変更）
 */
export const updateInquiryStatus = lazyCallable('./callable/admin/updateInquiryStatus.js', 'updateInquiryStatusCallable');

/**
 * board見積作成リトライ
 */
export const retryBoardEstimate = lazyCallable('./callable/admin/retryBoardEstimate.js', 'retryBoardEstimateCallable', { timeoutSeconds: 60, secrets: ['BOARD_API_KEY', 'BOARD_API_TOKEN'] });

/**
 * 問い合わせ削除（admin権限のみ）
 */
export const deleteUpgradeInquiries = lazyCallable('./callable/admin/deleteUpgradeInquiries.js', 'deleteUpgradeInquiriesCallable');

/**
 * board同期（手動ボタン用）
 */
export const syncBoardInquiry = lazyCallable('./callable/admin/syncBoardInquiry.js', 'syncBoardInquiryCallable', { timeoutSeconds: 60, secrets: ['BOARD_API_KEY', 'BOARD_API_TOKEN'] });

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
 * アカウント情報メール送信 Callable Function（§16）
 * admin が任意のタイミングで対象ユーザーにアカウント情報メールを送信する。
 * パスワードリセットリンク経由（Firebase Auth）。
 * SES SMTP 認証は SHARED_SECRETS で自動付与。
 */
export const sendAccountCredentialsEmail = lazyCallable('./callable/admin/sendAccountCredentialsEmail.js', 'sendAccountCredentialsEmailCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * パスワード再設定メール送信 Callable Function（顧客自己申請・認証不要）
 * Firebase Console テンプレート (https://growgroupreporter.firebaseapp.com/__/auth/action) を経由せず、
 * 自社 SES + 自社ブランド UI (grow-reporter.com/auth/action) でパスワード再設定を完結させる。
 * 列挙攻撃対策: ユーザー存在有無・内部エラーに関わらず常に success:true を返す。
 * SES SMTP / GOOGLE_CLIENT_SECRET は SHARED_SECRETS で自動付与。
 */
export const sendPasswordResetByEmail = lazyCallable('./callable/sendPasswordResetByEmail.js', 'sendPasswordResetByEmailCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * board 取り込み Callable Function（§15）
 * board で先行作成された案件・見積を grow-reporter の upgradeInquiries に取り込む。
 * dryRun=true で preview 取得（DB 書き込みなし）、false で本番取り込み。
 * board API 呼出のため timeout を長めに。
 */
export const importBoardProject = lazyCallable('./callable/admin/importBoardProject.js', 'importBoardProjectCallable', {
  memory: '256MiB',
  timeoutSeconds: 60,
  secrets: ['BOARD_API_KEY', 'BOARD_API_TOKEN'],
});

/**
 * inquiry とユーザーの後付け紐付け Callable Function（§15 Phase 2）
 * uid=null で取り込まれた inquiry に、後から admin が uid を紐付ける。
 */
export const linkInquiryToUser = lazyCallable('./callable/admin/linkInquiryToUser.js', 'linkInquiryToUserCallable', { memory: '256MiB', timeoutSeconds: 30 });

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
 * 管理者→顧客サイト所有権移管 Callable
 * 当社代行作成サイトを顧客 (新規 or 既存) に引き渡す。OAuth トークンは admin 保持で代行運用継続。
 */
export const adminTransferSiteOwnership = lazyCallable(
  './callable/admin/adminTransferSiteOwnership.js',
  'adminTransferSiteOwnershipCallable',
  { memory: '512MiB', timeoutSeconds: 120, secrets: ['SES_SMTP_USER', 'SES_SMTP_PASSWORD'] }
);

/**
 * 管理者←顧客サイト所有権取り戻し Callable
 * 誤操作や顧客退会対応時に admin がサイトを取り戻す。
 */
export const adminReverseSiteOwnership = lazyCallable(
  './callable/admin/adminReverseSiteOwnership.js',
  'adminReverseSiteOwnershipCallable',
  { memory: '512MiB', timeoutSeconds: 120 }
);

/**
 * 顧客 OAuth 切替 Callable
 * 当社代行運用中のサイトを顧客自身の OAuth で再連携する。
 */
export const claimSiteTokenOwnership = lazyCallable(
  './callable/claimSiteTokenOwnership.js',
  'claimSiteTokenOwnershipCallable',
  { memory: '256MiB', timeoutSeconds: 30 }
);

/**
 * タクソノミー V2 の手動再分類（移行スクリプト後の needsManualReclassify=true サイト向け）
 */
export const adminUpdateSiteTaxonomy = lazyCallable('./callable/admin/adminUpdateSiteTaxonomy.js', 'adminUpdateSiteTaxonomyCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 改善ロジック統一化プラン (Phase 5-A) のマイグレーション運用ツール:
 *   全サイトの Before スクショを render+shot ベースで一括再撮影。
 *   timeoutSeconds: 3600 (60min)、サイト間で 30s stagger。
 *   進捗は adminJobs/{jobId} を参照。
 */
export const regenerateAllSiteScreenshots = lazyCallable(
  './callable/admin/regenerateAllSiteScreenshots.js',
  'regenerateAllSiteScreenshotsCallable',
  { memory: '512MiB', timeoutSeconds: 3600, secrets: ['CF_PROXY_SECRET'] }
);

/**
 * GA4上位100ページスクレイピング Callable Function（遅延読み込み）
 */
export const scrapeTop100Pages = onCall({
  region: 'asia-northeast1',
  memory: '256MiB',
  timeoutSeconds: 30,
  cors: true,
  // CF_PROXY_SECRET: スクレイピング Worker proxy 経由フォールバック
  // GOOGLE_CLIENT_SECRET: GA4 上位ページ取得時 OAuth 経由
  secrets: ['CF_PROXY_SECRET', 'GOOGLE_CLIENT_SECRET'],
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
 * 改善案生成 Callable Function（サーバー側一元化）
 * データ取得→AI生成→重複排除→保存を一括実行
 */
export const generateImprovements = lazyCallable('./callable/generateImprovements.js', 'generateImprovementsCallable', { memory: '2GiB', timeoutSeconds: 300, secrets: ['GEMINI_API_KEY'] });

/**
 * 手動改善案 AI 補完 Callable Function
 * ユーザー入力（対象 + 改善方向）から AI が完全な改善案 JSON を生成
 * Firestore 保存はクライアント側で実行
 */
export const expandManualImprovement = lazyCallable('./callable/expandManualImprovement.js', 'expandManualImprovementCallable', { memory: '512MiB', timeoutSeconds: 180, secrets: ['GEMINI_API_KEY', 'CF_PROXY_SECRET'] });

/**
 * 改善効果測定 Before指標スナップショット取得
 * 改善タスク完了時にGA4/GSCのBefore期間データを自動取得・保存
 */
export const fetchBeforeMetrics = lazyCallable('./callable/fetchBeforeMetrics.js', 'fetchBeforeMetricsCallable', { memory: '512MiB', timeoutSeconds: 60 });
export const retryEffectMeasurement = lazyCallable('./callable/retryEffectMeasurement.js', 'retryEffectMeasurementCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const scheduleRemeasurement = lazyCallable('./callable/scheduleRemeasurement.js', 'scheduleRemeasurementCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * 実装検証用 Before スナップショット取得（status → in_progress 遷移時に呼ぶ）
 * CF Worker Browser Rendering 経由でスクショ取得
 */
export const captureBeforeImplementationSnapshot = lazyCallable(
  './callable/captureBeforeImplementationSnapshot.js',
  'captureBeforeImplementationSnapshotCallable',
  { memory: '2GiB', timeoutSeconds: 120, secrets: ['CF_PROXY_SECRET'] }
);

/**
 * 改善モックアップ生成 Callable Function（Gemini 2.5 Flash）
 * 手動トリガー：改善箇所のみの部分HTML生成
 */
// RENDER_SECRET: Cloud Run render-fallback service の認証 (L2 フォールバック用)
export const generateImprovementMockup = lazyCallable('./callable/generateImprovementMockup.js', 'generateImprovementMockupCallable', { memory: '512MiB', timeoutSeconds: 540, secrets: ['GEMINI_API_KEY', 'CF_PROXY_SECRET', 'RENDER_SECRET'] });

/**
 * 改善モックアップ HTML 配信プロキシ (HTTP, public)
 * Firebase Hosting の rewrite (firebase.json: /page-mockups/** → serveMockup) で
 * grow-reporter.com 配下の URL として Storage の HTML を配信する
 *
 * invoker: 'public' は Cloud Run (Functions v2) の IAM を allUsers / run.invoker に
 * 設定するため必須。これがないと Hosting からの呼び出しが 403 になる。
 */
export const serveMockup = onRequest(
  { region: 'asia-northeast1', memory: '256MiB', timeoutSeconds: 30, cors: false, invoker: 'public' },
  async (req, res) => {
    const m = await import('./callable/serveMockup.js');
    return m.serveMockupRequest(req, res);
  }
);

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
 * 管理者用：全サイトのAI分析キャッシュ（aiAnalysisCache）を一括クリア
 * vivid Phase 2 デプロイ時の混在期間回避用、および将来のプロンプト変更時に使用
 */
export const clearAllAICache = lazyCallable('./callable/admin/clearAllAICache.js', 'clearAllAICacheCallable', { memory: '512MiB', timeoutSeconds: 540 });

/**
 * 管理者用：改善ナレッジ（improvementKnowledge）の業種別ベンチマーク集計取得
 * vivid Phase 3: /admin/improvement-knowledge マトリクス画面用
 */
export const getImprovementBenchmarks = lazyCallable('./callable/admin/getImprovementBenchmarks.js', 'getImprovementBenchmarksCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth トークン管理 callable 群
 * /admin/industry-benchmarks/tokens 画面で OAuth アカウント追加・テスト・無効化を行う
 */
export const getBenchmarkOAuthUrl = lazyCallable('./callable/admin/getBenchmarkOAuthUrl.js', 'getBenchmarkOAuthUrlCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const exchangeBenchmarkOAuthCode = lazyCallable('./callable/admin/exchangeBenchmarkOAuthCode.js', 'exchangeBenchmarkOAuthCodeCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const listBenchmarkTokens = lazyCallable('./callable/admin/listBenchmarkTokens.js', 'listBenchmarkTokensCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const testBenchmarkToken = lazyCallable('./callable/admin/testBenchmarkToken.js', 'testBenchmarkTokenCallable', { memory: '256MiB', timeoutSeconds: 60 });
export const revokeBenchmarkToken = lazyCallable('./callable/admin/revokeBenchmarkToken.js', 'revokeBenchmarkTokenCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const triggerBenchmarkAggregator = lazyCallable('./callable/admin/triggerBenchmarkAggregator.js', 'triggerBenchmarkAggregatorCallable', { memory: '2GiB', timeoutSeconds: 540, secrets: ['GEMINI_API_KEY'] });
export const getBenchmarkOverview = lazyCallable('./callable/admin/getBenchmarkOverview.js', 'getBenchmarkOverviewCallable', { memory: '512MiB', timeoutSeconds: 60 });

/**
 * lively-aggregating-bobcat: 業界平均ベンチマーク集計バッチ
 * 毎月1日 02:00 JST に実行
 */
export const benchmarkAggregator = onSchedule({
  schedule: '0 2 1 * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '2GiB',
  timeoutSeconds: 540,
  secrets: ['GEMINI_API_KEY'],
}, async (event) => {
  const m = await import('./scheduled/benchmarkAggregator.js');
  return m.benchmarkAggregatorHandler(event);
});

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
  secrets: ['GOOGLE_CLIENT_SECRET', 'SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
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
  secrets: ['GOOGLE_CLIENT_SECRET', 'SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
}, async (event) => {
  const m = await import('./scheduled/sendMonthlyReports.js');
  return m.sendMonthlyReportsHandler(event);
});

/**
 * 契約更新リマインダー Scheduled Function
 * 毎月1日 午前9時半（JST）に実行
 * active契約の終了2ヶ月前/1ヶ月前にメール通知
 */
/**
 * board自動同期 Scheduled Function
 * 毎日0時（JST）に実行 - active/estimate_createdの案件をboard APIから同期
 */
export const syncBoardData = onSchedule({
  schedule: '0 0 * * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '256MiB',
  timeoutSeconds: 300,
  secrets: ['BOARD_API_KEY', 'BOARD_API_TOKEN'],
}, async (event) => {
  const m = await import('./scheduled/syncBoardData.js');
  return m.syncBoardDataHandler(event);
});

export const checkContractRenewals = onSchedule({
  schedule: '30 9 1 * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '256MiB',
  timeoutSeconds: 60,
  secrets: ['SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
}, async (event) => {
  const m = await import('./scheduled/checkContractRenewals.js');
  return m.checkContractRenewalsHandler(event);
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
  secrets: ['GEMINI_API_KEY', 'GOOGLE_CLIENT_SECRET', 'SES_SMTP_USER', 'SES_SMTP_PASSWORD'],
}, async (event) => {
  const m = await import('./scheduled/checkMetricAlerts.js');
  return m.runCheckMetricAlerts();
});

/**
 * 改善効果 After指標自動計測 Scheduled Function
 * 毎日AM4:00(JST)に、計測対象のBefore/After比較を実行
 * 実装検証の After 側 DOM 取得で Puppeteer を使うため 2GiB
 */
export const measureImprovementEffects = onSchedule({
  schedule: '0 4 * * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '2GiB',
  timeoutSeconds: 540,
  // GEMINI: AI 評価 / CF_PROXY: スクレイピング + Browser Rendering スクショ / GOOGLE_CLIENT_SECRET: GA4
  secrets: ['GEMINI_API_KEY', 'CF_PROXY_SECRET', 'GOOGLE_CLIENT_SECRET'],
}, async (event) => {
  const m = await import('./scheduled/measureImprovementEffects.js');
  return m.measureImprovementEffectsHandler(event);
});

/**
 * 鮮度管理・自動アーカイブ（日次）
 * draft提案の relevanceScore 更新 + 90日超を archived に変更
 */
export const archiveStaleImprovements = onSchedule({
  schedule: '0 5 * * *',
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '256MiB',
  timeoutSeconds: 120,
}, async (event) => {
  const m = await import('./scheduled/archiveStaleImprovements.js');
  return m.archiveStaleImprovementsHandler(event);
});

/**
 * AIチャット Callable Functions
 */
export const aiChat = lazyCallable('./callable/aiChat.js', 'aiChatCallable', { memory: '512MiB', timeoutSeconds: 120, secrets: ['GEMINI_API_KEY'] });
export const debugCompareCVSources = lazyCallable('./callable/debugCompareCVSources.js', 'debugCompareCVSourcesCallable', { memory: '512MiB', timeoutSeconds: 120 });
export const getChatSessions = lazyCallable('./callable/chatManagement.js', 'getChatSessionsCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const deleteChatSession = lazyCallable('./callable/chatManagement.js', 'deleteChatSessionCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const archiveChatSession = lazyCallable('./callable/chatManagement.js', 'archiveChatSessionCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const endChatSession = lazyCallable('./callable/chatManagement.js', 'endChatSessionCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const updateChatSession = lazyCallable('./callable/chatManagement.js', 'updateChatSessionCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const searchChatSessions = lazyCallable('./callable/chatManagement.js', 'searchChatSessionsCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const addImprovementFromChat = lazyCallable('./callable/chatManagement.js', 'addImprovementFromChatCallable', { memory: '256MiB', timeoutSeconds: 30 });
export const getChatMessages = lazyCallable('./callable/chatManagement.js', 'getChatMessagesCallable', { memory: '256MiB', timeoutSeconds: 30 });

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
 * viewer の allowedSiteIds 更新 Callable Function
 * オーナーが viewer の閲覧可能サイトを変更
 */
export const updateViewerAllowedSites = lazyCallable('./callable/updateViewerAllowedSites.js', 'updateViewerAllowedSitesCallable', { memory: '256MiB', timeoutSeconds: 30 });

/**
 * データマイグレーション実行
 */
export const migrateData = lazyCallable('./callable/migrateData.js', 'migrateDataCallable', { memory: '512MiB', timeoutSeconds: 540 });

/**
 * アカウントメンバー一覧取得
 */
export const getAccountMembers = lazyCallable('./callable/getAccountMembers.js', 'getAccountMembersCallable', { memory: '256MiB', timeoutSeconds: 60 });

