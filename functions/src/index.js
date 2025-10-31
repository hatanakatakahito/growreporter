import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
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
import { cleanupCacheScheduled } from './scheduled/cleanupCache.js';

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
