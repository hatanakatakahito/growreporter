import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Firebase Admin SDK初期化（ADC使用）
initializeApp({ projectId: 'growgroupreporter' });
const db = getFirestore();

// PSI API Key
const PSI_API_KEY = process.env.PSI_API_KEY;
const PSI_TIMEOUT_MS = 45000;

async function fetchPSI(url, strategy) {
  if (!PSI_API_KEY) { console.warn('PSI_API_KEY not set'); return null; }
  const categories = ['performance', 'seo', 'accessibility', 'best-practices'];
  const categoryParams = categories.map(c => `category=${c}`).join('&');
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}&locale=ja&key=${PSI_API_KEY}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) { console.error(`PSI error (${strategy}): ${response.status}`); return null; }
    return await response.json();
  } catch (e) { console.error(`PSI fetch error (${strategy}):`, e.message); return null; }
}

function formatPSIResult(psiData) {
  const categories = psiData.lighthouseResult?.categories || {};
  const audits = psiData.lighthouseResult?.audits || {};
  const performance = Math.round((categories.performance?.score || 0) * 100);
  const seo = Math.round((categories.seo?.score || 0) * 100);
  const accessibility = Math.round((categories.accessibility?.score || 0) * 100);
  const bestPractices = Math.round((categories['best-practices']?.score || 0) * 100);
  return { performance, seo, accessibility, bestPractices, cwv: {}, topAudits: [] };
}

function analyzeSEO(psiMobile, psiDesktop, siteData) {
  const mobileSeo = psiMobile ? Math.round((psiMobile.lighthouseResult?.categories?.seo?.score || 0) * 100) : null;
  const desktopSeo = psiDesktop ? Math.round((psiDesktop.lighthouseResult?.categories?.seo?.score || 0) * 100) : null;
  const titleLength = (siteData.metaTitle || '').length;
  const descLength = (siteData.metaDescription || '').length;
  const titleOptimal = titleLength >= 30 && titleLength <= 60;
  const descOptimal = descLength >= 50 && descLength <= 160;
  let metaScore = 0;
  if (titleLength > 0) metaScore += titleOptimal ? 50 : 25;
  if (descLength > 0) metaScore += descOptimal ? 50 : 25;
  const psiAvg = calcAvg(mobileSeo, desktopSeo);
  const score = Math.round(psiAvg * 0.6 + metaScore * 0.4);
  return { score, psiSeoScore: { mobile: mobileSeo, desktop: desktopSeo }, metaAnalysis: { titleLength, titleOptimal, descLength, descOptimal }, gscConnected: false, gscMetrics: null, issues: [] };
}

function calcAvg(a, b) {
  if (a !== null && a !== undefined && b !== null && b !== undefined) return Math.round((a + b) / 2);
  if (a !== null && a !== undefined) return a;
  if (b !== null && b !== undefined) return b;
  return 0;
}

async function runDiagnosisForSite(siteId, siteData) {
  const siteUrl = siteData.siteUrl || siteData.url;
  if (!siteUrl) { console.warn(`  [${siteId}] URLなし、スキップ`); return null; }

  console.log(`  [${siteId}] 診断開始: ${siteUrl}`);

  const [psiMobileResult, psiDesktopResult] = await Promise.allSettled([
    fetchPSI(siteUrl, 'mobile'),
    fetchPSI(siteUrl, 'desktop'),
  ]);

  const psiMobile = psiMobileResult.status === 'fulfilled' ? psiMobileResult.value : null;
  const psiDesktop = psiDesktopResult.status === 'fulfilled' ? psiDesktopResult.value : null;

  if (!psiMobile && !psiDesktop) {
    console.warn(`  [${siteId}] PSI取得失敗`);
    return null;
  }

  // スクレイピングデータ取得
  let scrapingPages = [];
  try {
    const snap = await db.collection('sites').doc(siteId).collection('pageScrapingData').orderBy('pageViews', 'desc').limit(50).get();
    snap.forEach(d => scrapingPages.push({ id: d.id, ...d.data() }));
  } catch(e) {}

  // コンテンツ品質（簡易版）
  let contentQuality = { available: false, score: 0, totalPages: 0, problematicPages: 0, topIssues: [], topPageDetails: null };
  if (scrapingPages.length > 0) {
    const scores = scrapingPages.map(p => {
      let s = 50;
      if ((p.metaTitle || p.title || '').length >= 30) s += 10;
      if ((p.metaDescription || p.description || '').length >= 50) s += 10;
      if ((p.textLength || 0) >= 500) s += 15;
      if ((p.headingStructure?.h1 || 0) === 1) s += 10;
      if ((p.headingStructure?.h2 || 0) >= 1) s += 5;
      return Math.min(s, 100);
    });
    contentQuality = { available: true, score: Math.round(scores.reduce((a,b) => a+b, 0) / scores.length), totalPages: scrapingPages.length, problematicPages: 0, topIssues: [], topPageDetails: null };
  }

  const seo = analyzeSEO(psiMobile, psiDesktop, siteData);
  const engagement = { available: false, score: 0, metrics: { avgEngagementRate: 0 }, lowEngagementPages: [] };

  const perfMobile = psiMobile ? Math.round((psiMobile.lighthouseResult?.categories?.performance?.score || 0) * 100) : null;
  const perfDesktop = psiDesktop ? Math.round((psiDesktop.lighthouseResult?.categories?.performance?.score || 0) * 100) : null;
  const perfScore = calcAvg(perfMobile, perfDesktop);

  // 総合スコア
  let weights = { perf: 30, seo: 30, content: contentQuality.available ? 20 : 0, eng: 0 };
  const totalW = weights.perf + weights.seo + weights.content + weights.eng;
  const overallScore = totalW > 0 ? Math.round((perfScore * weights.perf + seo.score * weights.seo + contentQuality.score * weights.content) / totalW) : 0;

  const result = {
    overallScore,
    diagnosedAt: new Date().toISOString(),
    siteUrl,
    fromCache: false,
    psi: {
      mobile: psiMobile ? formatPSIResult(psiMobile) : null,
      desktop: psiDesktop ? formatPSIResult(psiDesktop) : null,
    },
    contentQuality,
    seo,
    engagement,
  };

  // キャッシュ保存
  await db.collection('sites').doc(siteId).collection('diagnosisCache').doc('latest').set({
    result,
    timestamp: Timestamp.now(),
    siteUrl,
  });

  console.log(`  [${siteId}] 完了: スコア=${overallScore}`);
  return result;
}

// メイン
async function main() {
  const snap = await db.collection('sites').where('setupCompleted', '==', true).get();
  console.log(`対象サイト: ${snap.size}件`);

  let success = 0, fail = 0;
  for (const doc of snap.docs) {
    try {
      const r = await runDiagnosisForSite(doc.id, doc.data());
      if (r) success++; else fail++;
    } catch(e) {
      console.error(`  [${doc.id}] エラー:`, e.message);
      fail++;
    }
  }
  console.log(`\n完了: 成功=${success}, 失敗=${fail}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
