/**
 * recruit/ の Before スクショを Browser Rendering で再撮影し、
 * pageScreenshots コレクションに登録する。
 *
 * 使い方 (functions/ ディレクトリから実行):
 *   node scripts/_screenshot_check/browser_rendering_poc/recapture-recruit-before.mjs
 *
 * 内部処理:
 *   1. CF Worker mode='screenshot' で recruit/ を撮影
 *   2. JPEG を Storage page-screenshots/{siteId}/ に保存
 *   3. pageScreenshots に source: 'on-demand-browser-rendering' で登録
 */
import admin from 'firebase-admin';

const PROJECT_ID = 'growgroupreporter';
const STORAGE_BUCKET = 'growgroupreporter.firebasestorage.app';
const SITE_ID = 'CZYomSqeTRAnIWgD8Km4';
const TARGET_URL = 'https://grow-group.jp/recruit/';
const PAGE_PATH = '/recruit/';
// Worker URL は公開前提。Secret は環境変数経由（Firebase Secret Manager と同じ値）。
// 実行例: CF_PROXY_SECRET=xxxx node scripts/_screenshot_check/browser_rendering_poc/recapture-recruit-before.mjs
const WORKER_URL = process.env.CF_PROXY_URL || 'https://growreporter-fetch-proxy.hatanaka-a1e.workers.dev';
const PROXY_SECRET = process.env.CF_PROXY_SECRET || '';
if (!PROXY_SECRET) {
  console.error('[recapture-recruit-before] CF_PROXY_SECRET 環境変数が未設定です。');
  console.error('  例: CF_PROXY_SECRET=xxxx node scripts/_screenshot_check/browser_rendering_poc/recapture-recruit-before.mjs');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket();

console.log(`[1/3] CF Worker で screenshot 撮影: ${TARGET_URL}`);
const res = await fetch(WORKER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Proxy-Secret': PROXY_SECRET },
  body: JSON.stringify({ url: TARGET_URL, mode: 'screenshot', viewport: 'pc' }),
});
const data = await res.json();
if (data.error) {
  console.error('Error:', data.error);
  process.exit(1);
}
console.log(`  byteLen: ${data.byteLen}, viewport: ${data.viewport}`);

console.log(`[2/3] Storage にアップロード`);
const buf = Buffer.from(data.screenshot, 'base64');
const fileName = `page-screenshots/${SITE_ID}/${Date.now()}_pc__recruit_.jpg`;
const file = bucket.file(fileName);
await file.save(buf, {
  metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' },
  resumable: false,
});
await file.makePublic();
const imageUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${fileName}`;
console.log(`  → ${imageUrl}`);

console.log(`[3/3] Firestore pageScreenshots に登録`);
const ssCol = db.collection(`sites/${SITE_ID}/pageScreenshots`);
const docRef = await ssCol.add({
  url: TARGET_URL,
  pagePath: PAGE_PATH,
  screenshotUrl: imageUrl,
  imageSize: buf.length,
  capturedAt: admin.firestore.FieldValue.serverTimestamp(),
  screenshotType: 'full-page',
  source: 'on-demand-browser-rendering',
});
await ssCol.doc('_meta').set(
  { lastCapturedAt: admin.firestore.FieldValue.serverTimestamp() },
  { merge: true }
);
console.log(`  Firestore doc: ${docRef.id}`);

console.log('Done.');
process.exit(0);
