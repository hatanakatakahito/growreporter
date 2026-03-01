import { getFirestore } from 'firebase-admin/firestore';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate } from '../utils/emailTemplates.js';
import { sendEmailDirect } from '../utils/emailSender.js';
import { getGA4MetricsForSite } from '../utils/ga4ServerHelper.js';

/**
 * 週次レポートを送信
 * Cloud Schedulerから毎週月曜日 9:00 JST に実行
 */
export async function sendWeeklyReportsHandler(event) {
  console.log('週次レポート送信開始');
  const db = getFirestore();

  try {
    // 1. 管理者設定を取得
    const settingsDoc = await db.collection('systemSettings').doc('emailNotifications').get();

    if (!settingsDoc.exists) {
      console.log('メール通知設定が見つかりません');
      return null;
    }

    const settings = settingsDoc.data();
    const { weeklyReport } = settings;

    if (!weeklyReport || !weeklyReport.enabled) {
      console.log('週次レポートは無効化されています');
      return null;
    }

    // 2. メール通知を有効にしているユーザーを取得
    const usersSnapshot = await db
      .collection('users')
      .where('notificationSettings.emailNotifications', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('メール通知を有効にしているユーザーがいません');
      return null;
    }

    console.log(`対象ユーザー数: ${usersSnapshot.size}`);

    // 3. 期間を計算（先週月〜日 / 前々週月〜日）
    const now = new Date();
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const prevWeekStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
    const prevWeekEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });

    const dateRange = {
      startDate: format(lastWeekStart, 'yyyy/MM/dd', { locale: ja }),
      endDate: format(lastWeekEnd, 'yyyy/MM/dd', { locale: ja }),
    };

    // GA4 API用の日付文字列（YYYY-MM-DD）
    const ga4CurrentStart = format(lastWeekStart, 'yyyy-MM-dd');
    const ga4CurrentEnd = format(lastWeekEnd, 'yyyy-MM-dd');
    const ga4PrevStart = format(prevWeekStart, 'yyyy-MM-dd');
    const ga4PrevEnd = format(prevWeekEnd, 'yyyy-MM-dd');

    // 4. 各ユーザーのサイトに対してレポートを生成・送信
    const sendPromises = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;
      const ns = userData.notificationSettings || {};
      const wantWeekly = ns.weeklyReportEmail !== undefined ? ns.weeklyReportEmail : ns.emailNotifications;

      if (!userEmail || !wantWeekly) continue;

      // ユーザーのサイト一覧を取得
      const sitesSnapshot = await db
        .collection('sites')
        .where('userId', '==', userId)
        .get();

      if (sitesSnapshot.empty) continue;

      for (const siteDoc of sitesSnapshot.docs) {
        const siteId = siteDoc.id;
        const siteData = siteDoc.data();

        // GA4未設定のサイトはスキップ
        if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
          console.log(`サイト ${siteId} はGA4未設定のためスキップ`);
          continue;
        }

        // GA4 APIから実データを取得
        const rawMetrics = await getGA4MetricsForSite(db, siteId, ga4CurrentStart, ga4CurrentEnd);
        const rawPrevMetrics = await getGA4MetricsForSite(db, siteId, ga4PrevStart, ga4PrevEnd);

        if (!rawMetrics || !rawPrevMetrics) {
          console.log(`サイト ${siteId} のメトリクスデータが取得できませんでした`);
          continue;
        }

        // テンプレート用にフィールド名をマッピング
        const metrics = mapMetricsForTemplate(rawMetrics);
        const previousMetrics = mapMetricsForTemplate(rawPrevMetrics);

        // CV内訳・KPIデータ
        const conversionDetails = rawMetrics.conversionDetails || [];
        const previousConversionDetails = rawPrevMetrics.conversionDetails || [];
        const kpiSettings = siteData.kpiSettings || null;

        const emailData = {
          siteName: siteData.siteName || siteData.siteUrl || '（サイト名なし）',
          siteUrl: siteData.siteUrl || '',
          siteId,
          metrics,
          previousMetrics,
          conversionDetails,
          previousConversionDetails,
          kpiSettings,
        };

        const { subject, html, text } = generateEmailTemplate('weekly', emailData, dateRange);

        sendPromises.push(
          sendEmailDirect({ to: userEmail, subject, html, text })
            .then(() => {
              console.log(`週次レポート送信成功: ${userEmail} - ${siteData.siteName || siteId}`);
            })
            .catch((error) => {
              console.error(`週次レポート送信失敗: ${userEmail} - ${siteData.siteName || siteId}`, error);
            })
        );
      }
    }

    await Promise.all(sendPromises);
    console.log(`週次レポート送信完了: ${sendPromises.length}件`);
    return null;
  } catch (error) {
    console.error('週次レポート送信エラー:', error);
    throw error;
  }
}

/**
 * ga4ServerHelper の返却値をメールテンプレートのフィールド名に変換
 */
function mapMetricsForTemplate(raw) {
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
