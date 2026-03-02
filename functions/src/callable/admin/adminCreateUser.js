import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../../utils/userActivityLogger.js';
import { sendEmailDirect } from '../../utils/emailSender.js';
import { generateWelcomeEmail } from '../../utils/emailTemplates.js';

/**
 * 管理者がユーザーを新規作成
 * Firebase Auth + Firestore usersドキュメントを作成
 *
 * @param {Object} data.email - メールアドレス（必須）
 * @param {string} data.lastName - 姓（必須）
 * @param {string} data.firstName - 名（必須）
 * @param {string} data.company - 組織名（必須）
 * @param {string} data.phoneNumber - 電話番号（必須）
 * @param {string} data.plan - プラン（任意、デフォルト 'free'）
 * @param {boolean} data.sendWelcomeEmail - ウェルカムメール送信（任意、デフォルト true）
 * @returns {Object} 作成結果
 */
export const adminCreateUserCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    email,
    lastName,
    firstName,
    company,
    phoneNumber,
    plan = 'free',
    password = '',
    sendWelcomeEmail = true,
  } = request.data || {};

  // バリデーション
  if (!email || !lastName || !firstName || !company || !phoneNumber) {
    throw new HttpsError('invalid-argument', 'メール、姓、名、組織名、電話番号は必須です');
  }

  if (password && password.length < 6) {
    throw new HttpsError('invalid-argument', 'パスワードは6文字以上で指定してください');
  }

  if (!['free', 'standard', 'premium'].includes(plan)) {
    throw new HttpsError('invalid-argument', 'プランはfree、standard、premiumのいずれかを指定してください');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();

    // 管理者権限チェック（admin or editor）
    const executorAdminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!executorAdminDoc.exists || !['admin', 'editor'].includes(executorAdminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', 'この操作は管理者または編集者ロールが必要です');
    }

    const displayName = `${lastName} ${firstName}`;

    // Firebase Authでユーザー作成
    const createParams = { email, displayName };
    if (password) {
      createParams.password = password;
    }

    let newUser;
    try {
      newUser = await auth.createUser(createParams);
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'このメールアドレスは既に登録されています');
      }
      throw authError;
    }

    const newUid = newUser.uid;
    const now = FieldValue.serverTimestamp();

    // Firestoreにユーザードキュメント作成（AuthContext.jsxのスキーマ準拠）
    const userDocData = {
      uid: newUid,
      email,
      displayName,
      lastName,
      firstName,
      company,
      phoneNumber,
      industry: '',
      photoURL: '',
      plan,
      aiSummaryUsage: 0,
      aiImprovementUsage: 0,
      accountOwnerId: newUid,
      memberRole: 'owner',
      memberships: { [newUid]: { role: 'owner', joinedAt: now } },
      notificationSettings: {
        weeklyReportEmail: true,
        monthlyReportEmail: true,
        alertEmail: true,
        emailNotifications: true,
      },
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      _createdByAdmin: true,
      _createdByAdminId: uid,
    };

    // ウェルカムメール不要の場合、送信済みフラグを先にセット
    if (!sendWelcomeEmail) {
      userDocData._welcomeEmailSent = true;
      userDocData._skipWelcomeEmail = true;
    }

    await db.collection('users').doc(newUid).set(userDocData);

    logger.info('管理者によるユーザー作成完了', {
      executorId: uid,
      newUserId: newUid,
      email,
      plan,
      sendWelcomeEmail,
    });

    // パスワード未指定の場合のみパスワード設定メール送信
    if (!password) {
      try {
        const resetLink = await auth.generatePasswordResetLink(email);
        await sendEmailDirect({
          to: email,
          subject: '【グローレポータ】アカウントが作成されました',
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3758F9;">グローレポータへようこそ</h2>
              <p>${displayName} 様</p>
              <p>管理者によりアカウントが作成されました。</p>
              <p>以下のリンクからパスワードを設定してログインしてください。</p>
              <div style="margin: 24px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3758F9; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">パスワードを設定する</a>
              </div>
              <p style="color: #666; font-size: 12px;">このリンクの有効期限は限られています。期限切れの場合はログイン画面の「パスワードを忘れた方」からリセットしてください。</p>
            </div>
          `,
          text: `${displayName} 様\n\n管理者によりアカウントが作成されました。\n以下のリンクからパスワードを設定してログインしてください。\n\n${resetLink}\n\nこのリンクの有効期限は限られています。`,
        });
        logger.info('パスワード設定メール送信完了', { newUserId: newUid, email });
      } catch (emailError) {
        logger.error('パスワード設定メール送信エラー', { newUserId: newUid, error: emailError.message });
      }
    }

    // ウェルカムメール送信（オプション）
    if (sendWelcomeEmail) {
      try {
        const { subject, html, text } = generateWelcomeEmail({ userName: displayName });
        await sendEmailDirect({ to: email, subject, html, text });
        await db.collection('users').doc(newUid).update({ _welcomeEmailSent: true });
        logger.info('ウェルカムメール送信完了', { newUserId: newUid, email });
      } catch (welcomeError) {
        logger.error('ウェルカムメール送信エラー', { newUserId: newUid, error: welcomeError.message });
      }
    }

    // アクティビティログ
    await logUserActivity({
      userId: uid,
      userEmail: (executorAdminDoc.data()?.email) || '',
      userName: executorAdminDoc.data()?.displayName || '',
      action: ACTIVITY_ACTIONS.ADMIN_USER_CREATED,
      details: {
        targetUserId: newUid,
        targetEmail: email,
        targetName: displayName,
        plan,
        sendWelcomeEmail,
      },
    });

    return {
      success: true,
      uid: newUid,
      message: `${displayName}さんのアカウントを作成しました`,
    };

  } catch (error) {
    logger.error('管理者ユーザー作成エラー', {
      error: error.message,
      stack: error.stack,
      executorId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'ユーザーの作成に失敗しました: ' + error.message);
  }
};
