import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate, generateAlertEmailTemplate } from '../utils/emailTemplates.js';
import { sendEmailDirect } from '../utils/emailSender.js';
import { getGA4MetricsForSite } from '../utils/ga4ServerHelper.js';

/**
 * テストメール送信ハンドラ（v2 request）
 * reportType: 'weekly' | 'monthly' | 'alert'
 * siteId を指定すると実際のGA4データでレポートメールを送信
 */
export async function sendTestReportEmailHandler(req) {
  const data = req.data || {};
  const auth = req.auth;
  const db = getFirestore();
  if (!auth) {
    throw new HttpsError('unauthenticated', 'この機能を使用するには認証が必要です');
  }
  const userId = auth.uid;
  const adminDoc = await db.collection('adminUsers').doc(userId).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', '管理者権限が必要です');
  }
  const adminRole = adminDoc.data().role;
  if (!['admin', 'editor', 'viewer'].includes(adminRole)) {
    throw new HttpsError('permission-denied', '管理者権限が必要です');
  }
  const { recipientEmail, reportType = 'weekly', siteId } = data;
  if (!recipientEmail) {
    throw new HttpsError('invalid-argument', '送信先メールアドレスが指定されていません');
  }
  try {
    console.log(`テストメール送信: ${recipientEmail} (${reportType}) siteId=${siteId || 'なし'}`);

    // アラート通知の場合は別処理
    if (reportType === 'alert') {
      return await sendTestAlert(db, recipientEmail, siteId);
    }

    const now = new Date();
    const isWeekly = reportType === 'weekly';
    let currentStart, currentEnd, previousStart, previousEnd;
    if (isWeekly) {
      currentStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      currentEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      previousStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      previousEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
    } else {
      currentStart = startOfMonth(subMonths(now, 1));
      currentEnd = endOfMonth(subMonths(now, 1));
      previousStart = startOfMonth(subMonths(now, 2));
      previousEnd = endOfMonth(subMonths(now, 2));
    }
    const dateRange = {
      startDate: format(currentStart, 'yyyy/MM/dd', { locale: ja }),
      endDate: format(currentEnd, 'yyyy/MM/dd', { locale: ja }),
    };

    let emailData;

    // siteId指定時は実際のGA4データを取得
    if (siteId) {
      const siteDoc = await db.collection('sites').doc(siteId).get();
      if (!siteDoc.exists) {
        throw new HttpsError('not-found', `サイト ${siteId} が見つかりません`);
      }
      const site = siteDoc.data();
      if (!site.ga4PropertyId || !site.ga4OauthTokenId) {
        throw new HttpsError('failed-precondition', `サイト ${siteId} はGA4未設定です`);
      }

      const ga4Start = format(currentStart, 'yyyy-MM-dd');
      const ga4End = format(currentEnd, 'yyyy-MM-dd');
      const ga4PrevStart = format(previousStart, 'yyyy-MM-dd');
      const ga4PrevEnd = format(previousEnd, 'yyyy-MM-dd');

      const rawMetrics = await getGA4MetricsForSite(db, siteId, ga4Start, ga4End);
      const rawPrevMetrics = await getGA4MetricsForSite(db, siteId, ga4PrevStart, ga4PrevEnd);

      if (!rawMetrics || !rawPrevMetrics) {
        throw new HttpsError('internal', `サイト ${siteId} のGA4メトリクスが取得できませんでした`);
      }

      emailData = {
        siteName: site.siteName || site.siteUrl || '（サイト名なし）',
        siteUrl: site.siteUrl || '',
        siteId,
        metrics: mapMetrics(rawMetrics),
        previousMetrics: mapMetrics(rawPrevMetrics),
        conversionDetails: rawMetrics.conversionDetails || [],
        previousConversionDetails: rawPrevMetrics.conversionDetails || [],
        kpiSettings: site.kpiSettings || null,
      };
    } else {
      // モックデータ
      emailData = {
        siteName: 'テストサイト - グローレポータ Demo',
        siteUrl: 'https://grow-reporter.com',
        metrics: {
          sessions: 12450, users: 9840, pageviews: 45678, averagePageviews: 3.67,
          engagementRate: 68.5, conversions: 124, conversionRate: 1.85, bounceRate: 42.3,
        },
        previousMetrics: {
          sessions: 10230, users: 8120, pageviews: 38456, averagePageviews: 3.45,
          engagementRate: 65.2, conversions: 98, conversionRate: 1.62, bounceRate: 45.8,
        },
      };
    }

    const { subject, html, text } = generateEmailTemplate(reportType, emailData, dateRange);
    const result = await sendEmailDirect({ to: recipientEmail, subject, html, text });
    console.log(`テストメール送信成功: ${recipientEmail}`);
    return { success: true, message: 'テストメールを送信しました', messageId: result.messageId };
  } catch (error) {
    console.error('テストメール送信エラー:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'テストメールの送信に失敗しました: ' + error.message);
  }
}

/**
 * アラート通知のテスト送信
 */
async function sendTestAlert(db, recipientEmail, siteId) {
  if (!siteId) {
    throw new HttpsError('invalid-argument', 'アラート通知にはサイトIDが必要です');
  }

  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', `サイト ${siteId} が見つかりません`);
  }
  const site = siteDoc.data();
  const siteName = site.siteName || site.siteUrl || '（サイト名なし）';
  const siteUrl = site.siteUrl || '';

  // 最新のアラートを取得
  const alertsSnap = await db
    .collection('sites').doc(siteId).collection('alerts')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  let alertData;
  if (!alertsSnap.empty) {
    alertData = alertsSnap.docs[0].data();
  } else {
    // アラートが存在しない場合はサンプルデータ
    const now = new Date();
    const end = subDays(now, 1);
    const start = subDays(end, 6);
    alertData = {
      message: 'セッション数が35.2%減少しました',
      metricLabel: '流入数（セッション）',
      metricName: 'sessions',
      changePercent: -35.2,
      currentValue: 850,
      previousValue: 1312,
      periodCurrent: `${format(start, 'yyyy-MM-dd')} 〜 ${format(end, 'yyyy-MM-dd')}`,
      hypotheses: [
        { text: '季節的なトラフィック変動の可能性' },
        { text: '検索順位の変動による影響' },
        { text: 'リファラー元サイトの変化' },
      ],
    };
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'https://grow-reporter.web.app';
  const dashboardUrl = `${appBaseUrl}/dashboard?siteId=${siteId}`;

  const { subject, html, text } = generateAlertEmailTemplate(alertData, siteName, siteUrl, dashboardUrl);
  const result = await sendEmailDirect({ to: recipientEmail, subject, html, text });
  console.log(`テストアラートメール送信成功: ${recipientEmail}`);
  return { success: true, message: 'アラート通知テストメールを送信しました', messageId: result.messageId };
}

function mapMetrics(raw) {
  return {
    sessions: raw.sessions,
    users: raw.totalUsers,
    pageviews: raw.screenPageViews,
    averagePageviews: raw.averagePageviews,
    engagementRate: raw.engagementRate,
    conversions: raw.totalConversions,
    conversionRate: raw.conversionRate,
    bounceRate: raw.bounceRate,
  };
}
