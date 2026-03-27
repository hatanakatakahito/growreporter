import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Firebase Admin SDK初期化（ADC使用）
initializeApp({ projectId: 'growgroupreporter' });
const db = getFirestore();

/**
 * 全サイトに再スクレイピングジョブを一括登録
 * onScrapingJobCreated トリガーが順次実行する
 */
async function rescrapeAllSites() {
  console.log('[rescrapeAll] 全サイト再スクレイピング開始');

  const sitesSnapshot = await db.collection('sites').get();
  let queued = 0;
  let skipped = 0;

  for (const siteDoc of sitesSnapshot.docs) {
    const siteData = siteDoc.data();
    // GA4連携が完了しているサイトのみ対象
    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      console.log(`  スキップ: ${siteDoc.id} (GA4未連携)`);
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
        source: 'manual_batch_rescrape',
      });
      queued++;
      console.log(`  ジョブ登録: ${siteId} (${siteData.siteUrl || siteData.siteName || ''})`);
    } catch (e) {
      console.error(`  エラー: ${siteId}`, e.message);
    }
  }

  console.log(`[rescrapeAll] 完了: ${queued}件キュー登録, ${skipped}件スキップ`);
}

rescrapeAllSites().catch(console.error);
