import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';
import { generateWelcomeEmail } from '../utils/emailTemplates.js';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * ユーザー新規登録トリガーハンドラー
 * users/{uid} ドキュメント作成時にウェルカムメールを送信
 *
 * メールパスワード登録: name が既にあるため即座に送信
 * SSO登録: name がないためスキップ → logUserRegistration で送信
 */
export async function onUserCreatedHandler(event) {
  const uid = event.params.uid;
  const userData = event.data?.data();

  if (!userData) {
    logger.warn('[onUserCreated] ユーザーデータがありません', { uid });
    return;
  }

  // 管理者作成ユーザーはウェルカムメールスキップ
  if (userData._skipWelcomeEmail || userData._welcomeEmailSent) {
    logger.info('[onUserCreated] 管理者作成のためウェルカムメールスキップ', { uid });
    return;
  }

  const email = userData.email;
  if (!email) {
    logger.warn('[onUserCreated] メールアドレスがないためスキップ', { uid });
    return;
  }

  // name がなければSSO登録 → logUserRegistration で送信するためスキップ
  const displayName = userData.name
    || (userData.lastName && userData.firstName ? `${userData.lastName} ${userData.firstName}` : '');
  if (!displayName) {
    logger.info('[onUserCreated] SSO登録のためスキップ（logUserRegistrationで送信）', { uid });
    return;
  }

  try {
    const { subject, html, text } = generateWelcomeEmail({ userName: displayName });
    await sendEmailDirect({ to: email, subject, html, text });

    // 二重送信防止フラグ
    const db = getFirestore();
    await db.collection('users').doc(uid).update({ _welcomeEmailSent: true });

    logger.info('[onUserCreated] ウェルカムメール送信完了', { uid, email, displayName });
  } catch (error) {
    logger.error('[onUserCreated] ウェルカムメール送信エラー', {
      uid,
      email,
      error: error.message,
    });
  }
}
