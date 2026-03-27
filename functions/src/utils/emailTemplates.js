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
  const { siteName, siteUrl, siteId, metrics, previousMetrics } = siteData;
  const conversionDetails = siteData.conversionDetails || [];
  const previousConversionDetails = siteData.previousConversionDetails || [];
  const kpiSettings = siteData.kpiSettings || null;

  const displaySiteName = (siteName != null && siteName !== '') ? String(siteName) : '（サイト名なし）';
  const displaySiteUrl = (siteUrl != null && siteUrl !== '') ? String(siteUrl) : '';
  const isWeekly = reportType === 'weekly';
  const reportTitle = isWeekly ? '週次レポート' : '月次レポート';
  const periodLabel = isWeekly ? '先週' : '先月';
  const prevPeriodLabel = isWeekly ? '週' : '月';

  const appBaseUrl = 'https://grow-reporter.com';
  const dashboardUrl = siteId ? `${appBaseUrl}/dashboard?siteId=${siteId}` : `${appBaseUrl}/dashboard`;

  // 増減率を計算
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // 数値フォーマット
  const fmt = (v, decimals = 0) => {
    if (v == null || isNaN(v)) return '0';
    return decimals > 0 ? Number(v).toFixed(decimals) : Number(v).toLocaleString();
  };

  // 増減表示用のHTML行
  const renderRow = (current, previous, metricName, decimals = 0, suffix = '') => {
    const change = calculateChange(current, previous);
    const isPositive = change >= 0;
    const color = isPositive ? '#10b981' : '#ef4444';
    const arrow = isPositive ? '↗' : '↘';

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${metricName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; font-size: 14px;">
          ${fmt(current, decimals)}${suffix}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${color}; font-weight: 600; font-size: 14px;">
          ${arrow} ${isPositive ? '+' : '-'}${Math.abs(change).toFixed(1)}%
        </td>
      </tr>
    `;
  };

  // CV内訳行を生成
  const renderConversionRows = () => {
    if (conversionDetails.length === 0) return '';
    return conversionDetails.map((cv) => {
      const prevCv = previousConversionDetails.find((p) => p.eventName === cv.eventName);
      const prevCount = prevCv ? prevCv.count : 0;
      return renderRow(cv.count, prevCount, `　└ ${cv.displayName || cv.eventName}`);
    }).join('');
  };

  // KPIセクションHTML（月次レポートのみ）
  const renderKpiSection = () => {
    if (!kpiSettings || !kpiSettings.kpiList || kpiSettings.kpiList.length === 0) return '';
    const activeKpis = kpiSettings.kpiList.filter((k) => k.isActive);
    if (activeKpis.length === 0) return '';

    // KPIメトリクスの実績値をマッピング
    const getActualValue = (kpi) => {
      const key = kpi.metric;
      if (key === 'sessions' || key === 'target_sessions') return metrics.sessions;
      if (key === 'users' || key === 'target_users') return metrics.users;
      if (key === 'pageviews') return metrics.pageviews;
      if (key === 'engagement_rate') return metrics.engagementRate;
      if (key === 'target_conversions') return metrics.conversions;
      if (key === 'target_conversion_rate') return metrics.conversionRate;
      if (kpi.isConversion && kpi.eventName) {
        const cv = conversionDetails.find((c) => c.eventName === kpi.eventName);
        return cv ? cv.count : 0;
      }
      return 0;
    };

    const rows = activeKpis.map((kpi) => {
      const actual = getActualValue(kpi);
      const target = kpi.target || 0;
      const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
      const progressColor = progress >= 100 ? '#10b981' : progress >= 70 ? '#f59e0b' : '#ef4444';

      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${kpi.label}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; font-weight: 600;">${fmt(actual)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px;">${fmt(target)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; font-weight: 600; color: ${progressColor};">${progress.toFixed(0)}%</td>
        </tr>
      `;
    }).join('');

    return `
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 700;">KPI達成状況</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280;">KPI</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6b7280;">実績</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6b7280;">目標</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6b7280;">達成率</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </td>
          </tr>
    `;
  };

  // メール件名
  const subject = `【グローレポータ】${displaySiteName} - ${reportTitle}（${dateRange.startDate} 〜 ${dateRange.endDate}）`;

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
            <td style="background-color: #3758F9; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">${reportTitle}</p>
            </td>
          </tr>

          <!-- サイト情報 -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 5px 0; color: #1f2937; font-size: 20px; font-weight: 700;">${displaySiteName}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                ${displaySiteUrl ? `<a href="${displaySiteUrl}" style="color: #3758F9; text-decoration: none;">${displaySiteUrl}</a>` : '（URLなし）'}
              </p>
              <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">対象期間: ${dateRange.startDate} 〜 ${dateRange.endDate}</p>
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
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #6b7280; font-weight: 600;">前${prevPeriodLabel}比</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderRow(metrics.sessions, previousMetrics.sessions, '訪問者数')}
                  ${renderRow(metrics.users, previousMetrics.users, 'ユーザー数')}
                  ${renderRow(metrics.pageviews, previousMetrics.pageviews, '表示回数')}
                  ${renderRow(metrics.averagePageviews, previousMetrics.averagePageviews, '平均PV', 2)}
                  ${renderRow(metrics.engagementRate, previousMetrics.engagementRate, 'ENG率', 1, '%')}
                  ${renderRow(metrics.conversions, previousMetrics.conversions, 'CV数')}
                  ${renderConversionRows()}
                  ${renderRow(metrics.conversionRate, previousMetrics.conversionRate, 'CVR', 3, '%')}
                  ${renderRow(metrics.bounceRate, previousMetrics.bounceRate, '直帰率', 1, '%')}
                </tbody>
              </table>
            </td>
          </tr>

          ${renderKpiSection()}

          <!-- アクションボタン -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #3758F9; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(55, 88, 249, 0.3);">詳細を確認する</a>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">このメールは グローレポータ から自動送信されています</p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">メール通知の設定は<a href="${appBaseUrl}/account/settings" style="color: #3758F9; text-decoration: none;">アカウント設定</a>から変更できます</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // CV内訳テキスト
  const cvDetailText = conversionDetails.length > 0
    ? conversionDetails.map((cv) => {
        const prevCv = previousConversionDetails.find((p) => p.eventName === cv.eventName);
        const prevCount = prevCv ? prevCv.count : 0;
        return `  └ ${cv.displayName || cv.eventName}: ${fmt(cv.count)} (前${prevPeriodLabel}比 ${calculateChange(cv.count, prevCount).toFixed(1)}%)`;
      }).join('\n')
    : '';

  // KPIテキスト
  const kpiText = (() => {
    if (!kpiSettings?.kpiList?.length) return '';
    const lines = kpiSettings.kpiList.filter((k) => k.isActive).map((kpi) => {
      const key = kpi.metric;
      let actual = 0;
      if (key === 'sessions' || key === 'target_sessions') actual = metrics.sessions;
      else if (key === 'users' || key === 'target_users') actual = metrics.users;
      else if (key === 'pageviews') actual = metrics.pageviews;
      else if (key === 'engagement_rate') actual = metrics.engagementRate;
      else if (key === 'target_conversions') actual = metrics.conversions;
      else if (key === 'target_conversion_rate') actual = metrics.conversionRate;
      else if (kpi.isConversion && kpi.eventName) {
        const cv = conversionDetails.find((c) => c.eventName === kpi.eventName);
        actual = cv ? cv.count : 0;
      }
      const target = kpi.target || 0;
      const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
      return `- ${kpi.label}: ${fmt(actual)} / ${fmt(target)}（${progress.toFixed(0)}%）`;
    });
    return lines.length ? `\n■KPI達成状況\n${lines.join('\n')}` : '';
  })();

  // テキスト版
  const text = `
${reportTitle} - ${displaySiteName}

対象期間: ${dateRange.startDate} 〜 ${dateRange.endDate}
サイトURL: ${displaySiteUrl || '（URLなし）'}

■主要指標
- 訪問者数: ${fmt(metrics.sessions)} (前${prevPeriodLabel}比 ${calculateChange(metrics.sessions, previousMetrics.sessions).toFixed(1)}%)
- ユーザー数: ${fmt(metrics.users)} (前${prevPeriodLabel}比 ${calculateChange(metrics.users, previousMetrics.users).toFixed(1)}%)
- 表示回数: ${fmt(metrics.pageviews)} (前${prevPeriodLabel}比 ${calculateChange(metrics.pageviews, previousMetrics.pageviews).toFixed(1)}%)
- 平均PV: ${fmt(metrics.averagePageviews, 2)} (前${prevPeriodLabel}比 ${calculateChange(metrics.averagePageviews, previousMetrics.averagePageviews).toFixed(1)}%)
- ENG率: ${fmt(metrics.engagementRate, 1)}% (前${prevPeriodLabel}比 ${calculateChange(metrics.engagementRate, previousMetrics.engagementRate).toFixed(1)}%)
- CV数: ${fmt(metrics.conversions)} (前${prevPeriodLabel}比 ${calculateChange(metrics.conversions, previousMetrics.conversions).toFixed(1)}%)
${cvDetailText ? cvDetailText + '\n' : ''}- CVR: ${fmt(metrics.conversionRate, 3)}% (前${prevPeriodLabel}比 ${calculateChange(metrics.conversionRate, previousMetrics.conversionRate).toFixed(1)}%)
- 直帰率: ${fmt(metrics.bounceRate, 1)}% (前${prevPeriodLabel}比 ${calculateChange(metrics.bounceRate, previousMetrics.bounceRate).toFixed(1)}%)
${kpiText}

詳細はこちら: ${dashboardUrl}

---
このメールは グローレポータ から自動送信されています。
メール通知の設定変更: ${appBaseUrl}/account/settings
  `.trim();

  return { subject, html, text };
}

