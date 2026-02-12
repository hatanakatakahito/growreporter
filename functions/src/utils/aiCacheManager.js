import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const CACHE_DURATION_DAYS = 7;

/**
 * キャッシュされたAI分析を取得
 * @param {string} userId 
 * @param {string} siteId 
 * @param {string} pageType 
 * @param {string} startDate 
 * @param {string} endDate 
 * @returns {Promise<Object|null>}
 */
export async function getCachedAnalysis(userId, siteId, pageType, startDate, endDate) {
  const db = getFirestore();

  try {
    const cacheSnapshot = await db.collection('aiAnalysisCache')
      .where('userId', '==', userId)
      .where('siteId', '==', siteId)
      .where('pageType', '==', pageType)
      .where('period.startDate', '==', startDate)
      .where('period.endDate', '==', endDate)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    if (cacheSnapshot.empty) {
      logger.info('[CacheManager] キャッシュが見つかりません', {
        userId,
        siteId,
        pageType,
        startDate,
        endDate,
      });
      return null;
    }

    const cacheDoc = cacheSnapshot.docs[0];
    const cacheData = cacheDoc.data();

    // 有効期限チェック
    const now = new Date();
    const expiresAt = cacheData.expiresAt.toDate();

    if (now > expiresAt) {
      logger.info('[CacheManager] キャッシュが期限切れ', {
        cacheId: cacheDoc.id,
        expiresAt: expiresAt.toISOString(),
      });
      return null;
    }

    logger.info('[CacheManager] キャッシュヒット', {
      cacheId: cacheDoc.id,
      generatedAt: cacheData.generatedAt.toDate().toISOString(),
    });

    return {
      ...cacheData,
      cacheId: cacheDoc.id,
      generatedAt: cacheData.generatedAt.toDate(),
      expiresAt: expiresAt,
    };
  } catch (error) {
    logger.error('[CacheManager] キャッシュ取得エラー:', error);
    return null;
  }
}

/**
 * AI分析結果をキャッシュに保存
 * @param {string} userId 
 * @param {string} siteId 
 * @param {string} pageType 
 * @param {string} summary 
 * @param {Array} recommendations 
 * @param {string} startDate 
 * @param {string} endDate 
 * @returns {Promise<string>} cacheId
 */
export async function saveCachedAnalysis(userId, siteId, pageType, summary, recommendations, startDate, endDate) {
  const db = getFirestore();

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const cacheData = {
      userId,
      siteId,
      pageType,
      summary,
      recommendations: recommendations || [],
      generatedAt: now,
      expiresAt,
      period: {
        startDate,
        endDate,
      },
    };

    const cacheRef = await db.collection('aiAnalysisCache').add(cacheData);
    
    logger.info('[CacheManager] キャッシュ保存成功', {
      cacheId: cacheRef.id,
      pageType,
      expiresAt: expiresAt.toISOString(),
    });

    return cacheRef.id;
  } catch (error) {
    logger.error('[CacheManager] キャッシュ保存エラー:', error);
    throw error;
  }
}

