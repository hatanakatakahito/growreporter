import { TOUR_TARGETS, sel } from './tourTargets';

/**
 * 画面IDごとのツアーステップ配列
 * driver.js の steps フォーマット
 */

export const analysisDaySteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: '期間と比較',
      description: '分析期間と比較対象をここで切り替えられます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Excel / PowerPoint でダウンロード',
      description: 'レポートを Excel / PowerPoint 形式でダウンロードできます。',
    },
    businessOnly: true,
  },
];

export const analysisSummarySteps = [
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY),
    popover: {
      title: 'AIが自動でサマリー',
      description:
        '期間のデータを AI が日本語で解説します。再生成もワンクリックです。',
    },
  },
];

export const membersSteps = [
  {
    element: sel(TOUR_TARGETS.MEMBERS_INVITE),
    popover: {
      title: 'チームを招待',
      description:
        'Free プランは3名まで、Business プランは無制限で招待できます。',
    },
  },
];

export const accountSettingsSteps = [
  {
    element: sel(TOUR_TARGETS.ACCOUNT_NOTIFICATIONS),
    popover: {
      title: '通知を設定',
      description:
        '週次レポート・月次レポート・アラートの通知を切り替えられます。',
    },
  },
];

export const sitesSteps = [
  {
    element: sel(TOUR_TARGETS.SITE_EDIT_BUTTON),
    popover: {
      title: 'サイト設定を編集',
      description:
        'サイト情報・KPI目標・コンバージョンイベントなどを編集できます。',
    },
  },
];

export const aiChatSteps = [
  {
    element: sel(TOUR_TARGETS.AI_CHAT_INPUT),
    popover: {
      title: 'AIチャット',
      description:
        'サイトのデータについて AI に自由に質問できます。データの読み解きや改善のヒントが得られます。',
    },
  },
];

export const improveSteps = [
  {
    element: sel(TOUR_TARGETS.IMPROVE_HEADER),
    popover: {
      title: '改善提案',
      description:
        'AI がサイトの改善ポイントを自動で提案します。提案を採用すると改善タスクとして管理できます。',
    },
  },
];

export const reportsSteps = [
  {
    element: sel(TOUR_TARGETS.REPORTS_HEADER),
    popover: {
      title: '評価機能',
      description:
        '実施した改善の効果を自動計測し、AI が評価レポートを作成します。',
    },
  },
];

export const TOUR_STEPS_BY_ID = {
  analysisDay: analysisDaySteps,
  analysisSummary: analysisSummarySteps,
  members: membersSteps,
  accountSettings: accountSettingsSteps,
  sites: sitesSteps,
  aiChat: aiChatSteps,
  improve: improveSteps,
  reports: reportsSteps,
};

// tourId に対応する完了時の markStep キー
export const TOUR_STEP_COMPLETION_KEY = {
  analysisDay: 'analysisViewed',
  analysisSummary: 'aiTried',
  members: 'memberInvited',
  accountSettings: 'notificationsConfigured',
  sites: 'siteEdited',
  aiChat: 'aiChatTried',
  improve: 'improveViewed',
  reports: 'reportsViewed',
};
