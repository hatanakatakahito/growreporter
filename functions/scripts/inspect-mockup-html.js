// snapshot_patch で生成されたモックアップ HTML の中身を直接調べる
import admin from 'firebase-admin';

const siteId = process.argv[2];
const improvementId = process.argv[3];
if (!siteId || !improvementId) {
  console.error('Usage: node scripts/inspect-mockup-html.js <siteId> <improvementId>');
  process.exit(1);
}

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

(async () => {
  const doc = await db.doc(`sites/${siteId}/improvements/${improvementId}`).get();
  if (!doc.exists) {
    console.error('Improvement not found');
    return;
  }
  const data = doc.data();
  console.log(`title: ${data.title}`);
  console.log(`mockupMode: ${data.mockupMode}`);
  console.log(`mockupStoragePath: ${data.mockupStoragePath}`);
  console.log(`mockupSourceSnapshotPath: ${data.mockupSourceSnapshotPath}`);
  console.log(`mockupStorageUrl: ${data.mockupStorageUrl}`);
  console.log(`mockupPatchSummary: ${data.mockupPatchSummary}`);
  console.log(`patches:`);
  (data.mockupPatchChanges || []).forEach((p, i) => {
    console.log(`  [${i}] ${p.action || p.op || '?'} → selector="${p.selector || ''}" label="${p.label || ''}" reason="${(p.reason || '').substring(0, 80)}"`);
    if (p.html) console.log(`      html: ${(p.html || '').substring(0, 200).replace(/\n/g, ' ')}...`);
  });

  // モックアップ HTML 取得
  if (data.mockupStoragePath) {
    const [buf] = await bucket.file(data.mockupStoragePath).download();
    const html = buf.toString('utf-8');
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Mockup HTML サイズ: ${html.length} bytes`);
    console.log(`${'='.repeat(80)}`);

    // 主要構造をチェック
    const hasDoctype = /<!DOCTYPE/i.test(html);
    const hasHtml = /<html/i.test(html);
    const hasHead = /<head/i.test(html);
    const hasBody = /<body/i.test(html);
    const sectionCount = (html.match(/<section[\s>]/gi) || []).length;
    const articleCount = (html.match(/<article[\s>]/gi) || []).length;
    const headerCount = (html.match(/<header[\s>]/gi) || []).length;
    const footerCount = (html.match(/<footer[\s>]/gi) || []).length;
    const dataChangedCount = (html.match(/data-changed=/gi) || []).length;
    const styleTags = (html.match(/<style/gi) || []).length;
    const scriptTags = (html.match(/<script/gi) || []).length;
    const imgCount = (html.match(/<img[\s>]/gi) || []).length;

    console.log(`<!DOCTYPE>: ${hasDoctype} | <html>: ${hasHtml} | <head>: ${hasHead} | <body>: ${hasBody}`);
    console.log(`<header>: ${headerCount} | <section>: ${sectionCount} | <article>: ${articleCount} | <footer>: ${footerCount}`);
    console.log(`<style>: ${styleTags} | <script>: ${scriptTags} | <img>: ${imgCount}`);
    console.log(`data-changed 属性: ${dataChangedCount} 箇所`);

    // 先頭と末尾を確認
    console.log(`\n--- 先頭 500 bytes ---`);
    console.log(html.substring(0, 500));
    console.log(`\n--- 末尾 500 bytes ---`);
    console.log(html.substring(html.length - 500));
  }

  // ソース snapshot のサイズも比較用に取得
  if (data.mockupSourceSnapshotPath) {
    try {
      const [buf] = await bucket.file(data.mockupSourceSnapshotPath).download();
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Source Snapshot サイズ: ${buf.length} bytes`);
      console.log(`${'='.repeat(80)}`);
    } catch (e) {
      console.warn('Source snapshot download failed:', e.message);
    }
  }
})();
