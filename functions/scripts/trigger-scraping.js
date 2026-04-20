/**
 * 指定サイトに対してスクレイピングを手動トリガーし、結果を待機してログ出力する。
 * 実行: node functions/scripts/trigger-scraping.js [siteName]
 *
 * scrapingJobs コレクションに pending ドキュメントを作成 → onScrapingJobCreated が発火。
 * 完了を待ってから pageScrapingMeta の集計結果を表示する。
 */
import admin from 'firebase-admin';

const siteNameFilter = process.argv[2] || 'ドーミーBiz';

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findSite(siteNameOrId) {
  // まず siteId として試す
  const byId = await db.collection('sites').doc(siteNameOrId).get();
  if (byId.exists) return byId;
  // 完全一致
  const exact = await db.collection('sites').where('siteName', '==', siteNameOrId).get();
  if (!exact.empty) return exact.docs[0];
  // 部分一致
  const all = await db.collection('sites').get();
  const match = all.docs.find(d => (d.data().siteName || '').includes(siteNameOrId) || (d.data().siteUrl || '').includes(siteNameOrId));
  if (!match) throw new Error(`サイトが見つかりません: ${siteNameOrId}`);
  return match;
}

async function main() {
  console.log(`\n🔎 サイト検索: "${siteNameFilter}"`);
  const siteDoc = await findSite(siteNameFilter);
  const siteId = siteDoc.id;
  const siteData = siteDoc.data();
  console.log(`✅ siteId=${siteId}  name="${siteData.siteName}"  url=${siteData.siteUrl}\n`);

  const userId = siteData.userId || 'admin-trigger';

  // scrapingJobs にドキュメント作成
  const jobRef = await db.collection('scrapingJobs').add({
    siteId,
    status: 'pending',
    requestedBy: userId,
    trigger: 'admin-script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`📤 ジョブ作成: jobId=${jobRef.id}`);
  console.log('   → onScrapingJobCreated が発火します。処理完了まで待機中...\n');

  // 完了を待機（最大10分）
  const MAX_WAIT_SEC = 600;
  const POLL_INTERVAL_MS = 5000;
  const startTime = Date.now();
  let lastStatus = 'pending';
  let completed = false;
  let jobData = null;

  while ((Date.now() - startTime) < MAX_WAIT_SEC * 1000) {
    await sleep(POLL_INTERVAL_MS);
    const snap = await jobRef.get();
    jobData = snap.data();
    const status = jobData?.status || '?';
    if (status !== lastStatus) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`   [${elapsed}s] status: ${lastStatus} → ${status}`);
      lastStatus = status;
    }
    if (status === 'completed' || status === 'error') {
      completed = true;
      break;
    }
  }

  if (!completed) {
    console.log(`\n⚠️ タイムアウト (${MAX_WAIT_SEC}秒)`);
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ジョブ完了結果');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (jobData?.result) {
    const r = jobData.result;
    console.log(`成功: ${r.success}`);
    console.log(`取得成功ページ数: ${r.successCount}`);
    console.log(`失敗ページ数: ${r.failedCount}`);
    console.log(`メッセージ: ${r.message}`);
  }

  // pageScrapingData から実際の内容を抜粋確認
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 取得できたページ（上位5件、metaTitle サンプル）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const dataSnap = await db.collection('sites').doc(siteId).collection('pageScrapingData')
    .orderBy('pageViews', 'desc')
    .limit(10)
    .get();

  if (dataSnap.empty) {
    console.log('⚠️ pageScrapingData にドキュメントがありません');
  } else {
    dataSnap.docs.slice(0, 10).forEach((d, i) => {
      const p = d.data();
      const title = (p.metaTitle || '').substring(0, 80);
      const proxy = p.loadedViaProxy ? ' [viaProxy]' : '';
      console.log(`  ${i + 1}. ${p.pagePath}  PV=${p.pageViews}`);
      console.log(`     タイトル: "${title}"${proxy}`);
      console.log(`     h1=${p.headingStructure?.h1 || 0}  text=${p.textLength || 0}字  load=${p.loadTime || 0}ms`);
    });
  }

  // HTTP ステータス別集計（失敗分を分析）
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 失敗パターン集計');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // 失敗データは pageScrapingData には保存されていない可能性あり
  // job 履歴か logs から判明する
  console.log('（詳細な失敗分布は Cloud Functions ログを確認してください）');
  console.log(`\n完了: jobId=${jobRef.id}`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
