import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 単一サイトを再スクレイピングするためのジョブ投入
 * 使い方: node --loader ./loader.mjs src/scripts/triggerSingleSiteRescrape.js <siteId>
 */

initializeApp();

const siteId = process.argv[2];
if (!siteId) {
  console.error('使い方: node --loader ./loader.mjs src/scripts/triggerSingleSiteRescrape.js <siteId>');
  process.exit(1);
}

async function trigger() {
  const db = getFirestore();

  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    console.error(`サイトが見つかりません: ${siteId}`);
    process.exit(1);
  }
  const data = siteDoc.data() || {};
  console.log(`[trigger] ${siteId} | ${data.siteName || '(no name)'} | ${data.siteUrl || '(no url)'}`);

  const ref = await db.collection('scrapingJobs').add({
    siteId,
    requestedBy: data.userId || null,
    forceRescrape: true,
    status: 'pending',
    requestedAt: FieldValue.serverTimestamp(),
    source: 'admin_test',
  });

  console.log(`[trigger] scrapingJobs/${ref.id} を投入しました`);
  console.log('onScrapingJobCreated トリガーが発火 → 100ページスクレイピング → Phase E 2段階推定が走ります');
}

trigger()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
