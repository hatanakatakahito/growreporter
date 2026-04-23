import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { inferTaxonomyFromPageScrapingData } from '../utils/taxonomyInferenceHelper.js';

/**
 * 既存の pageScrapingData を再利用して Gemini 推定だけを動かすテストスクリプト。
 * 再スクレイピングしないため 45 分待たずに maxOutputTokens 修正を検証できる。
 *
 * 使い方: node --loader ./loader.mjs src/scripts/testInferenceOnly.js <siteId>
 */

initializeApp();

const siteId = process.argv[2];
if (!siteId) {
  console.error('使い方: node --loader ./loader.mjs src/scripts/testInferenceOnly.js <siteId>');
  process.exit(1);
}

async function test() {
  const db = getFirestore();

  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    console.error(`サイトが見つかりません: ${siteId}`);
    process.exit(1);
  }
  const site = siteDoc.data() || {};
  console.log(`[test] ${siteId} | ${site.siteName || '(no name)'} | ${site.siteUrl || '(no url)'}`);

  const pagesSnap = await db
    .collection('sites')
    .doc(siteId)
    .collection('pageScrapingData')
    .get();

  const pages = [];
  pagesSnap.forEach((doc) => {
    const d = doc.data() || {};
    pages.push({
      pagePath: d.pagePath || '',
      pageType: d.pageType || '',
      metaTitle: d.metaTitle || '',
      metaDescription: d.metaDescription || '',
      h1: d.h1 || '',
      h2: d.h2 || [],
      pageViews: d.pageViews || 0,
      contentExcerpt: d.contentExcerpt || '',
    });
  });

  console.log(`[test] pageScrapingData: ${pages.length}件`);
  if (pages.length === 0) {
    console.error('pageScrapingData がありません。先にスクレイピングを実行してください。');
    process.exit(1);
  }

  const topMetadata = {
    title: site.metaTitle || '',
    description: site.metaDescription || '',
    ogTitle: site.ogTitle || '',
    ogDescription: site.ogDescription || '',
  };

  console.log('[test] Gemini 推定開始...');
  const start = Date.now();
  try {
    const result = await inferTaxonomyFromPageScrapingData({
      siteUrl: site.siteUrl,
      siteName: site.siteName,
      topMetadata,
      pages,
      conversionEvents: [],
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n[test] 推定完了 (${elapsed}s):`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`\n[test] ERROR: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

test()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
