/**
 * サイトの PV 上位ページに対する Before スクリーンショット予熱 Callable。
 *
 * 想定呼出元: ImprovementFocusModal（方針選択モーダル）が開いた瞬間に
 *   fire-and-forget で呼ばれる。改善案生成のあとにドロワーを開いた際、
 *   PSI 撮影済 Before がキャッシュに並んでいる状態を目指す。
 *
 * 入力: { siteId: string }
 * 出力: { success, requestedCount, capturedCount, skippedCount }
 *
 * 挙動:
 *   1. canAccessSite で権限チェック
 *   2. sites/{siteId}/pageScrapingData を pageViews 降順で上位10URL取得
 *   3. captureAndStoreBeforeScreenshotsBulk で並列4撮影（既存 util 内で重複撮影防止済）
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { captureAndStoreBeforeScreenshotsBulk } from '../utils/captureAndStoreBeforeScreenshot.js';
import { canAccessSite } from '../utils/permissionHelper.js';

const PREHEAT_TOP_N = 10;
const PREHEAT_CONCURRENCY = 4;

export async function preheatSitePageScreenshotsCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId } = req.data || {};
  if (!siteId) {
    throw new HttpsError('invalid-argument', 'siteId が必要です');
  }

  const userId = req.auth.uid;
  const canView = await canAccessSite(userId, siteId);
  if (!canView) {
    throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');
  }

  const db = getFirestore();

  // サイト所有者 ID を取得（captureSingleScreenshot の Storage パス用）
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', 'サイトが見つかりません');
  }
  const siteOwnerId = siteDoc.data().userId || userId;

  // PV 上位 N ページの URL を取得
  const snap = await db
    .collection('sites')
    .doc(siteId)
    .collection('pageScrapingData')
    .orderBy('pageViews', 'desc')
    .limit(PREHEAT_TOP_N)
    .get();

  const targetPageUrls = snap.docs
    .map((d) => d.data()?.pageUrl)
    .filter((url) => url && /^https?:\/\//i.test(url));

  if (targetPageUrls.length === 0) {
    logger.info(`[preheat] pageScrapingData 0件のためスキップ: siteId=${siteId}`);
    return { success: true, requestedCount: 0, capturedCount: 0, skippedCount: 0 };
  }

  logger.info(`[preheat] 開始: siteId=${siteId}, 対象URL=${targetPageUrls.length}件, 並列度=${PREHEAT_CONCURRENCY}`);

  const results = await captureAndStoreBeforeScreenshotsBulk({
    siteId,
    targetPageUrls,
    siteOwnerId,
    concurrency: PREHEAT_CONCURRENCY,
  });

  const capturedCount = results.filter((r) => r?.success && !r.alreadyExists).length;
  const skippedCount = results.filter((r) => r?.success && r.alreadyExists).length;
  const failedCount = results.length - capturedCount - skippedCount;

  logger.info(
    `[preheat] 完了: siteId=${siteId}, 新規=${capturedCount}, 既存=${skippedCount}, 失敗=${failedCount}`
  );

  return {
    success: true,
    requestedCount: targetPageUrls.length,
    capturedCount,
    skippedCount,
  };
}
