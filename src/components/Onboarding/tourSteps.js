import { TOUR_TARGETS, sel } from './tourTargets';

/**
 * 画面IDごとのツアーステップ配列
 * driver.js の steps フォーマット
 */

// ── ヘルパー: 分析ページ共通ステップを生成 ──────────────
function makeAnalysisSteps(periodDesc, aiTabDesc, opts = {}) {
  const {
    hasColumnToggle = true,
    hasFilters = true,
    hasViewTabs = true,
  } = opts;
  const steps = [
    {
      element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
      popover: { title: '期間設定', description: periodDesc },
    },
  ];
  if (hasFilters) {
    steps.push({
      element: sel(TOUR_TARGETS.ANALYSIS_DIMENSION_FILTERS),
      popover: {
        title: 'フィルタ設定',
        description: 'デバイス・チャネル・流入元などで分析対象を絞り込めます。複数条件の組み合わせも可能です。',
      },
    });
  }
  if (hasViewTabs) {
    steps.push({
      element: sel(TOUR_TARGETS.ANALYSIS_VIEW_TABS),
      popover: {
        title: '表形式 / グラフ形式',
        description: '同じデータを「表形式」と「グラフ形式」で切り替えて確認できます。表は数値の比較、グラフはトレンド把握に便利です。',
      },
    });
  }
  if (hasColumnToggle) {
    steps.push({
      element: sel(TOUR_TARGETS.ANALYSIS_COLUMN_TOGGLE),
      popover: {
        title: '表示項目の切替',
        description: '表示する列（指標）を選択・並び替えできます。確認したい指標だけに絞ってカスタマイズしましょう。',
      },
    });
  }
  steps.push(
    {
      element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
      popover: {
        title: 'Excel / PowerPoint でダウンロード',
        description: '表示中のデータをそのまま Excel / PowerPoint 形式で出力できます。画面の表示列・並び順がそのまま反映されます。',
      },
      businessOnly: true,
    },
    {
      element: sel(TOUR_TARGETS.ANALYSIS_AI_TAB),
      popover: {
        title: 'AI分析タブ',
        description: aiTabDesc,
        side: 'bottom',
        align: 'start',
      },
      businessOnly: true,
    },
    {
      element: sel(TOUR_TARGETS.ANALYSIS_NOTE),
      popover: {
        title: 'メモ機能',
        description: '分析の気付きをメモとして残せます。チームメンバーとも共有可能で、後から振り返るときに便利です。',
        side: 'bottom',
        align: 'start',
      },
    }
  );
  return steps;
}

