import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { assertAdmin } from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth トークンを無効化
 *
 * `serviceTokens/{email}.status` を 'revoked' に変更。
 * 物理削除はせず履歴として保持（監査用）。
 * benchmarkAggregator は status === 'active' のトークンのみ利用するため、
 * 無効化するとそのアカウント経由のサイトは翌月のバッチから除外される
 * （他アカウント経由でも見えるサイトは残る）。
 *
 * @param {object} request.data
 * @param {string} request.data.email
 * @returns {Promise<{ success }>}
 */
export async function revokeBenchmarkTokenCallable(request) {
  const adminData = await assertAdmin(request.auth?.uid);
  const adminEmail = request.auth.token?.email || adminData.email || 'unknown';

  const { email } = request.data || {};
  if (!email) throw new HttpsError('invalid-argument', 'email が必要です');

  const db = getFirestore();
  const tokenRef = db.collection('serviceTokens').doc(email);
  const tokenDoc = await tokenRef.get();
  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', `serviceTokens/${email} が見つかりません`);
  }

  await tokenRef.update({
    status: 'revoked',
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy: adminEmail,
  });

  // 監査ログ
  try {
    await db.collection('adminActivityLogs').add({
      action: 'benchmark_oauth_revoked',
      targetType: 'serviceTokens',
      targetId: email,
      adminId: request.auth.uid,
      adminEmail,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (logErr) {
    logger.warn('[revokeBenchmarkToken] activity log 失敗', { error: logErr.message });
  }

  logger.info('[revokeBenchmarkToken] 無効化', { adminId: request.auth.uid, email });
  return { success: true };
}
