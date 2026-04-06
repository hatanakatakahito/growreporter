import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { createBoardEstimateFromInquiry } from '../../utils/boardEstimateCreator.js';

/**
 * board見積作成のリトライ（管理者用）
 */
export const retryBoardEstimateCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（admin/editorのみ）
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
    logger.info('board見積リトライ開始', { inquiryId, companyName: data.companyName });

    const result = await createBoardEstimateFromInquiry(inquiryId, data);

    logger.info('board見積リトライ成功', { inquiryId, boardEstimateId: result.boardEstimateId });
    return { success: true, boardEstimateId: result.boardEstimateId };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('retryBoardEstimate error:', { error: error.message });
    throw new HttpsError('internal', `board見積作成に失敗: ${error.message}`);
  }
};
