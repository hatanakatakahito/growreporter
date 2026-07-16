/**
 * Before 枠用スクリーンショットを取得して Firestore に保存するユーティリティ。
 *
 * 改善ロジック統一化プラン (Phase 2) で `captureRenderAndScreenshot` 経由に置換済。
 *   - 1 URL × {PC, Mobile} 両方を Worker `mode='render+shot'` で同時取得
 *   - HTML を `page-renderings/`、screenshot を `page-renderings-shots/` に保存
 *   - Firestore `pageScreenshots` には deviceType ('pc'|'mobile') ごとに 1 ドキュメント保存
 *   - source='render+shot' で旧 PSI / BR レコードと区別
 *   - PSI フォールバックは廃止 (改善する機能の source of truth 統一を優先)
 *
 * 呼び出し側:
 *   - captureBeforeScreenshot.js (Callable): 1件ずつ / 手動保険
 *   - generateImprovements.js: Gemini 完了後に並列で N 件呼出
 *   - preheatSitePageScreenshots.js: 上位 PV ページの先回り撮影
 *
 * 例外は投げず { success: boolean, ... } を返す。
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { captureRenderAndScreenshot } from './captureRenderAndScreenshot.js';

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
 * @param {string} [params.siteOwnerId] - 後方互換用 (新ロジックでは未使用)
 * @returns {Promise<{
 *   success: boolean,
 *   alreadyExists?: boolean,
 *   pc?: { screenshotUrl: string, htmlUrl: string },
 *   mobile?: { screenshotUrl: string, htmlUrl: string },
 *   // 後方互換 (measureImprovementEffects / captureBeforeImplementationSnapshot 用):
 *   //   trate-level screenshotUrl は PC の URL、screenshotType は 'full-page'
 *   screenshotUrl?: string,
 *   screenshotType?: string,
 *   reason?: string,
 *   message?: string,
 * }>}
 */
export async function captureAndStoreBeforeScreenshot({ siteId, targetPageUrl, siteOwnerId: _siteOwnerId }) {
  if (!siteId || !targetPageUrl) {
    return { success: false, reason: 'invalid_params' };
  }
  if (!/^https?:\/\//i.test(targetPageUrl)) {
    return { success: false, reason: 'invalid_url' };
  }

  const db = getFirestore();
  const normalized = normalizeUrl(targetPageUrl);
  const ssCol = db.collection('sites').doc(siteId).collection('pageScreenshots');

  // 既存の pageScreenshots に該当URL × {PC, Mobile} 両方の render+shot 由来ドキュメントがあれば再利用
  // (旧 source='on-demand-psi' / 'browser-rendering' / 'bulk-preheat' は再利用対象外、新しく撮り直す)
  const existingSnap = await ssCol.get();
  const existingByDevice = { pc: null, mobile: null };
  for (const d of existingSnap.docs) {
    if (d.id === '_meta') continue;
    const data = d.data();
    if (
      data?.url &&
      data?.screenshotUrl &&
      data?.htmlUrl &&
      data?.source === 'render+shot' &&
      normalizeUrl(data.url) === normalized
    ) {
      const dt = data.deviceType || 'pc';
      if (dt === 'pc' || dt === 'mobile') {
        existingByDevice[dt] = data;
      }
    }
  }
  if (existingByDevice.pc && existingByDevice.mobile) {
    return {
      success: true,
      alreadyExists: true,
      pc: { screenshotUrl: existingByDevice.pc.screenshotUrl, htmlUrl: existingByDevice.pc.htmlUrl },
      mobile: { screenshotUrl: existingByDevice.mobile.screenshotUrl, htmlUrl: existingByDevice.mobile.htmlUrl },
      // 後方互換 (PC を代表値として返す)
      screenshotUrl: existingByDevice.pc.screenshotUrl,
      screenshotType: existingByDevice.pc.screenshotType || 'full-page',
    };
  }

  let pagePath = '/';
  try {
    pagePath = new URL(targetPageUrl).pathname || '/';
  } catch {
    // noop
  }

  // PC + Mobile を Worker 1 アクセス × 2 viewport で取得 (内部直列、Storage 24h cache あり)
  const captured = await captureRenderAndScreenshot(siteId, targetPageUrl, {
    viewports: ['pc', 'mobile'],
  });

  if (captured.error) {
    logger.warn(
      `[captureAndStoreBeforeScreenshot] capture failed (${captured.error}): ${targetPageUrl} - ${captured.message || ''}`
    );
    return { success: false, reason: captured.error, message: captured.message };
  }

  if (!captured.pc || !captured.mobile) {
    logger.warn(
      `[captureAndStoreBeforeScreenshot] partial capture: pc=${!!captured.pc}, mobile=${!!captured.mobile}: ${targetPageUrl}`
    );
    return { success: false, reason: 'partial_capture' };
  }

  // Firestore に PC / Mobile を別ドキュメントで保存
  const writes = [];
  for (const dt of ['pc', 'mobile']) {
    const r = captured[dt];
    writes.push(
      ssCol.add({
        url: targetPageUrl,
        pagePath,
        deviceType: dt,
        screenshotUrl: r.screenshotUrl,
        screenshotStoragePath: r.screenshotStoragePath,
        htmlUrl: r.htmlUrl,
        htmlStoragePath: r.htmlStoragePath,
        imageSize: r.screenshotByteLen,
        capturedAt: FieldValue.serverTimestamp(),
        screenshotType: 'full-page',
        source: 'render+shot',
      })
    );
  }
  await Promise.all(writes);

  await ssCol.doc('_meta').set(
    { lastCapturedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  logger.info(`[captureAndStoreBeforeScreenshot] 撮影完了 (pc+mobile): ${targetPageUrl}`);
  return {
    success: true,
    pc: { screenshotUrl: captured.pc.screenshotUrl, htmlUrl: captured.pc.htmlUrl },
    mobile: { screenshotUrl: captured.mobile.screenshotUrl, htmlUrl: captured.mobile.htmlUrl },
    // 後方互換 (PC を代表値として返す。captureBeforeImplementationSnapshot / measureImprovementEffects 用)
    screenshotUrl: captured.pc.screenshotUrl,
    screenshotType: 'full-page',
  };
}

/**
 * 複数URLを並列度 concurrency で並列撮影する。
 * 各URLの結果を配列で返す（例外は投げない）。
 *
 * 注意: 内部の captureRenderAndScreenshot は viewport を直列処理するため、
 *       同時実行ブラウザ数 = concurrency × 1 (URL ごとに 1 viewport ずつ)。
 *       Workers Free の同時 3 ブラウザ制約を考慮し、concurrency は 2 推奨。
 */
export async function captureAndStoreBeforeScreenshotsBulk({ siteId, targetPageUrls, siteOwnerId, concurrency = 2 }) {
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
