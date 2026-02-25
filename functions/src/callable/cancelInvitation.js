import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 招待を取り消し（削除）
 * オーナーのみ、保留中の招待を取り消せます。
 *
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.invitationId - 招待ID
 * @returns {Object} 取り消し結果
 */
export const cancelInvitationCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { invitationId } = request.data || {};

  if (!invitationId) {
    throw new HttpsError('invalid-argument', '招待IDが必要です');
  }

  try {
    const db = getFirestore();

    const invitationRef = db.collection('invitations').doc(invitationId);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', '招待が見つかりません');
    }

    const invitation = invitationDoc.data();

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const memberRole = userData?.memberRole || 'owner';
    const accountOwnerId = userData?.accountOwnerId || uid;

    if (memberRole !== 'owner' || invitation.accountOwnerId !== accountOwnerId) {
      throw new HttpsError('permission-denied', 'オーナーのみ招待を取り消せます');
    }

    if (invitation.status !== 'pending') {
      throw new HttpsError('invalid-argument', '保留中の招待のみ取り消せます');
    }

    await invitationRef.delete();

    logger.info('Invitation cancelled', { invitationId, email: invitation.email });

    return {
      success: true,
      message: '招待を取り消しました',
    };
  } catch (error) {
    logger.error('Error cancelling invitation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error?.message || '招待の取り消しに失敗しました');
  }
};
