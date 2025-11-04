/**
 * プラン定義
 */
export const PLANS = {
  free: {
    id: 'free',
    name: '無料プラン',
    aiGenerationsPerMonth: 4,
    description: '週1回（月4回）のAI分析',
  },
  paid: {
    id: 'paid',
    name: '有料プラン',
    aiGenerationsPerMonth: -1, // 無制限
    description: '無制限のAI分析',
  },
};

/**
 * キャッシュ有効期限（日数）
 */
export const CACHE_DURATION_DAYS = 7;

/**
 * ページタイプ定数
 */
export const PAGE_TYPES = {
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
  CONVERSIONS: 'conversions',
  REVERSE_FLOW: 'reverseFlow',
};

