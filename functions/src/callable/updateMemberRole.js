import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { requireDocId, requireEnum } from '../utils/validators.js';

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

  // 入力検証 (Phase 4-B-7)
  const memberId = requireDocId(request.data?.memberId, 'memberId');
  const newRole = requireEnum(request.data?.newRole, 'newRole', ['editor', 'viewer']);

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
    //    新仕様: editor / viewer ともに allowedSiteIds でサイト指定式
    //    - editor ↔ viewer の切替: allowedSiteIds は維持（同じサイトを引き継ぐ）
    //    - 必要に応じてオーナーが「サイト割当」UI で個別調整する
    const updateData = {
      memberRole: newRole,
      updatedAt: FieldValue.serverTimestamp()
    };

    // memberships マップ内のロールも整合させる
    if (memberData.memberships && memberData.memberships[accountOwnerId]) {
      updateData[`memberships.${accountOwnerId}.role`] = newRole;
    }

    const previousRole = memberData.memberRole;
    await db.collection('users').doc(memberId).update(updateData);

    logger.info('Member role updated', { memberId, previousRole, newRole });

    return { success: true, message: '権限を更新しました' };
  } catch (error) {
    logger.error('Error updating member role:', error);
    throw error;
  }
};
