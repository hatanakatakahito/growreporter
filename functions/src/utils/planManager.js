import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { normalizeForCompare } from './normalizeForCompare.js';

/**
 * プランIDを正規化（後方互換: standard/premium/paid → business）
 * 大文字小文字・スペース有無を同一視（'Business' / ' BUSINESS ' / 'business' すべて同一）
 */
function normalizePlan(planId) {
  const id = normalizeForCompare(planId || 'free');
  if (!id) return 'free';
  if (id === 'standard' || id === 'premium' || id === 'paid') return 'business';
  if (id === 'business') return 'business';
  return 'free';
}

/**
 * プラン枠の「会計単位」となるユーザー ID を解決する。
 * - オーナー本人（accountOwnerId が自分または未設定）→ 自分の uid
 * - メンバー（editor / viewer）→ 所属アカウントオーナーの uid
 *
 * これにより、メンバーが AI 生成を実行してもオーナーの aiSummaryUsage 等が
 * インクリメントされ、プラン制限はオーナーのプランで判定される。
 *
 * @param {Object} db - Firestore instance
 * @param {string} userId
 * @returns {Promise<string>} プラン枠の会計対象 uid
 */
async function resolvePlanOwnerId(db, userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return userId;
    const userData = userDoc.data();
    const accountOwnerId = userData.accountOwnerId;
    if (accountOwnerId && accountOwnerId !== userId) {
      return accountOwnerId;
    }
    return userId;
  } catch (error) {
    logger.error('[PlanManager] resolvePlanOwnerId エラー:', error);
    return userId;
  }
}

// デフォルトのプラン設定（v5.7.0: Free / Business の2プラン）
const BUSINESS_CONFIG = {
  maxSites: 3,
  aiSummaryLimit: -1,
  aiImprovementLimit: -1,
  aiChatLimit: -1,
  excelExportLimit: -1,
  pptxExportLimit: -1,
};

