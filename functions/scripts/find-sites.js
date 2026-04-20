import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

async function main() {
  const keywords = process.argv.slice(2);
  if (keywords.length === 0) {
    console.log('usage: node find-sites.js <keyword1> [keyword2] ...');
    return;
  }
  const all = await db.collection('sites').get();
  console.log(`全サイト数: ${all.docs.length}\n`);
  for (const kw of keywords) {
    console.log(`━━ 検索: "${kw}"`);
    const matches = all.docs.filter(d => {
      const data = d.data();
      return (data.siteName || '').includes(kw) || (data.siteUrl || '').includes(kw);
    });
    if (matches.length === 0) {
      console.log('  ⚠️ 該当なし');
    } else {
      matches.forEach(d => {
        const data = d.data();
        console.log(`  ${d.id}  name="${data.siteName}"  url=${data.siteUrl}`);
      });
    }
    console.log('');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
