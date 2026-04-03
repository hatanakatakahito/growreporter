import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';

/** 全メールの送信元アドレス */
export const DEFAULT_FROM_EMAIL = 'info@grow-reporter.com';
/** 差出人表示名（メールクライアントに表示される名前） */
export const DEFAULT_FROM_NAME = 'グローレポータ';

/**
 * SMTP（AWS SES 等）でメールを直接送信（Trigger Email 拡張不要）
 * 環境変数: SES_SMTP_HOST, SES_SMTP_PORT, SES_SMTP_USER, SES_SMTP_PASSWORD, SES_FROM_EMAIL, SES_FROM_NAME（任意）
 */
export async function sendEmailDirect({ to, subject, html, text, attachments }) {
  const nodemailer = await import('nodemailer');
  const host = process.env.SES_SMTP_HOST || '';
  const port = parseInt(process.env.SES_SMTP_PORT || '587', 10);
  const user = process.env.SES_SMTP_USER || '';
  const pass = process.env.SES_SMTP_PASSWORD || '';
  const fromEmail = process.env.SES_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const fromName = process.env.SES_FROM_NAME || DEFAULT_FROM_NAME;
  const from = `"${fromName}" <${fromEmail}>`;

  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.info('[メール送信（エミュレーター）]', { to, subject });
    return { success: true };
  }

  if (!host || !user || !pass) {
    throw new Error('SES SMTP not configured: set SES_SMTP_HOST, SES_SMTP_USER, SES_SMTP_PASSWORD (e.g. in Firebase Console → Functions → Environment variables or .env)');
  }

  const transporter = nodemailer.default.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const mailOptions = {
    from: from,
    to,
    subject,
    text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
    html: html || undefined,
  };
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  const info = await transporter.sendMail(mailOptions);

  logger.info('メール送信成功', { to, messageId: info.messageId });
  return { success: true, messageId: info.messageId };
}

/**
 * プラン変更通知メールを送信（SMTP 直接送信・拡張不要）
 */
export async function sendPlanChangeEmail({ toEmail, userName, oldPlan, newPlan, reason }) {
  try {
    const planNames = {
      free: 'Free',
      business: 'Business',
      standard: 'Business', // 後方互換
      premium: 'Business',  // 後方互換
    };
    const emailSubject = `【グローレポータ】プラン変更のお知らせ`;
    const emailBody = `
${userName} 様

いつもグローレポータをご利用いただき、ありがとうございます。

お客様のプランが変更されました。

■ 変更内容
変更前: ${planNames[oldPlan] || oldPlan}
変更後: ${planNames[newPlan] || newPlan}

■ 変更理由
${reason || '（記載なし）'}

■ 変更日時
${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

今後ともグローレポータをよろしくお願いいたします。

────────────────────────
グローレポータ運営チーム
お問い合わせ: info@grow-reporter.com
────────────────────────
`;
    await sendEmailDirect({
      to: toEmail,
      subject: emailSubject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>'),
    });
    logger.info('プラン変更通知メール送信', { toEmail, oldPlan, newPlan });
    return { success: true };
  } catch (error) {
    logger.error('メール送信エラー', { error: error.message, toEmail });
    return { success: false, error: error.message };
  }
}

/**
 * 管理者向けアラートメール送信（SMTP 直接送信）
 */
export async function sendAdminAlertEmail({ subject, body, toEmails = null }) {
  try {
    const db = getFirestore();
    let recipients = toEmails;
    if (!recipients) {
      const adminSnapshot = await db.collection('adminUsers').get();
      recipients = adminSnapshot.docs.map(doc => doc.data().email).filter(email => email);
    }
    if (!recipients || recipients.length === 0) {
      logger.warn('管理者メールアドレスが見つかりません');
      return { success: false, error: '宛先がありません' };
    }
    const subj = `【グローレポータ 管理者】${subject}`;
    const html = body.replace(/\n/g, '<br>');
    await Promise.all(recipients.map(email =>
      sendEmailDirect({ to: email, subject: subj, text: body, html })
    ));
    logger.info('管理者アラートメール送信', { count: recipients.length, subject });
    return { success: true };
  } catch (error) {
    logger.error('管理者メール送信エラー', { error: error.message, subject });
    return { success: false, error: error.message };
  }
}

