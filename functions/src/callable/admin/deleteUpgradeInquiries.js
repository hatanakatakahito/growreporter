import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 問い合わせ削除（管理者用）
 */
export const deleteUpgradeInquiriesCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();

    // admin のみ削除可
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', '管理者（admin）権限が必要です');
    }

    const { inquiryIds } = request.data || {};
    if (!inquiryIds || !Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      throw new HttpsError('invalid-argument', '削除対象のIDが必要です');
    }

    const batch = db.batch();
    for (const id of inquiryIds) {
      batch.delete(db.collection('upgradeInquiries').doc(id));
    }
    await batch.commit();

    // アクティビティログ
    const adminData = adminDoc.data();
    await db.collection('adminActivityLogs').add({
      adminId: uid,
      adminName: adminData.displayName || adminData.email || uid,
      action: 'inquiry_delete',
      targetType: 'upgradeInquiry',
      targetId: inquiryIds.join(', '),
      details: { count: inquiryIds.length },
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info('問い合わせ削除', { count: inquiryIds.length, adminId: uid });
    return { success: true, deletedCount: inquiryIds.length };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('deleteUpgradeInquiries error:', { error: error.message });
    throw new HttpsError('internal', '削除に失敗しました');
  }
};
