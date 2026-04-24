/**
 * モックアップ生成結果の調査用スクリプト
 *   cd functions
 *   node scripts/inspect-mockup.js <siteId> <improvementId>
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
  console.log('targetPageUrl:', d.targetPageUrl);
  console.log('mockupMode:', d.mockupMode);
  console.log('mockupStorageUrl:', d.mockupStorageUrl);
  console.log('mockupSourceSnapshotPath:', d.mockupSourceSnapshotPath);
  console.log('mockupPatchSummary:', d.mockupPatchSummary);
  console.log('mockupPatchChanges:');
  console.log(JSON.stringify(d.mockupPatchChanges, null, 2));
})();
