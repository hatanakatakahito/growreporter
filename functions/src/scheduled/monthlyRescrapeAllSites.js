import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 毎月1日に全サイトの再スクレイピングジョブをキューに登録
 * onScrapingJobCreated トリガーが順次実行し、完了後にスクリーンショット撮影も自動実行される
 */
export const monthlyRescrapeAllSites = onSchedule({
  schedule: '0 0 1 * *', // 毎月1日 0:00 (Asia/Tokyo)
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '256MiB',
  timeoutSeconds: 120,
}, async () => {
  logger.info('[monthlyRescrapeAllSites] 月次再スクレイピング開始');

  const db = getFirestore();

  try {
    // GA4連携済みの全サイトを取得
    const sitesSnapshot = await db.collection('sites').get();
    let queued = 0;
    let skipped = 0;

    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      // GA4連携が完了しているサイトのみ対象
      if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
        skipped++;
        continue;
      }

      const siteId = siteDoc.id;
      try {
        await db.collection('scrapingJobs').add({
          siteId,
          requestedBy: 'system',
          forceRescrape: true,
          status: 'pending',
          requestedAt: FieldValue.serverTimestamp(),
          source: 'monthly_rescrape',
        });
        queued++;
        logger.info(`[monthlyRescrapeAllSites] ジョブ登録: ${siteId}`);
      } catch (e) {
        logger.warn(`[monthlyRescrapeAllSites] ジョブ登録エラー: ${siteId}`, { error: e.message });
      }
    }

    logger.info(`[monthlyRescrapeAllSites] 完了: ${queued}件キュー登録, ${skipped}件スキップ`);
  } catch (error) {
    logger.error('[monthlyRescrapeAllSites] エラー:', error);
    throw error;
  }
});
