/**
 * GROW REPORTER プラン定義
 * v5.7.0: Free / Business の2プラン体系
 */

export const PLAN_TYPES = {
  FREE: 'free',
  BUSINESS: 'business',
};

export const PLANS = {
  [PLAN_TYPES.FREE]: {
    id: PLAN_TYPES.FREE,
    name: '無料プラン',
    displayName: 'Free',
    price: 0,
    priceWithTax: 0,
    features: {
      maxSites: 1,
      maxMembers: 1,
      aiSummaryMonthly: 0,
      aiImprovementMonthly: 0,
      aiChatMonthly: 0,
      dataRetention: '無制限',
      reportEvaluation: false,
      improvementTask: false,
      excelExportMonthly: 0,
      pptxExportMonthly: 0,
      support: 'なし',
    },
    description: 'サイトのアクセスデータを閲覧・通知で確認',
  },
  [PLAN_TYPES.BUSINESS]: {
    id: PLAN_TYPES.BUSINESS,
    name: 'ビジネスプラン',
    displayName: 'Business',
    price: 49800,
    priceWithTax: 54780,
    features: {
      maxSites: 3,
      maxMembers: 3,
      aiSummaryMonthly: 999999,
      aiImprovementMonthly: 999999,
      aiChatMonthly: 999999,
      dataRetention: '無制限',
      reportEvaluation: true,
      improvementTask: true,
      excelExportMonthly: 999999,
      pptxExportMonthly: 999999,
      support: 'メール・Web会議',
    },
    description: 'AIの力でサイト改善を本格的に推進',
  },
};

/**
 * 後方互換: 旧プランID（standard/premium）をbusinessに正規化
 */
export const normalizePlanId = (planId) => {
  const id = (planId || 'free').toLowerCase();
  if (id === 'standard' || id === 'premium') return 'business';
  if (id === 'business') return 'business';
  return 'free';
};

/**
 * プランバッジ用の Tailwind クラス
 */
export const getPlanBadgeColor = (planType) => {
  const normalized = normalizePlanId(planType);
  switch (normalized) {
    case 'business':
      return 'bg-gradient-to-r from-red-400 to-pink-600 text-white shadow-md';
    case 'free':
    default:
      return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-md';
  }
};

/**
 * プラン名の表示名を取得
 */
export const getPlanDisplayName = (planType) => {
  const normalized = normalizePlanId(planType);
  const plan = PLANS[normalized];
  return plan ? plan.displayName : 'Free';
};

/**
 * プラン情報を取得
 */
export const getPlanInfo = (planType) => {
  const normalized = normalizePlanId(planType);
  return PLANS[normalized] || PLANS[PLAN_TYPES.FREE];
};

/**
 * AI生成回数が無制限かチェック
 */
export const isUnlimited = (limit) => {
  return limit >= 999999;
};

/**
 * 再分析（forceRegenerate）が可能なプランかチェック
 * 無料プランでは再分析不可
 */
export const canRegenerate = (planId) => {
  return normalizePlanId(planId) !== PLAN_TYPES.FREE;
};

/**
 * プラン一覧を配列で取得
 */
export const getPlanList = () => {
  return [
    PLANS[PLAN_TYPES.FREE],
    PLANS[PLAN_TYPES.BUSINESS],
  ];
};

/**
 * Freeプランかどうかをチェック
 */
export const isFreeplan = (planId) => {
  return normalizePlanId(planId) === PLAN_TYPES.FREE;
};

/**
 * ページタイプ定数
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
