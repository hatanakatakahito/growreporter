import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate, sendEmail } from '../utils/emailTemplates.js';

/**
 * テストメール送信ハンドラ（v2 request）
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
  const { recipientEmail, reportType = 'weekly' } = data;
  if (!recipientEmail) {
    throw new HttpsError('invalid-argument', '送信先メールアドレスが指定されていません');
  }
  try {
    console.log(`テストメール送信: ${recipientEmail} (${reportType})`);

    const now = new Date();
    const isWeekly = reportType === 'weekly';
    let currentStart, currentEnd, previousStart, previousEnd;
    if (isWeekly) {
      currentStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      currentEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      previousStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      previousEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
    } else {
      currentStart = subDays(now, 30);
      currentEnd = subDays(now, 1);
      previousStart = subDays(now, 60);
      previousEnd = subDays(now, 31);
    }
    const dateRange = {
      startDate: format(currentStart, 'yyyy/MM/dd', { locale: ja }),
      endDate: format(currentEnd, 'yyyy/MM/dd', { locale: ja }),
    };
    const siteData = {
      siteName: 'テストサイト - グローレポータ Demo',
      siteUrl: 'https://grow-reporter.com',
      metrics: {
        sessions: 12450,
        users: 9840,
        pageviews: 45678,
        averagePageviews: 3.67,
        engagementRate: 68.5,
        conversions: 124,
        conversionRate: 1.85,
        bounceRate: 42.3,
      },
      previousMetrics: {
        sessions: 10230,
        users: 8120,
        pageviews: 38456,
        averagePageviews: 3.45,
        engagementRate: 65.2,
        conversions: 98,
        conversionRate: 1.62,
        bounceRate: 45.8,
      },
    };
    const { subject, html, text } = generateEmailTemplate(reportType, siteData, dateRange);
    const result = await sendEmail(recipientEmail, subject, html, text);
    console.log(`テストメール送信成功: ${recipientEmail}`);
    return { success: true, message: 'テストメールを送信しました', messageId: result.messageId };
  } catch (error) {
    console.error('テストメール送信エラー:', error);
    throw new HttpsError('internal', 'テストメールの送信に失敗しました: ' + error.message);
  }
}
