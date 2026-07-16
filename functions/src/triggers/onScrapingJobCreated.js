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
      // Phase D: サイトサムネ取得 (CF Worker Browser Rendering 経由 viewport モード)
      // PC + Mobile を 1 アクセスで同時取得。スクレイピング完了直後に確実に最新サムネを保存する。
      // ========================================
      if (siteUrl && (!siteData?.pcScreenshotUrl || !siteData?.mobileScreenshotUrl)) {
        try {
          const { refreshSiteThumbnails } = await import('../utils/refreshSiteThumbnails.js');
          const result = await refreshSiteThumbnails({
            siteId,
            siteUrl,
            forceRefresh: false,
            persist: false, // siteUpdate に含めて 1 回の write にまとめる
          });
          if (result?.error) {
            logger.warn('[onScrapingJobCreated] サムネ取得エラー', { siteId, error: result.error, message: result.message });
          } else {
            if (result?.pcScreenshotUrl) siteUpdate.pcScreenshotUrl = result.pcScreenshotUrl;
            if (result?.mobileScreenshotUrl) siteUpdate.mobileScreenshotUrl = result.mobileScreenshotUrl;
            logger.info('[onScrapingJobCreated] サムネ取得完了', {
              siteId,
              pc: !!result?.pcScreenshotUrl,
              mobile: !!result?.mobileScreenshotUrl,
            });
          }
        } catch (importError) {
          logger.warn('[onScrapingJobCreated] refreshSiteThumbnails 読み込みエラー', { siteId, error: importError.message });
        }
      }

      // サイトドキュメント更新（メタデータ + スクショをまとめて1回で保存）
      if (Object.keys(siteUpdate).length > 0) {
        await db.collection('sites').doc(siteId).update(siteUpdate);
        logger.info('[onScrapingJobCreated] サイト情報更新完了', { siteId, fields: Object.keys(siteUpdate) });
      }

      // ========================================
      // Phase E: タクソノミー V2 自動判定（100ページ情報から業種・サイト役割・ビジネスモデルを推定）
      // ユーザー側UIでは業種を入力させないため、ここで裏データとして埋める。
      //
      // スキップ条件:
      //   - taxonomyVersion === 2 かつ全フィールド設定済み かつ needsManualReclassify !== true
      //   - ただし forceRescrape=true（ユーザーが手動で「スクレイピング開始」した場合）は
      //     再判定する（プロンプト改善や内容変化への追従のため）
      //   - monthly_rescrape（月次自動）も再判定（サイト内容の変化を追うため）
      // ========================================
      try {
        const latestSiteDoc = await db.collection('sites').doc(siteId).get();
        const latestSiteData = latestSiteDoc.data() || {};
        const alreadyConfirmed =
          Number(latestSiteData.taxonomyVersion) === 2 &&
          latestSiteData.needsManualReclassify !== true &&
          !!latestSiteData.businessModel &&
          !!latestSiteData.industryMajor &&
          !!latestSiteData.industryMinor &&
          !!latestSiteData.siteRole;

        // forceRescrape=true もしくは monthly_rescrape の場合は skip 条件を無視して再判定
        const forceInference = data.forceRescrape === true || data.source === 'monthly_rescrape';

        if (alreadyConfirmed && !forceInference) {
          logger.info('[onScrapingJobCreated] タクソノミー確定済みのためスキップ', { siteId });
        } else if (result.successCount < 3) {
          // スクレイピング件数が少なすぎて推定の精度が出せない場合はスキップ
          logger.warn('[onScrapingJobCreated] スクレイピング件数不足でタクソノミー推定をスキップ', {
            siteId,
            successCount: result.successCount,
          });
        } else {
          const pagesSnap = await db
            .collection('sites')
            .doc(siteId)
            .collection('pageScrapingData')
            .orderBy('pageViews', 'desc')
            .limit(100)
            .get();

          if (pagesSnap.empty) {
            logger.warn('[onScrapingJobCreated] pageScrapingData が空でタクソノミー推定をスキップ', { siteId });
          } else {
            const pages = pagesSnap.docs.map((d) => d.data());
            const { inferTaxonomyFromPageScrapingData } = await import(
              '../utils/taxonomyInferenceHelper.js'
            );

            const inference = await inferTaxonomyFromPageScrapingData({
              siteUrl: latestSiteData.siteUrl || siteUrl || '',
              siteName: latestSiteData.siteName || '',
              topMetadata: {
                title: latestSiteData.metaTitle || siteUpdate.metaTitle || '',
                description:
                  latestSiteData.metaDescription || siteUpdate.metaDescription || '',
              },
              pages,
              conversionEvents: latestSiteData.conversionEvents || [],
            });

            const taxonomyUpdate = {
              businessModel: inference.businessModel,
              industryMajor: inference.industryMajor,
              industryMinor: inference.industryMinor,
              siteRole: inference.siteRole,
              taxonomyVersion: 2,
              needsManualReclassify: inference.confidence === 'low',
              taxonomyInferredAt: FieldValue.serverTimestamp(),
              taxonomyInferenceSource: 'page_scraping',
              taxonomyConfidence: inference.confidence,
              taxonomyReasoning: inference.reasoning || '',
              // 旧フィールドが残っていれば掃除
              industry: FieldValue.delete(),
              siteType: FieldValue.delete(),
              sitePurpose: FieldValue.delete(),
              businessType: FieldValue.delete(),
            };

            await db.collection('sites').doc(siteId).update(taxonomyUpdate);
            logger.info('[onScrapingJobCreated] タクソノミー V2 自動判定完了', {
              siteId,
              businessModel: inference.businessModel,
              industryMajor: inference.industryMajor,
              industryMinor: inference.industryMinor,
              siteRole: inference.siteRole,
              confidence: inference.confidence,
              totalPages: pages.length,
            });
          }
        }
      } catch (taxonomyError) {
        logger.warn('[onScrapingJobCreated] タクソノミー自動判定エラー（既存処理は継続）', {
          siteId,
          error: taxonomyError.message,
        });
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
