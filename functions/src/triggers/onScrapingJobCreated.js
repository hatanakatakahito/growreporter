import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { runScrapingForSite } from '../callable/scrapeTop100Pages.js';


/** トリガー設定（index で遅延読み込み時に使用） */
export const onScrapingJobCreatedTriggerConfig = {
  document: 'scrapingJobs/{jobId}',
  region: 'asia-northeast1',
  memory: '2GiB',
  timeoutSeconds: 540,
};

/**
 * スクレイピングジョブ作成時のハンドラ
 * スクレイピング + メタデータ取得 + サイトスクショ + サイト診断 を一括実行
 */
export async function onScrapingJobCreatedHandler(event) {
    const jobId = event.params.jobId;
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('[onScrapingJobCreated] スナップショットなし', { jobId });
      return;
    }

    const data = snapshot.data();
    const { siteId, status } = data || {};
    logger.info('[onScrapingJobCreated] ジョブ受信', { jobId, siteId, status });

    if (status !== 'pending' || !siteId) {
      return;
    }

    const db = getFirestore();
    const jobRef = snapshot.ref;

    try {
      await jobRef.update({
        status: 'running',
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // ========================================
      // Phase A+B: スクレイピング（100ページ + 30ページスクショ）
      // ========================================
      logger.info('[onScrapingJobCreated] スクレイピング開始', { jobId, siteId });
      const result = await runScrapingForSite(db, siteId, { skipRateLimit: true });

      await jobRef.update({
        status: 'completed',
        result: {
          success: result.success,
          successCount: result.successCount,
          failedCount: result.failedCount,
          message: result.message,
        },
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      logger.info('[onScrapingJobCreated] スクレイピング完了', { jobId, siteId, successCount: result.successCount });

      // ========================================
      // Phase C: メタデータ取得（スクレイピングデータ → Cloudflare proxy フォールバック）
      // ========================================
      const siteDoc = await db.collection('sites').doc(siteId).get();
      const siteData = siteDoc.data();
      const siteUrl = siteData?.siteUrl;
      const siteUpdate = {};

      if (!siteData?.metaTitle || !siteData?.metaDescription) {
        try {
          await _fetchAndSetMetadata(db, siteId, siteUrl, siteData, siteUpdate);
        } catch (metaError) {
          logger.warn('[onScrapingJobCreated] メタデータ取得エラー', { siteId, error: metaError.message });
        }
      }

      // ========================================
      // Phase D: サイトスクショ取得（Puppeteer → PSI フォールバック）
      // ========================================
      if (siteUrl && (!siteData?.pcScreenshotUrl || !siteData?.mobileScreenshotUrl)) {
        try {
          const { captureScreenshotCallable } = await import('../callable/captureScreenshot.js');
          const ownerUid = siteData?.userId || null;

          if (!siteData?.pcScreenshotUrl) {
            try {
              const pcResult = await captureScreenshotCallable({
                data: { siteUrl, deviceType: 'pc' },
                auth: ownerUid ? { uid: ownerUid } : undefined,
              });
              if (pcResult?.imageUrl) siteUpdate.pcScreenshotUrl = pcResult.imageUrl;
              logger.info('[onScrapingJobCreated] PCスクショ取得完了', { siteId });
            } catch (e) {
              logger.warn('[onScrapingJobCreated] PCスクショ取得エラー', { siteId, error: e.message });
            }
          }

          if (!siteData?.mobileScreenshotUrl) {
            try {
              const mobileResult = await captureScreenshotCallable({
                data: { siteUrl, deviceType: 'mobile' },
                auth: ownerUid ? { uid: ownerUid } : undefined,
              });
              if (mobileResult?.imageUrl) siteUpdate.mobileScreenshotUrl = mobileResult.imageUrl;
              logger.info('[onScrapingJobCreated] モバイルスクショ取得完了', { siteId });
            } catch (e) {
              logger.warn('[onScrapingJobCreated] モバイルスクショ取得エラー', { siteId, error: e.message });
            }
          }
        } catch (importError) {
          logger.warn('[onScrapingJobCreated] captureScreenshot読み込みエラー', { siteId, error: importError.message });
        }
      }

      // サイトドキュメント更新（メタデータ + スクショをまとめて1回で保存）
      if (Object.keys(siteUpdate).length > 0) {
        await db.collection('sites').doc(siteId).update(siteUpdate);
        logger.info('[onScrapingJobCreated] サイト情報更新完了', { siteId, fields: Object.keys(siteUpdate) });
      }

      // ========================================
      // 完了通知アラート
      // ========================================
      try {
        await db.collection('sites').doc(siteId).collection('alerts').add({
          type: 'scraping_completed',
          message: `ページスクレイピングが完了しました（成功: ${result.successCount ?? 0}件、失敗: ${result.failedCount ?? 0}件）`,
          createdAt: new Date(),
        });
      } catch (alertError) {
        logger.warn('[onScrapingJobCreated] アラート保存エラー', { siteId, error: alertError.message });
      }

      // ========================================
      // サイト診断
      // ========================================
      try {
        const diagModule = await import('../utils/runSiteDiagnosis.js').catch(() => null);
        if (diagModule?.runSiteDiagnosisInternal) {
          const diagResult = await diagModule.runSiteDiagnosisInternal(siteId);
          if (diagResult) {
            logger.info('[onScrapingJobCreated] サイト診断完了', { siteId, overallScore: diagResult.overallScore });
          }
        }
      } catch (diagError) {
        logger.warn('[onScrapingJobCreated] サイト診断スキップ', { siteId, error: diagError.message });
      }

      // ========================================
      // 月次スクレイピング時: AI改善提案自動生成
      // ========================================
      if (data.source === 'monthly_rescrape') {
        try {
          const { generateAutoImprovements } = await import('../utils/autoImprovementGenerator.js');
          const autoResult = await generateAutoImprovements(siteId);
          if (autoResult.skipped) {
            logger.info('[onScrapingJobCreated] AI改善提案スキップ', { siteId, reason: autoResult.reason });
          } else if (autoResult.success) {
            logger.info('[onScrapingJobCreated] AI改善提案完了', { siteId, count: autoResult.count });
          }
        } catch (autoError) {
          logger.warn('[onScrapingJobCreated] AI改善提案エラー', { siteId, error: autoError.message });
        }
      }

    } catch (error) {
      logger.error('[onScrapingJobCreated] エラー', { jobId, siteId, error: error.message });

      try {
        await jobRef.update({
          status: 'error',
          error: error.message,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (e) {
        logger.warn('[onScrapingJobCreated] ジョブ更新エラー', e);
      }

      try {
        await db.collection('sites').doc(siteId).collection('scrapingProgress').doc('default').set(
          { status: 'error', error: error.message, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      } catch (e) {
        logger.warn('[onScrapingJobCreated] 進捗更新エラー', e);
      }
    }
}

/**
 * メタデータ取得: スクレイピングデータ → Cloudflare proxy フォールバック
 */
async function _fetchAndSetMetadata(db, siteId, siteUrl, siteData, siteUpdate) {
  const errorTitles = /^(403|404|500|502|503)\s|forbidden|not found|access denied|error/i;

  // Step 1: スクレイピングデータからトップページのメタデータを取得
  const scrapingSnap = await db.collection('sites').doc(siteId)
    .collection('pageScrapingData')
    .where('pagePath', 'in', ['/', '/index.html', '/index.php'])
    .limit(1)
    .get();

  let title = null;
  let desc = null;

  if (!scrapingSnap.empty) {
    const d = scrapingSnap.docs[0].data();
    if (d.metaTitle && !errorTitles.test(d.metaTitle.trim())) title = d.metaTitle;
    if (d.metaDescription && !errorTitles.test(d.metaDescription.trim())) desc = d.metaDescription;
  }

  // Step 2: スクレイピングデータで取れなかった場合 → fetchMetadata（fetch → Puppeteer → CF proxy）
  if (!title || !desc) {
    if (siteUrl) {
      try {
        const { fetchMetadataCallable } = await import('../callable/fetchMetadata.js');
        const result = await fetchMetadataCallable({ data: { siteUrl } });
        const meta = result?.metadata;
        if (!title && (meta?.title || meta?.ogTitle)) {
          title = meta.title || meta.ogTitle;
        }
        if (!desc && (meta?.description || meta?.ogDescription)) {
          desc = meta.description || meta.ogDescription;
        }
        logger.info('[onScrapingJobCreated] fetchMetadataでメタデータ取得', { siteId, title: !!title, desc: !!desc });
      } catch (e) {
        logger.warn('[onScrapingJobCreated] fetchMetadataエラー', { siteId, error: e.message });
      }
    }
  }

  if (title && !siteData?.metaTitle) siteUpdate.metaTitle = title;
  if (desc && !siteData?.metaDescription) siteUpdate.metaDescription = desc;
}

export const onScrapingJobCreatedTrigger = onDocumentCreated(
  onScrapingJobCreatedTriggerConfig,
  onScrapingJobCreatedHandler
);
