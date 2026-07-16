import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();
const siteId = process.argv[2];
if (!siteId) { console.error('Usage: ... <siteId>'); process.exit(1); }
const snap = await db.collection(`sites/${siteId}/pageScreenshots`).get();
let cleared = 0;
for (const d of snap.docs) {
  if (d.id === '_meta') continue;
  const data = d.data();
  if (data.screenshotType === 'viewport') {
    console.log(`削除: ${data.url} (viewport)`);
    await d.ref.delete();
    cleared++;
  }
}
console.log(`\nクリア: ${cleared} 件 → 次回ドロワー開時に新ロジックで再取得`);
