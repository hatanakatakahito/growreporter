import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { assertAdmin, maskToken } from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: 保存済みベンチマーク用 OAuth トークン一覧を取得
 *
 * refresh_token はマスク済の値のみ返却（フロントへの生 token 露出防止）。
 * 管理画面 /admin/industry-benchmarks/tokens で表示。
 *
 * @returns {Promise<{ tokens: Array<TokenSummary> }>}
 *
 *   TokenSummary: {
 *     email, status, addedBy, addedAt, lastRefreshedAt, lastUsedAt,
 *     lastFailedAt, failureReason, consecutiveFailures,
 *     refreshTokenMasked, lastBatchStats
 *   }
 */
export async function listBenchmarkTokensCallable(request) {
  await assertAdmin(request.auth?.uid);

  const db = getFirestore();
  const snap = await db.collection('serviceTokens').orderBy('addedAt', 'desc').get();

  const tokens = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      email: data.email || doc.id,
      status: data.status || 'active',
      addedBy: data.addedBy || null,
      addedAt: data.addedAt?.toDate?.()?.toISOString() || null,
      lastRefreshedAt: data.lastRefreshedAt?.toDate?.()?.toISOString() || null,
      lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || null,
      lastFailedAt: data.lastFailedAt?.toDate?.()?.toISOString() || null,
      failureReason: data.failureReason || null,
      consecutiveFailures: data.consecutiveFailures || 0,
      refreshTokenMasked: maskToken(data.refresh_token),
      lastBatchStats: data.lastBatchStats || null,
      scope: data.scope || '',
    };
  });

  logger.info('[listBenchmarkTokens] 取得', { adminId: request.auth.uid, count: tokens.length });
  return { success: true, tokens };
}
