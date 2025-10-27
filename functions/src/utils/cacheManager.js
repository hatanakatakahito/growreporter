import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// キャッシュの有効期限（ミリ秒）
const CACHE_TTL = 60 * 60 * 1000; // 1時間

/**
 * キャッシュからデータを取得
 * @param {string} cacheKey - キャッシュキー
 * @returns {Promise<object|null>} - キャッシュデータ、または null
 */
export async function getCache(cacheKey) {
  try {
    const db = getFirestore();
    const cacheDoc = await db.collection('api_cache').doc(cacheKey).get();
    
    if (!cacheDoc.exists) {
      console.log(`[CacheManager] Cache miss: ${cacheKey}`);
      return null;
    }

    const cache = cacheDoc.data();
    const cacheAge = Date.now() - cache.timestamp.toMillis();
    
    // キャッシュが有効期限内かチェック
    if (cacheAge < CACHE_TTL) {
      console.log(`[CacheManager] Cache hit: ${cacheKey} (age: ${Math.round(cacheAge / 1000)}s)`);
      return cache.data;
    }

    console.log(`[CacheManager] Cache expired: ${cacheKey} (age: ${Math.round(cacheAge / 1000)}s)`);
    return null;
  } catch (error) {
    console.error('[CacheManager] Error getting cache:', error);
    return null;
  }
}

/**
 * キャッシュにデータを保存
 * @param {string} cacheKey - キャッシュキー
 * @param {object} data - 保存するデータ
 * @param {string} siteId - サイトID
 * @param {string} userId - ユーザーID
 * @returns {Promise<void>}
 */
export async function setCache(cacheKey, data, siteId, userId) {
  try {
    const db = getFirestore();
    await db.collection('api_cache').doc(cacheKey).set({
      data,
      timestamp: FieldValue.serverTimestamp(),
      siteId,
      userId,
      ttl: CACHE_TTL,
    });
    
    console.log(`[CacheManager] Cache set: ${cacheKey}`);
  } catch (error) {
    console.error('[CacheManager] Error setting cache:', error);
    // キャッシュ保存エラーは致命的ではないので、エラーを投げない
  }
}

/**
 * キャッシュキーを生成
 * @param {string} type - データタイプ（'ga4' または 'gsc'）
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日
 * @param {string} endDate - 終了日
 * @returns {string} - キャッシュキー
 */
export function generateCacheKey(type, siteId, startDate, endDate) {
  return `${type}_${siteId}_${startDate}_${endDate}`;
}

/**
 * 古いキャッシュを削除
 * @param {number} olderThanMs - この時間より古いキャッシュを削除（ミリ秒）
 * @returns {Promise<number>} - 削除したキャッシュの数
 */
export async function cleanupOldCache(olderThanMs = 24 * 60 * 60 * 1000) {
  try {
    const db = getFirestore();
    const cutoffTime = new Date(Date.now() - olderThanMs);
    
    const snapshot = await db
      .collection('api_cache')
      .where('timestamp', '<', cutoffTime)
      .get();
    
    if (snapshot.empty) {
      console.log('[CacheManager] No old cache to delete');
      return 0;
    }

    // バッチ削除
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`[CacheManager] Deleted ${snapshot.size} old cache entries`);
    return snapshot.size;
  } catch (error) {
    console.error('[CacheManager] Error cleaning up cache:', error);
    return 0;
  }
}

