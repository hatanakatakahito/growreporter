/**
 * KW V2: AI 再分類 Callable
 *
 * 「再分類」ボタンから呼ばれる。
 * 当月の AI 分類キャッシュ（gscKeywordClassifyCache/{siteId}_{yyyymm}）を破棄し、
 * 関連する全体結果キャッシュも破棄する。
 * 次回 fetchGSCKeywordsV2Data 呼び出しで AI 分類が再実行される。
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { canAccessSite } from '../utils/permissionHelper.js';

export async function classifyKeywordsV2Callable(request) {
  const db = getFirestore();
  const { siteId, yearMonth } = request.data || {};

  if (!siteId) throw new HttpsError('invalid-argument', 'siteId is required');
  if (!request.auth) throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');

  const userId = request.auth.uid;
  const hasAccess = await canAccessSite(userId, siteId);
  if (!hasAccess) throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');

  // 対象月（指定なしなら今月）
  let yyyymm = yearMonth;
  if (!yyyymm) {
    const now = new Date();
    yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const cacheDocId = `${siteId}_${yyyymm}`;

  console.log(`[classifyKeywordsV2] reclassify request: ${cacheDocId}, userId=${userId}`);

  try {
    // 1. AI 分類キャッシュを削除
    await db.collection('gscKeywordClassifyCache').doc(cacheDocId).delete();

    // 2. 関連する全体結果キャッシュ（api_cache）を削除
    //    cacheKey は `gsc-kw-v2_{siteId}_{startDate}_{endDate}_...` 形式（generateCacheKey 参照）
    //    siteId フィールドで絞り込み → ID プレフィックスで filter
    const apiCacheSnap = await db
      .collection('api_cache')
      .where('siteId', '==', siteId)
      .get();
    const targets = apiCacheSnap.docs.filter((doc) => doc.id.startsWith('gsc-kw-v2_'));
    if (targets.length > 0) {
      const batch = db.batch();
      targets.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log(
      `[classifyKeywordsV2] cleared classify cache + ${targets.length} api_cache entries for ${siteId}`
    );

    return {
      success: true,
      yearMonth: yyyymm,
      clearedApiCacheCount: targets.length,
      message: '次回データ取得時に AI 分類が再実行されます',
    };
  } catch (error) {
    console.error('[classifyKeywordsV2] Error:', error);
    throw new HttpsError('internal', '再分類リクエストに失敗しました: ' + error.message);
  }
}
