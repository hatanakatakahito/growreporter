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
 * スクレイピングジョブ作成時のハンドラ（index から遅延読み込みされる）
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
      logger.info('[onScrapingJobCreated] スキップ（status !== pending または siteId なし）', { jobId, siteId, status });
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

      // スクレイピング完了の通知をアラートに保存
      try {
        await db.collection('sites').doc(siteId).collection('alerts').add({
          type: 'scraping_completed',
          message: `ページスクレイピングが完了しました（成功: ${result.successCount ?? 0}件、失敗: ${result.failedCount ?? 0}件）`,
          createdAt: new Date(),
        });
        logger.info('[onScrapingJobCreated] スクレイピング完了アラートを保存', { siteId });
      } catch (alertError) {
        logger.warn('[onScrapingJobCreated] アラート保存エラー', { siteId, error: alertError.message });
      }

      // スクレイピング完了後にサイト診断を自動実行（プラン消費なし）
      try {
        const { runSiteDiagnosisInternal } = await import('../callable/runSiteDiagnosis.js');
        logger.info('[onScrapingJobCreated] 自動サイト診断を開始', { siteId });
        const diagResult = await runSiteDiagnosisInternal(siteId);
        if (diagResult) {
          logger.info('[onScrapingJobCreated] 自動サイト診断完了', { siteId, overallScore: diagResult.overallScore });
        } else {
          logger.warn('[onScrapingJobCreated] 自動サイト診断: データ不足でスキップ', { siteId });
        }
      } catch (diagError) {
        logger.warn('[onScrapingJobCreated] 自動サイト診断エラー（スクレイピングは成功）', { siteId, error: diagError.message });
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

      // scrapingProgress もエラーに更新（runScrapingForSite 内で更新されていない場合のフォールバック）
      try {
        await db.collection('sites').doc(siteId).collection('scrapingProgress').doc('default').set(
          {
            status: 'error',
            error: error.message,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        logger.warn('[onScrapingJobCreated] 進捗更新エラー', e);
      }
    }
}

export const onScrapingJobCreatedTrigger = onDocumentCreated(
  onScrapingJobCreatedTriggerConfig,
  onScrapingJobCreatedHandler
);
