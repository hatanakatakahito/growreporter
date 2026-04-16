/**
 * ツアーガイド定数
 * トグル式オンボーディング: seenTours で既読管理、tourGuideEnabled で ON/OFF
 */

export const TOUR_TARGET_VERSION = 1;

/**
 * デフォルトの onboarding フィールド値（seenTours のみ管理）
 */
export function getDefaultOnboarding() {
  return {
    version: 1,
    tourVersion: TOUR_TARGET_VERSION,
    seenTours: {
      dashboard: false,
      analysisMonth: false,
      analysisDay: false,
      analysisWeek: false,
      analysisHour: false,
      analysisChannels: false,
      analysisKeywords: false,
      analysisReferrals: false,
      analysisPages: false,
      analysisContent: false,
      analysisPageCategories: false,
      analysisLandingPages: false,
      analysisPageFlow: false,
      analysisConversions: false,
      analysisReverseFlow: false,
      analysisExternalLinks: false,
      analysisFileDownloads: false,
      analysisUsers: false,
      analysisSummaryFree: false,
      analysisExport: false,
      analysisSummary: false,
      comprehensiveAI: false,
      aiChat: false,
      improve: false,
      reports: false,
      members: false,
      accountSettings: false,
      sites: false,
    },
  };
}
