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

  const {
    targetUserId,
    newPlan,
    reason,
    extraSitesCount: rawExtraSitesCount,
    extraSitesValidUntil: rawExtraSitesValidUntil,
  } = request.data || {};

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', '対象ユーザーIDが必要です');
  }

  if (!newPlan || !['free', 'business'].includes(newPlan)) {
    throw new HttpsError('invalid-argument', '有効なプランを指定してください');
  }

  // extraSites の検証（任意フィールド）
  // - 0 以上の整数のみ許可
  // - 上限は 100（個別商談で更に増やす場合のみ手動で広げる前提のセーフティ）
  // - undefined（未指定）と 0/null（明示的にクリア）を区別
  const extraSitesCountProvided = rawExtraSitesCount !== undefined;
  const extraSitesCount = (() => {
    if (!extraSitesCountProvided || rawExtraSitesCount === null) return null;
    const n = Number(rawExtraSitesCount);
    if (!Number.isFinite(n) || n < 0 || n > 100 || !Number.isInteger(n)) {
      throw new HttpsError('invalid-argument', 'extraSitesCount は 0〜100 の整数で指定してください');
    }
    return n;
  })();

  const extraSitesValidUntilProvided = rawExtraSitesValidUntil !== undefined;
  const extraSitesValidUntilDate = (() => {
    if (!extraSitesValidUntilProvided || rawExtraSitesValidUntil === null || rawExtraSitesValidUntil === '') {
      return null;
    }
    const d = new Date(rawExtraSitesValidUntil);
    if (Number.isNaN(d.getTime())) {
      throw new HttpsError('invalid-argument', 'extraSitesValidUntil の日付形式が不正です');
    }
    return d;
  })();

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
    const oldExtraSitesCount = Number(userData.extraSitesCount) || 0;
    const oldExtraSitesValidUntil = userData.extraSitesValidUntil
      ? (typeof userData.extraSitesValidUntil.toDate === 'function'
        ? userData.extraSitesValidUntil.toDate()
        : new Date(userData.extraSitesValidUntil))
      : null;

    // free に下げる場合は extraSites 自動ゼロ化
    const finalExtraSitesCount = newPlan === 'free'
      ? 0
      : (extraSitesCountProvided ? (extraSitesCount ?? 0) : oldExtraSitesCount);
    const finalExtraSitesValidUntil = newPlan === 'free'
      ? null
      : (extraSitesValidUntilProvided ? extraSitesValidUntilDate : oldExtraSitesValidUntil);

    const isPlanChanged = oldPlan !== newPlan;
    const isExtraChanged =
      finalExtraSitesCount !== oldExtraSitesCount ||
      (finalExtraSitesValidUntil?.getTime?.() ?? null) !== (oldExtraSitesValidUntil?.getTime?.() ?? null);

    if (!isPlanChanged && !isExtraChanged) {
      throw new HttpsError('invalid-argument', '変更内容がありません');
    }

    // 管理者名を name 優先、lastName + firstName フォールバック
    const adminData = adminDoc.data();
    const adminName = adminData.name || (adminData.lastName && adminData.firstName
      ? `${adminData.lastName} ${adminData.firstName}`
      : '') || adminData.displayName || adminData.email || 'Admin';

    // トランザクションでプラン変更と履歴記録を実行
    await db.runTransaction(async (transaction) => {
      // 1. ユーザープロフィールを更新
      const userUpdate = {
        plan: newPlan,
        // 月間使用回数をリセット（プランアップグレード時のみ）
        ...(getPlanPriority(newPlan) > getPlanPriority(oldPlan) ? {
          aiSummaryUsage: 0,
          aiImprovementUsage: 0,
        } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // extraSites の更新（管理者からの直接設定）
      if (isExtraChanged) {
        userUpdate.extraSitesCount = finalExtraSitesCount;
        userUpdate.extraSitesValidUntil = finalExtraSitesValidUntil
          ? Timestamp.fromDate(finalExtraSitesValidUntil)
          : null;
        userUpdate.extraSitesUpdatedAt = FieldValue.serverTimestamp();
      }

      transaction.update(db.collection('users').doc(targetUserId), userUpdate);

      // 2. プラン変更履歴を記録（users/{uid}/planChangeHistory）
      const historyRef = db.collection('users').doc(targetUserId).collection('planChangeHistory').doc();
      transaction.set(historyRef, {
        userId: targetUserId,
        oldPlan,
        newPlan,
        oldExtraSitesCount,
        newExtraSitesCount: finalExtraSitesCount,
        oldExtraSitesValidUntil: oldExtraSitesValidUntil ? Timestamp.fromDate(oldExtraSitesValidUntil) : null,
        newExtraSitesValidUntil: finalExtraSitesValidUntil ? Timestamp.fromDate(finalExtraSitesValidUntil) : null,
        changedBy: uid,
        changedByName: adminName,
        reason: reason || '',
        changedAt: FieldValue.serverTimestamp(),
      });

      // 3. アクティビティログを記録
      const activityRef = db.collection('adminActivityLogs').doc();
      transaction.set(activityRef, {
        adminId: uid,
        adminName: adminName,
        action: 'plan_change',
        targetType: 'user',
        targetId: targetUserId,
        details: {
          oldPlan,
          newPlan,
          oldExtraSitesCount,
          newExtraSitesCount: finalExtraSitesCount,
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

    // §15-D-0: extras が変わった場合、board 見積も再構築
    // - admin が PlanChangeModal で extras を変更したケース
    // - newPlan='free' でダウングレードした場合は extras=0 で再構築
    // - 月単位精算: excludeCurrentMonth=true（解約相当の扱い）
    if (isExtraChanged) {
      try {
        const baseProjectId = userData.boardProjectId || userData.extraSitesBoardProjectId || null;
        const refContractEndDate = finalExtraSitesValidUntil
          ? finalExtraSitesValidUntil.toISOString().substring(0, 10)
          : (oldExtraSitesValidUntil
            ? oldExtraSitesValidUntil.toISOString().substring(0, 10)
            : null);
        if (baseProjectId && refContractEndDate) {
          const { rebuildBoardEstimateForExtras } = await import('../../utils/boardEstimateCreator.js');
          await rebuildBoardEstimateForExtras({
            boardProjectId: baseProjectId,
            totalExtras: finalExtraSitesCount,
            contractEndDate: refContractEndDate,
            // 解約・減算の場合のみ当月除外。新規追加 / 増額は当月から課金
            excludeCurrentMonth: finalExtraSitesCount < oldExtraSitesCount,
          });
          logger.info('プラン変更: board 見積再構築完了', {
            targetUserId, baseProjectId,
            oldExtras: oldExtraSitesCount, newExtras: finalExtraSitesCount,
          });
        } else if (newPlan === 'free') {
          // free にダウングレード時、ユーザー側 extras=0 にする以外は board は admin 手動運用（§21-A）
          logger.info('プラン変更: free 化のため board 見積は admin 手動運用', { targetUserId });
        }
      } catch (rebuildErr) {
        // rebuild 失敗してもプラン変更自体は成功扱い（致命的でない）
        logger.warn('プラン変更: board 見積再構築失敗', {
          targetUserId, error: rebuildErr.message,
        });
      }
    }

    // ユーザー名を name 優先、lastName + firstName フォールバック
    const userName = userData.name || (userData.lastName && userData.firstName
      ? `${userData.lastName} ${userData.firstName}`
      : '') || userData.displayName || userData.email || 'ユーザー';

    // メール通知を送信（非同期・エラーでも続行）
    sendPlanChangeEmail({
      toEmail: userData.email,
      userName: userName,
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
    business: 2,
    standard: 2, // 後方互換
    premium: 2,  // 後方互換
  };
  return priorities[plan] || 0;
}