/**
 * メンバー招待メールテンプレート
 * @param {Object} data - 招待情報
 * @returns {Object} { subject, html, text }
 */
export function generateInvitationEmail(data) {
  const { inviterName, companyName, role, invitationUrl, expiresAt } = data;
  
  const subject = `【グローレポータ】${companyName} への招待`;
  
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
          
          <tr>
            <td style="background-color: #3758F9; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">メンバー招待</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${inviterName} さんから招待が届いています
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${companyName}</strong> のメンバーとして招待されました。
              </p>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #3758F9; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>権限:</strong> ${role}
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                招待を承認すると、${companyName} の全サイトのデータにアクセスできるようになります。
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      招待を承認する
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                ボタンが表示されない場合は、以下のリンクをクリックしてください：<br>
                <a href="${invitationUrl}" style="color: #3758F9; text-decoration: underline; word-break: break-all;">${invitationUrl}</a>
              </p>
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ※ この招待は <strong>${expiresAt}</strong> まで有効です。<br>
                ※ グローレポータのアカウントをお持ちでない場合は、まず新規登録を行ってから招待を承認してください。
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2026 グローレポータ by Grow Group
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
  
  const text = `
${inviterName} さんから ${companyName} への招待が届いています

権限: ${role}

招待を承認すると、${companyName} の全サイトのデータにアクセスできるようになります。

招待を承認する: ${invitationUrl}

※ この招待は ${expiresAt} まで有効です。
※ グローレポータのアカウントをお持ちでない場合は、まず新規登録を行ってから招待を承認してください。
  `;
  
  return { subject, html, text };
}

