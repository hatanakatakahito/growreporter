import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { assertAdmin } from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: benchmarkAggregator scheduled function を手動でトリガ
 *
 * 月次バッチを待たずに即時実行する管理用 Callable。
 * デプロイ直後の動作確認、トークン再認証後の即時反映、テスト時に使用。
 *
 * 注意: Cloud Functions の onCall タイムアウトは 540s 上限。
 * 大規模化したらバックグラウンドジョブに切り替える。
 */
export async function triggerBenchmarkAggregatorCallable(request) {
  await assertAdmin(request.auth?.uid);

  logger.info('[triggerBenchmarkAggregator] 手動実行開始', { adminId: request.auth.uid });

  try {
    const { benchmarkAggregatorHandler } = await import('../../scheduled/benchmarkAggregator.js');
    const stats = await benchmarkAggregatorHandler({ manual: true, adminId: request.auth.uid });
    return { success: true, stats };
  } catch (err) {
    logger.error('[triggerBenchmarkAggregator] エラー', { error: err.message, stack: err.stack });
    throw new HttpsError('internal', `バッチ実行失敗: ${err.message}`);
  }
}