// ── ダッシュボード ──────────────────────────────
export const dashboardSteps = [
  {
    element: sel(TOUR_TARGETS.DASHBOARD_QUICK_ACTIONS),
    popover: {
      title: 'ダッシュボードへようこそ',
      description: 'サイト全体のパフォーマンスを一画面で把握できます。ここではよく使う機能へのショートカットが並んでいます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.DASHBOARD_ALERTS),
    popover: {
      title: 'アラート通知',
      description: 'セッション数やCVが大きく変動した場合にアラートが表示されます。異常な変化をいち早くキャッチし、原因分析につなげましょう。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_KPI_CARD),
    popover: {
      title: '主要指標（3タブ）',
      description: 'サマリ / CV内訳 / KPI予実 の3タブで主要指標を確認できます。前月比・前年比の変化もひと目で分かります。KPI設定を行うと目標との予実比較が可能になります。',
    },
  },
  {
    element: sel(TOUR_TARGETS.DASHBOARD_TREND),
    popover: {
      title: 'トレンドチャート',
      description: '月次と日次の推移をグラフで確認できます。中長期のトレンドと直近の変動を切り替えて把握しましょう。',
    },
  },
  {
    element: sel(TOUR_TARGETS.DASHBOARD_IMPROVE),
    popover: {
      title: '改善タスク進捗',
      description: '改善するページで管理しているタスクの進捗サマリーが表示されます。未着手・対応中・完了の件数をダッシュボードから確認できます。',
      side: 'top',
    },
    businessOnly: true,
  },
];

// ── 月別分析（専用・詳細版） ────────────────────────
export const analysisMonthSteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: '期間設定',
      description: '分析する期間と比較対象（前期間・前年同期など）をここで切り替えられます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_DIMENSION_FILTERS),
    popover: {
      title: 'フィルタ設定',
      description: 'デバイス・チャネル・流入元などで分析対象を絞り込めます。複数条件の組み合わせも可能です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_VIEW_TABS),
    popover: {
      title: '表形式 / グラフ形式',
      description: '同じデータを「表形式」と「グラフ形式」で切り替えて確認できます。表は数値の比較、グラフはトレンド把握に便利です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_COLUMN_TOGGLE),
    popover: {
      title: '表示項目の切替',
      description: '表示する列（指標）を選択・並び替えできます。よく見る項目だけに絞ってカスタマイズしましょう。',
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
    element: sel(TOUR_TARGETS.ANALYSIS_AI_TAB),
    popover: {
      title: 'AI分析タブ',
      description: 'AI分析タブでは月別の中長期トレンドをAIが自動解説します。季節変動や前年比の異常をAIが検知し、改善案をそのままタスク追加できます。',
      side: 'bottom',
      align: 'start',
    },
    businessOnly: true,
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_NOTE),
    popover: {
      title: 'メモ機能',
      description: '気付きや分析結果のメモをページごとに残せます。チームメンバーとも共有可能で、後から振り返るときに便利です。',
      side: 'bottom',
      align: 'start',
    },
  },
];

// ── 日別分析 ──────────────────────────────────
export const analysisDaySteps = makeAnalysisSteps(
  '日別分析の対象期間を設定します。特定のキャンペーン期間や季節イベント前後を指定して、日単位のアクセス変動を細かく追えます。',
  'AIが日別データを分析し、アクセスが急増・急減した日とその原因仮説を自動で解説します。'
);

// ── 曜日別分析 ────────────────────────────────
export const analysisWeekSteps = makeAnalysisSteps(
  '曜日別分析の対象期間を設定します。期間が長いほど曜日ごとの傾向が安定して見えます。',
  'AIが曜日ごとのパターンを分析し、平日と週末の差異やピーク曜日の活用方法を提案します。'
);

// ── 時間帯別分析 ───────────────────────────────
export const analysisHourSteps = makeAnalysisSteps(
  '時間帯別分析の対象期間を設定します。0時〜23時の24時間でアクセスのピーク・谷を確認できます。',
  'AIが時間帯パターンを分析し、アクセスピーク時の施策やオフピーク時の改善案を提案します。'
);

// ── 集客チャネル ───────────────────────────────
export const analysisChannelsSteps = makeAnalysisSteps(
  '集客チャネル分析の対象期間を設定します。Organic Search / Direct / Referral / Paid Search など流入経路別のデータを確認できます。',
  'AIがチャネル別の強弱を分析し、伸びしろのあるチャネルや注力すべき経路を具体的に提案します。'
);

// ── 流入キーワード ──────────────────────────────
export const analysisKeywordsSteps = makeAnalysisSteps(
  'Search Console のキーワードデータの対象期間を設定します。検索クエリごとのクリック数・表示回数・掲載順位・CTRを確認できます。',
  'AIがキーワードの順位変動やCTR改善余地を分析し、SEO施策の優先順位を提案します。',
  { hasFilters: false }
);

// ── 被リンク元 ────────────────────────────────
export const analysisReferralsSteps = makeAnalysisSteps(
  '被リンク元分析の対象期間を設定します。外部サイトからの参照流入（Referral）を確認できます。',
  'AIが参照元サイトの質と量を分析し、注目すべきリファラや新規流入経路の開拓ヒントを提案します。'
);

// ── ページ別 ──────────────────────────────────
export const analysisPagesSteps = makeAnalysisSteps(
  'ページ別分析の対象期間を設定します。ページごとのPV数・エンゲージメント率・滞在時間・興味度スコアを確認できます。',
  'AIがページ単位のパフォーマンスを分析し、改善余地のあるページや高評価ページの特徴を解説します。'
);

// ── コンテンツ分析 ──────────────────────────────
export const analysisContentSteps = makeAnalysisSteps(
  'コンテンツ分析の対象期間を設定します。ページごとの興味度スコアで改善すべきコンテンツを特定できます。',
  'AIが興味度スコアの分布を分析し、完読率やCTAクリック率が低いページの具体的な改善案を提案します。',
  { hasViewTabs: false }
);

// ── ページ分類別 ───────────────────────────────
export const analysisPageCategoriesSteps = makeAnalysisSteps(
  'ページ分類別分析の対象期間を設定します。第1階層のディレクトリ別にページを分類して表示します。',
  'AIがカテゴリ別のパフォーマンスを比較し、注力すべきコンテンツカテゴリを提案します。'
);

// ── ランディングページ ─────────────────────────────
export const analysisLandingPagesSteps = makeAnalysisSteps(
  'ランディングページ分析の対象期間を設定します。ユーザーが最初に訪問したページ別にデータを確認できます。',
  'AIがLP別の直帰率やCV率を分析し、ファーストビューの改善案やA/Bテスト候補を提案します。'
);

// ── ページフロー ───────────────────────────────
export const analysisPageFlowSteps = makeAnalysisSteps(
  'ページフロー分析の対象期間を設定します。特定ページの直前にユーザーがどのページを見ていたかを分析できます。',
  'AIが遷移パターンを分析し、離脱が多い導線や効果的な回遊経路を提案します。',
  { hasColumnToggle: false, hasFilters: false, hasViewTabs: false }
);

// ── コンバージョン ──────────────────────────────
export const analysisConversionsSteps = makeAnalysisSteps(
  'コンバージョン分析の対象期間を設定します。登録済みのCVイベント別に件数の推移を月単位で確認できます。',
  'AIがCV数の月別推移とイベント別の傾向を分析し、CV増加のための具体的な施策を提案します。',
  { hasFilters: false }
);

// ── 逆算フロー ────────────────────────────────
export const analysisReverseFlowSteps = makeAnalysisSteps(
  '逆算フロー分析の対象期間を設定します。フォームページからのコンバージョンフローを分析できます。',
  'AIがファネルの各段階の離脱率を分析し、CV率改善のためのフォーム最適化案を提案します。',
  { hasColumnToggle: false, hasFilters: false, hasViewTabs: false }
);

// ── 外部リンククリック ─────────────────────────────
export const analysisExternalLinksSteps = makeAnalysisSteps(
  '外部リンククリック分析の対象期間を設定します。サイトから外部サイトへの遷移クリック数を確認できます。',
  'AIが外部リンクのクリック傾向を分析し、意図しない離脱が多いリンクの改善案を提案します。',
  { hasViewTabs: false }
);

// ── ファイルダウンロード ────────────────────────────
export const analysisFileDownloadsSteps = makeAnalysisSteps(
  'ファイルダウンロード分析の対象期間を設定します。PDF・Excel等のダウンロード数を確認できます。',
  'AIがダウンロード傾向を分析し、人気コンテンツの特徴やダウンロード数向上のヒントを提案します。'
);

// ── ユーザー属性 ───────────────────────────────
export const analysisUsersSteps = makeAnalysisSteps(
  'ユーザー属性分析の対象期間を設定します。性別・年齢・デバイス・地域などのデモグラフィックデータを確認できます。',
  'AIがユーザー属性の構成比を分析し、ターゲット層へのリーチ状況や改善余地を提案します。',
  { hasColumnToggle: false, hasFilters: false, hasViewTabs: false }
);

// ── 全体サマリー（無料プラン向け） ──────────────────────
export const analysisSummaryFreeSteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: '期間設定',
      description: '全体サマリーの対象期間を設定します。選択した期間の主要指標を前月比・前年比と一緒に一画面で確認できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.METRIC_TAB_SUMMARY),
    popover: {
      title: '主要サマリータブ',
      description: '訪問者数・ユーザー数・平均PV・直帰率・平均滞在時間・CV数など、サイトの主要指標をカード形式で一覧表示します。各カードには前月比・前年同月比が自動計算されます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.METRIC_TAB_CONVERSION),
    popover: {
      title: 'CV内訳タブ',
      description: 'サイトに設定したコンバージョンイベント（フォーム送信・購入・電話など）の内訳と件数を確認できます。未設定の場合はサイト管理画面から登録してください。',
    },
  },
  {
    element: sel(TOUR_TARGETS.METRIC_TAB_KPI),
    popover: {
      title: 'KPIタブ',
      description: 'サイト管理画面で設定した月次KPI目標に対する実績（達成率）を確認できます。目標未達の指標がひと目で分かり、改善優先度の判断に役立ちます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Excel / PowerPoint でダウンロード',
      description: '表示中のデータをそのまま Excel / PowerPoint 形式で出力できます。',
    },
    businessOnly: true,
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_AI_TAB),
    popover: {
      title: 'AI分析タブ',
      description: 'AIがサマリーデータを分析し、注目すべき変化点や改善のヒントを日本語で自動解説します。',
      side: 'bottom',
      align: 'start',
    },
    businessOnly: true,
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_NOTE),
    popover: {
      title: 'メモ機能',
      description: '分析の気付きをメモとして残せます。チームメンバーとも共有可能で、後から振り返るときに便利です。',
      side: 'bottom',
      align: 'start',
    },
  },
];

