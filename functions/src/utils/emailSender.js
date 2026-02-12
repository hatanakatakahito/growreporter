import { logger } from 'firebase-functions/v2';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * プラン変更通知メールを送信
 * 
 * Firebase Extensions "Trigger Email" が必要です。
 * インストール手順は EMAIL_EXTENSION_SETUP.md を参照してください。
 * 
 * @param {Object} params - メールパラメータ
 * @param {string} params.toEmail - 宛先メールアドレス
 * @param {string} params.userName - ユーザー名
 * @param {string} params.oldPlan - 変更前のプラン
 * @param {string} params.newPlan - 変更後のプラン
 * @param {string} params.reason - 変更理由
 */
export async function sendPlanChangeEmail({ toEmail, userName, oldPlan, newPlan, reason }) {
  try {
    const db = getFirestore();
    
    // プラン名の日本語表記
    const planNames = {
      free: '無料プラン',
      standard: 'スタンダードプラン',
      premium: 'プレミアムプラン',
    };

    const emailSubject = `【GROW REPORTER】プラン変更のお知らせ`;
    const emailBody = `
${userName} 様

いつもGROW REPORTERをご利用いただき、ありがとうございます。

お客様のプランが変更されました。

■ 変更内容
変更前: ${planNames[oldPlan] || oldPlan}
変更後: ${planNames[newPlan] || newPlan}

■ 変更理由
${reason || '（記載なし）'}

■ 変更日時
${new Date().toLocaleString('ja-JP')}

今後ともGROW REPORTERをよろしくお願いいたします。

────────────────────────
GROW REPORTER運営チーム
お問い合わせ: support@grow-group.jp
────────────────────────
`;

    // Firebase Extensions "Trigger Email" を使用する場合
    // mail コレクションにドキュメントを追加すると自動でメール送信される
    await db.collection('mail').add({
      to: toEmail,
      message: {
        subject: emailSubject,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>'),
      },
      createdAt: Timestamp.now(),
    });

    logger.info('プラン変更通知メール送信', {
      toEmail,
      oldPlan,
      newPlan,
    });

    return { success: true };
  } catch (error) {
    logger.error('メール送信エラー', {
      error: error.message,
      toEmail,
    });
    // メール送信失敗してもエラーにしない（メイン処理は成功として扱う）
    return { success: false, error: error.message };
  }
}

/**
 * 管理者向けアラートメール送信
 * 
 * @param {Object} params - メールパラメータ
 * @param {string} params.subject - 件名
 * @param {string} params.body - 本文
 * @param {string[]} params.toEmails - 宛先メールアドレス配列（デフォルト: 管理者全員）
 */
export async function sendAdminAlertEmail({ subject, body, toEmails = null }) {
  try {
    const db = getFirestore();
    
    // toEmails が指定されていない場合は、全管理者を取得
    let recipients = toEmails;
    if (!recipients) {
      const adminSnapshot = await db.collection('adminUsers').get();
      recipients = adminSnapshot.docs
        .map(doc => doc.data().email)
        .filter(email => email);
    }

    if (!recipients || recipients.length === 0) {
      logger.warn('管理者メールアドレスが見つかりません');
      return { success: false, error: '宛先がありません' };
    }

    // 各管理者にメール送信
    const emailPromises = recipients.map(email =>
      db.collection('mail').add({
        to: email,
        message: {
          subject: `【GROW REPORTER 管理者】${subject}`,
          text: body,
          html: body.replace(/\n/g, '<br>'),
        },
        createdAt: Timestamp.now(),
      })
    );

    await Promise.all(emailPromises);

    logger.info('管理者アラートメール送信', {
      count: recipients.length,
      subject,
    });

    return { success: true };
  } catch (error) {
    logger.error('管理者メール送信エラー', {
      error: error.message,
      subject,
    });
    return { success: false, error: error.message };
  }
}

