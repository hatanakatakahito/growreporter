/**
 * recruit/ 関連の全キャッシュをクリアして Browser Rendering を強制再実行させる。
 *
 * 削除対象:
 *   1. Firestore: sites/{SITE_ID}/pageScreenshots の recruit/ レコード
 *   2. Storage: page-renderings/{SITE_ID}/*.html （Browser Rendering の HTML キャッシュ全削除）
 *
 * 使い方 (functions/ ディレクトリから実行):
 *   node scripts/_screenshot_check/browser_rendering_poc/clear-recruit-all-caches.mjs
 */
import admin from 'firebase-admin';

const PROJECT_ID = 'growgroupreporter';
const STORAGE_BUCKET = 'growgroupreporter.firebasestorage.app';
const SITE_ID = 'CZYomSqeTRAnIWgD8Km4';
const TARGET_URL = 'https://grow-group.jp/recruit/';

admin.initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase();
    if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) u.pathname += '/';
    return u.toString();
  } catch {
    return url;
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// 1) Firestore pageScreenshots: recruit/ レコード削除
const ssCol = db.collection(`sites/${SITE_ID}/pageScreenshots`);
const target = normalizeUrl(TARGET_URL);
console.log(`[1/2] Firestore pageScreenshots: searching for ${TARGET_URL}`);
const snap = await ssCol.get();
let firestoreDeleted = 0;
for (const d of snap.docs) {
  if (d.id === '_meta') continue;
  const data = d.data();
  if (data?.url && normalizeUrl(data.url) === target) {
    console.log(`  Deleting Firestore doc ${d.id} (source=${data.source || 'unknown'})`);
    await d.ref.delete();
    firestoreDeleted++;
  }
}
console.log(`  → deleted ${firestoreDeleted} Firestore document(s).`);

// 2) Storage page-renderings: 全削除
console.log(`[2/2] Storage page-renderings/${SITE_ID}/: deleting all HTML caches`);
const [files] = await bucket.getFiles({ prefix: `page-renderings/${SITE_ID}/` });
let storageDeleted = 0;
for (const f of files) {
  console.log(`  Deleting ${f.name}`);
  await f.delete();
  storageDeleted++;
}
console.log(`  → deleted ${storageDeleted} Storage object(s).`);

console.log('Done.');
process.exit(0);
