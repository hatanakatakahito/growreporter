import { cleanupOldCache } from '../utils/cacheManager.js';

/**
 * 古いキャッシュを削除するScheduled Function
 * 毎日午前3時（JST）に実行
 * @param {object} event - イベントオブジェクト
 * @returns {Promise<null>}
 */
export async function cleanupCacheScheduled(event) {
  console.log('[cleanupCache] Start');

  try {
    // 24時間より古いキャッシュを削除
    const deletedCount = await cleanupOldCache(24 * 60 * 60 * 1000);
    
    console.log(`[cleanupCache] Completed: deleted ${deletedCount} cache entries`);
    
    return null;
  } catch (error) {
    console.error('[cleanupCache] Error:', error);
    // エラーが発生しても処理を続行
    return null;
  }
}




