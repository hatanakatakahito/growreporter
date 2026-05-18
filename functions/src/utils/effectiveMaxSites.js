import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * プランIDをプラン基準サイト数に変換（DEFAULT_PLANS 相当の最低限版）
 * planManager.js とは独立に持つ（依存逆転を避けるため）
 */
const BASE_MAX_SITES_BY_PLAN = {
  free: 1,
  business: 3,
  standard: 3,
  premium: 3,
  paid: 3,
};

/**
 * 有効サイト登録数（effectiveMaxSites）算出ヘルパー（サーバー版）
 *
 * @param {Object} userData
 * @param {Date} [now]
 * @returns {number}
 */
export function getEffectiveMaxSitesFromUserData(userData, now = new Date()) {
  if (!userData) return 1;

  const planId = String(userData.plan || 'free').toLowerCase().trim();
  const base = BASE_MAX_SITES_BY_PLAN[planId] ?? BASE_MAX_SITES_BY_PLAN.free;

  const extra = Number(userData.extraSitesCount) || 0;
  if (extra <= 0) return base;

  const validUntilRaw = userData.extraSitesValidUntil;
  let validUntil = null;
  if (validUntilRaw) {
    if (typeof validUntilRaw.toDate === 'function') {
      validUntil = validUntilRaw.toDate();
    } else if (validUntilRaw instanceof Date) {
      validUntil = validUntilRaw;
    } else {
      validUntil = new Date(validUntilRaw);
    }
  }

  const isExpired = validUntil instanceof Date && !Number.isNaN(validUntil.getTime()) && validUntil < now;
  return base + (isExpired ? 0 : extra);
}

/**
 * userId から effectiveMaxSites を取得（オーナー解決済み）
 * メンバー（editor/viewer）の場合はオーナー側を参照する
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getEffectiveMaxSites(userId) {
  const db = getFirestore();
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return 1;
    const userData = userDoc.data();

    // メンバー判定: accountOwnerId が自分以外ならオーナー側を見る
    const accountOwnerId = userData.accountOwnerId;
    if (accountOwnerId && accountOwnerId !== userId) {
      const ownerDoc = await db.collection('users').doc(accountOwnerId).get();
      if (ownerDoc.exists) {
        return getEffectiveMaxSitesFromUserData(ownerDoc.data());
      }
    }

    return getEffectiveMaxSitesFromUserData(userData);
  } catch (error) {
    logger.error('[effectiveMaxSites] 取得エラー:', { userId, error: error.message });
    return 1;
  }
}

/**
 * 残契約月数（部分月は切上、最低 1）
 *
 * 例:
 *  - now=2026-04-30, end=2027-04-30 → 12 (同日 = ちょうど12ヶ月)
 *  - now=2026-04-15, end=2027-04-30 → 13 (12ヶ月 + 15日 → 切上)
 *
 * @param {string|Date} contractEndDate
 * @param {Date} [now]
 * @returns {number}
 */
export function monthsUntilContractEnd(contractEndDate, now = new Date()) {
  if (!contractEndDate) return 1;
  const end = contractEndDate instanceof Date ? contractEndDate : new Date(contractEndDate);
  if (Number.isNaN(end.getTime())) return 1;

  let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  // 同日付はちょうど N ヶ月。終端日付が大きい場合のみ部分月として +1
  if (end.getDate() > now.getDate()) months += 1;
  return Math.max(1, months);
}
