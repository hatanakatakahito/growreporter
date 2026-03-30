/**
 * 改善案対象ページの不足スクリーンショットを撮影
 *
 * スクレイピング時は上位30ページのみスクショ撮影するが、
 * AI改善案は上位50ページまで対象にするため、31〜50位のページには
 * スクショがない。改善案生成後にこの関数で不足分を補完する。
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  launchBrowser,
  normalizeUrl,
  setupRequestInterception,
  scrollAndWaitForLazyLoad,
  captureAndUploadScreenshot,
  SCREENSHOT_VIEWPORT,
} from './unifiedPageScraper.js';

const NAV_TIMEOUT_MS = 8_000;

/**
 * 改善案の対象URLのうちスクショ未取得のものを撮影・保存する
 * @param {string} siteId
 * @param {string[]} targetPageUrls - 改善案のtargetPageUrl一覧
 * @returns {Promise<{captured: number, skipped: number, failed: number}>}
 */
export async function captureMissingScreenshots(siteId, targetPageUrls) {
  if (!targetPageUrls || targetPageUrls.length === 0) {
    return { captured: 0, skipped: 0, failed: 0 };
  }

  const db = getFirestore();

  // 1. 対象URLをユニーク化・正規化（空文字は除外）
  const uniqueUrls = [...new Set(
    targetPageUrls
      .filter(url => url && url.startsWith('http'))
      .map(url => normalizeUrl(url)),
  )];

  if (uniqueUrls.length === 0) {
    return { captured: 0, skipped: 0, failed: 0 };
  }

  // 2. 既存スクショを取得して正規化URLのSetを作る
  const existingSnap = await db
    .collection('sites').doc(siteId)
    .collection('pageScreenshots')
    .get();

  const existingNormalizedUrls = new Set();
  for (const doc of existingSnap.docs) {
    if (doc.id === '_meta') continue;
    const url = doc.data().url;
    if (url) existingNormalizedUrls.add(normalizeUrl(url));
  }

  // 3. 不足URLを抽出
  const missingUrls = uniqueUrls.filter(url => !existingNormalizedUrls.has(url));

  if (missingUrls.length === 0) {
    logger.info(`[captureMissingScreenshots] 全URLにスクショあり (${uniqueUrls.length}件)`);
    return { captured: 0, skipped: uniqueUrls.length, failed: 0 };
  }

  logger.info(`[captureMissingScreenshots] 不足スクショ: ${missingUrls.length}件 (全${uniqueUrls.length}件中)`);

  // 4. Puppeteerで撮影
  let browser = null;
  let captured = 0;
  let failed = 0;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });
    await page.setViewport(SCREENSHOT_VIEWPORT);
    await setupRequestInterception(page, 'screenshot');

    for (const url of missingUrls) {
      try {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
        } catch (navErr) {
          if (!(navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout'))) {
            throw navErr;
          }
        }

        await scrollAndWaitForLazyLoad(page);

        const pagePath = new URL(url).pathname;
        const ssResult = await captureAndUploadScreenshot(page, siteId, pagePath);

        // pageScreenshots に保存
        const ssRef = db.collection('sites').doc(siteId).collection('pageScreenshots').doc();
        await ssRef.set({
          url,
          pagePath,
          screenshotUrl: ssResult.screenshotUrl,
          imageSize: ssResult.imageSize,
          capturedAt: FieldValue.serverTimestamp(),
        });

        // pageScrapingData の該当ドキュメントがあれば screenshotUrl を更新
        const scrapingSnap = await db
          .collection('sites').doc(siteId)
          .collection('pageScrapingData')
          .where('pageUrl', '==', url)
          .limit(1)
          .get();

        if (!scrapingSnap.empty) {
          await scrapingSnap.docs[0].ref.update({
            screenshotUrl: ssResult.screenshotUrl,
          });
        }

        captured++;
        logger.info(`[captureMissingScreenshots] 撮影成功: ${url}`);
      } catch (err) {
        failed++;
        logger.warn(`[captureMissingScreenshots] 撮影失敗: ${url} - ${err.message}`);
      }
    }

    await page.close().catch(() => {});
  } catch (err) {
    logger.error(`[captureMissingScreenshots] Browser起動エラー: ${err.message}`);
    return { captured, skipped: uniqueUrls.length - missingUrls.length, failed: missingUrls.length };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  // _meta ドキュメントに撮影完了を記録（フロントエンドのリアルタイム監視用）
  if (captured > 0) {
    try {
      const metaRef = db.collection('sites').doc(siteId).collection('pageScreenshots').doc('_meta');
      await metaRef.set({
        lastCapturedAt: FieldValue.serverTimestamp(),
        totalCaptured: captured,
        totalFailed: failed,
      }, { merge: true });
    } catch (metaErr) {
      logger.warn(`[captureMissingScreenshots] _meta更新エラー（無視）:`, metaErr.message);
    }
  }

  logger.info(`[captureMissingScreenshots] 完了: captured=${captured}, failed=${failed}`);
  return {
    captured,
    skipped: uniqueUrls.length - missingUrls.length,
    failed,
  };
}
