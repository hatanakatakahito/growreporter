/**
 * すべてのAI分析キャッシュをクリアするCallable Function
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

export async function clearAllAICacheCallable(request) {
  // 管理者権限チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  const db = getFirestore();
  
  try {
    logger.info('AI分析キャッシュのクリアを開始', { userId: request.auth.uid });

    let totalDeleted = 0;

    // aiAnalysisCacheコレクション
    const cacheSnapshot = await db.collection('aiAnalysisCache').get();
    logger.info(`aiAnalysisCache: ${cacheSnapshot.size}件見つかりました`);
    
    if (cacheSnapshot.size > 0) {
      const cacheBatch = db.batch();
      cacheSnapshot.docs.forEach((doc) => {
        cacheBatch.delete(doc.ref);
        totalDeleted++;
      });
      await cacheBatch.commit();
      logger.info(`aiAnalysisCache: ${cacheSnapshot.size}件削除しました`);
    }

    // aiSummariesコレクション
    const summariesSnapshot = await db.collection('aiSummaries').get();
    logger.info(`aiSummaries: ${summariesSnapshot.size}件見つかりました`);
    
    if (summariesSnapshot.size > 0) {
      const summariesBatch = db.batch();
      summariesSnapshot.docs.forEach((doc) => {
        summariesBatch.delete(doc.ref);
        totalDeleted++;
      });
      await summariesBatch.commit();
      logger.info(`aiSummaries: ${summariesSnapshot.size}件削除しました`);
    }

    logger.info('AI分析キャッシュのクリアが完了', { totalDeleted });
    
    return {
      success: true,
      message: `すべてのAI分析キャッシュをクリアしました（${totalDeleted}件）`,
      cacheDeleted: cacheSnapshot.size,
      summariesDeleted: summariesSnapshot.size,
      totalDeleted,
    };

  } catch (error) {
    logger.error('キャッシュクリアエラー:', error);
    throw new HttpsError('internal', `エラーが発生しました: ${error.message}`);
  }
}



