/**
 * benchmarkSourceSites のうち taxonomy == null のドメインのみ
 * inferTaxonomyFromUrl で判定し直す。OAuth巡回はスキップ（バッチ全体は再実行しない）。
 *
 * 使い方:
 *   GEMINI_API_KEY=... node src/scripts/classifyUnclassifiedOnly.mjs
 *   GEMINI_API_KEY=... node src/scripts/classifyUnclassifiedOnly.mjs --concurrency=5 --limit=50
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const CONCURRENCY = parseInt(args.concurrency || '3', 10);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'growgroupreporter';

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY が未設定です');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

// taxonomyInferenceHelper.js を import するために getMetadataAndHtml も内蔵
async function fetchUrlMetadataAndHtml(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrowReporter-classifier/1.0)',
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const metadata = {};
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1].trim().slice(0, 200);
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (descMatch) metadata.description = descMatch[1].trim().slice(0, 500);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitleMatch) metadata.ogTitle = ogTitleMatch[1].trim().slice(0, 200);
    return { html: html.slice(0, 100000), metadata };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  console.log(`▶ projectId=${PROJECT_ID} concurrency=${CONCURRENCY} limit=${LIMIT}`);
  console.log('='.repeat(80));

  // 未判定ドメイン取得
  const snap = await db.collection('benchmarkSourceSites').get();
  const unclassified = snap.docs
    .filter((d) => {
      const tax = d.data().taxonomy;
      return !tax || !tax.industryMajor;
    })
    .filter((d) => !d.data().excludedFromBenchmark)
    .filter((d) => {
      const failCount = d.data().classificationFailureCount || 0;
      return failCount < 5; // 5回以上失敗してるものはスキップ
    })
    .slice(0, LIMIT)
    .map((d) => d.id);

  console.log(`[stats] benchmarkSourceSites 全体: ${snap.size}件 / 未判定: ${unclassified.length}件`);

  if (unclassified.length === 0) {
    console.log('✅ 未判定ドメインなし、終了');
    return;
  }

  const { inferTaxonomyFromUrl } = await import('../utils/taxonomyInferenceHelper.js');

  let success = 0;
  let failed = 0;
  let processed = 0;
  const startTime = Date.now();

  // 並列処理
  const queue = [...unclassified];
  const workers = [];
  const workerCount = Math.min(CONCURRENCY, queue.length);

  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const domain = queue.shift();
        if (!domain) break;
        processed++;
        const idx = processed;
        try {
          const ref = db.collection('benchmarkSourceSites').doc(domain);
          const url = `https://${domain}`;
          let html = '';
          let metadata = {};
          try {
            const fetched = await fetchUrlMetadataAndHtml(url);
            html = fetched.html;
            metadata = fetched.metadata;
          } catch (fetchErr) {
            // URL のみで判定継続
          }
          const inference = await inferTaxonomyFromUrl({ siteUrl: url, siteName: '', metadata, html });
          await ref.update({
            taxonomy: { ...inference, inferredAt: FieldValue.serverTimestamp() },
            classificationFailureCount: 0,
          });
          success++;
          if (idx % 20 === 0 || idx === unclassified.length) {
            console.log(`  [${idx}/${unclassified.length}] ${domain} → ${inference.industryMajor}/${inference.siteRole}/${inference.businessModel} (success=${success} fail=${failed})`);
          }
        } catch (err) {
          failed++;
          try {
            await db.collection('benchmarkSourceSites').doc(domain).update({
              classificationFailureCount: FieldValue.increment(1),
            });
          } catch {}
          if (failed % 10 === 1) {
            console.log(`  [${idx}/${unclassified.length}] ${domain} → ❌ ${err.message}`);
          }
        }
      }
    })());
  }
  await Promise.all(workers);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n' + '='.repeat(80));
  console.log(`✅ 完了: success=${success} failed=${failed} elapsed=${elapsed}s (${Math.round(elapsed/60*10)/10}min)`);
}

main().catch((e) => {
  console.error('❌ 致命的エラー:', e);
  process.exit(1);
});
