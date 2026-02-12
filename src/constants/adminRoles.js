/**
 * 管理者ロール定義
 */

export const ADMIN_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const ADMIN_ROLE_LABELS = {
  admin: '管理者',
  editor: '編集者',
  viewer: '閲覧者',
};

export const ADMIN_ROLE_DESCRIPTIONS = {
  admin: 'すべての操作が可能（ユーザー管理、サイト管理、設定変更）',
  editor: '閲覧・編集が可能（管理者の追加/削除は不可）',
  viewer: '閲覧のみ可能（変更操作は一切不可）',
};

/**
 * 管理者ロールの表示名を取得
 */
export function getAdminRoleLabel(role) {
  return ADMIN_ROLE_LABELS[role] || '不明';
}

/**
 * 管理者ロールの説明を取得
 */
export function getAdminRoleDescription(role) {
  return ADMIN_ROLE_DESCRIPTIONS[role] || '';
}

/**
 * 操作権限チェック
 */
export const PERMISSIONS = {
  // ユーザー管理
  VIEW_USERS: ['admin', 'editor', 'viewer'],
  EDIT_USER_PLAN: ['admin', 'editor'],
  SET_CUSTOM_LIMITS: ['admin', 'editor'],
  
  // サイト管理
  VIEW_SITES: ['admin', 'editor', 'viewer'],
  EDIT_SITES: ['admin', 'editor'],
  DELETE_SITES: ['admin'],
  
  // 管理者管理
  VIEW_ADMINS: ['admin', 'editor', 'viewer'],
  ADD_ADMIN: ['admin'],
  EDIT_ADMIN_ROLE: ['admin'],
  DELETE_ADMIN: ['admin'],
  
  // ログ・統計
  VIEW_LOGS: ['admin', 'editor', 'viewer'],
  VIEW_STATS: ['admin', 'editor', 'viewer'],
  
  // 設定
  EDIT_PLAN_CONFIG: ['admin'],
  VIEW_PLAN_CONFIG: ['admin', 'editor', 'viewer'],
};

/**
 * 権限があるかチェック
 * @param {string} userRole - ユーザーのロール
 * @param {string} permission - 権限名（PERMISSIONS のキー）
 * @returns {boolean}
 */
export function hasPermission(userRole, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(userRole);
}

