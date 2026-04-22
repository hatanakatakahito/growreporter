import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

const siteId = process.argv[2] || 'E33hs8oB6dihy3Di8Jqh';

async function inspect() {
  const db = getFirestore();
  const doc = await db.collection('sites').doc(siteId).get();
  if (!doc.exists) {
    console.log('サイトが見つかりません');
    return;
  }
  const d = doc.data() || {};
  console.log('=== サイト情報 ===');
  console.log('siteName:', d.siteName);
  console.log('siteUrl:', d.siteUrl);
  console.log('metaTitle:', d.metaTitle);
  console.log('metaDescription:', d.metaDescription);
  console.log('businessModel:', d.businessModel, '/ siteRole:', d.siteRole);
  console.log('industry:', d.industryMajor, '/', d.industryMinor);
  console.log('taxonomyReasoning:', d.taxonomyReasoning);

  // 上位5ページのタイトル
  const pages = await db.collection('sites').doc(siteId)
    .collection('pageScrapingData')
    .orderBy('pageViews', 'desc')
    .limit(10)
    .get();
  console.log('\n=== PV上位10ページ ===');
  pages.forEach((p) => {
    const pd = p.data();
    console.log(`  [${pd.pageType || '-'}] ${pd.pagePath} | "${(pd.metaTitle || '').slice(0, 80)}"`);
  });
}

inspect().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
