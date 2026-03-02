import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * ユーザー活動ログをFirestoreに記録する
 * 
 * @param {Object} params - ログパラメータ
 * @param {string} params.userId - ユーザーUID
 * @param {string} params.userEmail - ユーザーメールアドレス
 * @param {string} params.userName - ユーザー名（姓 名）
 * @param {string} params.action - アクション種別 (user_registered, user_login, site_created, site_deleted)
 * @param {Object} params.details - 詳細情報（任意）
 * @param {string} params.ipAddress - IPアドレス（任意）
 */
export async function logUserActivity({
  userId,
  userEmail,
  userName = null,
  action,
  details = {},
  ipAddress = null,
}) {
  try {
    const db = getFirestore();
    
    const activityLog = {
      userId,
      userEmail,
      userName,
      action,
      details,
      ipAddress,
      createdAt: Timestamp.now(),
    };

    await db.collection('activityLogs').add(activityLog);

    logger.info('ユーザー活動ログ記録', {
      userId,
      action,
      userEmail,
    });
  } catch (error) {
    logger.error('ユーザー活動ログ記録エラー', {
      error: error.message,
      userId,
      action,
    });
    // エラーが発生してもメインの処理は継続
  }
}

/**
 * アクティビティログの種別定義
 */
export const ACTIVITY_ACTIONS = {
  // ユーザー管理
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  
  // サイト管理
  SITE_CREATED: 'site_created',
  SITE_DELETED: 'site_deleted',

  // 管理者操作
  ADMIN_USER_CREATED: 'admin_user_created',
  ADMIN_SITE_CREATED: 'admin_site_created',
  ADMIN_SITE_DELETED: 'admin_site_deleted',
};
