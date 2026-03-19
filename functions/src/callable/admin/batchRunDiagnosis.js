import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { runSiteDiagnosisInternal } from '../runSiteDiagnosis.js';

/**
 * 管理者用: 全サイトまたは指定サイトに対してサイト診断を一括実行
 * プラン消費なし、認証はadminチェックのみ
 *
 * パラメータ:
 *   siteIds?: string[]  — 指定がなければ setupCompleted=true の全サイト
 */
export async function batchRunDiagnosisCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  const db = getFirestore();

  // 管理者チェック
  const adminDoc = await db.collection('adminUsers').doc(req.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', '管理者権限が必要です');
  }

  const { siteIds } = req.data || {};

  let sites = [];
  if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
    // 指定サイトのみ
    for (const id of siteIds) {
      const doc = await db.collection('sites').doc(id).get();
      if (doc.exists) sites.push({ id: doc.id, ...doc.data() });
    }
  } else {
    // setupCompleted=true の全サイト
    const snap = await db.collection('sites').where('setupCompleted', '==', true).get();
    snap.forEach(doc => sites.push({ id: doc.id, ...doc.data() }));
  }

  logger.info(`[batchRunDiagnosis] 対象サイト数: ${sites.length}`);

  const results = [];
  for (const site of sites) {
    try {
      const diagResult = await runSiteDiagnosisInternal(site.id);
      results.push({
        siteId: site.id,
        siteName: site.siteName || site.siteUrl,
        success: !!diagResult,
        overallScore: diagResult?.overallScore ?? null,
      });
      logger.info(`[batchRunDiagnosis] ${site.id}: スコア=${diagResult?.overallScore ?? 'N/A'}`);
    } catch (e) {
      results.push({
        siteId: site.id,
        siteName: site.siteName || site.siteUrl,
        success: false,
        error: e.message,
      });
      logger.warn(`[batchRunDiagnosis] ${site.id}: エラー=${e.message}`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  logger.info(`[batchRunDiagnosis] 完了: ${successCount}/${sites.length}件成功`);

  return { total: sites.length, success: successCount, results };
}
