/**
 * 改善モーダル Before 枠用スクリーンショット取得 Callable（保険用途）
 *
 * 通常はサーバ側 generateImprovements が改善生成直後にバックグラウンドで
 * 並列撮影するため、このCallableは edge case（手動追加した改善案、撮影漏れ、
 * 後から targetPageUrl が変更された等）に備えるフォールバックとして残す。
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { captureAndStoreBeforeScreenshot } from '../utils/captureAndStoreBeforeScreenshot.js';
import { canAccessSite } from '../utils/permissionHelper.js';

export async function captureBeforeScreenshotCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId, targetPageUrl } = req.data || {};
  if (!siteId || !targetPageUrl) {
    throw new HttpsError('invalid-argument', 'siteId と targetPageUrl が必要です');
  }
  if (!/^https?:\/\//i.test(targetPageUrl)) {
    throw new HttpsError('invalid-argument', 'targetPageUrl は http/https のみ受け付けます');
  }

  const userId = req.auth.uid;
  const canView = await canAccessSite(userId, siteId);
  if (!canView) {
    throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
  }

  return captureAndStoreBeforeScreenshot({ siteId, targetPageUrl });
}
