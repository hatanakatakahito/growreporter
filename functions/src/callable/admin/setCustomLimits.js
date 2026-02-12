import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * 個別制限を設定
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.userId - 対象ユーザーID
 * @param {Object} data.limits - 制限内容
 * @param {number|null} data.limits.maxSites - サイト登録数上限
 * @param {number|null} data.limits.aiSummaryMonthly - AI分析月間上限
 * @param {number|null} data.limits.aiImprovementMonthly - AI改善月間上限
 * @param {string|null} data.validUntil - 有効期限（ISO文字列、nullで無期限）
 * @param {string} data.reason - 設定理由
 * @returns {Object} 設定結果
 */
export const setCustomLimitsCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    userId: targetUserId,
    limits,
    validUntil,
    reason = '',
  } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'ユーザーIDが必要です');
  }

  if (!limits) {
    throw new HttpsError('invalid-argument', '制限内容が必要です');
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

    // 有効期限のパース
    const validUntilTimestamp = validUntil 
      ? Timestamp.fromDate(new Date(validUntil))
      : null;

    // 現在の設定を取得
    const existingLimitDoc = await db.collection('customLimits').doc(targetUserId).get();
    const oldLimits = existingLimitDoc.exists ? existingLimitDoc.data().limits : null;

    // customLimits ドキュメントを作成/更新
    const customLimitData = {
      userId: targetUserId,
      limits: {
        maxSites: limits.maxSites !== undefined ? limits.maxSites : null,
        aiSummaryMonthly: limits.aiSummaryMonthly !== undefined ? limits.aiSummaryMonthly : null,
        aiImprovementMonthly: limits.aiImprovementMonthly !== undefined ? limits.aiImprovementMonthly : null,
      },
      validFrom: Timestamp.now(),
      validUntil: validUntilTimestamp,
      reason: reason,
      setBy: uid,
      setByName: adminName,
      updatedAt: FieldValue.serverTimestamp(),
      isActive: true,
    };

    // 新規作成の場合は createdAt を追加
    if (!existingLimitDoc.exists) {
      customLimitData.createdAt = FieldValue.serverTimestamp();
    }

    await db.collection('customLimits').doc(targetUserId).set(customLimitData, { merge: true });

    logger.info('個別制限設定完了', { 
      adminId: uid,
      targetUserId,
      limits,
    });

    // アクティビティログに記録
    await logActivity(db, {
      adminId: uid,
      adminName: adminName,
      action: 'custom_limits_set',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        oldLimits,
        newLimits: customLimitData.limits,
        validUntil: validUntil,
        reason: reason,
      },
    });

    // ユーザー名を取得
    const userName = (userData.lastName && userData.firstName) 
      ? `${userData.lastName} ${userData.firstName}` 
      : (userData.displayName || userData.email || 'ユーザー');

    return {
      success: true,
      message: `${userName}さんの個別制限を設定しました`,
      data: customLimitData,
    };

  } catch (error) {
    logger.error('個別制限設定エラー', { 
      error: error.message,
      adminId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '個別制限の設定に失敗しました');
  }
};

