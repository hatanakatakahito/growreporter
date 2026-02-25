import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * トークンで招待情報を取得（未ログインの招待画面用）
 * 認証不要。トークンを知っている人だけが招待内容を取得できる。
 *
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.token - 招待トークン
 * @returns {Object} 表示用招待情報（id, email, accountOwnerName, invitedByName, role, expiresAt）
 */
export const getInvitationByTokenCallable = async (request) => {
  const { token } = request.data || {};

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'トークンが必要です');
  }

  try {
    const db = getFirestore();
    const invitationsSnapshot = await db.collection('invitations')
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (invitationsSnapshot.empty) {
      throw new HttpsError('not-found', '招待が見つかりません。既に承認済み、取り消された、または期限切れの可能性があります。');
    }

    const doc = invitationsSnapshot.docs[0];
    const data = doc.data();

    const expiresAt = data.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) {
      throw new HttpsError('deadline-exceeded', '招待の有効期限が切れています');
    }

    return {
      id: doc.id,
      email: data.email || '',
      accountOwnerName: data.accountOwnerName || '',
      invitedByName: data.invitedByName || '',
      role: data.role || 'viewer',
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Error getting invitation by token:', error);
    throw new HttpsError('internal', '招待情報の取得に失敗しました');
  }
};
