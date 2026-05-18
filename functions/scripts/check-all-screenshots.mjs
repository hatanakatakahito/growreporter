import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();
const siteId = 'CZYomSqeTRAnIWgD8Km4';
const snap = await db.collection(`sites/${siteId}/pageScreenshots`).get();
const stats = { 'full-page': 0, viewport: 0 };
const samples = { 'full-page': [], viewport: [] };
snap.forEach(d => {
  if (d.id === '_meta') return;
  const data = d.data();
  const t = data.screenshotType;
  if (stats[t] != null) stats[t]++;
  if (samples[t] && samples[t].length < 3) samples[t].push({ url: data.url, size: data.imageSize });
});
console.log('Stats:', stats);
console.log('full-page samples:', samples['full-page']);
console.log('viewport samples:', samples.viewport);
