/**
 * 管理者用: 全サイトの Before スクショを render+shot ベースで一括再撮影。
 *
 * 改善ロジック統一化プラン (Phase 5-A) のマイグレーション運用ツール。
 * 旧 PSI / 旧 BR 由来の page-screenshots/...jpg を、新ルート由来
 * (page-renderings-shots/{hash}.jpg + htmlUrl 付き Firestore ドキュメント) に置き換える。
 *
 * 旧 Storage オブジェクトは削除しない (improvements.implementationCheck.beforeSnapshot.screenshotUrl
 * が参照している可能性があるため)。
 *
 * 入力:
 *   { dryRun?: boolean, siteIds?: string[], topPagesPerSite?: number }
 *     - dryRun=true: 件数だけ返して撮影しない
 *     - siteIds 指定: 指定サイトのみ (省略時は setupCompleted=true の全サイト)
 *     - topPagesPerSite: 1 サイトあたりの撮影上位 PV ページ数 (default 10)
 *
 * 出力:
 *   { jobId, totalSites, processedSites, capturedCount, skippedCount, failedCount, durationMs }
 *
 * 注意:
 *   - timeoutSeconds: 3600 (1 時間) — index.js での lazyCallable 設定
 *   - Workers Free の 1 日 10 分制限を踏まえ、サイト数 × 約 100s で見積もり
 *   - 各サイト間で 30s stagger (Cloudflare レート制限配慮)
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { captureAndStoreBeforeScreenshotsBulk } from '../../utils/captureAndStoreBeforeScreenshot.js';

const PREHEAT_TOP_N_DEFAULT = 10;
const PREHEAT_CONCURRENCY = 2;
const STAGGER_BETWEEN_SITES_MS = 30_000;

export async function regenerateAllSiteScreenshotsCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  const db = getFirestore();

  // 管理者チェック
  const adminDoc = await db.collection('adminUsers').doc(req.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', '管理者権限が必要です');
  }

  const {
    dryRun = false,
    siteIds = null,
    topPagesPerSite = PREHEAT_TOP_N_DEFAULT,
  } = req.data || {};

  const startedAt = Date.now();

  // 対象サイト一覧
  let sites = [];
  if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
    for (const id of siteIds) {
      const doc = await db.collection('sites').doc(id).get();
      if (doc.exists) sites.push({ id: doc.id, ...doc.data() });
    }
  } else {
    const snap = await db.collection('sites').where('setupCompleted', '==', true).get();
    snap.forEach(doc => sites.push({ id: doc.id, ...doc.data() }));
  }

  logger.info(`[regenerateAllSiteScreenshots] 対象サイト数: ${sites.length} (dryRun=${dryRun})`);

  // 見積もり: 1 サイト = 10P × 2 viewport × 5s + stagger 30s = 約 130s
  const estimatedDurationMin = Math.ceil((sites.length * 130) / 60);

  if (dryRun) {
    return {
      dryRun: true,
      totalSites: sites.length,
      siteIds: sites.map(s => s.id),
      estimatedDurationMin,
      message: `本番実行で約 ${estimatedDurationMin} 分かかる見込み`,
    };
  }

  // adminJobs にジョブエントリ作成
  const jobRef = db.collection('adminJobs').doc();
  const jobId = jobRef.id;
  await jobRef.set({
    type: 'regenerateAllSiteScreenshots',
    status: 'running',
    totalSites: sites.length,
    processedSites: 0,
    capturedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    startedAt: FieldValue.serverTimestamp(),
    startedBy: req.auth.uid,
    estimatedDurationMin,
  });

  let processedSites = 0;
  let totalCaptured = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const siteResults = [];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const siteStartedAt = Date.now();
    try {
      // PV 上位 N ページの URL を取得
      const snap = await db
        .collection('sites')
        .doc(site.id)
        .collection('pageScrapingData')
        .orderBy('pageViews', 'desc')
        .limit(topPagesPerSite)
        .get();

      const targetPageUrls = snap.docs
        .map((d) => d.data()?.pageUrl)
        .filter((url) => url && /^https?:\/\//i.test(url));

      if (targetPageUrls.length === 0) {
        logger.info(`[regenerateAllSiteScreenshots] ${site.id}: pageScrapingData 0件、スキップ`);
        siteResults.push({ siteId: site.id, requested: 0, captured: 0, skipped: 0, failed: 0 });
      } else {
        const results = await captureAndStoreBeforeScreenshotsBulk({
          siteId: site.id,
          targetPageUrls,
          siteOwnerId: site.userId,
          concurrency: PREHEAT_CONCURRENCY,
        });
        const captured = results.filter(r => r?.success && !r.alreadyExists).length;
        const skipped = results.filter(r => r?.success && r.alreadyExists).length;
        const failed = results.length - captured - skipped;
        totalCaptured += captured;
        totalSkipped += skipped;
        totalFailed += failed;
        siteResults.push({
          siteId: site.id,
          requested: targetPageUrls.length,
          captured,
          skipped,
          failed,
          durationMs: Date.now() - siteStartedAt,
        });
        logger.info(
          `[regenerateAllSiteScreenshots] ${site.id}: 新規=${captured}, 既存=${skipped}, 失敗=${failed}`
        );
      }
    } catch (e) {
      totalFailed++;
      siteResults.push({ siteId: site.id, requested: 0, captured: 0, skipped: 0, failed: 1, error: e?.message });
      logger.warn(`[regenerateAllSiteScreenshots] ${site.id}: 例外 ${e?.message}`);
    }

    processedSites++;

    // ジョブ進捗更新 (5 サイトごと or 最終サイト)
    if (processedSites % 5 === 0 || processedSites === sites.length) {
      await jobRef.update({
        processedSites,
        capturedCount: totalCaptured,
        skippedCount: totalSkipped,
        failedCount: totalFailed,
        currentSiteId: site.id,
        progressUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 次サイトへの stagger (最終サイトの後はスキップ)
    if (i < sites.length - 1) {
      await new Promise((r) => setTimeout(r, STAGGER_BETWEEN_SITES_MS));
    }
  }

  const durationMs = Date.now() - startedAt;
  await jobRef.update({
    status: 'completed',
    processedSites,
    capturedCount: totalCaptured,
    skippedCount: totalSkipped,
    failedCount: totalFailed,
    completedAt: FieldValue.serverTimestamp(),
    durationMs,
    siteResults: siteResults.slice(0, 200), // 上限を設けて Firestore 1MB 制限を回避
  });

  logger.info(
    `[regenerateAllSiteScreenshots] 完了 jobId=${jobId}: ${processedSites}/${sites.length} sites, 新規=${totalCaptured}, 既存=${totalSkipped}, 失敗=${totalFailed}, ${Math.round(durationMs / 1000)}s`
  );

  return {
    jobId,
    totalSites: sites.length,
    processedSites,
    capturedCount: totalCaptured,
    skippedCount: totalSkipped,
    failedCount: totalFailed,
    durationMs,
  };
}