const DEFAULT_PLANS = {
  free: {
    maxSites: 1,
    aiSummaryLimit: 0,
    aiImprovementLimit: 0,
    aiChatLimit: 0,
    excelExportLimit: 0,
    pptxExportLimit: 0,
  },
  business: BUSINESS_CONFIG,
  // 後方互換（standard/premium/paid → businessと同じ制限）
  standard: BUSINESS_CONFIG,
  premium: BUSINESS_CONFIG,
  paid: BUSINESS_CONFIG,
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
 * @param {string} type - 'summary', 'improvement', 'excelExport', or 'pptxExport'
 * @returns {Promise<number>} 制限値（-1 = 無制限）
 */
export async function getEffectiveLimit(userId, type = 'summary') {
  const db = getFirestore();

  try {
    // メンバー（editor/viewer）はオーナーの枠を共有する
    const planOwnerId = await resolvePlanOwnerId(db, userId);

    // 1. 個別制限をチェック（最優先）— オーナー（自分も含む）に対する設定を見る
    const customLimits = await getCustomLimits(db, planOwnerId);
    if (customLimits) {
      const customLimitMap = {
        summary: customLimits.aiSummaryMonthly,
        improvement: customLimits.aiImprovementMonthly,
        chat: customLimits.aiChatMonthly,
        excelExport: customLimits.excelExportMonthly,
        pptxExport: customLimits.pptxExportMonthly,
      };
      const customLimit = customLimitMap[type];

      if (customLimit !== null && customLimit !== undefined) {
        logger.info(`[PlanManager] 個別制限適用: planOwnerId=${planOwnerId} (caller=${userId}), タイプ: ${type}, 制限: ${customLimit}`);
        return customLimit;
      }
    }

    // 2. プラン制限を使用（コード定義のDEFAULT_PLANSから取得）— オーナーの plan を参照
    const ownerDoc = await db.collection('users').doc(planOwnerId).get();
    const ownerData = ownerDoc.data();

    if (!ownerData) {
      return 0; // デフォルトは使用不可
    }

    const plan = normalizePlan(ownerData.plan);
    const planConfig = DEFAULT_PLANS[plan] || DEFAULT_PLANS.free;

    const limitMap = {
      summary: planConfig.aiSummaryLimit,
      improvement: planConfig.aiImprovementLimit,
      chat: planConfig.aiChatLimit,
      excelExport: planConfig.excelExportLimit,
      pptxExport: planConfig.pptxExportLimit,
    };
    const limit = limitMap[type] ?? 0;

    logger.info(`[PlanManager] プラン制限適用: planOwnerId=${planOwnerId} (caller=${userId}), プラン: ${plan}, タイプ: ${type}, 制限: ${limit}`);

    return limit;
  } catch (error) {
    logger.error('[PlanManager] 有効制限取得エラー:', error);
    return 0;
  }
}

/**
 * ユーザーがAI生成可能かチェック
 * @param {string} userId 
 * @param {string} type - 'summary', 'improvement', 'excelExport', or 'pptxExport'
 * @returns {Promise<boolean>}
 */
export async function checkCanGenerate(userId, type = 'summary') {
  const db = getFirestore();

  try {
    // 有効な制限値を取得（個別制限 > プラン制限）
    // 内部で planOwnerId を解決するので getEffectiveLimit には caller の uid を渡す
    const limit = await getEffectiveLimit(userId, type);

    // 無制限チェック
    if (limit === -1 || limit >= 999999) {
      return true;
    }

    // 使用回数はオーナー側のレコードを参照（メンバーはオーナーの枠を共有）
    const planOwnerId = await resolvePlanOwnerId(db, userId);
    const ownerDoc = await db.collection('users').doc(planOwnerId).get();
    const ownerData = ownerDoc.data();

    if (!ownerData) {
      logger.warn(`[PlanManager] オーナーデータが見つかりません: ${planOwnerId} (caller=${userId})`);
      return false;
    }

    const usageMap = {
      summary: ownerData.aiSummaryUsage || 0,
      improvement: ownerData.aiImprovementUsage || 0,
      chat: ownerData.aiChatUsage || 0,
      excelExport: ownerData.excelExportUsage || 0,
      pptxExport: ownerData.pptxExportUsage || 0,
    };
    const used = usageMap[type] ?? 0;

    const canGenerate = used < limit;

    logger.info(`[PlanManager] AI生成チェック: planOwnerId=${planOwnerId} (caller=${userId}), タイプ: ${type}, 使用: ${used}/${limit}, 可能: ${canGenerate}`);

    return canGenerate;
  } catch (error) {
    logger.error('[PlanManager] AI生成チェックエラー:', error);
    return false;
  }
}

/**
 * AI生成回数をインクリメント
 * @param {string} userId 
 * @param {string} type - 'summary', 'improvement', 'excelExport', or 'pptxExport'
 */
export async function incrementGenerationCount(userId, type = 'summary') {
  const db = getFirestore();

  try {
    // メンバーが実行した場合もオーナーのカウンターをインクリメント
    const planOwnerId = await resolvePlanOwnerId(db, userId);
    const ownerRef = db.collection('users').doc(planOwnerId);

    const fieldMap = {
      summary: 'aiSummaryUsage',
      improvement: 'aiImprovementUsage',
      chat: 'aiChatUsage',
      excelExport: 'excelExportUsage',
      pptxExport: 'pptxExportUsage',
    };
    const fieldName = fieldMap[type] || 'aiSummaryUsage';
    await ownerRef.update({
      [fieldName]: FieldValue.increment(1),
    });

    logger.info(`[PlanManager] AI生成回数をインクリメント: planOwnerId=${planOwnerId} (caller=${userId}), タイプ: ${type}`);
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
        aiChatUsage: 0,
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

  } catch (error) {
    logger.error('[PlanManager] 月次制限リセットエラー:', error);
    throw error;
  }
}

