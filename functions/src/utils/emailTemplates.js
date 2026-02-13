import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * メールテンプレートを生成
 * @param {string} reportType - 'weekly' または 'monthly'
 * @param {Object} siteData - サイト情報とメトリクスデータ
 * @param {Object} dateRange - 期間情報
 * @returns {Object} { subject, html, text }
 */
export function generateEmailTemplate(reportType, siteData, dateRange) {
  const { siteName, siteUrl, metrics, previousMetrics } = siteData;
  const isWeekly = reportType === 'weekly';
  const reportTitle = isWeekly ? '週次レポート' : '月次レポート';
  const periodLabel = isWeekly ? '先週' : '先月';

  // 増減率を計算
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // 増減表示用のHTML
  const renderChange = (current, previous, metricName) => {
    const change = calculateChange(current, previous);
    const isPositive = change >= 0;
    const color = isPositive ? '#10b981' : '#ef4444';
    const arrow = isPositive ? '▲' : '▼';
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${metricName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
          ${current.toLocaleString()}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${color}; font-weight: 600;">
          ${arrow} ${Math.abs(change).toFixed(1)}%
        </td>
      </tr>
    `;
  };

  // メール件名
  const subject = `【GROW REPORTER】${siteName} - ${reportTitle}（${dateRange.startDate} 〜 ${dateRange.endDate}）`;

  // HTMLメール本文
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'Yu Gothic', 'Hiragino Sans', Meiryo, sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- ヘッダー -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                GROW REPORTER
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">
                ${reportTitle}
              </p>
            </td>
          </tr>

          <!-- サイト情報 -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 5px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${siteName}
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <a href="${siteUrl}" style="color: #667eea; text-decoration: none;">${siteUrl}</a>
              </p>
              <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">
                📊 対象期間: ${dateRange.startDate} 〜 ${dateRange.endDate}
              </p>
            </td>
          </tr>

          <!-- メトリクステーブル -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280; font-weight: 600;">指標</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #6b7280; font-weight: 600;">${periodLabel}</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #6b7280; font-weight: 600;">前${isWeekly ? '週' : '月'}比</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderChange(metrics.sessions, previousMetrics.sessions, '訪問者数')}
                  ${renderChange(metrics.users, previousMetrics.users, 'ユーザー数')}
                  ${renderChange(metrics.pageviews, previousMetrics.pageviews, '表示回数')}
                  ${renderChange(metrics.averagePageviews, previousMetrics.averagePageviews, '平均PV')}
                  ${renderChange(metrics.engagementRate, previousMetrics.engagementRate, 'ENG率（%）')}
                  ${renderChange(metrics.conversions, previousMetrics.conversions, 'CV数')}
                  ${renderChange(metrics.conversionRate, previousMetrics.conversionRate, 'CVR（%）')}
                  ${renderChange(metrics.bounceRate, previousMetrics.bounceRate, '直帰率（%）')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- アクションボタン -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="https://grow-reporter.com/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                詳細を確認する
              </a>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                このメールは GROW REPORTER から自動送信されています
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                メール通知の設定は<a href="https://grow-reporter.com/account/settings" style="color: #667eea; text-decoration: none;">アカウント設定</a>から変更できます
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // テキスト版（HTMLメールが表示できない環境用）
  const text = `
${reportTitle} - ${siteName}

対象期間: ${dateRange.startDate} 〜 ${dateRange.endDate}
サイトURL: ${siteUrl}

■主要指標
- 訪問者数: ${metrics.sessions.toLocaleString()} (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.sessions, previousMetrics.sessions).toFixed(1)}%)
- ユーザー数: ${metrics.users.toLocaleString()} (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.users, previousMetrics.users).toFixed(1)}%)
- 表示回数: ${metrics.pageviews.toLocaleString()} (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.pageviews, previousMetrics.pageviews).toFixed(1)}%)
- 平均PV: ${metrics.averagePageviews.toFixed(2)} (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.averagePageviews, previousMetrics.averagePageviews).toFixed(1)}%)
- ENG率: ${metrics.engagementRate.toFixed(1)}% (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.engagementRate, previousMetrics.engagementRate).toFixed(1)}%)
- CV数: ${metrics.conversions.toLocaleString()} (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.conversions, previousMetrics.conversions).toFixed(1)}%)
- CVR: ${metrics.conversionRate.toFixed(2)}% (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.conversionRate, previousMetrics.conversionRate).toFixed(1)}%)
- 直帰率: ${metrics.bounceRate.toFixed(1)}% (前${isWeekly ? '週' : '月'}比 ${calculateChange(metrics.bounceRate, previousMetrics.bounceRate).toFixed(1)}%)

詳細はこちら: https://grow-reporter.com/dashboard

---
このメールは GROW REPORTER から自動送信されています。
メール通知の設定変更: https://grow-reporter.com/account/settings
  `.trim();

  return { subject, html, text };
}

/**
 * メール送信（Amazon SES使用）
 * 注意: SES SMTP認証情報は環境変数に設定してください
 * firebase functions:config:set ses.smtp_host="email-smtp.ap-northeast-1.amazonaws.com"
 * firebase functions:config:set ses.smtp_port="587"
 * firebase functions:config:set ses.smtp_user="YOUR_SMTP_USER"
 * firebase functions:config:set ses.smtp_password="YOUR_SMTP_PASSWORD"
 * firebase functions:config:set ses.from_email="alert@grow-reporter.com"
 */
export async function sendEmail(to, subject, html, text) {
  // 開発環境ではコンソールにログ出力
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('[メール送信（エミュレーター）]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    return { success: true, messageId: 'emulator-test-id' };
  }

  try {
    const nodemailer = await import('nodemailer');
    
    // SES設定を取得
    const config = functions.config();
    const sesConfig = config.ses || {};
    
    const smtpHost = sesConfig.smtp_host || process.env.SES_SMTP_HOST;
    const smtpPort = parseInt(sesConfig.smtp_port || process.env.SES_SMTP_PORT || '587');
    const smtpUser = sesConfig.smtp_user || process.env.SES_SMTP_USER;
    const smtpPassword = sesConfig.smtp_password || process.env.SES_SMTP_PASSWORD;
    const fromEmail = sesConfig.from_email || process.env.SES_FROM_EMAIL || 'info@grow-reporter.com';
    
    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error('Amazon SES SMTP credentials not configured');
    }
    
    // Nodemailer transporterを作成
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // TLS使用（587ポート）
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
    
    // メール送信
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });
    
    console.log('[メール送信成功] MessageId:', info.messageId, 'To:', to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('メール送信エラー:', error);
    throw error;
  }
}
