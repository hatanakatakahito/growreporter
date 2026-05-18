/**
 * lively-aggregating-bobcat / vivid-swinging-alpaca: 管理者オペ自動化スクリプト
 *
 * Application Default Credentials (gcloud auth application-default login) で
 * firebase-admin を初期化し、UI クリックで対応する以下を一気に実行する:
 *
 *   1. systemSettings/featureFlags ドキュメント作成（全 false で安全に開始）
 *   2. inspector の 3 JSON を benchmarkSourceSites へ migrate
 *   3. aiAnalysisCache + aiSummaries の全削除（AI キャッシュクリア）
 *
 * 使い方:
 *   cd functions
 *   node src/scripts/setupBenchmarkAdmin.mjs --step=flags
 *   node src/scripts/setupBenchmarkAdmin.mjs --step=migrate
 *   node src/scripts/setupBenchmarkAdmin.mjs --step=clear-cache
 *   node src/scripts/setupBenchmarkAdmin.mjs --step=all
 *
 *   --dry-run でプレビューのみ（書込なし）
 *   --inspector-dir=<path> で inspector output ディレクトリを上書き
 *   --admin-email=<email> で migratedBy に書く email を上書き
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const STEP = String(args.step || 'all');
const DRY = !!args['dry-run'];
const INSPECTOR_DIR = String(args['inspector-dir'] || 'C:\\Users\\hatan\\ga4-gsc-inspector\\output');
const ADMIN_EMAIL = String(args['admin-email'] || 'hatanaka@grow-group.jp');
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'growgroupreporter';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

// =============================================================================
// Step 1: featureFlags
// =============================================================================
async function setupFeatureFlags() {
  const ref = db.doc('systemSettings/featureFlags');
  const snap = await ref.get();

  const desired = {
    improvementKnowledgeRagInjection: {
      enabled: false,
      enabledPrompts: ['comprehensiveImprovement'],
      debug: { logInjection: false },
    },
    industryBenchmarkInjection: {
      enabled: false,
    },
    benchmarkAggregation: {
      enabled: false,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    note: 'setupBenchmarkAdmin.mjs により自動作成（全 false で安全に初期化）',
  };

  if (snap.exists) {
    console.log('[flags] 既存ドキュメントを発見、上書きスキップ');
    console.log('[flags] 既存値:', JSON.stringify(snap.data(), null, 2));
    return { skipped: true, existing: snap.data() };
  }

  if (DRY) {
    console.log('[flags] [DRY-RUN] 作成予定:', JSON.stringify(desired, null, 2));
    return { dryRun: true };
  }

  await ref.set(desired);
  console.log('[flags] systemSettings/featureFlags を作成しました（全 false）');
  return { created: true };
}

// =============================================================================
// Step 2: inspector → benchmarkSourceSites
// =============================================================================
function extractDomain(url) {
  if (!url) return '';
  let s = String(url).trim();
  if (s.startsWith('sc-domain:')) {
    return s.replace('sc-domain:', '').toLowerCase().replace(/^www\./, '');
  }
  if (!s.startsWith('http')) s = `https://${s}`;
  try {
    return new URL(s).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return s.toLowerCase();
  }
}

async function migrateInspectorData() {
  const ga4Path = path.join(INSPECTOR_DIR, 'ga4-properties.json');
  const gscPath = path.join(INSPECTOR_DIR, 'gsc-sites.json');
  const taxPath = path.join(INSPECTOR_DIR, 'taxonomy.json');

  const ga4Properties = JSON.parse(await readFile(ga4Path, 'utf-8'));
  const gscSites = JSON.parse(await readFile(gscPath, 'utf-8'));
  const taxonomyArr = JSON.parse(await readFile(taxPath, 'utf-8'));

  console.log(`[migrate] ga4: ${ga4Properties.length}件 / gsc: ${gscSites.length}件 / taxonomy: ${taxonomyArr.length}件`);

  // 1. domain でマージ
  const map = new Map();
  for (const p of ga4Properties) {
    const domain = extractDomain(p.siteUrl);
    if (!domain) continue;
    if (!map.has(domain)) {
      map.set(domain, { domain, ga4PropertyIds: new Set(), gscSiteUrls: new Set(), accessibleVia: new Set() });
    }
    const m = map.get(domain);
    if (p.propertyId) m.ga4PropertyIds.add(p.propertyId);
    if (p.accessibleVia) m.accessibleVia.add(p.accessibleVia);
  }
  for (const s of gscSites) {
    const domain = extractDomain(s.siteUrl);
    if (!domain) continue;
    if (!map.has(domain)) {
      map.set(domain, { domain, ga4PropertyIds: new Set(), gscSiteUrls: new Set(), accessibleVia: new Set() });
    }
    const m = map.get(domain);
    if (s.siteUrl) m.gscSiteUrls.add(s.siteUrl);
    if (s.accessibleVia) m.accessibleVia.add(s.accessibleVia);
  }

  // 2. taxonomy をドメインでマップ化
  const taxByDomain = new Map();
  for (const t of taxonomyArr) {
    if (!t || !t.domain) continue;
    if (t.status === 'success' && t.industryMajor) {
      taxByDomain.set(t.domain, {
        businessModel: t.businessModel || null,
        industryMajor: t.industryMajor || null,
        industryMinor: t.industryMinor || null,
        siteRole: t.siteRole || null,
        confidence: t.confidence || 'low',
        reasoning: t.reasoning || '',
      });
    }
  }

  // 3. Firestore へ batch upsert
  let total = 0, classified = 0, unclassified = 0, skipped = 0;
  let batch = db.batch();
  let ops = 0;

  for (const [domain, m] of map.entries()) {
    total++;
    const ref = db.collection('benchmarkSourceSites').doc(domain);
    const existing = await ref.get();
    if (existing.exists) {
      skipped++;
      continue;
    }
    const tax = taxByDomain.get(domain) || null;
    if (tax) classified++; else unclassified++;

    const payload = {
      domain,
      ga4PropertyIds: [...m.ga4PropertyIds],
      gscSiteUrls: [...m.gscSiteUrls],
      accessibleVia: [...m.accessibleVia],
      taxonomy: tax ? { ...tax, inferredAt: FieldValue.serverTimestamp() } : null,
      firstSeenAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
      excludedFromBenchmark: false,
      excludeReason: null,
      optedOut: false,
      optedOutAt: null,
      optedOutReason: null,
      optedOutBy: null,
      classificationFailureCount: 0,
      metricsFailureCount: 0,
      migratedFromInspector: true,
      migratedAt: FieldValue.serverTimestamp(),
      migratedBy: ADMIN_EMAIL,
    };

    if (DRY) {
      if (total <= 3) console.log(`[migrate] [DRY-RUN] sample:`, domain, JSON.stringify(payload).slice(0, 200));
    } else {
      batch.set(ref, payload);
      ops++;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
  }
  if (ops > 0 && !DRY) await batch.commit();

  // 4. 監査ログ
  if (!DRY) {
    try {
      await db.collection('adminActivityLogs').add({
        action: 'benchmark_inspector_migration',
        targetType: 'benchmarkSourceSites',
        adminId: 'cli-script',
        adminEmail: ADMIN_EMAIL,
        details: { total, classified, unclassified, skipped, source: 'setupBenchmarkAdmin.mjs' },
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn('[migrate] adminActivityLogs 書込失敗:', e.message);
    }
  }

  console.log(`[migrate] 完了: total=${total} / classified=${classified} / unclassified=${unclassified} / skipped=${skipped}`);
  return { total, classified, unclassified, skipped };
}

// =============================================================================
// Step 3: AI キャッシュ全削除
// =============================================================================
async function clearAICache() {
  const cacheSnap = await db.collectionGroup('aiAnalysisCache').get();
  const summariesSnap = await db.collectionGroup('aiSummaries').get();
  console.log(`[cache] aiAnalysisCache: ${cacheSnap.size}件 / aiSummaries: ${summariesSnap.size}件`);

  if (DRY) {
    console.log(`[cache] [DRY-RUN] 削除予定: ${cacheSnap.size + summariesSnap.size}件`);
    return { dryRun: true, cache: cacheSnap.size, summaries: summariesSnap.size };
  }

  let deleted = 0;
  // 400件ずつバッチ削除
  for (const docs of [cacheSnap.docs, summariesSnap.docs]) {
    for (let i = 0; i < docs.length; i += 400) {
      const slice = docs.slice(i, i + 400);
      const batch = db.batch();
      slice.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += slice.length;
    }
  }
  console.log(`[cache] 削除完了: ${deleted}件`);
  return { totalDeleted: deleted };
}

// =============================================================================
// main
// =============================================================================
async function main() {
  console.log(`▶ projectId=${PROJECT_ID} adminEmail=${ADMIN_EMAIL} dryRun=${DRY} step=${STEP}`);
  console.log('='.repeat(80));

  if (STEP === 'flags' || STEP === 'all') {
    console.log('\n--- Step 1: featureFlags ---');
    await setupFeatureFlags();
  }
  if (STEP === 'migrate' || STEP === 'all') {
    console.log('\n--- Step 2: inspector → benchmarkSourceSites ---');
    await migrateInspectorData();
  }
  if (STEP === 'clear-cache' || STEP === 'all') {
    console.log('\n--- Step 3: AI キャッシュ全削除 ---');
    await clearAICache();
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 完了');
}

main().catch((e) => {
  console.error('❌ エラー:', e);
  process.exit(1);
});
