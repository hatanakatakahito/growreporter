import { normalizeForCompare } from './normalizeForCompare.js';

/**
 * 単価定数（税別 / 月）
 * boardEstimateCreator.js の UNIT_PRICE_BUSINESS / UNIT_PRICE_EXTRA_SITE と一致させる必要あり。
 */
export const PRICE_BUSINESS = 49800;
export const PRICE_EXTRA_SITE = 15000;

/**
 * 社内ユーザーのメールドメイン (売上・契約数集計から除外)
 */
const INTERNAL_EMAIL_DOMAINS = ['grow-group.jp'];

/**
 * メールが社内ドメインかどうか判定
 *
 * 例:
 *   isInternalEmail('foo@grow-group.jp')          → true
 *   isInternalEmail('foo@dev.grow-group.jp')      → true (サブドメインも社内扱い)
 *   isInternalEmail('foo@grow-group.jp.evil.com') → false (末尾一致でないので OK)
 *   isInternalEmail('foo@grow-groups.jp')         → false (ハイフン位置違いの別ドメイン)
 */
export function isInternalEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const host = email.slice(at + 1).toLowerCase();
  return INTERNAL_EMAIL_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
}

/**
 * 旧プランID (standard / premium / paid) と Business を business に正規化
 * 大文字小文字・スペース有無を同一視。
 */
function normalizePlanId(planId) {
  const id = normalizeForCompare(planId || 'free');
  if (!id) return 'free';
  if (id === 'standard' || id === 'premium' || id === 'paid' || id === 'business') return 'business';
  return 'free';
}

/**
 * 現在の契約スナップショットから MRR / ARR / 契約数 / 追加サイト数を計算
 *
 * users コレクションを source of truth とする (inquiry の active 化で users.plan に転記される設計)。
 * メンバー (memberRole !== 'owner') は除外して二重カウントを防止。
 * extraSitesValidUntil 期限切れの extras はカウントしない。
 *
 * @param {Array} usersDocs - Firestore QueryDocumentSnapshot 配列 or { plan, memberRole, extraSitesCount, extraSitesValidUntil } オブジェクト配列
 * @param {Date} [now] - 計算基準日時 (デフォルト: 現在時刻)
 * @returns {{ mrr: number, arr: number, activeBusinessContracts: number, totalExtras: number, arpu: number }}
 */
export function calculateCurrentRevenueSnapshot(usersDocs, now = new Date()) {
  let activeBusinessContracts = 0;
  let totalExtras = 0;

  for (const doc of usersDocs || []) {
    const u = (doc && typeof doc.data === 'function') ? doc.data() : doc;
    if (!u) continue;

    if (u.memberRole !== 'owner') continue;
    if (normalizePlanId(u.plan) !== 'business') continue;
    // 社内ユーザー (grow-group.jp) は売上・契約数から除外
    if (isInternalEmail(u.email)) continue;

    activeBusinessContracts++;

    const validUntil = u.extraSitesValidUntil?.toDate?.() ?? null;
    const isExpired = validUntil instanceof Date && !Number.isNaN(validUntil.getTime()) && validUntil < now;
    if (!isExpired) {
      const extras = Number(u.extraSitesCount) || 0;
      if (extras > 0) totalExtras += extras;
    }
  }

  const mrr = activeBusinessContracts * PRICE_BUSINESS + totalExtras * PRICE_EXTRA_SITE;
  const arr = mrr * 12;
  const arpu = activeBusinessContracts > 0 ? Math.round(mrr / activeBusinessContracts) : 0;

  return { mrr, arr, activeBusinessContracts, totalExtras, arpu };
}

/**
 * 月次の新規契約数 / 解約数 / 純増を集計（過去 monthCount ヶ月）
 *
 * upgradeInquiries.statusUpdatedAt + status の組み合わせで台帳化。
 * - status='active' で new_business → newContracts
 * - status='cancelled' で new_business → churnedContracts
 * - addon_only / merged は除外
 *
 * @param {Array} inquiriesDocs - Firestore QueryDocumentSnapshot 配列 or オブジェクト配列
 * @param {number} [monthCount=12]
 * @param {Date} [now]
 * @returns {Array<{ month: string, newContracts: number, churnedContracts: number, netNew: number }>}
 */
export function calculateMonthlyContractTrend(inquiriesDocs, monthCount = 12, now = new Date()) {
  const buckets = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    let newCount = 0;
    let churnedCount = 0;

    for (const d of inquiriesDocs || []) {
      const data = (d && typeof d.data === 'function') ? d.data() : d;
      if (!data) continue;
      if (data.status === 'merged') continue;

      const inquiryType = data.inquiryType || 'new_business';
      if (inquiryType !== 'new_business') continue;
      // 社内ユーザー (grow-group.jp) の inquiry はトレンドから除外
      if (isInternalEmail(data.email)) continue;

      const updatedAt = data.statusUpdatedAt?.toDate?.() ?? null;
      if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) continue;
      if (updatedAt < start || updatedAt >= end) continue;

      if (data.status === 'active') newCount++;
      else if (data.status === 'cancelled') churnedCount++;
    }

    buckets.push({
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      newContracts: newCount,
      churnedContracts: churnedCount,
      netNew: newCount - churnedCount,
    });
  }
  return buckets;
}
