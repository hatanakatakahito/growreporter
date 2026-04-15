import { TOUR_TARGETS, sel } from './tourTargets';

/**
 * 画面IDごとのツアーステップ配列
 * driver.js の steps フォーマット
 */

export const analysisMonthSteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: '期間設定',
      description:
        '分析する期間と比較対象（前期間・前年同期など）をここで切り替えられます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_DIMENSION_FILTERS),
    popover: {
      title: 'フィルタ設定',
      description:
        'デバイス・チャネル・流入元などで分析対象を絞り込めます。複数条件の組み合わせも可能です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_VIEW_TABS),
    popover: {
      title: '表形式 / グラフ形式',
      description:
        '同じデータを「表形式」と「グラフ形式」で切り替えて確認できます。表は数値の比較、グラフはトレンド把握に便利です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_COLUMN_TOGGLE),
    popover: {
      title: '表示項目の切替',
      description:
        '表示する列（指標）を選択・並び替えできます。よく見る項目だけに絞ってカスタマイズしましょう。',
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
  {
    element: sel(TOUR_TARGETS.ANALYSIS_NOTE),
    popover: {
      title: 'メモ機能',
      description:
        '気付きや分析結果のメモをページごとに残せます。チームメンバーとも共有可能で、後から振り返るときに便利です。',
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
    element: sel(TOUR_TARGETS.NOTIFICATION_WEEKLY),
    popover: {
      title: '週次レポート通知',
      description:
        '毎週のサイトパフォーマンスサマリーをメールで受け取れます。週単位の推移を定期的に把握したい方におすすめです。',
    },
  },
  {
    element: sel(TOUR_TARGETS.NOTIFICATION_MONTHLY),
    popover: {
      title: '月次レポート通知',
      description:
        '毎月のサイトパフォーマンスサマリーをメールで受け取れます。月次の振り返り・報告業務に役立ちます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.NOTIFICATION_ALERT),
    popover: {
      title: 'アラート通知',
      description:
        'セッション数やCVが前期比で大きく変動したときにメールで通知します。異常な変化をいち早くキャッチできます。',
    },
  },
];

export const sitesSteps = [
  {
    element: sel(TOUR_TARGETS.SITE_CV_BUTTON),
    popover: {
      title: 'コンバージョン設定（Step 1）',
      description:
        'サイトの目標となるコンバージョンイベントを設定できます。フォーム送信・購入完了・電話発信などを CV として登録しましょう。',
    },
  },
  {
    element: sel(TOUR_TARGETS.SITE_KPI_BUTTON),
    popover: {
      title: 'KPI設定（Step 2）',
      description:
        '月次の目標 KPI（セッション数・ユーザー数・CV数など）を設定できます。設定すると主要指標タブで予実比較が可能になります。',
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
  analysisMonth: analysisMonthSteps,
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
  analysisMonth: 'analysisViewed',
  analysisSummary: 'aiTried',
  members: 'memberInvited',
  accountSettings: 'notificationsConfigured',
  sites: 'siteEdited',
  aiChat: 'aiChatTried',
  improve: 'improveViewed',
  reports: 'reportsViewed',
};
