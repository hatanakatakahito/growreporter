import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { logUserActivity, ACTIVITY_ACTIONS } from '../utils/userActivityLogger.js';
import { sendEmailDirect } from '../utils/emailSender.js';
import { generateWelcomeEmail } from '../utils/emailTemplates.js';

/**
 * ユーザー登録ログを記録 + ウェルカムメール送信
 * CompleteProfile 完了後に呼ばれる（SSO/メールパスワード両方）
 *
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.displayName - 表示名（"姓 名" 形式）
 * @param {string} data.plan - プラン
 * @returns {Object} 記録結果
 */
export const logUserRegistrationCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    displayName = '',
    plan = 'free',
  } = request.data || {};

  try {
    const userEmail = request.auth.token.email || '';

    await logUserActivity({
      userId: uid,
      userEmail,
      userName: displayName,
      action: ACTIVITY_ACTIONS.USER_REGISTERED,
      details: {
        plan,
        displayName,
      },
    });

    logger.info('ユーザー登録ログ記録完了', {
      userId: uid,
      userEmail,
    });

    // ウェルカムメール送信（未送信の場合のみ）
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();

      if (userEmail && !userData?._welcomeEmailSent) {
        const { subject, html, text } = generateWelcomeEmail({ userName: displayName });
        await sendEmailDirect({ to: userEmail, subject, html, text });
        await db.collection('users').doc(uid).update({ _welcomeEmailSent: true });
        logger.info('ウェルカムメール送信完了', { userId: uid, userEmail, displayName });
      } else {
        logger.info('ウェルカムメール送信済みのためスキップ', { userId: uid });
      }
    } catch (emailError) {
      logger.error('ウェルカムメール送信エラー', { userId: uid, error: emailError.message });
      // メール送信エラーは無視して処理を続行
    }

    return {
      success: true,
    };

  } catch (error) {
    logger.error('ユーザー登録ログ記録エラー', {
      error: error.message,
      userId: uid,
    });

    // ログ記録エラーでもメインの処理は成功とする
    return {
      success: true,
    };
  }
};
