/**
 * 通知（週次・月次レポート / アラート）対象の判定ヘルパー
 *
 * viewer ロールのユーザーは users.allowedSiteIds に含まれるサイトに対する通知のみ受信する。
 * owner / editor は従来通り全サイトの通知を受信する。
 */

/**
 * 指定ユーザーがそのサイトの通知を受け取れるかを判定
 *
 * @param {Object} userData - users ドキュメントのデータ
 * @param {string} siteId - 通知対象のサイトID
 * @returns {boolean}
 */
export function canUserReceiveSiteNotification(userData, siteId) {
  if (!userData) return false;
  const role = userData.memberRole || 'owner';
  if (role !== 'viewer') return true;
  const allowed = Array.isArray(userData.allowedSiteIds) ? userData.allowedSiteIds : [];
  return allowed.includes(siteId);
}
