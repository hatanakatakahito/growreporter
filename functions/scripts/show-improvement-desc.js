/**
 * 指定 improvement の description 全文を表示
 * node scripts/show-improvement-desc.js <siteId> <improvementId>
 */
import admin from 'firebase-admin';

const siteId = process.argv[2];
const improvementId = process.argv[3];

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

(async () => {
  const snap = await db.doc(`sites/${siteId}/improvements/${improvementId}`).get();
  if (!snap.exists) { console.log('not found'); process.exit(1); }
  const d = snap.data();
  console.log('title:', d.title);
  console.log('createdAt:', d.createdAt?.toDate?.()?.toISOString() || '(none)');
  console.log('---');
  console.log('description:');
  console.log(d.description || '(none)');
})();
