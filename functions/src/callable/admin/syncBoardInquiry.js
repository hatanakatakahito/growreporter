import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { createBoardClient } from '../../utils/boardApiClient.js';

/**
 * board から最新情報を取得して Firestore に同期（手動ボタン用）
 */
export const syncBoardInquiryCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();

    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const { inquiryId } = request.data || {};
    if (!inquiryId) {
      throw new HttpsError('invalid-argument', 'inquiryIdは必須です');
    }

    const inquiryDoc = await db.collection('upgradeInquiries').doc(inquiryId).get();
    if (!inquiryDoc.exists) {
      throw new HttpsError('not-found', '問い合わせが見つかりません');
    }

    const data = inquiryDoc.data();
    if (!data.boardProjectId) {
      throw new HttpsError('failed-precondition', 'board連携されていません');
    }

    const result = await syncFromBoard(db, inquiryId, data);
    return { success: true, synced: result };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('syncBoardInquiry error:', { error: error.message });
    throw new HttpsError('internal', `board同期に失敗: ${error.message}`);
  }
};

/**
 * board APIから案件・見積書情報を取得してFirestoreに同期
 *
 * 副作用 (v5.8.0):
 *   - inquiry.status === 'active' の場合、契約終了日が変わったら
 *     紐づく users.extraSitesValidUntil も同期する
 */
export async function syncFromBoard(db, inquiryId, inquiryData) {
  const client = createBoardClient();
  const { boardProjectId, boardEstimateId } = inquiryData;

  if (!boardProjectId) return null;

  // 案件情報を取得（見積書含む）
  const project = await client.getProject(boardProjectId, 'estimate');
  if (!project) {
    logger.warn('[boardSync] 案件が見つかりません', { boardProjectId });
    return null;
  }

  const updateData = {
    boardSyncedAt: FieldValue.serverTimestamp(),
  };

  // 案件情報の同期
  if (project.invoice_timing_kbn != null) {
    updateData.boardInvoiceTimingKbn = project.invoice_timing_kbn;
    updateData.paymentTiming = project.invoice_timing_kbn === 1 ? 'bulk' : 'recurring';
  }
  if (project.order_status != null) {
    updateData.boardOrderStatus = project.order_status;
    updateData.boardOrderStatusName = project.order_status_name || '';
  }
  if (project.contract_start_date) {
    updateData.contractStartDate = project.contract_start_date;
  }
  if (project.contract_end_date) {
    updateData.contractEndDate = project.contract_end_date;
  }

  // 見積書情報の同期
  if (project.estimate) {
    const est = project.estimate;
    updateData.boardEstimateTotal = parseFloat(est.total) || 0;
    updateData.boardEstimateTax = parseFloat(est.tax) || 0;
    updateData.boardEstimateDetails = (est.details || []).map(d => ({
      description: d.description,
      quantity: parseFloat(d.quantity) || 0,
      unit: d.unit || '',
      unit_price: parseFloat(d.unit_price) || 0,
      price: parseFloat(d.price) || 0,
      tax_rate: parseFloat(d.tax_rate) || 0,
    }));
  }

  await db.collection('upgradeInquiries').doc(inquiryId).update(updateData);

  logger.info('[boardSync] 同期完了', {
    inquiryId,
    boardProjectId,
    orderStatus: project.order_status_name,
    total: project.estimate?.total,
  });

  // active な inquiry で契約終了日が変わったら、users.extraSitesValidUntil も追従
  // - 同期されるのは紐づくユーザーが「この inquiry の boardProjectId をオーナーとして保持している」場合のみ
  if (
    inquiryData.status === 'active' &&
    inquiryData.uid &&
    updateData.contractEndDate &&
    updateData.contractEndDate !== inquiryData.contractEndDate
  ) {
    try {
      const userRef = db.collection('users').doc(inquiryData.uid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const userBoardProjectId = userData.boardProjectId || userData.extraSitesBoardProjectId || null;
        // 紐付き確認: ユーザーの保持する案件 ID と一致する場合のみ反映
        if (userBoardProjectId && userBoardProjectId === boardProjectId) {
          const newEnd = new Date(updateData.contractEndDate);
          if (!Number.isNaN(newEnd.getTime())) {
            await userRef.update({
              extraSitesValidUntil: Timestamp.fromDate(newEnd),
              extraSitesUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            logger.info('[boardSync] users.extraSitesValidUntil も同期', {
              uid: inquiryData.uid,
              newEnd: updateData.contractEndDate,
            });
          }
        }
      }
    } catch (syncErr) {
      logger.warn('[boardSync] extraSitesValidUntil 同期エラー（同期処理は成功）', {
        inquiryId,
        error: syncErr.message,
      });
    }
  }

  return updateData;
}
