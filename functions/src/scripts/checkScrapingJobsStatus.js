import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * scrapingJobs コレクションの最近のジョブ状態を確認するスクリプト
 * 特に batch_rescrape ソースのジョブについて pending / running / completed / error を集計
 */

initializeApp();

async function checkJobsStatus() {
  const db = getFirestore();
  // 最近のジョブ(過去1時間分)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const snapshot = await db
    .collection('scrapingJobs')
    .where('requestedAt', '>=', oneHourAgo)
    .get();

  console.log(`[checkJobsStatus] 過去1時間のジョブ: ${snapshot.size}件`);

  const byStatus = { pending: [], running: [], completed: [], error: [], other: [] };
  snapshot.forEach((doc) => {
    const data = doc.data();
    const bucket = byStatus[data.status] || byStatus.other;
    bucket.push({
      jobId: doc.id,
      siteId: data.siteId,
      source: data.source,
      status: data.status,
      requestedAt: data.requestedAt?.toDate?.()?.toISOString?.(),
      startedAt: data.startedAt?.toDate?.()?.toISOString?.(),
      completedAt: data.completedAt?.toDate?.()?.toISOString?.(),
      error: data.error,
    });
  });

  console.log(`\n  pending  : ${byStatus.pending.length}`);
  console.log(`  running  : ${byStatus.running.length}`);
  console.log(`  completed: ${byStatus.completed.length}`);
  console.log(`  error    : ${byStatus.error.length}`);
  console.log(`  other    : ${byStatus.other.length}`);

  for (const [status, list] of Object.entries(byStatus)) {
    if (list.length === 0) continue;
    console.log(`\n=== ${status} (${list.length}) ===`);
    for (const j of list) {
      console.log(`  ${j.siteId} [${j.source || '-'}] req=${j.requestedAt} started=${j.startedAt || '-'} completed=${j.completedAt || '-'}${j.error ? ' ERROR=' + j.error : ''}`);
    }
  }
}

checkJobsStatus()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
