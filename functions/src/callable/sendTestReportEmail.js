import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate, sendEmail } from '../utils/emailTemplates.js';

/**
 * テストメール送信（管理者専用）
 * フロントエンドから呼び出されて、管理者自身にテストメールを送信
 */
export const sendTestReportEmail = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const db = getFirestore();
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'この機能を使用するには認証が必要です'
      );
    }

    const userId = context.auth.uid;

    // 管理者権限チェック（adminUsersコレクションを確認）
    const adminDoc = await db.collection('adminUsers').doc(userId).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '管理者権限が必要です'
      );
    }

    // admin, editor, viewer のいずれかの権限があればOK
    const adminRole = adminDoc.data().role;
    if (!['admin', 'editor', 'viewer'].includes(adminRole)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '管理者権限が必要です'
      );
    }

    const { recipientEmail, reportType = 'weekly' } = data;

    if (!recipientEmail) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '送信先メールアドレスが指定されていません'
      );
    }

    try {
      console.log(`テストメール送信: ${recipientEmail} (${reportType})`);

      // テスト用の期間を設定
      const now = new Date();
      const isWeekly = reportType === 'weekly';

      let currentStart, currentEnd, previousStart, previousEnd;

      if (isWeekly) {
        currentStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        currentEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        previousStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
        previousEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      } else {
        // 月次の場合（簡易版）
        currentStart = subDays(now, 30);
        currentEnd = subDays(now, 1);
        previousStart = subDays(now, 60);
        previousEnd = subDays(now, 31);
      }

      const dateRange = {
        startDate: format(currentStart, 'yyyy/MM/dd', { locale: ja }),
        endDate: format(currentEnd, 'yyyy/MM/dd', { locale: ja }),
      };

      // テスト用のモックデータ
      const siteData = {
        siteName: 'テストサイト - GROW REPORTER Demo',
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

      // メールテンプレート生成
      const { subject, html, text } = generateEmailTemplate(reportType, siteData, dateRange);

      // メール送信
      const result = await sendEmail(recipientEmail, subject, html, text);

      console.log(`テストメール送信成功: ${recipientEmail}`);

      return {
        success: true,
        message: 'テストメールを送信しました',
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('テストメール送信エラー:', error);
      throw new functions.https.HttpsError(
        'internal',
        'テストメールの送信に失敗しました: ' + error.message
      );
    }
  });
