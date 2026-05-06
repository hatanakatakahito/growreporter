import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { escapeHtml, escapeHtmlAndValidateUrl, escapeForHtmlMultiline } from './htmlEscape.js';

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
      free: '無料プラン',
      business: 'ビジネスプラン',
      standard: 'ビジネスプラン', // 後方互換
      premium: 'ビジネスプラン',  // 後方互換
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
    // XSS 対策: userName が含まれるので HTML escape 必須
    await sendEmailDirect({
      to: toEmail,
      subject: emailSubject,
      text: emailBody,
      html: escapeForHtmlMultiline(emailBody),
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
    // XSS 対策: body は呼出し元から渡された任意文字列のため escape して HTML 化
    const html = escapeForHtmlMultiline(body);
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

    // XSS 対策: ユーザー入力 (siteName / siteUrl / userName / userEmail / message / excelFileName) は
    // 全て escape してから HTML に埋め込む。URL は許可スキームのみ通す。
    const siteNameHtml = escapeHtml((siteName || '').trim() || '（未入力）');
    const siteUrlHtml = escapeHtml((siteUrl || '').trim() || '（未入力）');
    const userNameHtml = escapeHtml((userName || '').trim() || '（未入力）');
    const userEmailHtml = escapeHtml((userEmail || '').trim() || '（未入力）');
    const excelFileNameHtml = escapeHtml(excelFileName || '');
    const excelDownloadUrlHtml = escapeHtmlAndValidateUrl(excelDownloadUrl || '');

    const htmlExcelSection = excelDownloadUrl
      ? `<br><strong>■ 改善内容Excel：</strong><br>${excelFileName ? `ファイル名: ${excelFileNameHtml}<br>` : ''}ダウンロード: <a href="${excelDownloadUrlHtml}">${excelFileNameHtml || 'Excelをダウンロード'}</a><br>`
      : '';

    const htmlBody = `このメールはグローレポータ（<a href="https://grow-reporter.com/">https://grow-reporter.com/</a>）の「制作会社へ相談する」フォームから送信されました。<br>
<br>
<strong>■ サイト名：</strong>${siteNameHtml}<br>
<strong>■ サイトURL：</strong>${siteUrlHtml}<br>
<strong>■ 送信者：</strong>${userNameHtml}（${userEmailHtml}）<br>
${message ? `<br><strong>■ メッセージ：</strong><br>${escapeForHtmlMultiline(message.trim())}<br>` : ''}${htmlExcelSection}<br>
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
export async function sendUpgradeInquiryEmail({
  selectedPlan, companyName = '', department = '',
  lastName = '', firstName = '', userName = '',
  phone = '', userEmail = '',
  zipCode = '', prefecture = '', city = '', building = '',
  paymentTiming = '', startDatePref = '', startDate = '', startMonth = '',
  message = '',
}) {
  try {
    const planNames = { business: 'ビジネスプラン', standard: 'ビジネスプラン', premium: 'ビジネスプラン' };
    const planName = planNames[selectedPlan] || selectedPlan;
    const subject = `【グローレポータ】プランアップグレードのお問い合わせ（${planName}）`;

    // 担当者名の組み立て（姓名分離 or 旧形式のuserName）
    const contactName = (lastName || firstName)
      ? `${(lastName || '').trim()} ${(firstName || '').trim()}`.trim()
      : (userName || '').trim();

    // 支払い方法の表示
    const paymentLabel = paymentTiming === 'bulk'
      ? '一括請求（年額597,600円 税別）'
      : paymentTiming === 'recurring'
        ? '定期請求（月額49,800円 税別）'
        : '（未選択）';

    // 利用開始希望月
    let startDateLabel = '希望なし（翌月1日から）';
    if (startDatePref === 'preferred') {
      const month = startMonth || (startDate ? startDate.substring(0, 7) : '');
      if (month) {
        const [y, m] = month.split('-');
        startDateLabel = `${y}年${parseInt(m)}月`;
      }
    }

    // 住所の組み立て
    const zipLabel = zipCode ? `〒${zipCode.trim()}` : '';
    const addressParts = [prefecture, city, building].filter(Boolean).map(s => s.trim()).join(' ');
    const addressLine = [zipLabel, addressParts].filter(Boolean).join(' ');

    const appBaseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'https://grow-reporter.com';

    const body = `このメールはグローレポータ（${appBaseUrl}/）の「プランアップグレード」フォームから送信されました。

■ 組織名：${(companyName || '').trim() || '（未入力）'}
■ 部署名：${(department || '').trim() || '（未入力）'}
■ 担当者名：${contactName || '（未入力）'}
■ 電話番号：${(phone || '').trim() || '（未入力）'}
■ メールアドレス：${(userEmail || '').trim() || '（未入力）'}
■ 住所：${addressLine || '（未入力）'}
${message ? `■ ご質問・ご要望：${message.trim()}\n` : ''}
━━ ご契約条件 ━━
■ 希望プラン：${planName}
■ 支払い方法：${paymentLabel}
■ 利用開始希望月：${startDateLabel}

━━━━━━━━━━━━━━━━━━
問い合わせ管理画面で確認する
${appBaseUrl}/admin/inquiries

送信日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;

    // XSS 対策: text body をそのまま HTML 化していたため、ユーザー入力の
    // <script> 等が実行可能だった。escape してから <br> 変換する。
    await sendEmailDirect({
      to: CONSULTATION_TO_EMAIL,
      subject,
      text: body,
      html: escapeForHtmlMultiline(body),
    });
    logger.info('プランアップグレードお問い合わせメール送信', { selectedPlan, companyName, contactName, userEmail });
    return { success: true };
  } catch (error) {
    logger.error('プランアップグレードお問い合わせメール送信エラー', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 意見箱（userFeedback）の通知メールを送信
 * 宛先: info@grow-reporter.com
 */
export async function sendFeedbackEmail({
  categoryLabel = '',
  companyName = '',
  lastName = '',
  firstName = '',
  userEmail = '',
  message = '',
  attachmentUrl = '',
  attachmentFileName = '',
  feedbackId = '',
}) {
  try {
    const contactName = `${(lastName || '').trim()} ${(firstName || '').trim()}`.trim() || '（未入力）';
    const appBaseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'https://grow-reporter.com';
    const subject = `【グローレポータ】意見箱：${categoryLabel || 'お問い合わせ'}`;

    const body = `このメールはグローレポータ（${appBaseUrl}/）の「意見箱」フォームから送信されました。

■ 種別：${categoryLabel || '（未選択）'}
■ 組織名：${(companyName || '').trim() || '（未入力）'}
■ 担当者名：${contactName}
■ メールアドレス：${(userEmail || '').trim() || '（未入力）'}

━━ お問い合わせ内容 ━━
${(message || '').trim() || '（未入力）'}

${attachmentUrl ? `━━ 添付資料 ━━\n${attachmentFileName || 'ファイル'}\n${attachmentUrl}\n` : ''}
━━━━━━━━━━━━━━━━━━
${feedbackId ? `フィードバックID：${feedbackId}\n` : ''}送信日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;

    // XSS 対策: text body をそのまま HTML 化していたため、ユーザー入力の
    // <script> 等が実行可能だった。escape してから <br> 変換する。
    await sendEmailDirect({
      to: CONSULTATION_TO_EMAIL,
      subject,
      text: body,
      html: escapeForHtmlMultiline(body),
    });
    logger.info('意見箱メール送信', { categoryLabel, companyName, contactName, userEmail, feedbackId });
    return { success: true };
  } catch (error) {
    logger.error('意見箱メール送信エラー', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * board連携失敗時の管理者通知メール
 */
export async function sendBoardErrorNotificationEmail({ inquiryId, companyName, errorMessage }) {
  try {
    const appBaseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'https://grow-reporter.com';
    const subject = '【グローレポータ】board連携エラー - プランアップグレード問い合わせ';
    const body = `board APIとの連携でエラーが発生しました。管理画面から手動で対応してください。

■ 問い合わせID：${inquiryId}
■ 組織名：${companyName || '（不明）'}
■ エラー内容：${errorMessage}

▶ 問い合わせ管理画面で確認する
${appBaseUrl}/admin/inquiries

発生日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
`;
    // XSS 対策: errorMessage / companyName が含まれるため escape 必須
    await sendEmailDirect({
      to: CONSULTATION_TO_EMAIL,
      subject,
      text: body,
      html: escapeForHtmlMultiline(body),
    });
    logger.info('board連携エラー通知メール送信', { inquiryId, companyName });
    return { success: true };
  } catch (error) {
    logger.error('board連携エラー通知メール送信失敗', { error: error.message });
    return { success: false, error: error.message };
  }
}
