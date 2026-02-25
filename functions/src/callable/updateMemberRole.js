import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * メンバーの権限を変更
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.memberId - メンバーID
 * @param {string} data.newRole - 新しい権限 (editor/viewer)
 * @returns {Object} 更新結果
 */
export const updateMemberRoleCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { memberId, newRole } = request.data || {};

  if (!memberId || !newRole) {
    throw new HttpsError('invalid-argument', 'メンバーIDと新しい権限が必要です');
  }

  if (!['editor', 'viewer'].includes(newRole)) {
    throw new HttpsError('invalid-argument', '無効な権限です');
  }

  try {
    const db = getFirestore();
    
    // 1. 実行者がオーナーかチェック
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    const userData = userDoc.data();
    const memberRole = userData.memberRole || 'owner';
    const accountOwnerId = userData.accountOwnerId || uid;
    
    if (memberRole !== 'owner') {
      throw new HttpsError('permission-denied', 'オーナーのみ権限を変更できます');
    }
    
    // 2. 対象メンバー（memberId = ユーザー uid）を取得
    const memberUserDoc = await db.collection('users').doc(memberId).get();
    if (!memberUserDoc.exists) {
      throw new HttpsError('not-found', 'メンバーが見つかりません');
    }
    const memberData = memberUserDoc.data();
    if (memberData.accountOwnerId !== accountOwnerId) {
      throw new HttpsError('permission-denied', 'このアカウントのメンバーではありません');
    }
    if (memberData.memberRole === 'owner') {
      throw new HttpsError('invalid-argument', 'オーナーの権限は変更できません');
    }
    
    // 3. ユーザーの memberRole を更新（users のみ。accountMembers は参照しない）
    await db.collection('users').doc(memberId).update({
      memberRole: newRole,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    logger.info('Member role updated', { memberId, newRole });
    
    return { success: true, message: '権限を更新しました' };
  } catch (error) {
    logger.error('Error updating member role:', error);
    throw error;
  }
};
