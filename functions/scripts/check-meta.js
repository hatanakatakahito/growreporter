import admin from 'firebase-admin';

const siteIdOrName = process.argv[2] || 'yweywfAnJVrvSayf7sMt';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

async function main() {
  // 直接IDで取得を試す
  let siteDoc = await db.collection('sites').doc(siteIdOrName).get();
  if (!siteDoc.exists) {
    // 名前で検索
    const all = await db.collection('sites').get();
    const match = all.docs.find(d => (d.data().siteName || '').includes(siteIdOrName));
    if (!match) { console.log('site not found'); return; }
    siteDoc = match;
  }
  const siteId = siteDoc.id;
  const sd = siteDoc.data();
  console.log(`siteId=${siteId}`);
  console.log(`name=${sd.siteName}`);
  console.log(`url=${sd.siteUrl}\n`);

  const metaRef = db.collection('sites').doc(siteId).collection('pageScrapingMeta').doc('default');
  const meta = (await metaRef.get()).data();
  console.log('pageScrapingMeta:');
  console.log(JSON.stringify(meta, (k, v) => {
    if (v && v.toDate) return v.toDate().toISOString();
    return v;
  }, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
