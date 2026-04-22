import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 全サイト一括再スクレイピング投入スクリプト
 *
 * 対象: sites コレクションの setupCompleted === true の全ドキュメント
 * 処理:
 *   1. 各サイトについて scrapingJobs コレクションに forceRescrape: true のジョブを投入
 *   2. onScrapingJobCreated トリガーが自動発火し、100ページスクレイピング + Phase E
 *      （タクソノミー V2 自動判定）が実行される
 *   3. maxInstances: 3, concurrency: 1 なので最大3並列で捌かれる
 *
 * 用途: タクソノミー V2 を既存サイトに一斉適用する(旧フィールドも同時クリーンアップ)
 *
 * 実行方法:
 *   cd functions
 *   npm run batch:rescrape-all              # 本番実行
 *   npm run batch:rescrape-all:dry          # dry-run
 */

initializeApp();

const DRY_RUN = process.argv.includes('--dry-run');

async function triggerAllSitesRescrape() {
  const db = getFirestore();

  console.log(`[triggerAllSitesRescrape] 開始 (dryRun=${DRY_RUN})`);

  const snapshot = await db
    .collection('sites')
    .where('setupCompleted', '==', true)
    .get();
  console.log(`[triggerAllSitesRescrape] 対象サイト (setupCompleted=true): ${snapshot.size}件`);

  let queued = 0;
  let errors = 0;

  for (const siteDoc of snapshot.docs) {
    const siteId = siteDoc.id;
    const data = siteDoc.data() || {};

    const label = `${siteId} | ${data.siteName || '(no name)'} | ${data.siteUrl || '(no url)'}`;

    try {
      console.log(`[triggerAllSitesRescrape] ${label}`);

      if (DRY_RUN) {
        queued++;
        continue;
      }

      // scrapingJobs に pending ジョブを投入 → onScrapingJobCreated トリガーが発火
      await db.collection('scrapingJobs').add({
        siteId,
        requestedBy: data.userId || null,
        forceRescrape: true,
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp(),
        source: 'batch_rescrape',
      });
      queued++;

      // 1件ごとに少しだけ sleep して Firestore trigger の瞬間スパイクを緩和
      await new Promise((r) => setTimeout(r, 200));
    } catch (error) {
      console.error(`[triggerAllSitesRescrape] ${siteId} エラー:`, error);
      errors++;
    }
  }

  console.log('[triggerAllSitesRescrape] 完了');
  console.log(`  キュー投入: ${queued}`);
  console.log(`  エラー: ${errors}`);
  if (DRY_RUN) {
    console.log('  ※ dry-run のため scrapingJobs への投入は行っていません');
  } else {
    console.log('');
    console.log('  各ジョブは onScrapingJobCreated トリガーで順次処理されます。');
    console.log('  目安: 3並列 × 1ジョブあたり約2〜3分 → 21件なら15〜25分で完了');
    console.log('  進捗はFirebase Functions ログ、もしくは Firestore scrapingJobs コレクションで確認可能');
  }
}

triggerAllSitesRescrape()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[triggerAllSitesRescrape] 致命的エラー:', err);
    process.exit(1);
  });