/**
 * メンバー削除通知メールテンプレート
 * @param {Object} data - 削除情報
 * @returns {Object} { subject, html, text }
 */
export function generateMemberRemovedEmail(data) {
  const { memberName, companyName } = data;
  
  const subject = `【グローレポータ】${companyName} のメンバーから削除されました`;
  
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
          <tr>
            <td>
              <h2 style="margin: 0 0 20px 0; color: #1f2937;">メンバーから削除されました</h2>
              <p style="margin: 0 0 15px 0; color: #4b5563;">${memberName} さん、</p>
              <p style="margin: 0 0 15px 0; color: #4b5563;">
                ${companyName} のメンバーから削除されました。今後、このアカウントのサイトにはアクセスできません。
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                ご質問がある場合は、アカウントオーナーにお問い合わせください。
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
  
  const text = `
${memberName} さん、

${companyName} のメンバーから削除されました。今後、このアカウントのサイトにはアクセスできません。

ご質問がある場合は、アカウントオーナーにお問い合わせください。
  `;
  
  return { subject, html, text };
}

/**
 * オーナー譲渡通知メールテンプレート
 * @param {Object} data - 譲渡情報
 * @returns {Object} { subject, html, text }
 */
export function generateOwnershipTransferEmail(data) {
  const { newOwnerName, previousOwnerName, companyName } = data;
  
  const subject = `【グローレポータ】${companyName} のオーナー権限が譲渡されました`;
  
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
          <tr>
            <td>
              <h2 style="margin: 0 0 20px 0; color: #1f2937;">オーナー権限が譲渡されました</h2>
              <p style="margin: 0 0 15px 0; color: #4b5563;">${newOwnerName} さん、</p>
              <p style="margin: 0 0 15px 0; color: #4b5563;">
                ${previousOwnerName} さんから、<strong>${companyName}</strong> のオーナー権限が譲渡されました。
              </p>
              <p style="margin: 0 0 20px 0; color: #4b5563;">
                今後、あなたがこのアカウントのオーナーとして、メンバー管理やプラン変更などの全ての操作が可能になります。
              </p>
              <p style="margin: 0;">
                <a href="https://grow-reporter.com/members" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
                  メンバー管理画面を開く
                </a>
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
  
  const text = `
${newOwnerName} さん、

${previousOwnerName} さんから、${companyName} のオーナー権限が譲渡されました。

今後、あなたがこのアカウントのオーナーとして、メンバー管理やプラン変更などの全ての操作が可能になります。

メンバー管理画面: https://grow-reporter.com/members
  `;
  
  return { subject, html, text };
}

