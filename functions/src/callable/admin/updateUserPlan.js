import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { sendPlanChangeEmail } from '../../utils/emailSender.js';

/**
 * 管理者用ユーザープラン変更
 * プラン変更 + 履歴記録 + 使用制限リセット
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.targetUserId - 対象ユーザーのUID
 * @param {string} data.newPlan - 新しいプラン（free/standard/premium）
 * @param {string} data.reason - 変更理由
 * @returns {Object} 成功メッセージ
 */
export const updateUserPlanCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { targetUserId, newPlan, reason } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', '対象ユーザーIDが必要です');
  }

  if (!newPlan || !['free', 'standard', 'premium'].includes(newPlan)) {
    throw new HttpsError('invalid-argument', '有効なプランを指定してください');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    logger.info('プラン変更開始', { 
      adminId: uid,
      targetUserId,
      newPlan,
      reason,
    });

    // 対象ユーザーの現在のプランを取得
    const userDoc = await db.collection('users').doc(targetUserId).get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }

    const userData = userDoc.data();
    const oldPlan = userData.plan || 'free';

    if (oldPlan === newPlan) {
      throw new HttpsError('invalid-argument', 'すでに同じプランです');
    }

    // トランザクションでプラン変更と履歴記録を実行
    await db.runTransaction(async (transaction) => {
      // 1. ユーザープロフィールを更新
      transaction.update(db.collection('users').doc(targetUserId), {
        plan: newPlan,
        // 月間使用回数をリセット（プランアップグレード時のみ）
        ...(getPlanPriority(newPlan) > getPlanPriority(oldPlan) ? {
          aiSummaryUsage: 0,
          aiImprovementUsage: 0,
        } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 2. プラン変更履歴を記録
      const historyRef = db.collection('planChangeHistory').doc();
      transaction.set(historyRef, {
        userId: targetUserId,
        oldPlan,
        newPlan,
        changedBy: uid,
        changedByName: adminDoc.data().displayName || adminDoc.data().email || 'Admin',
        reason: reason || '',
        changedAt: FieldValue.serverTimestamp(),
      });

      // 3. アクティビティログを記録
      const activityRef = db.collection('adminActivityLogs').doc();
      transaction.set(activityRef, {
        adminId: uid,
        adminName: adminDoc.data().displayName || adminDoc.data().email || 'Admin',
        action: 'plan_change',
        targetType: 'user',
        targetId: targetUserId,
        details: {
          oldPlan,
          newPlan,
          reason: reason || '',
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info('プラン変更完了', { 
      adminId: uid,
      targetUserId,
      oldPlan,
      newPlan,
    });

    // メール通知を送信（非同期・エラーでも続行）
    sendPlanChangeEmail({
      toEmail: userData.email,
      userName: userData.displayName || userData.email || 'ユーザー',
      oldPlan,
      newPlan,
      reason: reason || '',
    }).catch(error => {
      logger.error('プラン変更通知メール送信エラー', { error: error.message });
    });

    return {
      success: true,
      message: `プランを${oldPlan}から${newPlan}に変更しました`,
      data: {
        userId: targetUserId,
        oldPlan,
        newPlan,
      },
    };

  } catch (error) {
    logger.error('プラン変更エラー', { 
      error: error.message,
      adminId: uid,
      targetUserId,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'プラン変更に失敗しました');
  }
};

/**
 * プランの優先度を取得（数字が大きいほど上位プラン）
 */
function getPlanPriority(plan) {
  const priorities = {
    free: 1,
    standard: 2,
    premium: 3,
  };
  return priorities[plan] || 0;
}

