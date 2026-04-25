/**
 * 改善案タイトル部分一致から ID を引いて inspect する
 * 使い方:
 *   node scripts/find-and-inspect-mockup.js <siteId> "<title-substring>"
 */
import admin from 'firebase-admin';

const siteId = process.argv[2];
const titleQuery = process.argv[3];

if (!siteId || !titleQuery) {
  console.error('Usage: node scripts/find-and-inspect-mockup.js <siteId> "<title-substring>"');
  process.exit(1);
}

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

(async () => {
  const snap = await db.collection(`sites/${siteId}/improvements`).get();
  const matches = [];
  snap.forEach(doc => {
    const data = doc.data();
    if ((data.title || '').includes(titleQuery)) {
      matches.push({ id: doc.id, data });
    }
  });
  if (matches.length === 0) {
    console.log('No matches for title containing:', titleQuery);
    process.exit(1);
  }
  for (const m of matches) {
    console.log('═'.repeat(70));
    console.log('improvementId:', m.id);
    console.log('title:', m.data.title);
    console.log('targetPageUrl:', m.data.targetPageUrl);
    console.log('mockupMode:', m.data.mockupMode);
    console.log('mockupStorageUrl:', m.data.mockupStorageUrl);
    console.log('mockupSourceSnapshotPath:', m.data.mockupSourceSnapshotPath);
    console.log('mockupPatchSummary:', m.data.mockupPatchSummary);
    console.log('mockupPatchChanges:');
    if (Array.isArray(m.data.mockupPatchChanges)) {
      m.data.mockupPatchChanges.forEach((c, i) => {
        console.log(`  [${i + 1}] action=${c.action}`);
        console.log(`      target_selector: ${c.target_selector}`);
        console.log(`      change_label: ${c.change_label}`);
        console.log(`      description_excerpt: ${c.description_excerpt || '(なし)'}`);
        if (c.new_html) console.log(`      new_html (head 200): ${String(c.new_html).substring(0, 200)}`);
        if (c.new_attrs) console.log(`      new_attrs: ${JSON.stringify(c.new_attrs)}`);
      });
    }
  }
})();
