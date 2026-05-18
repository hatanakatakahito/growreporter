import admin from 'firebase-admin';
const siteId = process.argv[2];
const improvementId = process.argv[3];
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();
await db.doc(`sites/${siteId}/improvements/${improvementId}`).update({
  mockupSkipped: false,
  mockupSkipReason: admin.firestore.FieldValue.delete(),
  mockupGeneratedAt: admin.firestore.FieldValue.delete(),
});
console.log('reset OK');
