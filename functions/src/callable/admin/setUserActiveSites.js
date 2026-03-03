import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者がユーザーの有効サイトIDリストを設定する
 * ダウングレード時に間違ったサイトを選択した場合の修正用
 *
 * @param {string} data.targetUserId - 対象ユーザーID
 * @param {string[]} data.activeSiteIds - 有効にするサイトIDリスト
 */
export const setUserActiveSitesCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { targetUserId, activeSiteIds } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'ユーザーIDが必要です');
  }

  if (!Array.isArray(activeSiteIds)) {
    throw new HttpsError('invalid-argument', 'activeSiteIdsは配列で指定してください');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（admin または editor）
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // 対象ユーザーの存在確認
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '対象ユーザーが見つかりません');
    }

    const userData = userDoc.data();
    const oldActiveSiteIds = userData.activeSiteIds || null;

    // activeSiteIds を更新
    await db.collection('users').doc(targetUserId).update({
      activeSiteIds: activeSiteIds.length > 0 ? activeSiteIds : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 管理者名を取得
    const adminData = adminDoc.data();
    const adminName = adminData.name || (adminData.lastName && adminData.firstName
      ? `${adminData.lastName} ${adminData.firstName}`
      : '') || adminData.displayName || adminData.email || 'Admin';

    const userName = userData.name || (userData.lastName && userData.firstName
      ? `${userData.lastName} ${userData.firstName}`
      : '') || userData.displayName || userData.email || 'ユーザー';

    logger.info('有効サイト設定完了', {
      adminId: uid,
      adminName,
      targetUserId,
      activeSiteIds,
    });

    return {
      success: true,
      message: `${userName}さんの有効サイトを更新しました`,
      data: { oldActiveSiteIds, newActiveSiteIds: activeSiteIds },
    };

  } catch (error) {
    logger.error('有効サイト設定エラー', {
      error: error.message,
      adminId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '有効サイトの設定に失敗しました');
  }
};
