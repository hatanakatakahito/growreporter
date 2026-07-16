/**
 * mockupSkipped 状態の確認
 * node scripts/check-mockup-skipped.js <siteId> <improvementId>
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
  console.log('mockupSkipped:', d.mockupSkipped);
  console.log('mockupSkipReason:', d.mockupSkipReason);
  console.log('mockupMode:', d.mockupMode);
  console.log('mockupStorageUrl:', d.mockupStorageUrl ? '(あり)' : '(なし)');
  console.log('mockupGeneratedAt:', d.mockupGeneratedAt?.toDate?.()?.toISOString() || '(なし)');
  console.log('mockupPatchChanges:', Array.isArray(d.mockupPatchChanges) ? `${d.mockupPatchChanges.length} 件` : '(なし)');
})();
