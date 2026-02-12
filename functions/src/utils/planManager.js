import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

// デフォルトのプラン設定（フォールバック用）
const DEFAULT_PLANS = {
  free: { 
    maxSites: 1,
    aiSummaryLimit: 10,
    aiImprovementLimit: 2,
  },
  standard: { 
    maxSites: 3,
    aiSummaryLimit: 50,
    aiImprovementLimit: 10,
  },
  premium: { 
    maxSites: 10,
    aiSummaryLimit: -1, // 無制限
    aiImprovementLimit: -1, // 無制限
  },
  // 旧システム互換
  paid: { 
    maxSites: 999999,
    aiSummaryLimit: -1,
    aiImprovementLimit: -1,
  },
};

// プラン設定のキャッシュ（メモリキャッシュ、1時間有効）
let planConfigCache = null;
let planConfigCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1時間

/**
 * Firestoreからプラン設定を取得（キャッシュ付き）
 * @param {Object} db - Firestore instance
 * @returns {Promise<Object>}
 */
async function getPlanConfig(db) {
  const now = Date.now();
  
  // キャッシュが有効ならそれを返す
  if (planConfigCache && (now - planConfigCacheTime) < CACHE_DURATION) {
    return planConfigCache;
  }

  try {
    const configDoc = await db.collection('planConfig').doc('default').get();
    
    if (configDoc.exists) {
      const config = configDoc.data();
      
      // キャッシュに保存
      planConfigCache = {
        free: {
          maxSites: config.free?.maxSites ?? DEFAULT_PLANS.free.maxSites,
          aiSummaryLimit: config.free?.aiSummaryLimit ?? DEFAULT_PLANS.free.aiSummaryLimit,
          aiImprovementLimit: config.free?.aiImprovementLimit ?? DEFAULT_PLANS.free.aiImprovementLimit,
        },
        standard: {
          maxSites: config.standard?.maxSites ?? DEFAULT_PLANS.standard.maxSites,
          aiSummaryLimit: config.standard?.aiSummaryLimit ?? DEFAULT_PLANS.standard.aiSummaryLimit,
          aiImprovementLimit: config.standard?.aiImprovementLimit ?? DEFAULT_PLANS.standard.aiImprovementLimit,
        },
        premium: {
          maxSites: config.premium?.maxSites ?? DEFAULT_PLANS.premium.maxSites,
          aiSummaryLimit: config.premium?.aiSummaryLimit ?? DEFAULT_PLANS.premium.aiSummaryLimit,
          aiImprovementLimit: config.premium?.aiImprovementLimit ?? DEFAULT_PLANS.premium.aiImprovementLimit,
        },
        paid: DEFAULT_PLANS.paid, // 旧システム互換
      };
      
      planConfigCacheTime = now;
      logger.info('[PlanManager] プラン設定をFirestoreから取得してキャッシュ');
      
      return planConfigCache;
    }
  } catch (error) {
    logger.error('[PlanManager] プラン設定取得エラー:', error);
  }

  // エラーまたは設定が存在しない場合はデフォルト値を使用
  logger.info('[PlanManager] デフォルトプラン設定を使用');
  planConfigCache = DEFAULT_PLANS;
  planConfigCacheTime = now;
  return DEFAULT_PLANS;
}

/**
 * 個別制限を取得
 * @param {Object} db - Firestore instance
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
async function getCustomLimits(db, userId) {
  try {
    const customLimitDoc = await db.collection('customLimits').doc(userId).get();
    
    if (!customLimitDoc.exists) {
      return null;
    }

    const data = customLimitDoc.data();
    
    // 有効性チェック
    if (!data.isActive) {
      return null;
    }

    // 有効期限チェック
    const now = new Date();
    if (data.validUntil && data.validUntil.toDate() < now) {
      return null;
    }

    return data.limits;
  } catch (error) {
    logger.error('[PlanManager] 個別制限取得エラー:', error);
    return null;
  }
}

/**
 * 有効な制限値を取得（個別制限 > プラン制限）
 * @param {string} userId 
 * @param {string} type - 'summary' or 'improvement'
 * @returns {Promise<number>} 制限値（-1 = 無制限）
 */
export async function getEffectiveLimit(userId, type = 'summary') {
  const db = getFirestore();
  
  try {
    // 1. 個別制限をチェック（最優先）
    const customLimits = await getCustomLimits(db, userId);
    if (customLimits) {
      const customLimit = type === 'summary' 
        ? customLimits.aiSummaryMonthly 
        : customLimits.aiImprovementMonthly;
      
      if (customLimit !== null && customLimit !== undefined) {
        logger.info(`[PlanManager] 個別制限適用: ${userId}, タイプ: ${type}, 制限: ${customLimit}`);
        return customLimit;
      }
    }

    // 2. プラン制限を使用（Firestoreから動的に取得）
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return 0; // デフォルトは使用不可
    }

    const plan = userData.plan || 'free';
    
    // Firestoreからプラン設定を取得
    const allPlanConfigs = await getPlanConfig(db);
    const planConfig = allPlanConfigs[plan] || allPlanConfigs.free;
    
    const limit = type === 'summary' 
      ? planConfig.aiSummaryLimit 
      : planConfig.aiImprovementLimit;
    
    logger.info(`[PlanManager] プラン制限適用: ${userId}, プラン: ${plan}, タイプ: ${type}, 制限: ${limit}`);
    
    return limit;
  } catch (error) {
    logger.error('[PlanManager] 有効制限取得エラー:', error);
    return 0;
  }
}

/**
 * ユーザーがAI生成可能かチェック
 * @param {string} userId 
 * @param {string} type - 'summary' or 'improvement'
 * @returns {Promise<boolean>}
 */
export async function checkCanGenerate(userId, type = 'summary') {
  const db = getFirestore();
  
  try {
    // 有効な制限値を取得（個別制限 > プラン制限）
    const limit = await getEffectiveLimit(userId, type);
    
    // 無制限チェック
    if (limit === -1 || limit >= 999999) {
      return true;
    }

    // 使用回数を取得
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      logger.warn(`[PlanManager] ユーザーデータが見つかりません: ${userId}`);
      return false;
    }

    const used = type === 'summary' 
      ? (userData.aiSummaryUsage || 0)
      : (userData.aiImprovementUsage || 0);
    
    const canGenerate = used < limit;
    
    logger.info(`[PlanManager] AI生成チェック: ${userId}, タイプ: ${type}, 使用: ${used}/${limit}, 可能: ${canGenerate}`);
    
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

