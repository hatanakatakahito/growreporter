import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate, generateBatchedAlertEmailTemplate, generateAdminCreatedAccountEmail } from '../utils/emailTemplates.js';
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

    // アカウント発行メールのテスト送信
    if (reportType === 'account') {
      const { subject, html, text } = generateAdminCreatedAccountEmail({
        userName: data.userName || '和波 悠生',
        email: data.testEmail || 'info@grow-reporter.com',
        password: data.testPassword || '00001724',
      });
      await sendEmailDirect({ to: recipientEmail, subject, html, text });
      return { success: true, message: `アカウント発行テストメールを ${recipientEmail} に送信しました` };
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
 * アラート通知のテスト送信（構成B: 実データ + AI分析）
 * 本番 checkMetricAlerts と同じテンプレート・フォーマットを使用
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

  // 実データを取得（直近7日 vs 前7日）
  const now = new Date();
  const currentEnd = subDays(now, 1);
  const currentStart = subDays(currentEnd, 6);
  const previousEnd = subDays(currentStart, 1);
  const previousStart = subDays(previousEnd, 6);

  const currentStartStr = format(currentStart, 'yyyy-MM-dd');
  const currentEndStr = format(currentEnd, 'yyyy-MM-dd');
  const previousStartStr = format(previousStart, 'yyyy-MM-dd');
  const previousEndStr = format(previousEnd, 'yyyy-MM-dd');
  const periodLabel = `${currentStartStr} 〜 ${currentEndStr}`;

  let currentMetrics, previousMetrics;
  if (site.ga4PropertyId && site.ga4OauthTokenId) {
    try {
      currentMetrics = await getGA4MetricsForSite(db, siteId, currentStartStr, currentEndStr);
      previousMetrics = await getGA4MetricsForSite(db, siteId, previousStartStr, previousEndStr);
    } catch (err) {
      console.error('[sendTestAlert] GA4 fetch error:', err.message);
    }
  }

  // GA4データがない場合はサンプルデータ
  if (!currentMetrics || !previousMetrics) {
    currentMetrics = {
      sessions: 472, totalUsers: 456, screenPageViews: 1203, averagePageviews: 2.55,
      engagementRate: 58.2, totalConversions: 2, conversionRate: 0.42, bounceRate: 41.8,
    };
    previousMetrics = {
      sessions: 1247, totalUsers: 1089, screenPageViews: 1318, averagePageviews: 2.61,
      engagementRate: 57.8, totalConversions: 7, conversionRate: 0.56, bounceRate: 42.2,
    };
  }

  const METRIC_KEYS = ['sessions', 'totalUsers', 'screenPageViews', 'averagePageviews', 'engagementRate', 'totalConversions', 'conversionRate', 'bounceRate'];
  const METRIC_LABELS = {
    sessions: '流入数（セッション）', totalUsers: 'ユーザー数', screenPageViews: '表示回数',
    averagePageviews: '平均PV', engagementRate: 'エンゲージメント率',
    totalConversions: 'コンバージョン数', conversionRate: 'コンバージョン率', bounceRate: '直帰率',
  };
  const ALERT_THRESHOLD = 30; // テスト用に閾値を下げる（本番は50%）

  // 全指標サマリーを構築
  const allMetricsSummary = [];
  const collectedAlerts = [];
  for (const key of METRIC_KEYS) {
    const current = currentMetrics[key];
    const previous = previousMetrics[key];
    const change = previous && previous !== 0 ? ((current - previous) / previous) * 100 : null;
    const isAlert = change != null && Math.abs(change) >= ALERT_THRESHOLD;
    allMetricsSummary.push({ key, label: METRIC_LABELS[key], current, previous, changePercent: change, isAlert });
    if (isAlert) {
      const isDrop = change < 0;
      collectedAlerts.push({
        metricName: key,
        metricLabel: METRIC_LABELS[key],
        currentValue: current,
        previousValue: previous,
        changePercent: change,
        message: `${METRIC_LABELS[key]}が${Math.abs(change).toFixed(1)}%${isDrop ? '減少' : '増加'}しました`,
        periodCurrent: periodLabel,
        periodPrevious: `${previousStartStr} 〜 ${previousEndStr}`,
      });
    }
  }

  // アラートが0件の場合、テスト用にセッションを強制追加
  if (collectedAlerts.length === 0) {
    allMetricsSummary[0].isAlert = true;
    collectedAlerts.push({
      metricName: 'sessions', metricLabel: '流入数（セッション）',
      currentValue: currentMetrics.sessions, previousValue: previousMetrics.sessions,
      changePercent: allMetricsSummary[0].changePercent || -10,
      message: '流入数（セッション）が変化しました（テスト送信）',
      periodCurrent: periodLabel,
      periodPrevious: `${previousStartStr} 〜 ${previousEndStr}`,
    });
  }

  // AI分析を生成
  const { generateBatchedAlertHypotheses } = await import('../utils/alertHypotheses.js');
  let aiAnalysis = { summary: '', actions: [] };
  try {
    aiAnalysis = await generateBatchedAlertHypotheses(db, siteId, collectedAlerts, siteName, siteUrl, allMetricsSummary);
  } catch (err) {
    console.error('[sendTestAlert] AI analysis error:', err.message);
    aiAnalysis = {
      summary: 'AI分析の生成に失敗しました。ダッシュボードで詳細をご確認ください。',
      actions: [],
    };
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'https://grow-reporter.com';
  const dashboardUrl = `${appBaseUrl}/dashboard?siteId=${siteId}`;

  const { subject, html, text } = generateBatchedAlertEmailTemplate(
    collectedAlerts, aiAnalysis, allMetricsSummary, siteName, siteUrl, periodLabel, dashboardUrl
  );
  const result = await sendEmailDirect({ to: recipientEmail, subject, html, text });
  console.log(`テストアラートメール送信成功: ${recipientEmail} (${collectedAlerts.length}件のアラート)`);
  return { success: true, message: `アラート通知テストメールを送信しました（${collectedAlerts.length}件の指標変化）`, messageId: result.messageId };
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
