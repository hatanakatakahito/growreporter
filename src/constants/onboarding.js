/**
 * 操作方法のガイド（オンボーディング）定数・ヘルパー
 */

export const TOUR_TARGET_VERSION = 1;

// チェックリスト項目カテゴリ
export const CATEGORIES = {
  setup: { label: '初期設定', order: 1 },
  basics: { label: '基本の使い方', order: 2 },
  use: { label: 'AIで改善サイクルを回す', order: 3 },
};

// 各チェックリスト項目の定義
// videoUrl / helpUrl は将来コンテンツができたら埋める（現状 null 非表示）
export const STEP_DEFINITIONS = {
  siteRegistered: {
    title: 'サイトを登録する',
    subtitle: '分析対象のサイトを登録',
    to: null,
    category: 'setup',
    estimatedTime: '完了',
    sidebarNavId: 'nav-sites',
    planRequired: 'free',
    videoUrl: null,
    helpUrl: null,
  },
  analysisViewed: {
    title: '詳細分析画面を見る',
    subtitle: '月別・日別・週別・ページ別など15種類以上の分析',
    to: '/analysis/month',
    category: 'basics',
    estimatedTime: '約1分',
    sidebarNavId: 'nav-analysis',
    planRequired: 'free',
    videoUrl: null,
    helpUrl: null,
  },
  notificationsConfigured: {
    title: '通知を設定する',
    subtitle: '週次レポート・月次レポート・アラート通知',
    to: '/account/settings?tab=email',
    category: 'setup',
    estimatedTime: '約30秒',
    sidebarNavId: 'nav-account-settings',
    planRequired: 'free',
    videoUrl: null,
    helpUrl: null,
  },
  siteEdited: {
    title: 'サイト設定を編集する',
    subtitle: 'KPI目標やコンバージョンの調整',
    to: '/sites/list',
    category: 'setup',
    estimatedTime: '約1分',
    sidebarNavId: 'nav-sites',
    planRequired: 'free',
    videoUrl: null,
    helpUrl: null,
  },
  memberInvited: {
    title: 'メンバーを招待する',
    subtitle: 'チームと分析結果を共有（3名まで無料）',
    to: '/members',
    category: 'setup',
    estimatedTime: '約30秒',
    sidebarNavId: 'nav-account-settings',
    planRequired: 'free',
    ownerOnly: true,
    videoUrl: null,
    helpUrl: null,
  },
  // Business 限定
  aiTried: {
    title: 'AI分析を試す',
    subtitle: '期間のデータを AI が日本語で解説',
    to: '/analysis/summary',
    category: 'use',
    estimatedTime: '約30秒',
    sidebarNavId: 'nav-analysis',
    planRequired: 'business',
    videoUrl: null,
    helpUrl: null,
  },
  aiChatTried: {
    title: 'AIチャットを使う',
    subtitle: 'データについて AI に質問',
    to: '/ai-chat',
    category: 'use',
    estimatedTime: '約1分',
    sidebarNavId: 'nav-aichat',
    planRequired: 'business',
    videoUrl: null,
    helpUrl: null,
  },
  exported: {
    title: 'レポートをダウンロードする',
    subtitle: '分析画面の表示内容を Excel / PowerPoint で出力',
    to: '/analysis/month',
    category: 'basics',
    estimatedTime: '約30秒',
    sidebarNavId: 'nav-analysis',
    planRequired: 'business',
    desktopOnly: true,
    videoUrl: null,
    helpUrl: null,
  },
  comprehensiveAITried: {
    title: 'AI総合分析を試す',
    subtitle: '全データを横断してAIが自動で総合評価',
    to: '/analysis/comprehensive',
    category: 'use',
    estimatedTime: '約1分',
    sidebarNavId: 'nav-analysis',
    planRequired: 'business',
    videoUrl: null,
    helpUrl: null,
  },
  improveViewed: {
    title: '改善提案を見る',
    subtitle: 'AI が改善ポイントを提案',
    to: '/improve',
    category: 'use',
    estimatedTime: '約1分',
    sidebarNavId: 'nav-improve',
    planRequired: 'business',
    videoUrl: null,
    helpUrl: null,
  },
  reportsViewed: {
    title: '評価機能を試す',
    subtitle: '改善効果の自動計測と評価',
    to: '/reports',
    category: 'use',
    estimatedTime: '約1分',
    sidebarNavId: 'nav-reports',
    planRequired: 'business',
    videoUrl: null,
    helpUrl: null,
  },
};

// 表示順序（カテゴリ→キー配列）
export const STEP_ORDER = [
  // setup
  'siteRegistered',
  'siteEdited',
  'notificationsConfigured',
  'memberInvited',
  // basics
  'analysisViewed',
  'exported',
  // use（AI改善サイクル）
  'aiTried',
  'comprehensiveAITried',
  'aiChatTried',
  'improveViewed',
  'reportsViewed',
];

/**
 * プラン・ロールに応じた必須ステップキーを返す
 */
export function getRequiredStepKeys(planId, memberRole) {
  const isBusiness = planId === 'business';
  const isOwner = memberRole === 'owner';

  return STEP_ORDER.filter((key) => {
    const def = STEP_DEFINITIONS[key];
    if (!def) return false;
    if (def.planRequired === 'business' && !isBusiness) return false;
    if (def.ownerOnly && !isOwner) return false;
    return true;
  });
}

/**
 * すべての必須ステップが完了しているか
 */
export function allRequiredStepsCompleted(planId, memberRole, steps) {
  const keys = getRequiredStepKeys(planId, memberRole);
  return keys.every((key) => steps?.[key] === true);
}

/**
 * デフォルトの onboarding フィールド値
 */
export function getDefaultOnboarding() {
  return {
    version: 1,
    tourVersion: TOUR_TARGET_VERSION,
    dismissed: false,
    startedAt: null,
    completedAt: null,
    steps: {
      siteRegistered: false,
      analysisViewed: false,
      notificationsConfigured: false,
      siteEdited: false,
      memberInvited: false,
      aiTried: false,
      comprehensiveAITried: false,
      aiChatTried: false,
      exported: false,
      improveViewed: false,
      reportsViewed: false,
    },
    seenTours: {
      dashboard: false,
      analysisDay: false,
      analysisSummary: false,
      members: false,
      accountSettings: false,
    },
  };
}

/**
 * 既存ユーザーの実績から完了状態を推定
 * @param {Object} userData - users/{uid} のドキュメントデータ
 * @param {number} sitesCount - ユーザーが保有するサイト数
 */
export function inferStepsFromExisting(userData, sitesCount = 0) {
  const base = getDefaultOnboarding();
  if (!userData) return base;

  if (sitesCount > 0) base.steps.siteRegistered = true;

  const ns = userData.notificationSettings || {};
  if (ns.alertEmail || ns.weeklyReportEmail || ns.monthlyReportEmail) {
    base.steps.notificationsConfigured = true;
  }

  // memberships が複数あるならメンバー招待を経験している
  const membershipsCount = userData.memberships
    ? Object.keys(userData.memberships).length
    : 0;
  if (membershipsCount > 1) base.steps.memberInvited = true;

  if ((userData.aiSummaryUsage ?? 0) > 0) base.steps.aiTried = true;
  if ((userData.aiChatUsage ?? 0) > 0) base.steps.aiChatTried = true;
  if ((userData.excelExportUsage ?? 0) > 0 || (userData.pptxExportUsage ?? 0) > 0) {
    base.steps.exported = true;
  }
  if ((userData.aiImprovementUsage ?? 0) > 0) base.steps.improveViewed = true;

  return base;
}

