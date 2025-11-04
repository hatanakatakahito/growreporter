import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const PLANS = {
  free: { aiGenerationsPerMonth: 4 },
  paid: { aiGenerationsPerMonth: -1 }, // 無制限
};

/**
 * ユーザーがAI生成可能かチェック
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export async function checkCanGenerate(userId) {
  const db = getFirestore();
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      logger.warn(`[PlanManager] ユーザーデータが見つかりません: ${userId}`);
      return false;
    }

    const plan = userData.plan || 'free';
    
    // 有料プランは無制限
    if (plan === 'paid') {
      return true;
    }

    // 無料プランは月4回まで
    const used = userData.planLimits?.aiGenerationsUsed || 0;
    const canGenerate = used < PLANS.free.aiGenerationsPerMonth;
    
    logger.info(`[PlanManager] AI生成チェック: ${userId}, プラン: ${plan}, 使用: ${used}/4, 可能: ${canGenerate}`);
    
    return canGenerate;
  } catch (error) {
    logger.error('[PlanManager] AI生成チェックエラー:', error);
    return false;
  }
}

/**
 * AI生成回数をインクリメント
 * @param {string} userId 
 */
export async function incrementGenerationCount(userId) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);

  try {
    await userRef.update({
      'planLimits.aiGenerationsUsed': FieldValue.increment(1),
    });
    
    logger.info(`[PlanManager] AI生成回数をインクリメント: ${userId}`);
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
    // 無料プランのユーザーのみ取得
    const usersSnapshot = await db.collection('users')
      .where('plan', '==', 'free')
      .get();

    if (usersSnapshot.empty) {
      logger.info('[PlanManager] リセット対象ユーザーなし');
      return;
    }

    // バッチ処理でリセット
    const batch = db.batch();
    let count = 0;

    usersSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        'planLimits.aiGenerationsUsed': 0,
        'planLimits.lastResetAt': FieldValue.serverTimestamp(),
      });
      count++;
    });

    await batch.commit();
    
    logger.info(`[PlanManager] ${count}件のユーザーの月次制限をリセット完了`);
  } catch (error) {
    logger.error('[PlanManager] 月次制限リセットエラー:', error);
    throw error;
  }
}

