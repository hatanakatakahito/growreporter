/**
 * GROW REPORTER プラン定義
 */

export const PLAN_TYPES = {
  FREE: 'free',
  STANDARD: 'standard',
  PREMIUM: 'premium',
};

export const PLANS = {
  [PLAN_TYPES.FREE]: {
    id: PLAN_TYPES.FREE,
    name: '無料プラン',
    displayName: '無料プラン',
    price: 0,
    priceWithTax: 0,
    features: {
      maxSites: 1,
      maxMembers: 1,
      aiSummaryMonthly: 999999, // 無制限（再分析はcanRegenerateで制限）
      aiImprovementMonthly: 1,
      dataRetention: '無制限',
      reportEvaluation: true,
      excelExportMonthly: 1,
      pptxExportMonthly: 1,
      support: 'なし',
    },
    description: '個人ブロガー、スタートアップ、試用ユーザー向け',
  },
  [PLAN_TYPES.STANDARD]: {
    id: PLAN_TYPES.STANDARD,
    name: 'スタンダードプラン',
    displayName: 'スタンダードプラン',
    price: 9800,
    priceWithTax: 10780,
    features: {
      maxSites: 3,
      maxMembers: 3,
      aiSummaryMonthly: 4, // 再分析4回/月（週1回相当）
      aiImprovementMonthly: 4, // AI改善4回/月（週1回相当）
      dataRetention: '無制限',
      reportEvaluation: true,
      excelExportMonthly: 999999,
      pptxExportMonthly: 999999,
      support: 'メール',
    },
    description: '中小企業、複数サイト運営者、Web制作会社向け',
    popular: true, // 人気プランフラグ
  },
  [PLAN_TYPES.PREMIUM]: {
    id: PLAN_TYPES.PREMIUM,
    name: 'プレミアムプラン',
    displayName: 'プレミアムプラン',
    price: 29800,
    priceWithTax: 32780,
    features: {
      maxSites: 10,
      maxMembers: 5,
      aiSummaryMonthly: 999999, // 無制限を大きな数値で表現
      aiImprovementMonthly: 999999,
      dataRetention: '無制限',
      reportEvaluation: true,
      excelExportMonthly: 999999,
      pptxExportMonthly: 999999,
      support: '最優先（メール・Web会議）',
    },
    description: '大企業、マーケティング代理店、EC事業者向け',
  },
};

/**
 * プランバッジ用の Tailwind クラス（管理画面と統一）
 * @param {string} planType - プランタイプ (free, standard, premium)
 * @returns {string} バッジ用 className
 */
export const getPlanBadgeColor = (planType) => {
  const normalized = (planType || '').toLowerCase();
  switch (normalized) {
    case 'free':
      return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-md';
    case 'standard':
      return 'bg-gradient-to-r from-red-400 to-pink-600 text-white shadow-md';
    case 'premium':
      return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md';
    default:
      return 'bg-gray-200 text-gray-700';
  }
};

/**
 * プラン名の表示名を取得
 * @param {string} planType - プランタイプ (free, standard, premium)
 * @returns {string} プランの表示名
 */
export const getPlanDisplayName = (planType) => {
  const normalizedPlanType = (planType || PLAN_TYPES.FREE).toLowerCase();
  const plan = PLANS[normalizedPlanType];
  return plan ? plan.displayName : '無料プラン';
};

/**
 * プラン情報を取得
 * @param {string} planType - プランタイプ
 * @returns {object} プラン情報
 */
export const getPlanInfo = (planType) => {
  const normalizedPlanType = (planType || PLAN_TYPES.FREE).toLowerCase();
  return PLANS[normalizedPlanType] || PLANS[PLAN_TYPES.FREE];
};

/**
 * AI生成回数が無制限かチェック
 * @param {number} limit - 制限値
 * @returns {boolean} 無制限かどうか
 */
export const isUnlimited = (limit) => {
  return limit >= 999999;
};

/**
 * 再分析（forceRegenerate）が可能なプランかチェック
 * 無料プランでは再分析不可
 * @param {string} planId - プランID ('free', 'standard', 'premium')
 * @returns {boolean} 再分析可能かどうか
 */
export const canRegenerate = (planId) => {
  return planId !== PLAN_TYPES.FREE;
};

/**
 * プラン一覧を配列で取得
 * @returns {Array} プラン情報の配列
 */
export const getPlanList = () => {
  return [
    PLANS[PLAN_TYPES.FREE],
    PLANS[PLAN_TYPES.STANDARD],
    PLANS[PLAN_TYPES.PREMIUM],
  ];
};

/**
 * ページタイプ定数
 * AIフローティングボタンで使用
 */
export const PAGE_TYPES = {
  DASHBOARD: 'dashboard',
  SUMMARY: 'summary',
  USERS: 'users',
  DAY: 'day',
  WEEK: 'week',
  HOUR: 'hour',
  CHANNELS: 'channels',
  KEYWORDS: 'keywords',
  REFERRALS: 'referrals',
  PAGES: 'pages',
  PAGE_CATEGORIES: 'pageCategories',
  LANDING_PAGES: 'landingPages',
  FILE_DOWNLOADS: 'fileDownloads',
  EXTERNAL_LINKS: 'externalLinks',
  PAGE_FLOW: 'pageFlow',
  CONVERSIONS: 'conversions',
  REVERSE_FLOW: 'reverseFlow',
  MONTHLY: 'analysis/month',
  COMPREHENSIVE_ANALYSIS: 'comprehensive_analysis',
};

