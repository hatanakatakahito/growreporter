import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { fetchGA4DataCallable } from './callable/fetchGA4Data.js';
import { fetchGA4MonthlyDataCallable } from './callable/fetchGA4MonthlyData.js';
import { fetchGA4MonthlyConversionDataCallable } from './callable/fetchGA4MonthlyConversionData.js';
import { fetchGA4ReverseFlowDataCallable } from './callable/fetchGA4ReverseFlowData.js';
import { fetchGA4PagePathsCallable } from './callable/fetchGA4PagePaths.js';
import { fetchGSCDataCallable } from './callable/fetchGSCData.js';
import { captureScreenshotCallable } from './callable/captureScreenshot.js';
import { generateAISummaryCallable } from './callable/generateAISummary.js';
import { fetchMetadataCallable } from './callable/fetchMetadata.js';
import { fetchGA4UserDemographicsCallable } from './callable/fetchGA4UserDemographics.js';
import { exchangeOAuthCodeCallable } from './callable/exchangeOAuthCode.js';
import { testSheetsConnectionCallable } from './callable/testSheetsConnection.js';
import { fetchImprovementKnowledgeCallable } from './callable/fetchImprovementKnowledge.js';
import { getAdminStatsCallable } from './callable/admin/getAdminStats.js';
import { getAdminUsersCallable } from './callable/admin/getAdminUsers.js';
import { updateUserPlanCallable } from './callable/admin/updateUserPlan.js';
import { getUserDetailCallable } from './callable/admin/getUserDetail.js';
import { getActivityLogsCallable } from './callable/admin/getActivityLogs.js';
import { getAdminSitesCallable } from './callable/admin/getAdminSites.js';
import { getSiteDetailCallable } from './callable/admin/getSiteDetail.js';
import { cleanupCacheScheduled } from './scheduled/cleanupCache.js';
import { exportToSheetsScheduled } from './scheduled/exportToSheets.js';
import { resetMonthlyLimitsScheduled } from './scheduled/resetMonthlyLimits.js';
import { onSiteCreatedTrigger } from './triggers/onSiteCreated.js';

// Firebase Admin初期化
initializeApp({
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

/**
 * GA4データ取得 Callable Function
 * フロントエンドから呼び出されるAPI
 */
export const fetchGA4Data = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGA4DataCallable);

/**
 * GA4月次データ取得 Callable Function
 * 過去13ヶ月の月次データを取得
 */
export const fetchGA4MonthlyData = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGA4MonthlyDataCallable);

/**
 * GA4月次コンバージョンデータ取得 Callable Function
 * コンバージョンイベントの月次推移データを取得
 */
export const fetchGA4MonthlyConversionData = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGA4MonthlyConversionDataCallable);

/**
 * GA4逆算フローデータ取得 Callable Function
 * フォームページからのコンバージョンフローデータを取得
 */
export const fetchGA4ReverseFlowData = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGA4ReverseFlowDataCallable);

/**
 * GA4ページパス一覧取得 Callable Function
 * 逆算フローのフォームページパス候補を取得
 */
export const fetchGA4PagePaths = onCall({
  memory: '256MiB',
  timeoutSeconds: 30,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGA4PagePathsCallable);

/**
 * GSCデータ取得 Callable Function
 * フロントエンドから呼び出されるAPI
 */
export const fetchGSCData = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGSCDataCallable);

/**
 * スクリーンショット取得 Callable Function
 * サイトのスクリーンショットを自動取得
 */
export const captureScreenshot = onCall({
  memory: '2GiB',
  timeoutSeconds: 300, // 60秒 → 300秒（5分）に延長
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, captureScreenshotCallable);

/**
 * AI要約生成 Callable Function
 * Gemini APIを使用してGA4データの要約を生成
 */
export const generateAISummary = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
  secrets: ['GEMINI_API_KEY'], // Secretへのアクセス権を付与
}, generateAISummaryCallable);

/**
 * メタデータ取得 Callable Function
 * サイトのメタデータ（タイトル、説明文など）を自動取得
 */
