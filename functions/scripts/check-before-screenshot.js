// 該当 URL の Before スクショ情報を取得
import admin from 'firebase-admin';

const siteId = process.argv[2];
const url = process.argv[3];

if (!siteId || !url) {
  console.error('Usage: node scripts/check-before-screenshot.js <siteId> <url>');
  process.exit(1);
}

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hostname = url.hostname.toLowerCase();
    if (!url.pathname.endsWith('/') && !url.pathname.includes('.')) url.pathname += '/';
    return url.toString();
  } catch {
    return u;
  }
}

(async () => {
  const ssCol = db.collection(`sites/${siteId}/pageScreenshots`);
  const snap = await ssCol.get();
  const target = normalizeUrl(url);
  console.log(`検索URL: ${target}\n`);
  for (const d of snap.docs) {
    if (d.id === '_meta') continue;
    const data = d.data();
    if (data.url && normalizeUrl(data.url) === target) {
      console.log('═'.repeat(50));
      console.log('docId:', d.id);
      console.log('url:', data.url);
      console.log('screenshotType:', data.screenshotType);
      console.log('screenshotUrl:', data.screenshotUrl);
      console.log('source:', data.source);
      console.log('imageSize:', data.imageSize, 'bytes');
      console.log('capturedAt:', data.capturedAt?.toDate?.()?.toISOString());
    }
  }
})();
