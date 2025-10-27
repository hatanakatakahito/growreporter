import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { fetchGA4DataCallable } from './callable/fetchGA4Data.js';
import { fetchGA4MonthlyDataCallable } from './callable/fetchGA4MonthlyData.js';
import { fetchGSCDataCallable } from './callable/fetchGSCData.js';
import { captureScreenshotCallable } from './callable/captureScreenshot.js';
import { generateAISummaryCallable } from './callable/generateAISummary.js';
import { cleanupCacheScheduled } from './scheduled/cleanupCache.js';

// Firebase Admin初期化
initializeApp({
  storageBucket: 'growgroupreporter.firebasestorage.app', // 正しいバケット名
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
  timeoutSeconds: 60,
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
}, generateAISummaryCallable);

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
