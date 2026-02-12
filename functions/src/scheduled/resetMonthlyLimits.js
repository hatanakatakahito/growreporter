import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { resetMonthlyLimits } from '../utils/planManager.js';

/**
 * 月次制限リセット（毎月1日0時実行）
 */
export const resetMonthlyLimitsScheduled = onSchedule({
  schedule: '0 0 1 * *', // 毎月1日0時
  timeZone: 'Asia/Tokyo',
  region: 'asia-northeast1',
  memory: '256MiB',
}, async (event) => {
  logger.info('[resetMonthlyLimits] 月次制限リセット開始');

  try {
    await resetMonthlyLimits();
    logger.info('[resetMonthlyLimits] 月次制限リセット完了');
  } catch (error) {
    logger.error('[resetMonthlyLimits] エラー:', error);
    throw error;
  }
});

