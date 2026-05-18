import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../../utils/emailSender.js';
import { generateAccountCredentialsEmail } from '../../utils/emailTemplates.js';

/**
 * admin が任意のタイミングで対象ユーザーに「アカウント情報メール」を送信する
 *
 * 用途:
 * - admin がサイレントでユーザー作成 → サイト登録など準備完了後に顧客に通知
 * - パスワードリセットリンクをメールで届ける（生パスワードはサーバー保持していないため）
 *
 * @param {string} data.targetUserId - 送信対象のユーザー uid
 * @returns {{ success: boolean, sentTo: string, sentAt: string }}
 */
export const sendAccountCredentialsEmailCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { targetUserId } = request.data || {};

  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new HttpsError('invalid-argument', 'targetUserId は必須です');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();

    // 管理者権限チェック（admin / editor のみ。viewer は送信不可）
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // 対象ユーザーの存在確認
    const userRef = db.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '対象ユーザーが見つかりません');
    }

    const userData = userDoc.data();
    const email = userData.email;
    if (!email) {
      throw new HttpsError('failed-precondition', 'ユーザーにメールアドレスが登録されていません');
    }

    // ユーザー名（lastName + firstName 優先、なければ name / displayName / email ローカル部）
    const userName = userData.name
      || (userData.lastName && userData.firstName ? `${userData.lastName} ${userData.firstName}` : '')
      || userData.displayName
      || email.split('@')[0];

    // Firebase Auth でパスワードリセットリンクを生成
    // continueUrl でログイン画面に戻る（パスワード設定完了後のフォールバック redirect）
    const actionCodeSettings = {
      url: 'https://grow-reporter.com/login',
      handleCodeInApp: false,
    };
    let rawResetLink;
    try {
      rawResetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
    } catch (authError) {
      logger.error('[sendAccountCredentialsEmail] パスワードリセットリンク生成エラー', {
        targetUserId,
        email,
        error: authError.message,
      });
      throw new HttpsError('internal', `パスワードリセットリンクの生成に失敗: ${authError.message}`);
    }

    // Admin SDK は デフォルトドメイン (growgroupreporter.firebaseapp.com) のリンクを返すため、
    // 自社ドメイン (grow-reporter.com/auth/action) に書き換える。
    // oobCode 等のクエリパラメータはそのまま流用する（実際の検証は Firebase Auth が行うため
    // ホスト名に依存しない）。これにより Firebase Console 設定なしでもドメイン統一可能。
    let resetLink;
    try {
      const parsedUrl = new URL(rawResetLink);
      // 元の URL のクエリパラメータをすべて引き継ぐ
      resetLink = `https://grow-reporter.com/auth/action${parsedUrl.search}`;
      logger.info('[sendAccountCredentialsEmail] リセットリンクを自社ドメインに書き換え', {
        targetUserId,
        original: rawResetLink.split('?')[0],
        rewritten: 'https://grow-reporter.com/auth/action',
      });
    } catch (urlErr) {
      // URL パース失敗時は元の URL をそのまま使う（フォールバック）
      logger.warn('[sendAccountCredentialsEmail] URL パース失敗、元のリンクを使用', { error: urlErr.message });
      resetLink = rawResetLink;
    }

    // メール内容を生成
    const { subject, html, text } = generateAccountCredentialsEmail({
      userName,
      email,
      resetLink,
    });

    // メール送信
    await sendEmailDirect({ to: email, subject, html, text });

    // 送信履歴を user 側に記録
    await userRef.update({
      _credentialsEmailSentAt: FieldValue.serverTimestamp(),
      _credentialsEmailSentBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 監査ログ
    const adminData = adminDoc.data();
    const adminName = adminData.name
      || (adminData.lastName && adminData.firstName ? `${adminData.lastName} ${adminData.firstName}` : '')
      || adminData.displayName
      || adminData.email
      || 'Admin';
    await db.collection('adminActivityLogs').add({
      adminId: uid,
      adminName,
      action: 'admin_send_account_credentials',
      targetType: 'user',
      targetId: targetUserId,
      details: { sentTo: email },
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info('[sendAccountCredentialsEmail] 送信完了', {
      adminId: uid,
      targetUserId,
      email,
    });

    return {
      success: true,
      sentTo: email,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[sendAccountCredentialsEmail] エラー', {
      adminId: uid,
      targetUserId,
      error: error.message,
      stack: error.stack,
    });
    throw new HttpsError('internal', `アカウント情報メール送信に失敗: ${error.message}`);
  }
};
