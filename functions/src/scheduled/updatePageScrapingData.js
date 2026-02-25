import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { runScrapingForSite } from '../callable/scrapeTop100Pages.js';

const SCRAPING_INTERVAL_DAYS = 30;
const MAX_SITES_PER_RUN = 1; // 1サイトずつ実行（スクレイピング時間を考慮）

/**
 * ページスクレイピングデータの定期更新
 * 毎日1回実行し、最終スクレイピングから30日以上経過したサイトを1サイトだけ再スクレイピング
 */
export const updatePageScrapingDataScheduled = onSchedule({
  schedule: '0 3 * * *', // 毎日 3:00 (Asia/Tokyo)
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '2GiB',
  timeoutSeconds: 600, // 10分
}, async () => {
  logger.info('[updatePageScrapingData] 定期スクレイピング更新開始');

  const db = getFirestore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SCRAPING_INTERVAL_DAYS);

  try {
    const sitesSnapshot = await db.collection('sites').get();

    const sitesToUpdate = [];
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) continue;
      const siteId = siteDoc.id;
      const metaDoc = await db.collection('sites').doc(siteId).collection('pageScrapingMeta').doc('default').get();
      const lastScrapedAt = metaDoc.exists
        ? (metaDoc.data().lastScrapedAt?.toDate?.() ?? metaDoc.data().lastScrapedAt)
        : null;
      if (!lastScrapedAt || (lastScrapedAt instanceof Date && lastScrapedAt < cutoff)) {
        sitesToUpdate.push({ siteId, lastScrapedAt: lastScrapedAt || null });
      }
    }

    // 最終更新が古い順（未実行を優先）
    sitesToUpdate.sort((a, b) => {
      if (!a.lastScrapedAt) return -1;
      if (!b.lastScrapedAt) return 1;
      return a.lastScrapedAt.getTime() - b.lastScrapedAt.getTime();
    });

    const toProcess = sitesToUpdate.slice(0, MAX_SITES_PER_RUN);
    if (toProcess.length === 0) {
      logger.info('[updatePageScrapingData] 更新対象サイトなし');
      return;
    }

    for (const { siteId } of toProcess) {
      try {
        logger.info('[updatePageScrapingData] スクレイピング実行', { siteId });
        await runScrapingForSite(db, siteId, { skipRateLimit: true });
        logger.info('[updatePageScrapingData] スクレイピング完了', { siteId });
      } catch (err) {
        logger.error('[updatePageScrapingData] サイトスクレイピングエラー', { siteId, error: err.message });
        await db.collection('error_logs').add({
          type: 'scheduled_scraping_error',
          function: 'updatePageScrapingData',
          siteId,
          error: err.message,
          timestamp: new Date(),
        });
      }
    }

    logger.info('[updatePageScrapingData] 定期スクレイピング更新完了', {
      processed: toProcess.length,
      remaining: sitesToUpdate.length - toProcess.length,
    });
  } catch (error) {
    logger.error('[updatePageScrapingData] エラー:', error);
    throw error;
  }
});