export const fetchMetadata = onCall({
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchMetadataCallable);

/**
 * GA4ユーザー属性データ取得 Callable Function
 * ユーザーの性別、年齢、デバイス、地域などのデモグラフィックデータを取得
 */
export const fetchGA4UserDemographics = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchGA4UserDemographicsCallable);

/**
 * OAuth 2.0 認可コード交換 Callable Function
 * OAuth 2.0の認可コードをアクセストークンとリフレッシュトークンに交換
 */
export const exchangeOAuthCode = onCall({
  memory: '256MiB',
  timeoutSeconds: 30,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, exchangeOAuthCodeCallable);

/**
 * Google Sheets API接続テスト Callable Function
 * スプレッドシートへの読み書きが正しく動作するかテスト
 */
export const testSheetsConnection = onCall({
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, testSheetsConnectionCallable);

/**
 * GrowGroup改善施策ナレッジ取得 Callable Function
 * スプレッドシートから改善施策のナレッジデータを取得
 */
export const fetchImprovementKnowledge = onCall({
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, fetchImprovementKnowledgeCallable);

/**
 * キャッシュクリーンアップ Scheduled Function
 * 毎日午前3時（JST）に実行
 */
export const cleanupCache = onSchedule({
  schedule: '0 3 * * *', // 毎日午前3時
  timeZone: 'Asia/Tokyo',
  memory: '256MiB',
  timeoutSeconds: 300,
  region: 'asia-northeast1', // 東京リージョン
}, cleanupCacheScheduled);

/**
 * Googleスプレッドシートエクスポート Scheduled Function
 * 毎日午前4時（JST）に実行
 * 全サイトの前月データをスプレッドシートに自動エクスポート
 */
export const exportToSheets = onSchedule({
  schedule: '0 4 * * *', // 毎日午前4時
  timeZone: 'Asia/Tokyo',
  memory: '512MiB',
  timeoutSeconds: 540, // 9分
  region: 'asia-northeast1', // 東京リージョン
}, exportToSheetsScheduled);

/**
 * サイト登録完了時トリガー
 * サイト登録完了時（setupCompleted: false → true）に過去3ヶ月分のデータをスプレッドシートに自動エクスポート
 */
export const siteCreatedSheetsExport = onDocumentWritten({
  document: 'sites/{siteId}',
  region: 'asia-northeast1', // 東京リージョン
  memory: '512MiB',
  timeoutSeconds: 300, // 5分
}, onSiteCreatedTrigger);

/**
 * 月次制限リセット Scheduled Function
 * 毎月1日0時に全ユーザーのAI生成回数をリセット
 */
export const resetMonthlyLimits = resetMonthlyLimitsScheduled;

/**
 * 管理者ダッシュボード統計データ取得 Callable Function
 * 管理者のみアクセス可能
 */
export const getAdminStats = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, getAdminStatsCallable);

/**
 * 管理者用ユーザー一覧取得 Callable Function
 * 検索、フィルタ、ページネーション対応
 */
export const getAdminUsers = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, getAdminUsersCallable);

/**
 * 管理者用ユーザープラン変更 Callable Function
 * プラン変更 + 履歴記録 + 使用制限リセット
 */
export const updateUserPlan = onCall({
  memory: '256MiB',
  timeoutSeconds: 30,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, updateUserPlanCallable);

/**
 * 管理者用ユーザー詳細取得 Callable Function
 * ユーザーの詳細情報、サイト一覧、プラン履歴を取得
 */
export const getUserDetail = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, getUserDetailCallable);

/**
 * 管理者用アクティビティログ取得 Callable Function
 * 管理者の操作履歴を取得（フィルタ、ページネーション対応）
 */
export const getActivityLogs = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, getActivityLogsCallable);

/**
 * 管理者用サイト一覧取得 Callable Function
 * 全サイトの一覧を取得（検索、フィルタ、ページネーション対応）
 */
export const getAdminSites = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, getAdminSitesCallable);

/**
 * 管理者用サイト詳細取得 Callable Function
 * サイトの詳細情報、データ収集状況、AI使用状況を取得
 */
export const getSiteDetail = onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
  region: 'asia-northeast1', // 東京リージョン
  cors: true, // CORS を有効化
}, getSiteDetailCallable);
