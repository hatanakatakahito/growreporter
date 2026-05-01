/**
 * 採用TOP (https://grow-group.jp/recruit/) の pageScreenshots キャッシュを削除する。
 *
 * 次回 expandManualImprovement / generateImprovementMockup を呼ぶと、
 * Browser Rendering 経路で再撮影される。
 *
 * 使い方 (functions/ ディレクトリから実行):
 *   node scripts/_screenshot_check/browser_rendering_poc/clear-recruit-screenshot-cache.mjs
 */
import admin from 'firebase-admin';

const PROJECT_ID = 'growgroupreporter';
const SITE_ID = 'CZYomSqeTRAnIWgD8Km4';
const TARGET_URL = 'https://grow-group.jp/recruit/';

admin.initializeApp({ projectId: PROJECT_ID });

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
const ssCol = db.collection(`sites/${SITE_ID}/pageScreenshots`);
const target = normalizeUrl(TARGET_URL);

console.log(`Searching pageScreenshots for ${TARGET_URL} (normalized: ${target})`);
const snap = await ssCol.get();
let deletedCount = 0;
for (const d of snap.docs) {
  if (d.id === '_meta') continue;
  const data = d.data();
  if (data?.url && normalizeUrl(data.url) === target) {
    console.log(`  Deleting: ${d.id} (source=${data.source || 'unknown'}, url=${data.url})`);
    await d.ref.delete();
    deletedCount++;
  }
}
console.log(`Done. Deleted ${deletedCount} document(s).`);
process.exit(0);
