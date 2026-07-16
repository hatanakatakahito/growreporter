// AI生成 vs 手動改善で、生成されたモックアップのモード(snapshot_patch / legacy)を比較
import admin from 'firebase-admin';

const siteId = process.argv[2];
if (!siteId) {
  console.error('Usage: node scripts/compare-mockup-modes.js <siteId>');
  process.exit(1);
}

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

(async () => {
  const snap = await db.collection(`sites/${siteId}/improvements`)
    .orderBy('createdAt', 'desc')
    .limit(40)
    .get();

  const aiRows = [];
  const manualRows = [];

  for (const d of snap.docs) {
    const data = d.data();
    const row = {
      id: d.id,
      title: (data.title || '').substring(0, 50),
      source: data.source || '(none)',
      targetPageUrl: data.targetPageUrl || '(empty)',
      mockupMode: data.mockupMode || (data.mockupHtml ? 'legacy(html)' : '(no mockup)'),
      mockupSkipped: !!data.mockupSkipped,
      mockupSkipReason: data.mockupSkipReason || '',
      hasMockupHtml: !!data.mockupHtml,
      mockupHtmlLen: (data.mockupHtml || '').length,
      hasMockupStorageUrl: !!data.mockupStorageUrl,
      mockupSourceSnapshotPath: data.mockupSourceSnapshotPath || '(none)',
      mockupPatchCount: Array.isArray(data.mockupPatchChanges) ? data.mockupPatchChanges.length : 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString()?.substring(0, 19) || '',
    };
    if (data.source === 'ai_generated') aiRows.push(row);
    else manualRows.push(row);
  }

  function dump(label, rows) {
    console.log(`\n${'='.repeat(80)}\n${label} (${rows.length}件)\n${'='.repeat(80)}`);
    for (const r of rows) {
      console.log(`\n[${r.id}] ${r.title}`);
      console.log(`  source: ${r.source} | mode: ${r.mockupMode} | skipped: ${r.mockupSkipped}${r.mockupSkipReason ? `(${r.mockupSkipReason})` : ''}`);
      console.log(`  url: ${r.targetPageUrl}`);
      console.log(`  legacy mockupHtml: ${r.hasMockupHtml ? r.mockupHtmlLen + ' bytes' : 'なし'}`);
      console.log(`  snapshot_patch storage: ${r.hasMockupStorageUrl ? 'あり' : 'なし'} | パッチ数: ${r.mockupPatchCount}`);
      console.log(`  source snapshot: ${r.mockupSourceSnapshotPath}`);
      console.log(`  createdAt: ${r.createdAt}`);
    }
  }

  dump('AI 生成 (source=ai_generated)', aiRows);
  dump('手動 (source != ai_generated)', manualRows);

  // 集計
  const summarize = (rows) => {
    const counts = {};
    for (const r of rows) {
      const key = r.mockupSkipped ? `skipped(${r.mockupSkipReason})` : r.mockupMode;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  };
  console.log(`\n${'='.repeat(80)}\nサマリー\n${'='.repeat(80)}`);
  console.log('AI 生成:    ', summarize(aiRows));
  console.log('手動:       ', summarize(manualRows));
})();
