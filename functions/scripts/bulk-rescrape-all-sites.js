/**
 * 全登録サイトに対してスクレイピングを一括再実行する。
 *
 * 実行:
 *   node functions/scripts/bulk-rescrape-all-sites.js            # dry-run（対象一覧のみ表示）
 *   node functions/scripts/bulk-rescrape-all-sites.js --execute  # 実行
 *
 * 挙動:
 *   - GA4 連携済みのサイト全件を対象にする（ga4PropertyId かつ ga4OauthTokenId あり）
 *   - サイトごとに scrapingJobs/{jobId} ドキュメントを作成
 *     → onScrapingJobCreated トリガーが検知してバックグラウンドでスクレイピング実行
 *   - 最大同時実行数 3（Cloud Functions 側の maxInstanceCount=3）でキュー処理される
 *   - ジョブ完了をポーリング監視して最終結果を表示
 *
 * 注意:
 *   - 既存 pageScrapingData（上限104件）と pageScreenshots（存在すれば全件）が削除され再作成される
 *   - 1サイトあたり 30-45秒。10サイトなら同時3並列で 2-3分程度で完了
 */
import admin from 'firebase-admin';

const EXECUTE = process.argv.includes('--execute');
const POLL_INTERVAL_MS = 10000;
const MAX_WAIT_SEC = 1200; // 20分

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function listEligibleSites() {
  const snap = await db.collection('sites').get();
  const eligible = [];
  const skipped = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const reason = [];
    if (!data.ga4PropertyId) reason.push('ga4PropertyId 未設定');
    if (!data.ga4OauthTokenId) reason.push('ga4OauthTokenId 未設定');
    if (!data.siteUrl) reason.push('siteUrl 未設定');
    if (reason.length) {
      skipped.push({ siteId: doc.id, siteName: data.siteName || '(名称未設定)', reason: reason.join(' / ') });
    } else {
      eligible.push({
        siteId: doc.id,
        siteName: data.siteName || '(名称未設定)',
        siteUrl: data.siteUrl,
        userId: data.userId || null,
      });
    }
  }
  return { eligible, skipped };
}

async function enqueueJob(siteId, requestedBy) {
  const ref = await db.collection('scrapingJobs').add({
    siteId,
    status: 'pending',
    requestedBy: requestedBy || 'bulk-rescrape-script',
    trigger: 'bulk-rescrape-script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function waitAllJobs(jobRecords) {
  const startedAt = Date.now();
  const completed = new Map();
  while ((Date.now() - startedAt) < MAX_WAIT_SEC * 1000) {
    await sleep(POLL_INTERVAL_MS);
    let allDone = true;
    for (const rec of jobRecords) {
      if (completed.has(rec.jobId)) continue;
      const snap = await db.collection('scrapingJobs').doc(rec.jobId).get();
      const data = snap.data() || {};
      if (data.status === 'completed' || data.status === 'error') {
        completed.set(rec.jobId, data);
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
        const r = data.result || {};
        const label = data.status === 'completed'
          ? `✅ ${rec.siteName}: ${r.successCount ?? '?'}件保存 (削除${r.removedCount ?? 0} / 失敗${r.failedCount ?? 0})`
          : `❌ ${rec.siteName}: エラー - ${data.error || '不明'}`;
        console.log(`   [${elapsed}s] ${label}`);
      } else {
        allDone = false;
      }
    }
    if (allDone) break;
  }
  return completed;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔎 対象サイトを列挙中...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const { eligible, skipped } = await listEligibleSites();

  console.log(`\n✅ 対象サイト: ${eligible.length}件`);
  eligible.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.siteName}  (${s.siteUrl})  [siteId=${s.siteId}]`);
  });

  if (skipped.length > 0) {
    console.log(`\n⏭️  スキップ: ${skipped.length}件`);
    skipped.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.siteName} — ${s.reason}`);
    });
  }

  if (!EXECUTE) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  DRY-RUN モード（jobs は作成されません）');
    console.log('    実行するには --execute を付けてください:');
    console.log('    node functions/scripts/bulk-rescrape-all-sites.js --execute');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  if (eligible.length === 0) {
    console.log('\n対象サイトが0件のため終了します。');
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 ${eligible.length}件のジョブを投入します`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const jobRecords = [];
  for (const s of eligible) {
    const jobId = await enqueueJob(s.siteId, s.userId);
    jobRecords.push({ ...s, jobId });
    console.log(`📤 ${s.siteName} → jobId=${jobId}`);
    // Eventarc のバーストを避けるため 1秒 間隔
    await sleep(1000);
  }

  console.log(`\n⏳ ジョブ完了を監視中（最大 ${MAX_WAIT_SEC}秒）...\n`);
  const completed = await waitAllJobs(jobRecords);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 最終結果');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const success = [];
  const errors = [];
  const pending = [];
  for (const rec of jobRecords) {
    const data = completed.get(rec.jobId);
    if (!data) {
      pending.push(rec);
      continue;
    }
    if (data.status === 'completed') {
      success.push({ ...rec, result: data.result });
    } else {
      errors.push({ ...rec, error: data.error });
    }
  }
  console.log(`✅ 成功: ${success.length}件`);
  console.log(`❌ 失敗: ${errors.length}件`);
  console.log(`⏳ 未完了（タイムアウト内に完了せず）: ${pending.length}件`);

  if (errors.length > 0) {
    console.log('\n失敗詳細:');
    errors.forEach(e => console.log(`  - ${e.siteName}: ${e.error}`));
  }
  if (pending.length > 0) {
    console.log('\n未完了ジョブ:');
    pending.forEach(p => console.log(`  - ${p.siteName} (jobId=${p.jobId})`));
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