/**
 * アラート通知メールのテンプレートを生成
 * @param {Object} alert - アラートオブジェクト（message, metricLabel, changePercent, periodCurrent, hypotheses, siteId）
 * @param {string} siteName - サイト名
 * @param {string} siteUrl - サイトURL
 * @param {string} dashboardUrl - ダッシュボードのURL（例: https://app.example.com/dashboard?siteId=xxx）
 * @returns {Object} { subject, html, text }
 */
export function generateAlertEmailTemplate(alert, siteName, siteUrl, dashboardUrl = '') {
  const displaySiteName = (siteName != null && siteName !== '') ? String(siteName) : '（サイト名なし）';
  const displaySiteUrl = (siteUrl != null && siteUrl !== '') ? String(siteUrl) : '';
  const message = alert.message || '指標に大きな変化がありました';
  const hypotheses = alert.hypotheses || [];
  const hypothesesList = hypotheses.length > 0
    ? hypotheses.map((h) => `<li style="margin-bottom: 8px;">${(h.text || '').replace(/</g, '&lt;')}</li>`).join('')
    : '<li>仮説を取得できませんでした</li>';

  const subject = `【グローレポータ】アラート: ${displaySiteName} - ${message}`;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'Yu Gothic', sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background-color: #3758F9; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">グローレポータ - アラート</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">${displaySiteName}</h2>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">${message}</p>
              ${alert.periodCurrent ? `<p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">対象期間: ${alert.periodCurrent}</p>` : ''}
              <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;"><strong>考えられる原因（仮説）</strong></p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
                ${hypothesesList}
              </ul>
              ${dashboardUrl ? `<p style="margin: 0;"><a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3758F9; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">ダッシュボードで確認</a></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `【グローレポータ】アラート: ${displaySiteName}\n\n${message}\n\n考えられる原因:\n${(hypotheses.map((h) => `・${h.text}`).join('\n') || '・仮説を取得できませんでした')}\n\n${dashboardUrl ? `ダッシュボード: ${dashboardUrl}` : ''}`;

  return { subject, html, text };
}

/**
 * アラート通知メール（構成B: 数値 + 状況整理 + 確認アクション型）
 * @param {Array} alerts - アラートの配列
 * @param {{summary: string, actions: string[]}} aiAnalysis - AI分析結果
 * @param {Array} allMetricsSummary - 全指標サマリー（変化あり＋横ばい）
 * @param {string} siteName - サイト名
 * @param {string} siteUrl - サイトURL
 * @param {string} periodLabel - 対象期間ラベル
 * @param {string} dashboardUrl - ダッシュボードURL
 * @returns {Object} { subject, html, text }
 */
export function generateBatchedAlertEmailTemplate(alerts, aiAnalysis, allMetricsSummary, siteName, siteUrl, periodLabel, dashboardUrl = '') {
  const displaySiteName = (siteName != null && siteName !== '') ? String(siteName) : '（サイト名なし）';
  const displaySiteUrl = (siteUrl != null && siteUrl !== '') ? String(siteUrl) : '';
  const alertCount = alerts.length;

  const subject = `【グローレポータ】アラート: ${displaySiteName} - ${alertCount}件の指標に大きな変化`;

  // 数値フォーマット
  const fmtVal = (key, value) => {
    if (value == null || isNaN(value)) return '—';
    if (['engagementRate', 'conversionRate', 'bounceRate'].includes(key)) return `${Number(value).toFixed(1)}%`;
    if (key === 'averagePageviews') return Number(value).toFixed(2);
    return Number(value).toLocaleString();
  };

  // 変化のあった指標テーブル行
  const alertedMetrics = (allMetricsSummary || []).filter(m => m.isAlert);
  const stableMetrics = (allMetricsSummary || []).filter(m => !m.isAlert);

  const alertRowsHtml = alertedMetrics.map(m => {
    const isDown = m.changePercent < 0;
    const color = isDown ? '#ef4444' : '#10b981';
    const arrow = isDown ? '↘' : '↗';
    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #1f2937;">${m.label}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; color: #6b7280;">${fmtVal(m.key, m.previous)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: #9ca3af;">→</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: 600; color: #1f2937;">${fmtVal(m.key, m.current)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; font-weight: 600; color: ${color};">${arrow} ${isDown ? '-' : '+'}${Math.abs(m.changePercent).toFixed(1)}%</td>
      </tr>`;
  }).join('');

  // 横ばい指標テキスト
  const stableNames = stableMetrics.map(m => m.label).join(', ');
  const stableHtml = stableNames
    ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #9ca3af;">※ 横ばい: ${stableNames}</p>`
    : '';

  // AI分析セクション
  const analysis = aiAnalysis || {};
  const summaryHtml = analysis.summary
    ? `<div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 0;">
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.7;">${analysis.summary.replace(/\n/g, '<br>')}</p>
       </div>`
    : '';

  const actionsHtml = (analysis.actions && analysis.actions.length > 0)
    ? analysis.actions.map((action, i) => {
        const escaped = action.replace(/</g, '&lt;').replace(/\n/g, '<br>');
        return `<tr>
          <td style="padding: 0 0 12px 0; vertical-align: top;">
            <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: #3758F9; color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px; margin-right: 8px;">${i + 1}</span>
          </td>
          <td style="padding: 0 0 12px 0; font-size: 14px; color: #374151; line-height: 1.6;">${escaped}</td>
        </tr>`;
      }).join('')
    : '';

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
            <td style="background-color: #3758F9; padding: 24px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">グローレポータ - アラート</h1>
            </td>
          </tr>

          <!-- サイト情報 -->
          <tr>
            <td style="padding: 24px 30px 8px 30px;">
              <h2 style="margin: 0 0 4px 0; color: #1f2937; font-size: 18px; font-weight: 700;">${displaySiteName}</h2>
              ${displaySiteUrl ? `<p style="margin: 0 0 4px 0; font-size: 13px;"><a href="${displaySiteUrl}" style="color: #3758F9; text-decoration: none;">${displaySiteUrl}</a></p>` : ''}
              ${periodLabel ? `<p style="margin: 0; color: #6b7280; font-size: 13px;">対象期間: ${periodLabel}</p>` : ''}
            </td>
          </tr>

          <!-- 変化のあった指標 -->
          <tr>
            <td style="padding: 20px 30px;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 15px; font-weight: 700;">■ 変化のあった指標</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">指標</th>
                    <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">前週</th>
                    <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #6b7280;"></th>
                    <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">今週</th>
                    <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">変化</th>
                  </tr>
                </thead>
                <tbody>
                  ${alertRowsHtml}
                </tbody>
              </table>
              ${stableHtml}
            </td>
          </tr>

          <!-- 状況の整理 -->
          ${summaryHtml ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 15px; font-weight: 700;">■ 状況の整理</h3>
              ${summaryHtml}
            </td>
          </tr>` : ''}

          <!-- 確認すべきこと -->
          ${actionsHtml ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 15px; font-weight: 700;">■ 確認すべきこと</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${actionsHtml}
              </table>
            </td>
          </tr>` : ''}

          <!-- アクションボタン -->
          ${dashboardUrl ? `
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #3758F9; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 6px rgba(55, 88, 249, 0.3);">ダッシュボードで確認</a>
            </td>
          </tr>` : ''}

          <!-- フッター -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">このメールは グローレポータ から自動送信されています</p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">メール通知の設定は<a href="https://grow-reporter.com/account/settings" style="color: #3758F9; text-decoration: none;">アカウント設定</a>から変更できます</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // プレーンテキスト版
  const alertListText = alertedMetrics
    .map(m => {
      const arrow = m.changePercent < 0 ? '↘' : '↗';
      return `  ${m.label}  ${fmtVal(m.key, m.previous)} → ${fmtVal(m.key, m.current)}  ${arrow}${m.changePercent < 0 ? '-' : '+'}${Math.abs(m.changePercent).toFixed(1)}%`;
    })
    .join('\n');

  const stableText = stableNames ? `\n  ※ 横ばい: ${stableNames}` : '';
  const summaryText = analysis.summary ? `\n■ 状況の整理\n${analysis.summary}` : '';
  const actionsText = (analysis.actions && analysis.actions.length > 0)
    ? `\n■ 確認すべきこと\n${analysis.actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    : '';

  const text = `【グローレポータ】アラート: ${displaySiteName}\n対象期間: ${periodLabel}\n\n■ 変化のあった指標\n${alertListText}${stableText}\n${summaryText}\n${actionsText}\n\n${dashboardUrl ? `ダッシュボードで確認: ${dashboardUrl}` : ''}`;

  return { subject, html, text };
}

/**
 * 新規ユーザー登録 ウェルカムメールテンプレート
 * @param {Object} data - ユーザー情報
 * @param {string} data.userName - ユーザー名
 * @returns {Object} { subject, html, text }
 */
export function generateWelcomeEmail(data) {
  const { userName } = data;
  const displayName = userName || 'ユーザー';
  const appUrl = 'https://grow-reporter.com';

  const subject = '【グローレポータ】ご登録ありがとうございます';

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'Yu Gothic', sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <tr>
            <td style="background-color: #3758F9; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">ご登録ありがとうございます</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${displayName} さん、ようこそ！
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                グローレポータへのご登録ありがとうございます。<br>
                GA4・サーチコンソールのデータをAIで分析し、サイト改善に役立つインサイトをお届けします。
              </p>

              <div style="background-color: #f9fafb; border-left: 4px solid #3758F9; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">ご利用開始の流れ</p>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  1. サイトを登録する<br>
                  2. Google アカウントを連携する<br>
                  3. ダッシュボードでデータを確認する
                </p>
              </div>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/sites/new" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      サイトを登録する
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ご不明点がございましたら、お気軽にお問い合わせください。
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; 2026 グローレポータ by Grow Group
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

  const text = `
