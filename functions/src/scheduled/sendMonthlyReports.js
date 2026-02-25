import { getFirestore } from 'firebase-admin/firestore';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateEmailTemplate } from '../utils/emailTemplates.js';
import { sendEmailDirect } from '../utils/emailSender.js';

/**
 * 月次レポートを送信
 * Cloud Schedulerから毎月指定の日・時刻に実行される
 * 
 * 実行例:
 * - 毎月1日 9:00 JST: '0 9 1 * *'
 * - 毎月5日 10:00 JST: '0 10 5 * *'
 */
export async function sendMonthlyReportsHandler(event) {
    console.log('月次レポート送信開始');
    const db = getFirestore();

    try {
      // 1. 管理者設定を取得
      const settingsDoc = await db.collection('systemSettings').doc('emailNotifications').get();
      
      if (!settingsDoc.exists) {
        console.log('メール通知設定が見つかりません');
        return null;
      }

      const settings = settingsDoc.data();
      const { monthlyReport } = settings;

      // 月次レポートが無効の場合は終了
      if (!monthlyReport || !monthlyReport.enabled) {
        console.log('月次レポートは無効化されています');
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

      // 3. 期間を計算（先月1日〜末日）
      const now = new Date();
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const prevMonthStart = startOfMonth(subMonths(now, 2));
      const prevMonthEnd = endOfMonth(subMonths(now, 2));

      const dateRange = {
        startDate: format(lastMonthStart, 'yyyy/MM/dd', { locale: ja }),
        endDate: format(lastMonthEnd, 'yyyy/MM/dd', { locale: ja }),
      };

      const previousDateRange = {
        startDate: format(prevMonthStart, 'yyyy/MM/dd', { locale: ja }),
        endDate: format(prevMonthEnd, 'yyyy/MM/dd', { locale: ja }),
      };

      // 4. 各ユーザーのサイトに対してレポートを生成・送信
      const sendPromises = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userEmail = userData.email;
        const ns = userData.notificationSettings || {};
        const wantMonthly = ns.monthlyReportEmail !== undefined ? ns.monthlyReportEmail : ns.emailNotifications;

        if (!userEmail) {
          console.log(`ユーザー ${userId} のメールアドレスが見つかりません`);
          continue;
        }
        if (!wantMonthly) {
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
          const metrics = await fetchMonthlyMetrics(userId, siteId, lastMonthStart, lastMonthEnd);
          const previousMetrics = await fetchMonthlyMetrics(userId, siteId, prevMonthStart, prevMonthEnd);

          if (!metrics || !previousMetrics) {
            console.log(`サイト ${siteId} のメトリクスデータが取得できませんでした`);
            continue;
          }

          // メールテンプレートを生成（Firestore の sites は siteName / siteUrl）
          const emailData = {
            siteName: siteData.siteName || siteData.siteUrl || '（サイト名なし）',
            siteUrl: siteData.siteUrl || '',
            metrics,
            previousMetrics,
          };

          const { subject, html, text } = generateEmailTemplate('monthly', emailData, dateRange);

          // メール送信をキューに追加
          sendPromises.push(
            sendEmailDirect({ to: userEmail, subject, html, text })
              .then(() => {
                console.log(`月次レポート送信成功: ${userEmail} - ${siteData.siteName || siteId}`);
              })
              .catch((error) => {
                console.error(`月次レポート送信失敗: ${userEmail} - ${siteData.siteName || siteId}`, error);
              })
          );
        }
      }

      // すべてのメール送信を待機
      await Promise.all(sendPromises);
      console.log(`月次レポート送信完了: ${sendPromises.length}件`);

      return null;
    } catch (error) {
      console.error('月次レポート送信エラー:', error);
      throw error;
    }
  }

/**
 * 月次メトリクスを取得
 * 注意: 実際にはGA4 APIまたはキャッシュから取得する必要があります
 * @param {string} userId 
 * @param {string} siteId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Object|null} メトリクスデータ
 */
async function fetchMonthlyMetrics(userId, siteId, startDate, endDate) {
  try {
    // TODO: 実際のGA4 API連携を実装
    // 暫定: モックデータを返す
    return {
      sessions: Math.floor(Math.random() * 40000) + 5000,
      users: Math.floor(Math.random() * 35000) + 4000,
      pageviews: Math.floor(Math.random() * 120000) + 15000,
      averagePageviews: Math.random() * 5 + 1,
      engagementRate: Math.random() * 100,
      conversions: Math.floor(Math.random() * 500),
      conversionRate: Math.random() * 5,
      bounceRate: Math.random() * 80 + 20,
    };
  } catch (error) {
    console.error('メトリクス取得エラー:', error);
    return null;
  }
}
