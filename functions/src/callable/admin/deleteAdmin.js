import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * 管理者を削除
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.adminId - 削除する管理者のUID
 * @param {string} data.reason - 削除理由
 * @returns {Object} 削除結果
 */
export const deleteAdminCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    adminId,
    reason = '',
  } = request.data || {};

  if (!adminId) {
    throw new HttpsError('invalid-argument', '管理者IDが必要です');
  }

  if (uid === adminId) {
    throw new HttpsError('invalid-argument', '自分自身は削除できません');
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

    // 管理者情報を取得
    const executorData = executorAdminDoc.data();
    const executorName = (executorData.lastName && executorData.firstName) 
      ? `${executorData.lastName} ${executorData.firstName}` 
      : (executorData.displayName || executorData.email || 'Admin');

    const targetData = targetAdminDoc.data();
    const targetName = (targetData.lastName && targetData.firstName) 
      ? `${targetData.lastName} ${targetData.firstName}` 
      : (targetData.displayName || targetData.email || 'Admin');

    // 管理者ドキュメントを削除
    await db.collection('adminUsers').doc(adminId).delete();

    logger.info('管理者削除完了', { 
      executorId: uid,
      deletedAdminId: adminId,
    });

    // アクティビティログに記録
    await logActivity(db, {
      adminId: uid,
      adminName: executorName,
      action: 'admin_deleted',
      targetType: 'admin',
      targetId: adminId,
      details: {
        targetName,
        email: targetData.email,
        role: targetData.role,
        reason,
      },
    });

    return {
      success: true,
      message: `${targetName}さんを管理者から削除しました`,
    };

  } catch (error) {
    logger.error('管理者削除エラー', { 
      error: error.message,
      executorId: uid,
      adminId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '管理者の削除に失敗しました');
  }
};

