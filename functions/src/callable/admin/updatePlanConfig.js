import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * プラン設定を更新
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {Object} data.config - 新しいプラン設定
 * @param {string} data.reason - 変更理由
 * @returns {Object} 更新結果
 */
export const updatePlanConfigCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    config,
    reason = '',
  } = request.data || {};

  if (!config) {
    throw new HttpsError('invalid-argument', 'プラン設定が必要です');
  }

  try {
    const db = getFirestore();
    
    // 実行者の管理者権限チェック（adminロールのみ許可）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || executorAdminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'この操作は管理者ロールのみ実行可能です');
    }

    // 実行者情報を取得
    const executorData = executorAdminDoc.data();
    const executorName = (executorData.lastName && executorData.firstName) 
      ? `${executorData.lastName} ${executorData.firstName}` 
      : (executorData.displayName || executorData.email || 'Admin');

    // 既存の設定を取得
    const configDoc = await db.collection('planConfig').doc('default').get();
    const oldConfig = configDoc.exists ? configDoc.data() : null;

    // プラン設定を更新
    await db.collection('planConfig').doc('default').set({
      ...config,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    }, { merge: true });

    logger.info('プラン設定更新完了', { 
      executorId: uid,
    });

    // アクティビティログに記録
    await logActivity(db, {
      adminId: uid,
      adminName: executorName,
      action: 'plan_config_updated',
      targetType: 'system',
      targetId: 'plan_config',
      details: {
        oldConfig,
        newConfig: config,
        reason,
      },
    });

    return {
      success: true,
      message: 'プラン設定を更新しました',
    };

  } catch (error) {
    logger.error('プラン設定更新エラー', { 
      error: error.message,
      executorId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'プラン設定の更新に失敗しました');
  }
};

