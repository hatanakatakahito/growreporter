/**
 * Cloudflare Browser Rendering 経由のスクリーンショット取得ユーティリティ。
 *
 * 既存 captureSingleScreenshot.js (PSI 経由) の代替経路。
 * 戻り値の shape は captureSingleScreenshot に合わせ、呼び出し側の差替を容易にする。
 *
 * 主な改善点（PSI 経路との比較）:
 *   - JS 実行込みでレンダリング → 動画 hero / lazy-load / 動的挿入要素 がすべて再現
 *   - 100vh hero の押し込み細工 (RESCUE_HERO_HEIGHT_PX=720) が不要
 *   - PSI 救済処理 (snapshot 経由 PSI 再撮影) も不要
 *   - viewport 1920x1080 (PC) / 412x915 (mobile) で安定
 *
 * 制限:
 *   - Workers Free: 1日 10分・同時 3 ブラウザ・20s に 1 ブラウザ
 *     上限到達で 429 が返る → 呼出側でフォールバック or リトライを検討
 *   - 1 撮影あたり 18-30 秒
 *
 * 失敗時は null を返す（例外を投げない、既存 util の挙動に合わせる）。
 */
import { logger } from 'firebase-functions/v2';
import { getStorage } from 'firebase-admin/storage';
import { fetchViaCloudflareProxy } from './cloudflareProxy.js';

const RENDER_TIMEOUT_MS = 120_000; // Browser Rendering は最大 60s + バッファ

/**
 * @param {object} params
 * @param {string} params.url         - 撮影対象URL（必須、http/https のみ）
 * @param {'pc'|'mobile'} params.deviceType - 必須
 * @param {string} params.userId      - Storage パス用
 * @param {object} [params.options]
 * @param {'screenshots'|'page-screenshots'} [params.options.storagePathPrefix='screenshots']
 * @param {string} [params.options.siteId]   - page-screenshots 使用時に必要
 * @param {string} [params.options.pagePath] - ファイル名補助
 * @param {number} [params.options.timeoutMs=120000]
 * @returns {Promise<null | {
 *   imageUrl: string,
 *   source: 'browser-rendering',
 *   screenshotType: 'full-page',
 *   dimensions: { width: number|string, height: number|string },
 *   bytesPerKpx: null,
 *   imageSize: number,
 *   rescuedFromSnapshot: false,
 * }>}
 */
export async function captureBrowserScreenshot({ url, deviceType, userId, options = {} }) {
  if (!url || !/^https?:\/\//i.test(url)) {
    logger.warn('[captureBrowserScreenshot] 無効なURL:', url);
    return null;
  }
  if (!['pc', 'mobile'].includes(deviceType)) {
    logger.warn('[captureBrowserScreenshot] 無効なdeviceType:', deviceType);
    return null;
  }
  if (!userId) {
    logger.warn('[captureBrowserScreenshot] userId が必要です');
    return null;
  }

  const {
    storagePathPrefix = 'screenshots',
    siteId,
    pagePath,
    timeoutMs = RENDER_TIMEOUT_MS,
  } = options;

  const viewport = deviceType === 'mobile' ? 'mobile' : 'pc';

  // Rate limit (429) 時は 25 秒待機 + 1 回再試行
  // - Workers Free の「20 秒に 1 ブラウザ」制限への対処
  // - 1 回リトライしても失敗したら null 返却 → 呼出側 (captureAndStoreBeforeScreenshot) で PSI フォールバック
  const RATE_LIMIT_WAIT_MS = 25_000;
  const MAX_ATTEMPTS = 2;
  let data;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`[captureBrowserScreenshot] 開始 (attempt ${attempt}/${MAX_ATTEMPTS}): ${url} (${viewport})`);
      data = await fetchViaCloudflareProxy({
        targetUrl: url,
        mode: 'screenshot',
        viewport,
        timeoutMs,
      });
      break; // 成功
    } catch (err) {
      lastError = err;
      const msg = err?.message || '';
      const isRateLimit = /429|Rate limit/i.test(msg);
      if (isRateLimit && attempt < MAX_ATTEMPTS) {
        logger.warn(`[captureBrowserScreenshot] Rate limit (429)、${RATE_LIMIT_WAIT_MS / 1000}s 待機後にリトライ: ${url}`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
        continue;
      }
      logger.warn(`[captureBrowserScreenshot] CF Worker 呼出失敗 (attempt ${attempt}/${MAX_ATTEMPTS}): ${url} - ${msg}`);
      return null;
    }
  }
  if (!data) {
    logger.warn(`[captureBrowserScreenshot] 全 attempt 失敗: ${url} - ${lastError?.message}`);
    return null;
  }

  if (!data?.screenshot) {
    logger.warn(`[captureBrowserScreenshot] スクショデータが空: ${url}`);
    return null;
  }

  const imageBuffer = Buffer.from(data.screenshot, 'base64');

  // Firebase Storage にアップロード
  const bucket = getStorage().bucket();
  let fileName;
  if (storagePathPrefix === 'page-screenshots' && siteId) {
    const safePath = encodeURIComponent((pagePath || '/').replace(/\//g, '_')).substring(0, 100);
    fileName = `page-screenshots/${siteId}/${Date.now()}_${deviceType}_${safePath}.jpg`;
  } else {
    fileName = `screenshots/${userId}/${deviceType}_${Date.now()}.jpg`;
  }

  const file = bucket.file(fileName);
  try {
    await file.save(imageBuffer, {
      metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' },
      resumable: false,
    });
    await file.makePublic();
  } catch (err) {
    logger.error(`[captureBrowserScreenshot] Storage 保存失敗: ${url} - ${err.message}`);
    return null;
  }

  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  logger.info(`[captureBrowserScreenshot] 成功: ${url} → ${imageBuffer.length} bytes (viewport=${viewport})`);

  return {
    imageUrl,
    source: 'browser-rendering',
    screenshotType: 'full-page',
    dimensions: { width: viewport === 'mobile' ? 412 : 1400, height: 'fullPage' },
    bytesPerKpx: null,
    imageSize: imageBuffer.length,
    rescuedFromSnapshot: false,
  };
}
