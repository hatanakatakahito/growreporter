import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../utils/userActivityLogger.js';

/**
 * サイト削除ログを記録
 * 
 * @param {Object} data - リクエストパラメータ
 * @param {string} data.siteId - サイトID
 * @param {string} data.siteName - サイト名
 * @param {string} data.siteUrl - サイトURL
 * @param {string} data.displayName - ユーザー表示名
 * @returns {Object} 記録結果
 */
export const logSiteDeletedCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const {
    siteId,
    siteName,
    siteUrl,
    displayName = '',
  } = request.data || {};

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'サイトIDが必要です');
  }

  try {
    const userEmail = request.auth.token.email || '';
    
    await logUserActivity({
      userId: uid,
      userEmail,
      userName: displayName,
      action: ACTIVITY_ACTIONS.SITE_DELETED,
      details: {
        siteId,
        siteName,
        siteUrl,
      },
    });

    logger.info('サイト削除ログ記録完了', { 
      userId: uid,
      siteId,
    });

    return {
      success: true,
    };

  } catch (error) {
    logger.error('サイト削除ログ記録エラー', { 
      error: error.message,
      userId: uid,
      siteId,
    });

    // ログ記録エラーでもメインの処理は成功とする
    return {
      success: true,
    };
  }
};
