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
 * @param {string|null} comparisonStartDate - 比較期間の開始日（任意）
 * @param {string|null} comparisonEndDate - 比較期間の終了日（任意）
 * @returns {Promise<Object|null>}
 */
export async function getCachedAnalysis(userId, siteId, pageType, startDate, endDate, comparisonStartDate = null, comparisonEndDate = null) {
  const db = getFirestore();

  try {
    let q = db.collection('sites').doc(siteId).collection('aiAnalysisCache')
      .where('userId', '==', userId)
      .where('pageType', '==', pageType)
      .where('period.startDate', '==', startDate)
      .where('period.endDate', '==', endDate);

    // 比較期間がある場合はキャッシュキーに含める
    if (comparisonStartDate && comparisonEndDate) {
      q = q.where('period.comparisonStartDate', '==', comparisonStartDate)
           .where('period.comparisonEndDate', '==', comparisonEndDate);
    } else {
      q = q.where('period.comparisonStartDate', '==', null);
    }

    const cacheSnapshot = await q
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
export async function saveCachedAnalysis(userId, siteId, pageType, summary, recommendations, startDate, endDate, comparisonStartDate = null, comparisonEndDate = null) {
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
        comparisonStartDate: comparisonStartDate || null,
        comparisonEndDate: comparisonEndDate || null,
      },
    };

    const cacheRef = await db.collection('sites').doc(siteId).collection('aiAnalysisCache').add(cacheData);
    
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

/**
 * 全サイトのAI分析キャッシュを一括削除（月次リセット用）
 * sites/{siteId}/aiAnalysisCache のすべてのドキュメントを削除
 * @returns {Promise<number>} 削除したドキュメント数
 */
export async function clearAllAIAnalysisCache() {
  const db = getFirestore();
  let totalDeleted = 0;

  try {
    const sitesSnapshot = await db.collection('sites').get();

    if (sitesSnapshot.empty) {
      logger.info('[CacheManager] キャッシュクリア対象サイトなし');
      return 0;
    }

    for (const siteDoc of sitesSnapshot.docs) {
      const siteId = siteDoc.id;

      const cacheSnapshot = await db
        .collection('sites')
        .doc(siteId)
        .collection('aiAnalysisCache')
        .get();

      if (cacheSnapshot.empty) continue;

      let batch = db.batch();
      let batchCount = 0;

      for (const cacheDoc of cacheSnapshot.docs) {
        batch.delete(cacheDoc.ref);
        batchCount++;
        totalDeleted++;

        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    }

    logger.info(`[CacheManager] AI分析キャッシュ一括削除完了: ${totalDeleted}件`);
    return totalDeleted;
  } catch (error) {
    logger.error('[CacheManager] AI分析キャッシュ一括削除エラー:', error);
    throw error;
  }
}