// ── レポートダウンロード（チェックリスト専用） ──────────────────
export const analysisExportSteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: 'Step 1: 出力する期間を指定',
      description: 'まず、ダウンロードしたいレポートの対象期間をここで選択します。分析画面で表示中の期間がそのまま反映されます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Step 2: ダウンロードボタンを開く',
      description: '右上の「ダウンロード」ボタンをクリックすると、Excel / PowerPoint の出力形式を選ぶメニューが開きます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Step 3: Excel / PowerPoint を選択',
      description: 'Excel は数値データの二次加工に、PowerPoint はそのまま報告資料に使えるレイアウトで出力されます。',
    },
  },
];

// ── AI分析（全体サマリー Business向け） ──────────────────
export const analysisSummarySteps = [
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY),
    popover: {
      title: 'AI分析へようこそ',
      description: '選択中の期間のGA4・Search Consoleデータを元に、AIが日本語で解説を生成します。各分析画面にもそれぞれ専用のAI分析タブがあり、ページの観点に合わせたコメントを出します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY_REGENERATE),
    popover: {
      title: '再分析ボタン',
      description: '一度生成した結果はキャッシュされ、同じ期間を再度開いても消費回数はかかりません。最新データで作り直したい場合にこの「再分析」を押します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY_BODY),
    popover: {
      title: 'AIサマリーの読み方',
      description: '前段に総評、後段に箇条書きで注目すべき変化点が並びます。数値は前期間比・前年同期比を自動で参照しており、社内共有のコメント材料としてそのままコピーしてお使いいただけます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY_ACTIONS),
    popover: {
      title: '次のアクション導線',
      description: '「AIに質問する」で深掘り対話、「サイト改善案を生成する」で改善タスクの自動生成に進めます。',
      side: 'top',
    },
  },
];

// ── AI総合分析 ────────────────────────────────
export const comprehensiveAISteps = [
  {
    element: sel(TOUR_TARGETS.COMP_AI_ROOT),
    popover: {
      title: 'AI総合分析へようこそ',
      description: '全データソースを1回の生成でAIが横断分析します。個別ページを回らずに「今サイトで何が起きているか」をまとめて把握できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_REGENERATE),
    popover: {
      title: '再分析ボタン',
      description: '最初の分析結果はキャッシュされます。期間を変えた後や最新データで作り直したい場合のみ「再分析」を押します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_SCORE),
    popover: {
      title: 'サイト健全性スコア',
      description: '複数指標の総合評価を1つのスコアで表示し、AIが全体総評を記載します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_HIGHLIGHTS),
    popover: {
      title: '注目ポイント3カード',
      description: '「注目すべき変化」「リスク」「チャンス」の3観点でハイライトを自動抽出します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_KPIS),
    popover: {
      title: 'ミニKPI（クリックでジャンプ）',
      description: '主要KPIを前期間比と一緒に表示します。カードをクリックすると該当セクションへスクロールします。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_SECTIONS),
    popover: {
      title: '5つの分析セクション',
      description: 'アクセス / 訪問者 / 集客 / コンテンツ / 成果 の順で各カテゴリのAIコメントが並びます。「詳細を見る」リンクから個別分析ページを開けます。',
      side: 'top',
    },
  },
];

// ── メンバー ──────────────────────────────────
export const membersSteps = [
  {
    element: sel(TOUR_TARGETS.MEMBERS_INVITE),
    popover: {
      title: 'チームを招待',
      description: 'Free プランは3名まで、Business プランは無制限で招待できます。',
    },
  },
];

// ── アカウント設定 ──────────────────────────────
export const accountSettingsSteps = [
  {
    element: sel(TOUR_TARGETS.ACCOUNT_TABS),
    popover: {
      title: 'アカウント設定',
      description: 'プロフィール・プラン確認・登録サイト・メール通知・メンバー管理の5つのタブで構成されています。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ACCOUNT_EMAIL_TAB),
    popover: {
      title: 'メール通知を設定しましょう',
      description: '「メール通知」タブでは3種類の通知を設定できます。\n\n・週次レポート — 毎週のパフォーマンスサマリーをメールで受信\n・月次レポート — 毎月の振り返りレポートをメールで受信\n・アラート通知 — セッション数やCVが大きく変動したときに即座に通知\n\nこのタブを開いてお好みの通知をONにしてください。',
      side: 'bottom',
    },
  },
];

// ── サイト管理 ────────────────────────────────
export const sitesSteps = [
  {
    element: sel(TOUR_TARGETS.SITE_CV_BUTTON),
    popover: {
      title: 'コンバージョン設定（Step 1）',
      description: 'サイトの目標となるCVイベントを設定できます。フォーム送信・購入完了・電話発信などを登録しましょう。',
    },
  },
  {
    element: sel(TOUR_TARGETS.SITE_KPI_BUTTON),
    popover: {
      title: 'KPI設定（Step 2）',
      description: '月次の目標KPIを設定できます。設定すると主要指標タブで予実比較が可能になります。',
    },
  },
];

// ── AIチャット ────────────────────────────────
export const aiChatSteps = [
  {
    element: sel(TOUR_TARGETS.AI_CHAT_INPUT),
    popover: {
      title: 'AIチャットへようこそ',
      description: '選択中のサイトのGA4・Search Consoleデータを土台に、AIと自由に対話できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_SIDEBAR),
    popover: {
      title: '会話履歴サイドバー',
      description: '過去の会話はすべて保存され、いつでも続きから再開できます。検索欄でタイトルや内容から探せます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_NEW_SESSION),
    popover: {
      title: '新しい会話を開始',
      description: '別トピックに切り替えたいときは「新しい会話」ボタンで新規セッションを作成します。タイトルはAIが自動命名します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_SUGGEST),
    popover: {
      title: '質問サジェスト',
      description: '何を聞けばいいか迷ったときは、サジェスト質問をクリックするだけで入力欄に反映されます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_INPUT_FIELD),
    popover: {
      title: '入力欄の使い方',
      description: 'Enterで送信、Shift+Enterで改行です。左のクリップアイコンからCSV・画像・PDF等を添付してAIに読み込ませることもできます。',
      side: 'top',
    },
  },
];

// ── 改善する ──────────────────────────────────
export const improveSteps = [
  {
    element: sel(TOUR_TARGETS.IMPROVE_HEADER),
    popover: {
      title: '改善するページへようこそ',
      description: 'AIが提案する改善タスクを一元管理できます。カテゴリ・優先度・ステータス・目安料金で整理します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_AI_GENERATE),
    popover: {
      title: 'AI改善案を生成する',
      description: 'GA4・Search Consoleのデータとサイトマップを元に、AIが改善ポイントを自動抽出します。ボタン右上の赤バッジは残り生成回数です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_MANUAL_ADD),
    popover: {
      title: '手動でタスクを追加',
      description: 'AIが気付かない施策や社内で決定済みのタスクは「手動で追加」から登録できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_AUTO_TOGGLE),
    popover: {
      title: '月次自動生成',
      description: 'ONにすると毎月1日に前月データを元にした改善案を自動生成します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_STATUS_FILTER),
    popover: {
      title: 'ステータスで絞り込む',
      description: '「未着手 / 対応中 / 完了 / アーカイブ」で絞り込みできます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_TABLE),
    popover: {
      title: '改善タスク一覧',
      description: '行をクリックするとドロワーが開き、詳細・モックアップ・ステータス変更が行えます。完了にしたタスクは「評価する」ページで自動的に効果計測されます。',
      side: 'top',
    },
  },
];

// ── 評価する ──────────────────────────────────
export const reportsSteps = [
  {
    element: sel(TOUR_TARGETS.REPORTS_HEADER),
    popover: {
      title: '評価するページへようこそ',
      description: '「改善する」で完了にしたタスクの効果をGA4データから自動計測し、AIが評価レポートを作成します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_SUMMARY),
    popover: {
      title: 'サマリーカード',
      description: '完了タスク数・計測完了数・平均スコア・期待超え件数をひと目で把握できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_FILTER),
    popover: {
      title: 'ステータスで絞り込む',
      description: '「計測待ち / 計測完了 / 期待超え」などで絞り込みできます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_LIST),
    popover: {
      title: 'カードをクリックで詳細展開',
      description: '展開すると改善内容・AI評価・主要指標の変化が3カラムで並びます。',
      side: 'top',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_LIST),
    popover: {
      title: 'アクションボタン',
      description: '「評価する」でAI評価、「再取得」で再計測、「追加計測」で14/30/60/90日後の自動計測をスケジュールできます。',
      side: 'top',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_LIST),
    popover: {
      title: '次のアクション生成',
      description: 'AI評価結果を踏まえたフォローアップ改善案を自動生成し、「改善する」ページに追加できます。改善→評価→次の改善のループを回しましょう。',
      side: 'top',
    },
  },
];

// ══════════════════════════════════════════════════════
// 登録マップ
// ══════════════════════════════════════════════════════

export const TOUR_STEPS_BY_ID = {
  // ダッシュボード
  dashboard: dashboardSteps,
  // 分析（個別ページ）
  analysisMonth: analysisMonthSteps,
  analysisDay: analysisDaySteps,
  analysisWeek: analysisWeekSteps,
  analysisHour: analysisHourSteps,
  analysisChannels: analysisChannelsSteps,
  analysisKeywords: analysisKeywordsSteps,
  analysisReferrals: analysisReferralsSteps,
  analysisPages: analysisPagesSteps,
  analysisContent: analysisContentSteps,
  analysisPageCategories: analysisPageCategoriesSteps,
  analysisLandingPages: analysisLandingPagesSteps,
  analysisPageFlow: analysisPageFlowSteps,
  analysisConversions: analysisConversionsSteps,
  analysisReverseFlow: analysisReverseFlowSteps,
  analysisExternalLinks: analysisExternalLinksSteps,
  analysisFileDownloads: analysisFileDownloadsSteps,
  analysisUsers: analysisUsersSteps,
  // 分析（特殊）
  analysisSummaryFree: analysisSummaryFreeSteps,
  analysisExport: analysisExportSteps,
  analysisSummary: analysisSummarySteps,
  comprehensiveAI: comprehensiveAISteps,
  // その他
  members: membersSteps,
  accountSettings: accountSettingsSteps,
  sites: sitesSteps,
  aiChat: aiChatSteps,
  improve: improveSteps,
  reports: reportsSteps,
};

// tourId ごとの必要プラン
export const TOUR_PLAN_REQUIRED = {
  dashboard: 'free',
  analysisMonth: 'free',
  analysisDay: 'free',
  analysisWeek: 'free',
  analysisHour: 'free',
  analysisChannels: 'free',
  analysisKeywords: 'free',
  analysisReferrals: 'free',
  analysisPages: 'free',
  analysisContent: 'free',
  analysisPageCategories: 'free',
  analysisLandingPages: 'free',
  analysisPageFlow: 'free',
  analysisConversions: 'free',
  analysisReverseFlow: 'free',
  analysisExternalLinks: 'free',
  analysisFileDownloads: 'free',
  analysisUsers: 'free',
  analysisSummaryFree: 'free',
  analysisExport: 'business',
  analysisSummary: 'business',
  comprehensiveAI: 'business',
  members: 'free',
  accountSettings: 'free',
  sites: 'free',
  aiChat: 'business',
  improve: 'business',
  reports: 'business',
};
