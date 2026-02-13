import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate, sendEmail } from '../utils/emailTemplates.js';

/**
 * 週次レポートを送信
 * Cloud Schedulerから毎週指定の曜日・時刻に実行される
 * 
 * 実行例:
 * - 毎週月曜日 9:00 JST: '0 9 * * 1'
 * - 毎週金曜日 18:00 JST: '0 18 * * 5'
 */
export const sendWeeklyReports = functions
  .region('asia-northeast1')
  .pubsub.schedule('0 9 * * 1') // 暫定: 毎週月曜日 9:00 JST（後でCloud Schedulerで動的に設定）
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
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

      // 週次レポートが無効の場合は終了
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

      // 3. 期間を計算（先週の月曜日〜日曜日）
      const now = new Date();
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevWeekStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });

      const dateRange = {
        startDate: format(lastWeekStart, 'yyyy/MM/dd', { locale: ja }),
        endDate: format(lastWeekEnd, 'yyyy/MM/dd', { locale: ja }),
      };

      const previousDateRange = {
        startDate: format(prevWeekStart, 'yyyy/MM/dd', { locale: ja }),
        endDate: format(prevWeekEnd, 'yyyy/MM/dd', { locale: ja }),
      };

      // 4. 各ユーザーのサイトに対してレポートを生成・送信
      const sendPromises = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userEmail = userDoc.data().email;

        if (!userEmail) {
          console.log(`ユーザー ${userId} のメールアドレスが見つかりません`);
          continue;
        }

        // ユーザーのサイト一覧を取得
        const sitesSnapshot = await db
          .collection('sites')
          .where('userId', '==', userId)
          .get();

        if (sitesSnapshot.empty) {
          console.log(`ユーザー ${userId} のサイトがありません`);
          continue;
        }

        // 各サイトのレポートを送信
        for (const siteDoc of sitesSnapshot.docs) {
          const siteId = siteDoc.id;
          const siteData = siteDoc.data();

          // メトリクスデータを取得（実際にはGA4 APIから取得する必要があります）
          // ここでは仮のデータ構造を示します
          const metrics = await fetchWeeklyMetrics(userId, siteId, lastWeekStart, lastWeekEnd);
          const previousMetrics = await fetchWeeklyMetrics(userId, siteId, prevWeekStart, prevWeekEnd);

          if (!metrics || !previousMetrics) {
            console.log(`サイト ${siteId} のメトリクスデータが取得できませんでした`);
            continue;
          }

          // メールテンプレートを生成
          const emailData = {
            siteName: siteData.title || siteData.url,
            siteUrl: siteData.url,
            metrics,
            previousMetrics,
          };

          const { subject, html, text } = generateEmailTemplate('weekly', emailData, dateRange);

          // メール送信をキューに追加
          sendPromises.push(
            sendEmail(userEmail, subject, html, text)
              .then(() => {
                console.log(`週次レポート送信成功: ${userEmail} - ${siteData.title}`);
              })
              .catch((error) => {
                console.error(`週次レポート送信失敗: ${userEmail} - ${siteData.title}`, error);
              })
          );
        }
      }

      // すべてのメール送信を待機
      await Promise.all(sendPromises);
      console.log(`週次レポート送信完了: ${sendPromises.length}件`);

      return null;
    } catch (error) {
      console.error('週次レポート送信エラー:', error);
      throw error;
    }
  });

/**
 * 週次メトリクスを取得
 * 注意: 実際にはGA4 APIまたはキャッシュから取得する必要があります
 * @param {string} userId 
 * @param {string} siteId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Object|null} メトリクスデータ
 */
async function fetchWeeklyMetrics(userId, siteId, startDate, endDate) {
  try {
    // TODO: 実際のGA4 API連携を実装
    // 暫定: モックデータを返す
    return {
      sessions: Math.floor(Math.random() * 10000) + 1000,
      users: Math.floor(Math.random() * 8000) + 800,
      pageviews: Math.floor(Math.random() * 30000) + 3000,
      averagePageviews: Math.random() * 5 + 1,
      engagementRate: Math.random() * 100,
      conversions: Math.floor(Math.random() * 100),
      conversionRate: Math.random() * 5,
      bounceRate: Math.random() * 80 + 20,
    };
  } catch (error) {
    console.error('メトリクス取得エラー:', error);
    return null;
  }
}
