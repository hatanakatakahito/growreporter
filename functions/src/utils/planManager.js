import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const PLANS = {
  free: { 
    aiSummaryLimit: 10,
    aiImprovementLimit: 2,
  },
  standard: { 
    aiSummaryLimit: 50,
    aiImprovementLimit: 10,
  },
  premium: { 
    aiSummaryLimit: -1, // 無制限
    aiImprovementLimit: -1, // 無制限
  },
  // 旧システム互換
  paid: { 
    aiSummaryLimit: -1,
    aiImprovementLimit: -1,
  },
};

/**
 * ユーザーがAI生成可能かチェック
 * @param {string} userId 
 * @param {string} type - 'summary' or 'improvement'
 * @returns {Promise<boolean>}
 */
export async function checkCanGenerate(userId, type = 'summary') {
  const db = getFirestore();
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      logger.warn(`[PlanManager] ユーザーデータが見つかりません: ${userId}`);
      return false;
    }

    const plan = userData.plan || 'free';
    const planConfig = PLANS[plan] || PLANS.free;
    
    // 無制限プラン
    if (type === 'summary' && planConfig.aiSummaryLimit === -1) {
      return true;
    }
    if (type === 'improvement' && planConfig.aiImprovementLimit === -1) {
      return true;
    }

    // 使用回数チェック
    const used = type === 'summary' 
      ? (userData.aiSummaryUsage || 0)
      : (userData.aiImprovementUsage || 0);
    const limit = type === 'summary' 
      ? planConfig.aiSummaryLimit 
      : planConfig.aiImprovementLimit;
    
    const canGenerate = used < limit;
    
    logger.info(`[PlanManager] AI生成チェック: ${userId}, プラン: ${plan}, タイプ: ${type}, 使用: ${used}/${limit}, 可能: ${canGenerate}`);
    
    return canGenerate;
  } catch (error) {
    logger.error('[PlanManager] AI生成チェックエラー:', error);
    return false;
  }
}

/**
 * AI生成回数をインクリメント
 * @param {string} userId 
 * @param {string} type - 'summary' or 'improvement'
 */
export async function incrementGenerationCount(userId, type = 'summary') {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);

  try {
    const fieldName = type === 'summary' ? 'aiSummaryUsage' : 'aiImprovementUsage';
    await userRef.update({
      [fieldName]: FieldValue.increment(1),
    });
    
    logger.info(`[PlanManager] AI生成回数をインクリメント: ${userId}, タイプ: ${type}`);
  } catch (error) {
    logger.error('[PlanManager] 生成回数の更新エラー:', error);
    throw error;
  }
}

/**
 * 全ユーザーの月次制限をリセット
 */
export async function resetMonthlyLimits() {
  const db = getFirestore();

  try {
    // 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      logger.info('[PlanManager] リセット対象ユーザーなし');
      return;
    }

    // バッチ処理でリセット（最大500件）
    let batch = db.batch();
    let count = 0;
    let batchCount = 0;

    for (const doc of usersSnapshot.docs) {
      batch.update(doc.ref, {
        aiSummaryUsage: 0,
        aiImprovementUsage: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
      batchCount++;

      // Firestoreのバッチ制限は500件
      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit();
    }
    
    logger.info(`[PlanManager] ${count}件のユーザーの月次制限をリセット完了`);
  } catch (error) {
    logger.error('[PlanManager] 月次制限リセットエラー:', error);
    throw error;
  }
}

