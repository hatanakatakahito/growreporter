import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const VALID_STATUSES = ['new', 'estimate_created', 'contract_sent', 'active', 'completed', 'cancelled', 'inquiry_cancelled'];

/**
 * 問い合わせステータス更新
 * activeにした場合、自動でupdateUserPlanを実行
 */
export const updateInquiryStatusCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();

    // 管理者権限チェック（admin/editorのみ）
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const { inquiryId, status, adminNote } = request.data || {};

    if (!inquiryId || !status) {
      throw new HttpsError('invalid-argument', 'inquiryIdとstatusは必須です');
    }
    if (!VALID_STATUSES.includes(status)) {
      throw new HttpsError('invalid-argument', `無効なステータス: ${status}`);
    }

    const inquiryRef = db.collection('upgradeInquiries').doc(inquiryId);
    const inquiryDoc = await inquiryRef.get();
    if (!inquiryDoc.exists) {
      throw new HttpsError('not-found', '問い合わせが見つかりません');
    }

    const inquiryData = inquiryDoc.data();
    const oldStatus = inquiryData.status;

    // ステータス更新
    const updateData = {
      status,
      statusUpdatedAt: FieldValue.serverTimestamp(),
      statusUpdatedBy: uid,
    };
    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }
    await inquiryRef.update(updateData);

    // アクティビティログ記録
    const adminData = adminDoc.data();
    await db.collection('adminActivityLogs').add({
      adminId: uid,
      adminName: adminData.displayName || adminData.email || uid,
      action: 'inquiry_status_change',
      targetType: 'upgradeInquiry',
      targetId: inquiryId,
      details: { oldStatus, newStatus: status, adminNote: adminNote || null },
      createdAt: FieldValue.serverTimestamp(),
    });

    // active にした場合、自動でプラン変更（free → business）
    if (status === 'active' && inquiryData.uid) {
      try {
        const userRef = db.collection('users').doc(inquiryData.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const currentPlan = userDoc.data().plan || 'free';
          if (currentPlan !== 'business') {
            // プラン変更
            await userRef.update({
              plan: 'business',
              aiSummaryUsage: 0,
              aiImprovementUsage: 0,
              updatedAt: FieldValue.serverTimestamp(),
            });

            // プラン変更履歴
            await db.collection('users').doc(inquiryData.uid)
              .collection('planChangeHistory').add({
                userId: inquiryData.uid,
                oldPlan: currentPlan,
                newPlan: 'business',
                changedBy: uid,
                changedByName: adminData.displayName || adminData.email || uid,
                reason: '問い合わせ管理からのプラン変更（自動）',
                changedAt: FieldValue.serverTimestamp(),
              });

            // プラン変更メール送信
            try {
              const { sendPlanChangeEmail } = await import('../../utils/emailSender.js');
              await sendPlanChangeEmail({
                toEmail: inquiryData.email || userDoc.data().email,
                userName: `${inquiryData.lastName || ''} ${inquiryData.firstName || ''}`.trim(),
                oldPlan: currentPlan,
                newPlan: 'business',
              });
            } catch (emailErr) {
              logger.warn('プラン変更メール送信失敗', { error: emailErr.message });
            }

            logger.info('問い合わせからプラン自動変更', {
              inquiryId, userId: inquiryData.uid, oldPlan: currentPlan,
            });
          }
        }
      } catch (planErr) {
        logger.error('プラン自動変更エラー', { error: planErr.message, inquiryId });
        // プラン変更失敗してもステータス変更は成功として返す
      }
    }

    // 解約にした場合、自動でプランをfreeに戻す（business → free）
    if (status === 'cancelled' && inquiryData.uid) {
      try {
        const userRef = db.collection('users').doc(inquiryData.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const currentPlan = userDoc.data().plan || 'free';
          if (currentPlan === 'business') {
            await userRef.update({
              plan: 'free',
              updatedAt: FieldValue.serverTimestamp(),
            });

            await db.collection('users').doc(inquiryData.uid)
              .collection('planChangeHistory').add({
                userId: inquiryData.uid,
                oldPlan: 'business',
                newPlan: 'free',
                changedBy: uid,
                changedByName: adminData.displayName || adminData.email || uid,
                reason: '解約による自動ダウングレード',
                changedAt: FieldValue.serverTimestamp(),
              });

            try {
              const { sendPlanChangeEmail } = await import('../../utils/emailSender.js');
              await sendPlanChangeEmail({
                toEmail: inquiryData.email || userDoc.data().email,
                userName: `${inquiryData.lastName || ''} ${inquiryData.firstName || ''}`.trim(),
                oldPlan: 'business',
                newPlan: 'free',
              });
            } catch (emailErr) {
              logger.warn('解約プラン変更メール送信失敗', { error: emailErr.message });
            }

            logger.info('解約によるプランダウングレード', {
              inquiryId, userId: inquiryData.uid,
            });
          }
        }
      } catch (planErr) {
        logger.error('解約プランダウングレードエラー', { error: planErr.message, inquiryId });
      }
    }

    logger.info('問い合わせステータス更新', { inquiryId, oldStatus, newStatus: status });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('updateInquiryStatus error:', { error: error.message });
    throw new HttpsError('internal', 'ステータス更新に失敗しました');
  }
};
