/**
 * Before 枠用スクリーンショットを取得して Firestore に保存するユーティリティ。
 *
 * 呼び出し側:
 *   - captureBeforeScreenshot.js (Callable): 1件ずつ / 手動保険
 *   - generateImprovements.js: Gemini 完了後に並列で N 件呼出
 *
 * 処理:
 *   1) pageScreenshots の既存チェック（正規化URL一致なら再利用）
 *   2) captureSingleScreenshot で PSI 撮影
 *   3) pageScreenshots ドキュメントに追加 + _meta.lastCapturedAt 更新
 *
 * 例外は投げず { success: boolean, ... } を返す。
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { captureSingleScreenshot } from './captureSingleScreenshot.js';

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase();
    if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) u.pathname += '/';
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * @param {object} params
 * @param {string} params.siteId
 * @param {string} params.targetPageUrl - 単一URL (カンマ区切りなら呼出側で先頭抽出)
 * @param {string} [params.siteOwnerId] - 省略時は sites/{siteId} の userId を読む
 * @returns {Promise<{ success: boolean, alreadyExists?: boolean, screenshotUrl?: string, screenshotType?: string, reason?: string }>}
 */
export async function captureAndStoreBeforeScreenshot({ siteId, targetPageUrl, siteOwnerId }) {
  if (!siteId || !targetPageUrl) {
    return { success: false, reason: 'invalid_params' };
  }
  if (!/^https?:\/\//i.test(targetPageUrl)) {
    return { success: false, reason: 'invalid_url' };
  }

  const db = getFirestore();
  const normalized = normalizeUrl(targetPageUrl);
  const ssCol = db.collection('sites').doc(siteId).collection('pageScreenshots');

  // 既存の pageScreenshots に該当URLがあれば再利用
  const existingSnap = await ssCol.get();
  for (const d of existingSnap.docs) {
    if (d.id === '_meta') continue;
    const data = d.data();
    if (data?.url && data?.screenshotUrl && normalizeUrl(data.url) === normalized) {
      return { success: true, alreadyExists: true, screenshotUrl: data.screenshotUrl };
    }
  }

  // siteOwnerId 未指定時はサイトドキュメントから取得
  let ownerId = siteOwnerId;
  if (!ownerId) {
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      return { success: false, reason: 'site_not_found' };
    }
    ownerId = siteDoc.data().userId;
    if (!ownerId) {
      return { success: false, reason: 'site_owner_missing' };
    }
  }

  let pagePath = '/';
  try {
    pagePath = new URL(targetPageUrl).pathname || '/';
  } catch {
    // noop
  }

  const ssResult = await captureSingleScreenshot({
    url: targetPageUrl,
    deviceType: 'pc',
    userId: ownerId,
    options: {
      storagePathPrefix: 'page-screenshots',
      siteId,
      pagePath,
    },
  });

  if (!ssResult?.imageUrl) {
    logger.warn(`[captureAndStoreBeforeScreenshot] PSI 撮影失敗: ${targetPageUrl}`);
    return { success: false, reason: 'psi_failed' };
  }

  await ssCol.add({
    url: targetPageUrl,
    pagePath,
    screenshotUrl: ssResult.imageUrl,
    imageSize: ssResult.imageSize,
    capturedAt: FieldValue.serverTimestamp(),
    screenshotType: ssResult.screenshotType,
    source: 'on-demand-psi',
  });

  await ssCol.doc('_meta').set(
    { lastCapturedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  logger.info(`[captureAndStoreBeforeScreenshot] 撮影完了: ${targetPageUrl}`);
  return {
    success: true,
    screenshotUrl: ssResult.imageUrl,
    screenshotType: ssResult.screenshotType,
  };
}

/**
 * 複数URLを並列度 concurrency で並列撮影する。
 * 各URLの結果を配列で返す（例外は投げない）。
 */
export async function captureAndStoreBeforeScreenshotsBulk({ siteId, targetPageUrls, siteOwnerId, concurrency = 4 }) {
  const urls = Array.from(new Set(
    (targetPageUrls || [])
      .map(u => (u ? String(u).split(',')[0].trim() : ''))
      .filter(u => u && /^https?:\/\//i.test(u))
  ));
  if (urls.length === 0) return [];

  const results = new Array(urls.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (true) {
      const myIdx = index++;
      if (myIdx >= urls.length) break;
      const url = urls[myIdx];
      try {
        results[myIdx] = { url, ...(await captureAndStoreBeforeScreenshot({ siteId, targetPageUrl: url, siteOwnerId })) };
      } catch (err) {
        logger.warn(`[captureAndStoreBeforeScreenshotsBulk] 例外: ${url} - ${err?.message}`);
        results[myIdx] = { url, success: false, reason: 'exception' };
      }
    }
  });
  await Promise.all(workers);
  return results;
}
