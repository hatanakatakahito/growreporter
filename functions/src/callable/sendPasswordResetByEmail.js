import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { sendEmailDirect } from '../utils/emailSender.js';
import { generatePasswordResetEmail } from '../utils/emailTemplates.js';

/**
 * 顧客自身がパスワード再設定メールを要求する Callable (認証不要)
 *
 * Firebase Auth の sendPasswordResetEmail はメール本文を Firebase Console テンプレートで
 * 制御するため、ブランド UI / 自社ドメインに統一できない。本 callable は:
 *  1. auth.generatePasswordResetLink で URL 生成 (Firebase 標準仕様)
 *  2. URL の hostname を grow-reporter.com/auth/action に書き換え
 *  3. 自社メールテンプレート (グローレポータ表記) で SES 送信
 *
 * 結果として:
 *  - Firebase Console の Templates 設定が不要
 *  - メール内リンクで自社ブランドの AuthAction.jsx が表示される
 *  - メール本文も「グローレポータ」表記で統一
 *
 * セキュリティ:
 *  - 入力 email がユーザー DB に存在しなくても **同じレスポンスを返す** (列挙攻撃対策)
 *  - レート制限は Firebase Auth 側の generatePasswordResetLink で吸収
 *
 * @param {string} data.email - パスワードを再設定したいユーザーのメール
 * @returns {{ success: boolean }} - 常に success:true (列挙攻撃対策)
 */
export const sendPasswordResetByEmailCallable = async (request) => {
  const { email } = request.data || {};

  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'メールアドレスが必要です');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new HttpsError('invalid-argument', 'メールアドレスの形式が正しくありません');
  }

  try {
    const db = getFirestore();
    const auth = getAuth();

    // 1. Firebase Auth でユーザーが存在するか確認 (存在しなくても success を返す)
    let userRecord = null;
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        logger.info('[sendPasswordResetByEmail] 該当ユーザーなし (列挙攻撃対策で success を返す)', { email: normalizedEmail });
        return { success: true };
      }
      throw err;
    }

    // 2. パスワードリセットリンク生成 (Firebase 標準仕様)
    const actionCodeSettings = {
      url: 'https://grow-reporter.com/login',
      handleCodeInApp: false,
    };
    const rawResetLink = await auth.generatePasswordResetLink(normalizedEmail, actionCodeSettings);

    // 3. URL を自社ドメインに書き換え
    let resetLink;
    try {
      const parsed = new URL(rawResetLink);
      resetLink = `https://grow-reporter.com/auth/action${parsed.search}`;
    } catch {
      resetLink = rawResetLink; // フォールバック
    }

    // 4. ユーザー名を取得 (users コレクションから、なければ email ローカル部)
    let userName = normalizedEmail.split('@')[0];
    try {
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        userName = u.name
          || (u.lastName && u.firstName ? `${u.lastName} ${u.firstName}` : '')
          || u.displayName
          || userName;
      }
    } catch (e) {
      logger.warn('[sendPasswordResetByEmail] users doc 取得失敗 (続行)', { error: e.message });
    }

    // 5. 自社メールテンプレートで送信
    const { subject, html, text } = generatePasswordResetEmail({
      userName,
      email: normalizedEmail,
      resetLink,
    });
    await sendEmailDirect({ to: normalizedEmail, subject, html, text });

    // 6. 履歴記録 (任意)
    try {
      await db.collection('users').doc(userRecord.uid).update({
        _passwordResetRequestedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.warn('[sendPasswordResetByEmail] users 履歴更新失敗 (続行)', { error: e.message });
    }

    logger.info('[sendPasswordResetByEmail] 送信完了', { email: normalizedEmail, uid: userRecord.uid });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[sendPasswordResetByEmail] エラー', {
      email: normalizedEmail,
      error: error.message,
      stack: error.stack,
    });
    // 内部エラーでも顧客には success を返す (列挙攻撃 + DoS 対策)
    // 監視は logger でフォロー
    return { success: true };
  }
};
