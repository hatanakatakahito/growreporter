import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

// デフォルトのプラン設定
const DEFAULT_PLAN_CONFIG = {
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
};

/**
 * プラン設定を取得
 * 
 * @returns {Object} プラン設定
 */
export const getPlanConfigCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  try {
    const db = getFirestore();
    
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    const adminRole = adminDoc.data()?.role;
    if (!['admin', 'editor', 'viewer'].includes(adminRole)) {
      throw new HttpsError('permission-denied', '管理者権限がありません');
    }

    // プラン設定を取得
    const configDoc = await db.collection('planConfig').doc('default').get();

    let config;
    if (configDoc.exists) {
      config = configDoc.data();
    } else {
      // 設定が存在しない場合はデフォルト値を返す
      config = DEFAULT_PLAN_CONFIG;
    }

    logger.info('プラン設定取得完了', { 
      requesterId: uid,
    });

    return {
      success: true,
      config,
    };

  } catch (error) {
    logger.error('プラン設定取得エラー', { 
      error: error.message,
      requesterId: uid,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'プラン設定の取得に失敗しました');
  }
};

