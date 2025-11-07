import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * 個別制限を削除
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.userId - 対象ユーザーID
 * @param {string} data.reason - 削除理由
 * @returns {Object} 削除結果
 */
export const removeCustomLimitsCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    userId: targetUserId,
    reason = '',
  } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'ユーザーIDが必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
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
    
    // 管理者名を取得
    const adminData = adminDoc.data();
    const adminName = (adminData.lastName && adminData.firstName) 
      ? `${adminData.lastName} ${adminData.firstName}` 
      : (adminData.displayName || adminData.email || 'Admin');

    // 既存の制限を取得
    const existingLimitDoc = await db.collection('customLimits').doc(targetUserId).get();
    
    if (!existingLimitDoc.exists) {
      throw new HttpsError('not-found', '個別制限が設定されていません');
    }

    const oldLimits = existingLimitDoc.data();

    // customLimits ドキュメントを削除
    await db.collection('customLimits').doc(targetUserId).delete();

    logger.info('個別制限削除完了', { 
      adminId: uid,
      targetUserId,
    });

    // アクティビティログに記録
    await logActivity(db, {
      adminId: uid,
      adminName: adminName,
      action: 'custom_limits_removed',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        oldLimits: oldLimits.limits,
        reason: reason,
      },
    });

    // ユーザー名を取得
    const userName = (userData.lastName && userData.firstName) 
      ? `${userData.lastName} ${userData.firstName}` 
      : (userData.displayName || userData.email || 'ユーザー');

    return {
      success: true,
      message: `${userName}さんの個別制限を削除しました`,
    };

  } catch (error) {
    logger.error('個別制限削除エラー', { 
      error: error.message,
      adminId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '個別制限の削除に失敗しました');
  }
};