${displayName} さん、ようこそ！

グローレポータへのご登録ありがとうございます。
GA4・サーチコンソールのデータをAIで分析し、サイト改善に役立つインサイトをお届けします。

■ ご利用開始の流れ
1. サイトを登録する
2. Google アカウントを連携する
3. ダッシュボードでデータを確認する

サイト登録: ${appUrl}/sites/new

ご不明点がございましたら、お気軽にお問い合わせください。

────────────────────────
グローレポータ運営チーム
────────────────────────
  `;

  return { subject, html, text };
}

/**
 * サイト登録完了メール
 */
export function generateSiteRegistrationCompleteEmail(data) {
  const { userName, siteName, siteUrl } = data;
  const displayName = userName || 'ユーザー';
  const appUrl = 'https://grow-reporter.com';

  const subject = `【グローレポータ】サイト「${siteName}」の登録が完了しました`;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'Yu Gothic', sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <tr>
            <td style="background-color: #3758F9; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">サイト登録完了のお知らせ</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${displayName} さん
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                サイトの登録が完了しました。<br>
                バックグラウンドでデータの取得・分析準備を行っています。
              </p>

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; padding-bottom: 8px;">サイト名</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600; padding-bottom: 8px; text-align: right;">${siteName}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">URL</td>
                    <td style="color: #3758F9; font-size: 14px; text-align: right;">
                      <a href="${siteUrl}" style="color: #3758F9; text-decoration: none;">${siteUrl}</a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #f9fafb; border-left: 4px solid #3758F9; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">現在実行中の処理</p>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  ・スクリーンショットの撮影<br>
                  ・上位100ページのスクレイピング<br>
                  ・過去3ヶ月分のデータエクスポート
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                  ※ 完了まで数分かかる場合があります
                </p>
              </div>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      ダッシュボードを見る
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ご不明点がございましたら、お気軽にお問い合わせください。
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; 2026 グローレポータ by Grow Group
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

  const text = `
