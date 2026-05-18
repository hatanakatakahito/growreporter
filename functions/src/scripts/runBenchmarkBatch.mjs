/**
 * lively-aggregating-bobcat: バッチ手動実行スクリプト
 *
 * benchmarkAggregator scheduled function のロジックを Application Default Credentials で
 * ローカル実行する。`benchmarkAggregation` feature flag を有効化して呼び出し、結果を表示。
 *
 * 使い方:
 *   cd functions
 *   node src/scripts/runBenchmarkBatch.mjs
 *   node src/scripts/runBenchmarkBatch.mjs --keep-flag-off  # 完了後 flag を false に戻す
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const KEEP_FLAG_OFF = !!args['keep-flag-off'];
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'growgroupreporter';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

async function setFlag(value) {
  await db.doc('systemSettings/featureFlags').set({
    benchmarkAggregation: { enabled: value },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'runBenchmarkBatch.mjs',
  }, { merge: true });
  console.log(`[flag] benchmarkAggregation.enabled = ${value}`);
}

async function main() {
  console.log(`▶ projectId=${PROJECT_ID}`);
  console.log('='.repeat(80));

  // 1. flag を一時的に true にする（本処理が flag チェックで早期 return しないように）
  await setFlag(true);

  // 2. Aggregator のメイン処理を import + 実行
  console.log('\n[batch] benchmarkAggregatorHandler を起動...');
  console.log('[batch] 535ドメイン × 4トークンの API 巡回 → 集計まで実行（5〜30分想定）\n');

  const startedAt = Date.now();
  let result;
  try {
    const mod = await import('../scheduled/benchmarkAggregator.js');
    result = await mod.benchmarkAggregatorHandler({});
  } catch (err) {
    console.error('\n❌ batch error:', err);
    if (KEEP_FLAG_OFF) await setFlag(false);
    process.exit(1);
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n[batch] 実行時間: ${elapsed}s (${Math.round(elapsed / 60 * 10) / 10}min)`);
  console.log('[batch] 結果サマリ:');
  console.log(JSON.stringify(result, null, 2));

  // 3. flag を false に戻すか聞かれた場合
  if (KEEP_FLAG_OFF) {
    await setFlag(false);
    console.log('[flag] 完了後 false に戻しました（本番運転前のため）');
  } else {
    console.log('[flag] benchmarkAggregation.enabled = true のまま（次月 1日 02:00 JST に自動実行されます）');
  }

  // 4. 生成された industryBenchmarks を確認
  const period = result.period;
  if (period) {
    const snap = await db.collection('industryBenchmarks').where('period', '==', period).get();
    console.log(`\n[verify] industryBenchmarks where period='${period}': ${snap.size}件`);
    if (snap.size > 0) {
      console.log('[verify] sample 3件:');
      snap.docs.slice(0, 3).forEach((d) => {
        const data = d.data();
        console.log(`  - ${d.id}: industry=${data.industryMajor}/role=${data.siteRole}/BM=${data.businessModel} N=${data.N}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 完了');
}

main().catch((e) => {
  console.error('❌ 致命的エラー:', e);
  process.exit(1);
});
