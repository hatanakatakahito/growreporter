import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 既存の inquiry に uid を後付け紐付けする callable（§15 Phase 2）
 *
 * 用途:
 * - board 取り込みで uid=null として作成された inquiry を、後から admin がユーザー作成・選択して紐付ける
 * - 既存ユーザーへの紐付け / 新規作成ユーザーへの紐付け両方に対応
 *
 * @param {Object} data
 * @param {string} data.inquiryId - 紐付け対象 inquiry ID
 * @param {string} data.uid - 紐付ける uid
 */
export const linkInquiryToUserCallable = async (request) => {
  const adminUid = request.auth?.uid;
  if (!adminUid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { inquiryId, uid } = request.data || {};
  if (!inquiryId || !uid) {
    throw new HttpsError('invalid-argument', 'inquiryId と uid は必須です');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(adminUid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // inquiry の存在確認
    const inquiryRef = db.collection('upgradeInquiries').doc(inquiryId);
    const inquiryDoc = await inquiryRef.get();
    if (!inquiryDoc.exists) {
      throw new HttpsError('not-found', 'inquiry が見つかりません');
    }

    const inquiryData = inquiryDoc.data();
    const oldUid = inquiryData.uid || null;

    if (oldUid === uid) {
      // 既に同じ uid に紐付いている → 何もしない
      return {
        success: true,
        message: '既に同じユーザーに紐付いています',
        inquiryId,
        uid,
      };
    }

    // 紐付け先ユーザーの存在確認
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '紐付け先ユーザーが見つかりません');
    }

    // inquiry を更新
    await inquiryRef.update({
      uid,
      linkedUserAt: FieldValue.serverTimestamp(),
      linkedUserBy: adminUid,
    });

    // 監査ログ
    const adminData = adminDoc.data();
    const adminName = adminData.name
      || (adminData.lastName && adminData.firstName ? `${adminData.lastName} ${adminData.firstName}` : '')
      || adminData.displayName || adminData.email || 'Admin';
    await db.collection('adminActivityLogs').add({
      adminId: adminUid,
      adminName,
      action: 'inquiry_link_user',
      targetType: 'upgradeInquiry',
      targetId: inquiryId,
      details: {
        oldUid,
        newUid: uid,
        targetEmail: userDoc.data().email || null,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info('[linkInquiryToUser] 紐付け完了', {
      adminId: adminUid,
      inquiryId,
      oldUid,
      newUid: uid,
    });

    return {
      success: true,
      inquiryId,
      uid,
      oldUid,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[linkInquiryToUser] エラー', {
      adminId: adminUid,
      inquiryId,
      uid,
      error: error.message,
    });
    throw new HttpsError('internal', `inquiry 紐付けに失敗: ${error.message}`);
  }
};
