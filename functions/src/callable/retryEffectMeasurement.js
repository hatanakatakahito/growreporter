/**
 * 効果計測の手動リトライ/再計測 Callable Function
 * エラー状態の計測をリセットして再実行、または完了済みの再計測を可能にする
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { canAccessSite } from '../utils/permissionHelper.js';
import {
  calculateNextMeasurementDate,
  isAfterPeriodPast,
} from '../utils/effectMeasurementHelper.js';

/**
 * @param {object} request
 * @param {string} request.data.siteId
 * @param {string} request.data.improvementId
 * @param {string} request.data.action - 'retry' | 'remeasure'
 *   retry: エラー状態を解消してスケジューラに再処理させる
 *   remeasure: 完了済みの計測を再実行（After指標を最新に更新）
 */
export async function retryEffectMeasurementCallable(request) {
  const db = getFirestore();
  const { siteId, improvementId, action = 'retry' } = request.data;

  if (!siteId || !improvementId) {
    throw new HttpsError('invalid-argument', 'siteId and improvementId are required');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const userId = request.auth.uid;
  const hasAccess = await canAccessSite(userId, siteId);
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
  }

  const improvementRef = db.collection('sites').doc(siteId).collection('improvements').doc(improvementId);
  const improvementDoc = await improvementRef.get();

  if (!improvementDoc.exists) {
    throw new HttpsError('not-found', '改善タスクが見つかりません');
  }

  const data = improvementDoc.data();
  const effectMeasurement = data.effectMeasurement;

  if (!effectMeasurement) {
    throw new HttpsError('failed-precondition', '効果計測データが存在しません');
  }

  if (action === 'retry') {
    // エラー状態のみリトライ可能
    if (effectMeasurement.status !== 'error') {
      throw new HttpsError('failed-precondition', 'エラー状態の計測のみリトライできます');
    }

    // Before指標がない場合はpendingに、ある場合はAfter期間チェック
    let newStatus;
    let nextMeasurementAt = null;

    if (!effectMeasurement.before) {
      newStatus = 'pending';
      nextMeasurementAt = calculateNextMeasurementDate(data.effectiveDate);
    } else if (isAfterPeriodPast(data.effectiveDate)) {
      newStatus = 'measuring';
    } else {
      newStatus = 'pending';
      nextMeasurementAt = calculateNextMeasurementDate(data.effectiveDate);
    }

    await improvementRef.update({
      'effectMeasurement.status': newStatus,
      'effectMeasurement.error': FieldValue.delete(),
      'effectMeasurement.errorAt': FieldValue.delete(),
      'effectMeasurement.retryCount': 0,
      'effectMeasurement.nextMeasurementAt': nextMeasurementAt,
      emStatus: newStatus,
      emNextMeasurementAt: nextMeasurementAt,
    });

    return { success: true, newStatus };

  } else if (action === 'remeasure') {
    // 完了済みの再計測
    if (effectMeasurement.status !== 'completed') {
      throw new HttpsError('failed-precondition', '完了済みの計測のみ再計測できます');
    }

    if (!data.effectiveDate) {
      throw new HttpsError('failed-precondition', '改善反映日が設定されていません');
    }

    // After期間が過去かチェック
    if (!isAfterPeriodPast(data.effectiveDate)) {
      throw new HttpsError('failed-precondition', 'After期間がまだ終了していません');
    }

    // measuringに戻す → 次回スケジューラで再取得
    await improvementRef.update({
      'effectMeasurement.status': 'measuring',
      'effectMeasurement.after': FieldValue.delete(),
      'effectMeasurement.changes': FieldValue.delete(),
      'effectMeasurement.overallScore': FieldValue.delete(),
      'effectMeasurement.aiEvaluation': FieldValue.delete(),
      'effectMeasurement.completedAt': FieldValue.delete(),
      'effectMeasurement.error': FieldValue.delete(),
      'effectMeasurement.retryCount': 0,
      emStatus: 'measuring',
      emNextMeasurementAt: null,
    });

    return { success: true, newStatus: 'measuring' };

  } else {
    throw new HttpsError('invalid-argument', 'action must be "retry" or "remeasure"');
  }
}
