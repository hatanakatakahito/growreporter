import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

// デフォルトのプラン設定（フォールバック用）
const DEFAULT_PLANS = {
  free: {
    maxSites: 1,
    aiSummaryLimit: -1, // 無制限（再分析はgenerateAISummary.js内で制限）
    aiImprovementLimit: 2,
    diagnosisLimit: 1,
    excelExportLimit: 1,
    pptxExportLimit: 1,
    heatmapPvLimit: 0, // ヒートマップ無効
  },
  standard: {
    maxSites: 3,
    aiSummaryLimit: 50,
    aiImprovementLimit: 10,
    diagnosisLimit: 5,
    excelExportLimit: -1,
    pptxExportLimit: -1,
    heatmapPvLimit: 10000, // サイト単位 10,000 PV/月
  },
  premium: {
    maxSites: 10,
    aiSummaryLimit: -1, // 無制限
    aiImprovementLimit: -1, // 無制限
    diagnosisLimit: -1, // 無制限
    excelExportLimit: -1,
    pptxExportLimit: -1,
    heatmapPvLimit: 10000, // サイト単位 10,000 PV/月
  },
  // 旧システム互換
  paid: {
    maxSites: 999999,
    aiSummaryLimit: -1,
    aiImprovementLimit: -1,
    diagnosisLimit: -1,
    excelExportLimit: -1,
    pptxExportLimit: -1,
    heatmapPvLimit: -1, // 無制限
  },
};

/**
 * 個別制限を取得
 * @param {Object} db - Firestore instance
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
async function getCustomLimits(db, userId) {
  try {
    const customLimitDoc = await db.collection('users').doc(userId).collection('customLimits').doc(userId).get();
    
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
 * @param {string} type - 'summary', 'improvement', 'diagnosis', 'excelExport', or 'pptxExport'
 * @returns {Promise<number>} 制限値（-1 = 無制限）
 */
export async function getEffectiveLimit(userId, type = 'summary') {
  const db = getFirestore();

  try {
    // 1. 個別制限をチェック（最優先）
    const customLimits = await getCustomLimits(db, userId);
    if (customLimits) {
      const customLimitMap = {
        summary: customLimits.aiSummaryMonthly,
        improvement: customLimits.aiImprovementMonthly,
        diagnosis: customLimits.diagnosisMonthly,
        excelExport: customLimits.excelExportMonthly,
        pptxExport: customLimits.pptxExportMonthly,
      };
      const customLimit = customLimitMap[type];

      if (customLimit !== null && customLimit !== undefined) {
        logger.info(`[PlanManager] 個別制限適用: ${userId}, タイプ: ${type}, 制限: ${customLimit}`);
        return customLimit;
      }
    }

    // 2. プラン制限を使用（コード定義のDEFAULT_PLANSから取得）
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return 0; // デフォルトは使用不可
    }

    const plan = userData.plan || 'free';
    const planConfig = DEFAULT_PLANS[plan] || DEFAULT_PLANS.free;

    const limitMap = {
      summary: planConfig.aiSummaryLimit,
      improvement: planConfig.aiImprovementLimit,
      diagnosis: planConfig.diagnosisLimit,
      excelExport: planConfig.excelExportLimit,
      pptxExport: planConfig.pptxExportLimit,
    };
    const limit = limitMap[type] ?? planConfig.diagnosisLimit;
    
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
 * @param {string} type - 'summary', 'improvement', or 'diagnosis'
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

    const usageMap = {
      summary: userData.aiSummaryUsage || 0,
      improvement: userData.aiImprovementUsage || 0,
      diagnosis: userData.diagnosisUsage || 0,
      excelExport: userData.excelExportUsage || 0,
      pptxExport: userData.pptxExportUsage || 0,
    };
    const used = usageMap[type] ?? 0;
    
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
 * @param {string} type - 'summary', 'improvement', or 'diagnosis'
 */
export async function incrementGenerationCount(userId, type = 'summary') {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);

  try {
    const fieldMap = {
      summary: 'aiSummaryUsage',
      improvement: 'aiImprovementUsage',
      diagnosis: 'diagnosisUsage',
      excelExport: 'excelExportUsage',
      pptxExport: 'pptxExportUsage',
    };
    const fieldName = fieldMap[type] || 'diagnosisUsage';
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
        diagnosisUsage: 0,
        excelExportUsage: 0,
        pptxExportUsage: 0,
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

    // サイト単位のヒートマップPV使用量もリセット
    const sitesSnapshot = await db.collection('sites').get();
    let siteBatch = db.batch();
    let siteCount = 0;
    let siteBatchCount = 0;

    for (const doc of sitesSnapshot.docs) {
      const data = doc.data();
      // heatmapPvUsage フィールドがあるサイトのみリセット
      if (data.heatmapPvUsage && data.heatmapPvUsage > 0) {
        siteBatch.update(doc.ref, {
          heatmapPvUsage: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
        siteCount++;
        siteBatchCount++;

        if (siteBatchCount >= 500) {
          await siteBatch.commit();
          siteBatch = db.batch();
          siteBatchCount = 0;
        }
      }
    }

    if (siteBatchCount > 0) {
      await siteBatch.commit();
    }

    logger.info(`[PlanManager] ${siteCount}件のサイトのヒートマップPV使用量をリセット完了`);
  } catch (error) {
    logger.error('[PlanManager] 月次制限リセットエラー:', error);
    throw error;
  }
}

