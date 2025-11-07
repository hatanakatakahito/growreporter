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
      aiSummaryMonthly: 10,
      aiImprovementMonthly: 2,
      dataRetention: '無制限',
      reportEvaluation: true,
      exportEnabled: false,
      support: '基本（メールのみ）',
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
      aiSummaryMonthly: 50,
      aiImprovementMonthly: 10,
      dataRetention: '無制限',
      reportEvaluation: true,
      exportEnabled: true,
      exportFormats: ['CSV', 'PDF'],
      support: '優先対応（メール）',
    },
    description: '中小企業、複数サイト運営者、Web制作会社向け',
    popular: true, // 人気プランフラグ
  },
  [PLAN_TYPES.PREMIUM]: {
    id: PLAN_TYPES.PREMIUM,
    name: 'プレミアムプラン',
    displayName: 'プレミアムプラン',
    price: 19800,
    priceWithTax: 21780,
    features: {
      maxSites: 10,
      aiSummaryMonthly: 999999, // 無制限を大きな数値で表現
      aiImprovementMonthly: 999999,
      dataRetention: '無制限',
      reportEvaluation: true,
      exportEnabled: true,
      exportFormats: ['CSV', 'PDF', 'Excel'],
      support: '最優先対応（メール + チャット）',
      consultation: '月1回の無料コンサルティング（30分）',
      customImprovements: 'カスタム改善施策の追加依頼可能',
    },
    description: '大企業、マーケティング代理店、EC事業者向け',
  },
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
