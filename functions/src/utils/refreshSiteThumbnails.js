/**
 * サイトトップのサムネイル (PC + Mobile、viewport モード) を CF Worker で取得し
 * sites/{siteId} の pcScreenshotUrl / mobileScreenshotUrl を更新するユーティリティ。
 *
 * - viewport モード: PC=1400×900、Mobile=412×915 (worker.js の VIEWPORT_PRESETS と一致)
 * - Storage path: page-renderings-shots-vp/{siteId}/{hash}.jpg (改善 Before の fullPage cache とは別 hash / 別 path)
 * - 24h cache あり、失敗時は既存サムネを上書きしない
 *
 * 用途:
 *  - サイト登録時のサムネ初回取得 (onSiteCreated)
 *  - siteUrl 変更時の再撮影 (onSiteChanged)
 *  - ユーザー手動再取得 (refreshSiteMetadataAndScreenshots)
 */

import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { captureRenderAndScreenshot } from './captureRenderAndScreenshot.js';

/**
 * @param {object} params
 * @param {string} params.siteId
 * @param {string} params.siteUrl - http(s):// で始まるサイトトップ URL
 * @param {boolean} [params.forceRefresh=false] - 24h cache を無視して再撮影
 * @param {boolean} [params.persist=true] - true: sites doc を update / false: URL のみ返却
 * @returns {Promise<{
 *   pcScreenshotUrl?: string,
 *   mobileScreenshotUrl?: string,
 *   error?: string,
 *   message?: string,
 * }>}
 */
export async function refreshSiteThumbnails({ siteId, siteUrl, forceRefresh = false, persist = true }) {
  if (!siteId || !siteUrl || !/^https?:\/\//i.test(siteUrl)) {
    return { error: 'invalid_params', message: `siteId=${!!siteId}, siteUrl=${siteUrl}` };
  }

  const captured = await captureRenderAndScreenshot(siteId, siteUrl, {
    viewports: ['pc', 'mobile'],
    fullPage: false,
    forceRefresh,
  });

  if (captured.error) {
    logger.warn(
      `[refreshSiteThumbnails] capture failed (${captured.error}): ${siteUrl} - ${captured.message || ''}`
    );
    return { error: captured.error, message: captured.message };
  }

  const updates = {};
  if (captured.pc?.screenshotUrl) updates.pcScreenshotUrl = captured.pc.screenshotUrl;
  if (captured.mobile?.screenshotUrl) updates.mobileScreenshotUrl = captured.mobile.screenshotUrl;

  if (persist && Object.keys(updates).length > 0) {
    try {
      await getFirestore().collection('sites').doc(siteId).update(updates);
      logger.info(`[refreshSiteThumbnails] updated sites/${siteId}: ${Object.keys(updates).join(', ')}`);
    } catch (err) {
      logger.warn(`[refreshSiteThumbnails] firestore update failed: ${siteId} - ${err.message}`);
      return { ...updates, error: 'firestore_update_failed', message: err.message };
    }
  }

  return updates;
}
