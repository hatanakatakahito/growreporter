import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK初期化（ADC使用）
initializeApp({ projectId: 'growgroupreporter' });
const db = getFirestore();

/**
 * 全サイトのAI分析キャッシュを一括削除
 * 削除後、各ページにアクセスすると新プロンプトで再生成される
 */
async function clearAllAICache() {
  console.log('[clearAICache] 全サイトAI分析キャッシュ一括削除開始');

  const sitesSnapshot = await db.collection('sites').get();
  let totalDeleted = 0;
  let siteCount = 0;

  for (const siteDoc of sitesSnapshot.docs) {
    const siteId = siteDoc.id;
    const siteData = siteDoc.data();
    const siteName = siteData.name || siteData.siteUrl || siteId;

    const cacheSnapshot = await db
      .collection('sites')
      .doc(siteId)
      .collection('aiAnalysisCache')
      .get();

    if (cacheSnapshot.empty) {
      console.log(`  ${siteName}: キャッシュなし`);
      continue;
    }

    let batch = db.batch();
    let batchCount = 0;
    let siteDeleted = 0;

    for (const cacheDoc of cacheSnapshot.docs) {
      batch.delete(cacheDoc.ref);
      batchCount++;
      siteDeleted++;

      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    totalDeleted += siteDeleted;
    siteCount++;
    console.log(`  ✅ ${siteName}: ${siteDeleted}件のキャッシュを削除`);
  }

  console.log(`\n[clearAICache] 完了: ${siteCount}サイト / ${totalDeleted}件のキャッシュを削除`);
  console.log('[clearAICache] 各ページにアクセスすると新しいプロンプトでAI分析が自動再生成されます');
}

clearAllAICache().catch(err => {
  console.error('[clearAICache] エラー:', err);
  process.exit(1);
});
