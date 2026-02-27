import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { resetMonthlyLimits } from '../utils/planManager.js';
import { clearAllAIAnalysisCache } from '../utils/aiCacheManager.js';

/**
 * 月次制限リセット＆AIキャッシュクリア（毎月1日0時実行）
 */
export const resetMonthlyLimitsScheduled = onSchedule({
  schedule: '0 0 1 * *', // 毎月1日0時
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async (event) => {
  logger.info('[resetMonthlyLimits] 月次制限リセット＆キャッシュクリア開始');

  try {
    // 1. 月次制限をリセット
    await resetMonthlyLimits();
    logger.info('[resetMonthlyLimits] 月次制限リセット完了');

    // 2. AI分析キャッシュを全削除（新しい月は新鮮な分析を自動生成）
    const deletedCount = await clearAllAIAnalysisCache();
    logger.info(`[resetMonthlyLimits] AIキャッシュクリア完了: ${deletedCount}件削除`);
  } catch (error) {
    logger.error('[resetMonthlyLimits] エラー:', error);
    throw error;
  }
});

