/**
 * ユーザー関連を users 配下へ移行済みのため、ルートの旧コレクションを削除するスクリプト
 * 実行: cd functions && node src/scripts/deleteOldUserRootCollections.js
 * 前提: migrateUserCollectionsToUsers 済み・デプロイ済みであること。
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BATCH_SIZE = 500;

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
    'oauth_tokens',
    'planChangeHistory',
    'memoReadStatus',
    'userAlertReads',
    'reports',
    'customLimits',
  ];

  const stats = {};
  for (const id of collections) {
    const count = await deleteCollection(db, id);
    stats[id] = count;
    console.log(`${id}: ${count} 件削除`);
  }

  console.log('\n旧ユーザー関連ルートコレクション削除完了:', stats);
  return stats;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
