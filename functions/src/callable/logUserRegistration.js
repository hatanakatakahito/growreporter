import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../utils/userActivityLogger.js';

/**
 * ユーザー登録ログを記録
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.displayName - 表示名
 * @param {string} data.plan - プラン
 * @returns {Object} 記録結果
 */
export const logUserRegistrationCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    displayName = '',
    plan = 'free',
  } = request.data || {};

  try {
    const userEmail = request.auth.token.email || '';
    
    await logUserActivity({
      userId: uid,
      userEmail,
      userName: displayName,
      action: ACTIVITY_ACTIONS.USER_REGISTERED,
      details: {
        plan,
        displayName,
      },
    });

    logger.info('ユーザー登録ログ記録完了', { 
      userId: uid,
      userEmail,
    });

    return {
      success: true,
    };

  } catch (error) {
    logger.error('ユーザー登録ログ記録エラー', { 
      error: error.message,
      userId: uid,
    });

    // ログ記録エラーでもメインの処理は成功とする
    return {
      success: true,
    };
  }
};
