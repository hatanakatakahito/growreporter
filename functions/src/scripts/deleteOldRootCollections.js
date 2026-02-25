/**
 * サブコレクション移行済みのため、ルートの旧コレクションを削除するスクリプト
 * 実行: cd functions && node src/scripts/deleteOldRootCollections.js
 * 前提: migrateToSubcollections 済みであること。削除後はロールバック不可。
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BATCH_SIZE = 500; // Firestore のバッチ上限

async function deleteCollection(db, collectionId) {
  const col = db.collection(collectionId);
  let total = 0;
  let snapshot = await col.limit(BATCH_SIZE).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.size;
    if (snapshot.size < BATCH_SIZE) break;
    const last = snapshot.docs[snapshot.docs.length - 1];
    snapshot = await col.limit(BATCH_SIZE).startAfter(last).get();
  }
  return total;
}

async function main() {
  initializeApp();
  const db = getFirestore();

  const collections = [
    'improvements',
    'pageNotes',
    'pageScrapingData',
    'pageScrapingMeta',
    'scrapingProgress',
    'scrapingErrors',
    'aiAnalysisCache',
    'aiSummaries',
  ];

  const stats = {};
  for (const id of collections) {
    const count = await deleteCollection(db, id);
    stats[id] = count;
    console.log(`${id}: ${count} 件削除`);
  }

  // accountMembers は廃止済み。残っていれば削除する（任意）
  try {
    stats.accountMembers = await deleteCollection(db, 'accountMembers');
    console.log(`accountMembers: ${stats.accountMembers} 件削除`);
  } catch (e) {
    console.log('accountMembers: スキップまたは 0 件', e.message);
  }

  console.log('\n旧ルートコレクション削除完了:', stats);
  return stats;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