${displayName} さん

サイト「${siteName}」の登録が完了しました。
バックグラウンドでデータの取得・分析準備を行っています。

■ 登録サイト情報
サイト名: ${siteName}
URL: ${siteUrl}

■ 現在実行中の処理
・スクリーンショットの撮影
・上位100ページのスクレイピング
・過去3ヶ月分のデータエクスポート
※ 完了まで数分かかる場合があります

ダッシュボード: ${appUrl}/dashboard

ご不明点がございましたら、お気軽にお問い合わせください。

────────────────────────
グローレポータ運営チーム
────────────────────────
  `;

  return { subject, html, text };
}

/**
 * 管理者がユーザーを代理作成した際のアカウント発行通知メール
 * ログイン情報（メール・パスワード）を記載
 */
export function generateAdminCreatedAccountEmail(data) {
  const { userName, email, password } = data;
  const displayName = userName || 'ユーザー';
  const loginUrl = 'https://grow-reporter.com/login';

  const subject = '【グローレポータ】アカウント発行のお知らせ';

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, 'Yu Gothic', sans-serif; background-color: #f3f4f6;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <tr>
            <td style="background-color: #3758F9; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">グローレポータ</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">アカウント発行のお知らせ</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
                ${displayName} 様
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ユーザーアカウントおよびサイト登録の発行が完了しました。<br>
                以下の情報でログインいただけます。
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 140px; vertical-align: top;">ログインURL</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                          <a href="${loginUrl}" style="color: #3758F9; text-decoration: none;">${loginUrl}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; vertical-align: top;">メールアドレス</td>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; vertical-align: top;">パスワード</td>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600; letter-spacing: 1px;">${password}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background-color: #3758F9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      ログインする
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                セキュリティのため、初回ログイン後にパスワードの変更をお勧めします。<br>
                ご不明点がございましたら、お気軽にお問い合わせください。
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; 2026 グローレポータ by Grow Group
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

  const text = `
${displayName} 様

ユーザーアカウントおよびサイト登録の発行が完了しました。
以下の情報でログインいただけます。

■ ログイン情報
ログインURL: ${loginUrl}
メールアドレス: ${email}
パスワード: ${password}

セキュリティのため、初回ログイン後にパスワードの変更をお勧めします。
ご不明点がございましたら、お気軽にお問い合わせください。

────────────────────────
グローレポータ運営チーム
────────────────────────
  `;

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
    const fromName = process.env.SES_FROM_NAME || 'グローレポータ';
    const from = `"${fromName}" <${fromEmail}>`;

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
      from,
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
