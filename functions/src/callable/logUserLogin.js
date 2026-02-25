import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../utils/userActivityLogger.js';

/**
 * ユーザーログインログを記録
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.displayName - 表示名（任意）
 * @returns {Object} 記録結果
 */
export const logUserLoginCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    displayName = '',
  } = request.data || {};

  try {
    const userEmail = request.auth.token.email || '';
    
    await logUserActivity({
      userId: uid,
      userEmail,
      userName: displayName,
      action: ACTIVITY_ACTIONS.USER_LOGIN,
      details: {},
    });

    logger.info('ユーザーログインログ記録完了', { 
      userId: uid,
      userEmail,
    });

    return {
      success: true,
    };

  } catch (error) {
    logger.error('ユーザーログインログ記録エラー', { 
      error: error.message,
      userId: uid,
    });

    // ログ記録エラーでもメインの処理は成功とする
    return {
      success: true,
    };
  }
};
