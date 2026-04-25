/**
 * description と description_excerpt の一致を検証
 * node scripts/diag-excerpt-match.js <siteId> <improvementId>
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
  const description = d.description || '';
  console.log('=== description ===');
  console.log(description);
  console.log('');
  console.log('=== description_excerpt マッチ判定 ===');
  for (const c of (d.mockupPatchChanges || [])) {
    const excerpt = c.description_excerpt || '';
    const label = c.change_label || '';
    const idx = description.indexOf(excerpt);
    console.log('');
    console.log(`[${label}]`);
    console.log(`  excerpt: ${excerpt.substring(0, 80)}${excerpt.length > 80 ? '...' : ''}`);
    console.log(`  indexOf: ${idx}`);
    if (idx < 0) {
      // 先頭 20 文字ずつ比較して不一致箇所を探す
      const sample = excerpt.substring(0, 20);
      const sampleIdx = description.indexOf(sample);
      console.log(`  先頭20字 (${sample}) の出現位置: ${sampleIdx}`);
      if (sampleIdx >= 0) {
        const ctx = description.substring(sampleIdx, sampleIdx + excerpt.length + 10);
        console.log(`  description 側: ${ctx}`);
      }
    }
  }
})();