const CONSULTATION_TO_EMAIL = 'info@grow-reporter.com';

/**
 * サイト改善相談メールを送信（SMTP 直接送信・宛先: info@grow-reporter.com）
 */
export async function sendImprovementConsultationEmail({ siteName, siteUrl, userEmail, userName = '', message = '', excelDownloadUrl = '', excelFileName = '' }) {
  try {
    const subject = `【グローレポータ】${(siteName || 'サイト').trim()}のサイト改善のご相談依頼`;

    const excelSection = excelDownloadUrl
      ? `\n■ 改善内容Excel：\n${excelFileName ? `ファイル名: ${excelFileName}\n` : ''}ダウンロード: ${excelDownloadUrl}\n`
      : '';

    const textBody = `このメールはグローレポータ（https://grow-reporter.com/）の「制作会社へ相談する」フォームから送信されました。

■ サイト名：${(siteName || '').trim() || '（未入力）'}
■ サイトURL：${(siteUrl || '').trim() || '（未入力）'}
■ 送信者：${(userName || '').trim() || '（未入力）'}（${(userEmail || '').trim() || '（未入力）'}）
${message ? `\n■ メッセージ：\n${message.trim()}\n` : ''}${excelSection}
送信日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;

    const htmlExcelSection = excelDownloadUrl
      ? `<br><strong>■ 改善内容Excel：</strong><br>${excelFileName ? `ファイル名: ${excelFileName}<br>` : ''}ダウンロード: <a href="${excelDownloadUrl}">${excelFileName || 'Excelをダウンロード'}</a><br>`
      : '';

    const htmlBody = `このメールはグローレポータ（<a href="https://grow-reporter.com/">https://grow-reporter.com/</a>）の「制作会社へ相談する」フォームから送信されました。<br>
<br>
<strong>■ サイト名：</strong>${(siteName || '').trim() || '（未入力）'}<br>
<strong>■ サイトURL：</strong>${(siteUrl || '').trim() || '（未入力）'}<br>
<strong>■ 送信者：</strong>${(userName || '').trim() || '（未入力）'}（${(userEmail || '').trim() || '（未入力）'}）<br>
${message ? `<br><strong>■ メッセージ：</strong><br>${message.trim().replace(/\n/g, '<br>')}<br>` : ''}${htmlExcelSection}<br>
送信日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;

    await sendEmailDirect({
      to: CONSULTATION_TO_EMAIL,
      subject,
      text: textBody,
      html: htmlBody,
    });
    logger.info('サイト改善相談メール送信', { siteName, userEmail, userName, hasExcelLink: !!excelDownloadUrl });
    return { success: true };
  } catch (error) {
    logger.error('サイト改善相談メール送信エラー', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * プランアップグレードお問い合わせメールを送信（SMTP 直接送信・宛先: info@grow-reporter.com）
 */
export async function sendUpgradeInquiryEmail({ selectedPlan, companyName = '', userName = '', userEmail = '', message = '' }) {
  try {
    const planNames = { business: 'Businessプラン', standard: 'Businessプラン', premium: 'Businessプラン' };
    const planName = planNames[selectedPlan] || selectedPlan;
    const subject = `【グローレポータ】プランアップグレードのお問い合わせ（${planName}）`;
    const body = `
このメールはグローレポータ（https://grow-reporter.com/）の「プランアップグレード」フォームから送信されました。

■ 希望プラン：${planName}
■ 組織名：${(companyName || '').trim() || '（未入力）'}
■ 氏名：${(userName || '').trim() || '（未入力）'}
■ メールアドレス：${(userEmail || '').trim() || '（未入力）'}
${message ? `\n■ メッセージ：\n${message.trim()}\n` : ''}
送信日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;

    await sendEmailDirect({
      to: CONSULTATION_TO_EMAIL,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });
    logger.info('プランアップグレードお問い合わせメール送信', { selectedPlan, companyName, userName, userEmail });
    return { success: true };
  } catch (error) {
    logger.error('プランアップグレードお問い合わせメール送信エラー', { error: error.message });
    return { success: false, error: error.message };
  }
}
