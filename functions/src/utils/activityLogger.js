import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * アクティビティログをFirestoreに記録する
 * 
 * @param {Object} params - ログパラメータ
 * @param {string} params.adminUid - 管理者UID
 * @param {string} params.adminEmail - 管理者メールアドレス
 * @param {string} params.action - アクション種別 (user_plan_change, user_view, user_search, etc.)
 * @param {string} params.targetType - ターゲット種別 (user, site, system)
 * @param {string} params.targetId - ターゲットID
 * @param {string} params.targetEmail - ターゲットのメールアドレス（任意）
 * @param {Object} params.details - 詳細情報（任意）
 * @param {string} params.ipAddress - IPアドレス（任意）
 */
export async function logActivity({
  adminUid,
  adminEmail,
  action,
  targetType,
  targetId,
  targetEmail = null,
  details = {},
  ipAddress = null,
}) {
  try {
    const db = getFirestore();
    
    const activityLog = {
      adminUid,
      adminEmail,
      action,
      targetType,
      targetId,
      targetEmail,
      details,
      ipAddress,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    await db.collection('adminActivityLogs').add(activityLog);

    logger.info('アクティビティログ記録', {
      adminUid,
      action,
      targetType,
      targetId,
    });
  } catch (error) {
    logger.error('アクティビティログ記録エラー', {
      error: error.message,
      adminUid,
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
  USER_VIEW: 'user_view',
  USER_SEARCH: 'user_search',
  USER_PLAN_CHANGE: 'user_plan_change',
  USER_EXPORT: 'user_export',
  
  // サイト管理
  SITE_VIEW: 'site_view',
  SITE_EDIT: 'site_edit',
  SITE_DELETE: 'site_delete',
  
  // システム
  DASHBOARD_VIEW: 'dashboard_view',
  SETTINGS_CHANGE: 'settings_change',
  
  // ログ
  LOGS_VIEW: 'logs_view',
  LOGS_EXPORT: 'logs_export',
};

/**
 * ターゲット種別定義
 */
export const TARGET_TYPES = {
  USER: 'user',
  SITE: 'site',
  SYSTEM: 'system',
  LOG: 'log',
};

