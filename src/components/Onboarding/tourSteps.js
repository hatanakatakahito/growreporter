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
    element: sel(TOUR_TARGETS.ANALYSIS_AI_TAB),
    popover: {
      title: 'AI分析タブ',
      description:
        '各分析画面の下部にある「AI分析」タブを開くと、その画面のデータに特化したAIコメントが表示されます。月別なら中長期トレンド、チャネル別なら集客経路の強弱、ページ別なら改善余地のあるページなど、画面ごとに異なる観点で自動解説します。AIが提案する改善案をそのまま「改善する」ページにタスク追加することもできます。',
      side: 'bottom',
      align: 'start',
    },
    businessOnly: true,
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_NOTE),
    popover: {
      title: 'メモ機能',
      description:
        '気付きや分析結果のメモをページごとに残せます。チームメンバーとも共有可能で、後から振り返るときに便利です。',
      side: 'bottom',
      align: 'start',
    },
  },
];

export const analysisExportSteps = [
  {
    element: sel(TOUR_TARGETS.ANALYSIS_PERIOD),
    popover: {
      title: 'Step 1: 出力する期間を指定',
      description:
        'まず、ダウンロードしたいレポートの対象期間をここで選択します。月・週・日など、分析画面で表示中の期間がそのまま Excel / PowerPoint に反映されます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Step 2: ダウンロードボタンを開く',
      description:
        '右上の「ダウンロード」ボタンをクリックすると、Excel / PowerPoint の出力形式を選ぶメニューが開きます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.ANALYSIS_EXPORT),
    popover: {
      title: 'Step 3: Excel / PowerPoint を選択',
      description:
        'Excel は数値データの二次加工に、PowerPoint はそのまま報告資料に使えるレイアウトで出力されます。画面に表示中の列・並び順がそのまま反映されます。',
    },
  },
];

export const analysisSummarySteps = [
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY),
    popover: {
      title: 'AI分析へようこそ',
      description:
        '選択中の期間（全体サマリー）のGA4・Search Consoleデータを元に、AIが日本語で解説を生成します。サマリー画面以外にも、月別・日別・チャネル・キーワード・ページ別など各分析画面にそれぞれ専用のAI分析タブがあり、ページの観点に合わせたコメントを出します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY_REGENERATE),
    popover: {
      title: '再分析ボタン',
      description:
        '一度生成した結果はキャッシュされ、同じ期間を再度開いても消費回数はかかりません。期間を変えた場合や、最新データで作り直したい場合にこの「再分析」を押すと、今月の残り生成回数を1回消費して最新内容に更新します。ボタン右上の生成日時に「(前回の分析結果)」と出ていればキャッシュ表示中です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY_BODY),
    popover: {
      title: 'AIサマリーの読み方',
      description:
        '前段に総評、後段に箇条書きで注目すべき変化点が並びます。数値は前期間比・前年同期比を自動で参照しており、単純な増減だけでなく「なぜ変化したか」の仮説までAIが提示します。社内共有のコメント材料としてそのままコピーしてお使いいただけます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_SUMMARY_ACTIONS),
    popover: {
      title: '次のアクション導線',
      description:
        '分析結果を読んだあとは「AIに質問する」で深掘り対話、「サイト改善案を生成する」で改善タスクの自動生成に進めます。AIチャットは開いているページ文脈を引き継いで質問できるので、気になった指標について続けて深掘りできます。',
      side: 'top',
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

export const comprehensiveAISteps = [
  {
    element: sel(TOUR_TARGETS.COMP_AI_ROOT),
    popover: {
      title: 'AI総合分析へようこそ',
      description:
        'このページは、月次推移・ユーザー属性・集客チャネル・ランディングページ・リファラ・ページ別・GSCキーワードまで、全データソースを1回の生成でAIが横断分析します。個別ページを回らずに「今サイトで何が起きているか」をまとめて把握できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_REGENERATE),
    popover: {
      title: '再分析ボタン',
      description:
        '最初の分析結果はキャッシュされ、同じ期間を再表示しても消費回数は増えません。期間を変えた後や、最新データで作り直したい場合のみ「再分析」を押して今月の残り生成回数を1回消費します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_SCORE),
    popover: {
      title: 'サイト健全性スコア',
      description:
        '複数指標の総合評価を1つのスコアで表示し、右側にAIが作成した全体総評を記載します。経営層・クライアントへの定期報告にそのまま使える粒度で出力されます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_HIGHLIGHTS),
    popover: {
      title: '注目ポイント3カード',
      description:
        'AIが「注目すべき変化」「気をつけたいこと（リスク）」「チャンス」の3観点で当期間のハイライトを自動抽出します。長い文章を読む前にここだけ見れば要点が分かります。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_KPIS),
    popover: {
      title: 'ミニKPI（クリックでジャンプ）',
      description:
        'アクセス・訪問者・集客・コンテンツ・成果の主要KPIを前期間比と一緒に表示します。カードをクリックすると、下の該当セクションへスムーズスクロールし、詳しい分析文を確認できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.COMP_AI_SECTIONS),
    popover: {
      title: '5つの分析セクション',
      description:
        'アクセス概況 / 訪問者の傾向 / 集客 / コンテンツ / 成果 の順で、各カテゴリのAIコメントと構造化データが並びます。各セクションの最下部には「詳細を見る」リンクがあり、該当する個別分析ページを別タブで開けます。',
      side: 'top',
    },
  },
];

export const aiChatSteps = [
  {
    element: sel(TOUR_TARGETS.AI_CHAT_INPUT),
    popover: {
      title: 'AIチャットへようこそ',
      description:
        '選択中のサイトのGA4・Search Consoleデータを土台に、AIと自由に対話できます。「なぜ直帰率が上がったか」「今月のCV低下の原因は」など、集計画面では見えない仮説まで踏み込んだ議論ができます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_SIDEBAR),
    popover: {
      title: '会話履歴サイドバー',
      description:
        '過去の会話はすべて保存され、いつでも続きから再開できます。ターン数・更新日も表示されるので、施策ごと・案件ごとに会話を分けて管理できます。会話は検索欄でタイトルや内容から探せます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_NEW_SESSION),
    popover: {
      title: '新しい会話を開始',
      description:
        '別トピックに切り替えたいときは「新しい会話」ボタンで新規セッションを作成します。会話のタイトルは最初のメッセージから AI が自動命名し、あとから手動で編集もできます。不要になった会話はセッション右の「…」メニューから削除できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_SUGGEST),
    popover: {
      title: '質問サジェスト',
      description:
        '何を聞けばいいか迷ったときは、このサジェスト質問をクリックするだけで入力欄に反映されます。ページ種別・データの状況に応じて、その時点で有効そうな質問がAIによって自動で提案されます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.AI_CHAT_INPUT_FIELD),
    popover: {
      title: '入力欄の使い方',
      description:
        'Enterで送信、Shift+Enterで改行です。左のクリップアイコンからはCSV・画像・PDFなどを添付してAIに読み込ませることもできます（例：競合サイトのスクリーンショットを送って比較分析）。AIの回答に「改善案カード」が含まれる場合、その場で「改善する」ページにタスクとして追加できます。',
      side: 'top',
    },
  },
];

export const improveSteps = [
  {
    element: sel(TOUR_TARGETS.IMPROVE_HEADER),
    popover: {
      title: '改善するページへようこそ',
      description:
        'このページでは、AIが提案する改善タスクを一元管理できます。カテゴリ・優先度・ステータス・目安料金で整理し、実装までのワークフローを回します。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_AI_GENERATE),
    popover: {
      title: 'AI改善案を生成する',
      description:
        'GA4・Search Console のデータとサイトマップを元に、AIが改善ポイントを自動抽出します。ボタン右上の赤バッジは今月の残り生成回数です。フォーカス（流入改善・CV改善など）を指定することもできます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_MANUAL_ADD),
    popover: {
      title: '手動でタスクを追加',
      description:
        'AIが気付かない施策や、社内で決定済みのタスクは「手動で追加」から登録できます。カテゴリ・優先度・対象ページURL・期待効果などを入力できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_AUTO_TOGGLE),
    popover: {
      title: '月次自動生成',
      description:
        'ONにすると毎月1日に、前月データを元にした改善案を自動生成します。定期的にサイト改善のネタを仕込みたい場合におすすめです。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_STATUS_FILTER),
    popover: {
      title: 'ステータスで絞り込む',
      description:
        '改善案は「未着手 / 対応中 / 完了 / アーカイブ」で管理できます。このセレクトで絞り込むと、進行中のタスクだけを一覧表示できます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.IMPROVE_TABLE),
    popover: {
      title: '改善タスク一覧',
      description:
        'カテゴリ・優先度・改善内容・目安料金と納期・ステータスを1行で確認できます。行をクリックすると右側にドロワーが開き、詳細・モックアップ・ステータス変更が行えます。完了にしたタスクは「評価する」ページで自動的に効果計測されます。',
      side: 'top',
    },
  },
];

export const reportsSteps = [
  {
    element: sel(TOUR_TARGETS.REPORTS_HEADER),
    popover: {
      title: '評価するページへようこそ',
      description:
        '「改善する」で完了にしたタスクの効果を、GA4データから自動で計測し、AIが評価レポートを作成します。改善が本当に成果につながったかを数字で振り返れます。',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_SUMMARY),
    popover: {
      title: 'サマリーカード',
      description:
        '完了タスク数・計測完了数・平均スコア・期待超え件数をひと目で把握できます。平均スコアは AI が算出する改善の総合評価（+が良化、-が悪化）です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_FILTER),
    popover: {
      title: 'ステータスで絞り込む',
      description:
        '「計測待ち / 計測完了 / 期待超え」などのステータスで絞り込みできます。AIの評価結果だけを見たいときや、まだ計測中のタスクを確認したいときに便利です。',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_LIST),
    popover: {
      title: 'カードをクリックで詳細展開',
      description:
        '各カードには改善内容・AI評価コメント・主要指標の変化（改善前 → 改善後）が表示されます。クリックで展開すると、左に改善内容・中央にAI評価と「次のアクション」提案・右に主要指標の変化が3カラムで並びます。',
      side: 'top',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_LIST),
    popover: {
      title: 'カード右上のアクションボタン',
      description:
        '各カードの右上には以下のボタンが並びます。\n\n・「評価する / 評価を見る」… AIにこの改善を評価させ、達成度（期待超え/達成/未達）を判定\n・「再取得 / 再計測」… 計測エラー時のリトライ、または最新データでの再計測\n・「追加計測」… 14/30/60/90日後に自動で再計測をスケジュール（時間差での効果検証に有効）\n・「削除」… 評価対象から除外\n\n計測完了後にAI評価を見て、次の改善につなげましょう。',
      side: 'top',
    },
  },
  {
    element: sel(TOUR_TARGETS.REPORTS_LIST),
    popover: {
      title: '「次のアクション生成」で改善サイクルを回す',
      description:
        'AI評価を見たあとは、展開カード下部の「次のアクション生成」ボタンで、今回の結果を踏まえたフォローアップ改善案をAIが自動生成します。生成された提案はそのまま「改善する」ページに追加され、改善→完了→評価→次の改善、というループを回せるのが本機能の真価です。',
      side: 'top',
    },
  },
];

export const TOUR_STEPS_BY_ID = {
  analysisMonth: analysisMonthSteps,
  analysisExport: analysisExportSteps,
  analysisSummary: analysisSummarySteps,
  comprehensiveAI: comprehensiveAISteps,
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
  analysisExport: 'exported',
  analysisSummary: 'aiTried',
  comprehensiveAI: 'comprehensiveAITried',
  members: 'memberInvited',
  accountSettings: 'notificationsConfigured',
  sites: 'siteEdited',
  aiChat: 'aiChatTried',
  improve: 'improveViewed',
  reports: 'reportsViewed',
};
