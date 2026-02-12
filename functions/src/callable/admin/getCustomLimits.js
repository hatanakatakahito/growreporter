import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * 個別制限を取得
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.userId - 対象ユーザーID
 * @returns {Object} 個別制限データ
 */
export const getCustomLimitsCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { userId: targetUserId } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'ユーザーIDが必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // customLimits ドキュメントを取得
    const customLimitDoc = await db.collection('customLimits').doc(targetUserId).get();

    if (!customLimitDoc.exists) {
      return {
        success: true,
        data: null,
      };
    }

    const data = customLimitDoc.data();
    
    // 有効期限チェック
    const now = new Date();
    const isExpired = data.validUntil && data.validUntil.toDate() < now;

    return {
      success: true,
      data: {
        userId: data.userId,
        limits: data.limits,
        validFrom: data.validFrom?.toDate?.().toISOString() || null,
        validUntil: data.validUntil?.toDate?.().toISOString() || null,
        reason: data.reason || '',
        setBy: data.setBy,
        setByName: data.setByName,
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        isActive: data.isActive && !isExpired,
        isExpired,
      },
    };

  } catch (error) {
    logger.error('個別制限取得エラー', { 
      error: error.message,
      adminId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '個別制限の取得に失敗しました');
  }
};

