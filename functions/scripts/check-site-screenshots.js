/**
 * 指定サイトの登録時スクショ情報を確認。いつ・何のURLで撮れたかを表示。
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

async function main() {
  const siteId = process.argv[2] || 'L3XXo1VZzDci1jSUUMIj';
  const doc = await db.collection('sites').doc(siteId).get();
  if (!doc.exists) { console.log('not found'); return; }
  const d = doc.data();

  console.log(`name: ${d.siteName}`);
  console.log(`url:  ${d.siteUrl}`);
  console.log(`\n【サイト登録時のスクショ】`);
  console.log(`PC:     ${d.pcScreenshotUrl || '(未設定)'}`);
  console.log(`Mobile: ${d.mobileScreenshotUrl || '(未設定)'}`);

  // _metaFetchDone が最終更新日の手がかり
  if (d._metaFetchDone) {
    const t = d._metaFetchDone.toDate ? d._metaFetchDone.toDate() : d._metaFetchDone;
    console.log(`メタ取得完了: ${t}`);
  }
  if (d.updatedAt) {
    const t = d.updatedAt.toDate ? d.updatedAt.toDate() : d.updatedAt;
    console.log(`最終更新: ${t}`);
  }
  if (d.createdAt) {
    const t = d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt;
    console.log(`作成日: ${t}`);
  }

  // 実際にスクショURLを fetch してサイズ確認
  if (d.pcScreenshotUrl) {
    try {
      const res = await fetch(d.pcScreenshotUrl);
      const buffer = await res.arrayBuffer();
      console.log(`\nPCスクショ現状: HTTP ${res.status}, size=${Math.round(buffer.byteLength / 1024)}KB`);
    } catch (e) {
      console.log(`\nPCスクショ確認失敗: ${e.message}`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
