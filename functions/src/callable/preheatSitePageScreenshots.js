/**
 * サイトの PV 上位ページに対する Before スクリーンショット予熱 Callable。
 *
 * 想定呼出元: ImprovementFocusModal（方針選択モーダル）が開いた瞬間に
 *   fire-and-forget で呼ばれる。改善案生成のあとにドロワーを開いた際、
 *   render+shot 撮影済 Before (PC + Mobile) がキャッシュに並んでいる状態を目指す。
 *
 * 入力: { siteId: string }
 * 出力: { success, requestedCount, capturedCount, skippedCount }
 *
 * 挙動:
 *   1. canAccessSite で権限チェック
 *   2. sites/{siteId}/pageScrapingData を pageViews 降順で上位 10 URL 取得
 *   3. captureAndStoreBeforeScreenshotsBulk (内部で captureRenderAndScreenshot) で
 *      URL 並列度 2 × 各 URL は PC/Mobile 直列 = 同時 2 ブラウザ稼働 (Workers Free 3 ブラウザ枠内)
 *   4. 1 URL あたり HTML + JPEG を page-renderings/ と page-renderings-shots/ に保存、
 *      Firestore pageScreenshots に deviceType=pc/mobile の 2 ドキュメント追加
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { captureAndStoreBeforeScreenshotsBulk } from '../utils/captureAndStoreBeforeScreenshot.js';
import { canAccessSite } from '../utils/permissionHelper.js';

const PREHEAT_TOP_N = 10;
// Workers Free の同時 3 ブラウザ・20s 1ブラウザ制限を考慮:
//   URL 並列 2 × 各 URL は PC/Mobile 直列 = 同時 2 ブラウザ稼働、合計 20 撮影/サイト
// PSI fallback は廃止 (改善ロジック統一化プランで source of truth を render+shot に統一)
// BR 失敗時は当該 URL はスキップされ、エラーは captureAndStoreBeforeScreenshot 内で
// reason: 'BR_RATE_LIMITED' | 'BR_UNAVAILABLE' | 'BR_FAILED' として伝播
const PREHEAT_CONCURRENCY = 2;

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
