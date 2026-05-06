/**
 * featureFlags を本番状態に切替 + improvementKnowledge / industryBenchmarks の件数を表示。
 *
 * 使い方:
 *   node src/scripts/enableFlagsAndVerify.mjs               # 全部 true
 *   node src/scripts/enableFlagsAndVerify.mjs --lively-only # industryBenchmarkInjection のみ true
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const LIVELY_ONLY = !!args['lively-only'];
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'growgroupreporter';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

async function main() {
  console.log(`▶ projectId=${PROJECT_ID} livelyOnly=${LIVELY_ONLY}`);
  console.log('='.repeat(80));

  // 1. industryBenchmarks 件数確認
  const benchSnap = await db.collection('industryBenchmarks').get();
  console.log(`\n[verify] industryBenchmarks: ${benchSnap.size}件`);
  const periodCount = {};
  for (const d of benchSnap.docs) {
    const p = d.data().period || 'unknown';
    periodCount[p] = (periodCount[p] || 0) + 1;
  }
  for (const [p, c] of Object.entries(periodCount)) {
    console.log(`  - ${p}: ${c}件`);
  }

  // 2. improvementKnowledge 件数確認
  const ikSnap = await db.collection('improvementKnowledge').get();
  console.log(`\n[verify] improvementKnowledge: ${ikSnap.size}件`);
  if (ikSnap.size > 0) {
    const byCat = {};
    const byLevel = {};
    for (const d of ikSnap.docs) {
      const data = d.data();
      const cat = data.category || 'unknown';
      const lvl = data.metrics?.achievementLevel || 'unknown';
      byCat[cat] = (byCat[cat] || 0) + 1;
      byLevel[lvl] = (byLevel[lvl] || 0) + 1;
    }
    console.log(`  category: ${JSON.stringify(byCat)}`);
    console.log(`  achievementLevel: ${JSON.stringify(byLevel)}`);
  }

  // 3. flags 切替
  const newFlags = {
    industryBenchmarkInjection: { enabled: true },
    benchmarkAggregation: { enabled: true },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'enableFlagsAndVerify.mjs',
  };
  if (!LIVELY_ONLY) {
    newFlags.improvementKnowledgeRagInjection = {
      enabled: true,
      enabledPrompts: ['comprehensiveImprovement'],
      debug: { logInjection: false },
    };
  }

  await db.doc('systemSettings/featureFlags').set(newFlags, { merge: true });
  console.log('\n[flags] 切替完了:');
  console.log('  - industryBenchmarkInjection: ✅ true');
  console.log('  - benchmarkAggregation: ✅ true');
  if (LIVELY_ONLY) {
    console.log('  - improvementKnowledgeRagInjection: ⏸ 未変更（lively-only モード）');
  } else {
    console.log('  - improvementKnowledgeRagInjection: ✅ true');
  }

  // 4. 現状の flags を読んで確認
  const finalSnap = await db.doc('systemSettings/featureFlags').get();
  console.log('\n[verify] 最終状態:');
  console.log(JSON.stringify(finalSnap.data(), null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('✅ 完了');
}

main().catch((e) => {
  console.error('❌ エラー:', e);
  process.exit(1);
});
