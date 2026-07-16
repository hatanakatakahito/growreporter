/**
 * 有効サイト登録数（effectiveMaxSites）算出ヘルパー
 *
 * effectiveMaxSites = プラン基準値 + 追加オプション（期限内のみ）
 *
 * @param {Object} userData - users/{uid} のデータ（extraSitesCount, extraSitesValidUntil 含む）
 * @param {Object} planConfig - PLANS[planId]（features.maxSites を持つ）
 * @param {Date} [now] - 比較基準日時
 * @returns {number}
 */
export function getEffectiveMaxSites(userData, planConfig, now = new Date()) {
  const base = planConfig?.features?.maxSites ?? 1;
  if (!userData) return base;

  const extra = Number(userData.extraSitesCount) || 0;
  if (extra <= 0) return base;

  const validUntilRaw = userData.extraSitesValidUntil;
  let validUntil = null;
  if (validUntilRaw) {
    if (typeof validUntilRaw.toDate === 'function') {
      validUntil = validUntilRaw.toDate();
    } else if (validUntilRaw instanceof Date) {
      validUntil = validUntilRaw;
    } else if (typeof validUntilRaw === 'string' || typeof validUntilRaw === 'number') {
      validUntil = new Date(validUntilRaw);
    }
  }

  // 有効期限が切れていれば extra は無効
  const isExpired = validUntil instanceof Date && !Number.isNaN(validUntil.getTime()) && validUntil < now;
  return base + (isExpired ? 0 : extra);
}

/**
 * 残契約月数を算出（部分月は切上、最低 1 を返す）
 * 追加オプション申込時の課金月数として使用
 *
 * 例:
 *  - now=2026-04-30, end=2027-04-30 → 12 (同日 = ちょうど12ヶ月)
 *  - now=2026-04-15, end=2027-04-30 → 13 (12ヶ月 + 15日 → 切上)
 *  - now=2026-04-30, end=2027-04-29 → 12 (11ヶ月29日 → 切上)
 *
 * @param {string|Date} contractEndDate - 契約終了日
 * @param {Date} [now] - 比較基準日時
 * @returns {number}
 */
export function monthsUntilContractEnd(contractEndDate, now = new Date()) {
  if (!contractEndDate) return 1;
  const end = contractEndDate instanceof Date ? contractEndDate : new Date(contractEndDate);
  if (Number.isNaN(end.getTime())) return 1;

  let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  // 同日付（end.getDate === now.getDate）はちょうど N ヶ月なので +1 しない。
  // 終端日付の方が大きい場合のみ部分月分として +1（切上）。
  if (end.getDate() > now.getDate()) months += 1;
  return Math.max(1, months);
}

export default getEffectiveMaxSites;
