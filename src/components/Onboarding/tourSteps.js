import { TOUR_TARGETS, sel } from './tourTargets';

/**
 * 画面IDごとのツアーステップ配列
 * driver.js の steps フォーマット
 */

export const dashboardSteps = [
  {
    element: sel(TOUR_TARGETS.DASHBOARD_KPI),
    popover: {
      title: '主要指標をひと目で',
      description:
        'セッション・ユーザー・PV・CV とその前月比をタブ切替で確認できます。指標のトレンドを素早く把握しましょう。',
    },
  },
  {
    element: sel(TOUR_TARGETS.DASHBOARD_ALERTS),
    popover: {
      title: '重要な変化を自動検知',
      description:
        '前期比で大きく動いた指標はアラートとして表示されます。異常を見逃さずキャッチできます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.SIDEBAR_ANALYSIS),
    popover: {
      title: '詳細分析はこちらから',
      description:
        '日別・週別・時間帯別・ページ別などの詳細分析は左サイドバーから開けます。',
    },
  },
];

export const analysisDaySteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: '期間と比較',
      description: '分析期間と比較対象をここで切り替えられます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_KPI_CARD),
    popover: {
      title: 'KPIカード',
      description:
        'タブを切り替えて主要サマリー・CV内訳・KPI目標を見られます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Excel / PowerPoint でダウンロード',
      description: 'レポートを Excel / PowerPoint 形式でダウンロードできます。',
    },
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

export const TOUR_STEPS_BY_ID = {
  dashboard: dashboardSteps,
  analysisDay: analysisDaySteps,
  analysisSummary: analysisSummarySteps,
  members: membersSteps,
  accountSettings: accountSettingsSteps,
};

// tourId に対応する完了時の markStep キー
export const TOUR_STEP_COMPLETION_KEY = {
  dashboard: 'dashboardViewed',
  analysisDay: 'analysisViewed',
  analysisSummary: 'aiTried',
  members: 'memberInvited',
  accountSettings: 'notificationsConfigured',
};
