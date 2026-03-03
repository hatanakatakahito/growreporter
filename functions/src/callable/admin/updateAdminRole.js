import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 管理者の権限を変更
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.adminId - 対象管理者のUID
 * @param {string} data.newRole - 新しい権限 (admin/editor/viewer)
 * @param {string} data.reason - 変更理由
 * @returns {Object} 変更結果
 */
export const updateAdminRoleCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    adminId,
    newRole,
    reason = '',
  } = request.data || {};

  if (!adminId) {
    throw new HttpsError('invalid-argument', '管理者IDが必要です');
  }

  if (!newRole || !['admin', 'editor', 'viewer'].includes(newRole)) {
    throw new HttpsError('invalid-argument', '有効な権限を指定してください');
  }

  if (uid === adminId) {
    throw new HttpsError('invalid-argument', '自分自身の権限は変更できません');
  }

  try {
    const db = getFirestore();
    
    // 実行者の管理者権限チェック（adminロールのみ許可）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || executorAdminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は管理者ロールのみ実行可能です');
    }

    // 対象管理者の存在確認
    const targetAdminDoc = await db.collection('adminUsers').doc(adminId).get();
    if (!targetAdminDoc.exists) {
      throw new HttpsError('not-found', '対象の管理者が見つかりません');
    }

    const oldRole = targetAdminDoc.data().role;

    // 管理者情報を取得
    const executorData = executorAdminDoc.data();
    const executorName = executorData.name || (executorData.lastName && executorData.firstName
      ? `${executorData.lastName} ${executorData.firstName}`
      : '') || executorData.displayName || executorData.email || 'Admin';

    const targetData = targetAdminDoc.data();
    const targetName = targetData.name || (targetData.lastName && targetData.firstName
      ? `${targetData.lastName} ${targetData.firstName}`
      : '') || targetData.displayName || targetData.email || 'Admin';

    // ロールを更新
    await db.collection('adminUsers').doc(adminId).update({
      role: newRole,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    });

    logger.info('管理者権限変更完了', { 
      executorId: uid,
      adminId,
      oldRole,
      newRole,
    });

    return {
      success: true,
      message: `${targetName}さんの権限を変更しました`,
    };

  } catch (error) {
    logger.error('管理者権限変更エラー', { 
      error: error.message,
      executorId: uid,
      adminId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '管理者権限の変更に失敗しました');
  }
};

