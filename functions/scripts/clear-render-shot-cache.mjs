/**
 * 改善ロジック統一化プラン (Phase 2) で導入した render+shot キャッシュを
 * 1 サイトについて全クリアするスクリプト。
 *
 * 使い方: node functions/scripts/clear-render-shot-cache.mjs <siteId>
 *
 * クリア対象:
 *   1. Firestore: sites/{siteId}/pageScreenshots/* (_meta 含む全件)
 *   2. Storage:   page-renderings/{siteId}/*.html
 *   3. Storage:   page-renderings-shots/{siteId}/*.jpg
 *
 * 次回 preheat / expandManualImprovement / generateImprovementMockup で
 * キャッシュ未ヒットになり、すべて新規 BR 撮影に走る。
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();
const bucket = admin.storage().bucket('growgroupreporter.firebasestorage.app');

const siteId = process.argv[2];
if (!siteId) {
  console.error('Usage: node clear-render-shot-cache.mjs <siteId>');
  process.exit(1);
}

console.log(`=== Clearing render+shot cache for siteId=${siteId} ===\n`);

// 1. Firestore: pageScreenshots/* 全削除
const ssCol = db.collection(`sites/${siteId}/pageScreenshots`);
const ssSnap = await ssCol.get();
let fsCleared = 0;
for (const d of ssSnap.docs) {
  await d.ref.delete();
  fsCleared++;
}
console.log(`Firestore: pageScreenshots ${fsCleared} docs deleted`);

// 2. Storage: page-renderings/{siteId}/*
const [renderFiles] = await bucket.getFiles({ prefix: `page-renderings/${siteId}/` });
let renderCleared = 0;
for (const f of renderFiles) {
  await f.delete();
  renderCleared++;
}
console.log(`Storage:   page-renderings/${siteId}/ ${renderCleared} files deleted`);

// 3. Storage: page-renderings-shots/{siteId}/*
const [shotFiles] = await bucket.getFiles({ prefix: `page-renderings-shots/${siteId}/` });
let shotCleared = 0;
for (const f of shotFiles) {
  await f.delete();
  shotCleared++;
}
console.log(`Storage:   page-renderings-shots/${siteId}/ ${shotCleared} files deleted`);

console.log(`\nDone. 次回 preheat で全ページ × {pc, mobile} が新規撮影されます。`);
process.exit(0);
