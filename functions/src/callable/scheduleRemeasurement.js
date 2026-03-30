/**
 * 追加計測スケジュール設定 Callable Function
 * 初回計測完了後にユーザーが14/30/60/90日後の再計測をスケジュール
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { canAccessSite } from '../utils/permissionHelper.js';

const VALID_DAYS = [14, 30, 60, 90];

/**
 * @param {object} request
 * @param {string} request.data.siteId
 * @param {string} request.data.improvementId
 * @param {number|null} request.data.remeasureDays - 14, 30, 60, 90 or null (cancel)
 */
export async function scheduleRemeasurementCallable(request) {
  const db = getFirestore();
  const { siteId, improvementId, remeasureDays } = request.data;

  if (!siteId || !improvementId) {
    throw new HttpsError('invalid-argument', 'siteId and improvementId are required');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  if (remeasureDays !== null && !VALID_DAYS.includes(remeasureDays)) {
    throw new HttpsError('invalid-argument', `remeasureDays must be one of: ${VALID_DAYS.join(', ')} or null`);
  }

  const userId = request.auth.uid;
  const hasAccess = await canAccessSite(userId, siteId);
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
  }

  const ref = db.collection('sites').doc(siteId).collection('improvements').doc(improvementId);
  const docSnap = await ref.get();
  if (!docSnap.exists) {
    throw new HttpsError('not-found', '改善タスクが見つかりません');
  }

  const data = docSnap.data();
  const em = data.effectMeasurement;
  if (!em || em.status !== 'completed') {
    throw new HttpsError('failed-precondition', '計測完了済みのタスクのみスケジュール可能です');
  }

  if (remeasureDays === null) {
    // キャンセル: 計測を終了
    await ref.update({
      'effectMeasurement.nextMeasurementAt': null,
      'effectMeasurement.scheduledRemeasureDays': FieldValue.delete(),
      emNextMeasurementAt: null,
    });
    console.log(`[scheduleRemeasurement] Cancelled for ${improvementId}`);
    return { success: true, action: 'cancelled' };
  }

  // 再計測日を算出（today + remeasureDays）
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + remeasureDays);
  const nextMeasurementAt = nextDate.toISOString().split('T')[0];

  await ref.update({
    'effectMeasurement.status': 'pending',
    'effectMeasurement.nextMeasurementAt': nextMeasurementAt,
    'effectMeasurement.scheduledRemeasureDays': remeasureDays,
    // After/changes/overallScore/aiEvaluation は保持（計測履歴のため）
    emStatus: 'pending',
    emNextMeasurementAt: nextMeasurementAt,
  });

  console.log(`[scheduleRemeasurement] Scheduled ${remeasureDays}d remeasurement for ${improvementId}, next: ${nextMeasurementAt}`);
  return { success: true, action: 'scheduled', nextMeasurementAt, remeasureDays };
}
