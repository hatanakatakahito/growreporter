/**
 * AI分析プロンプト共通化ユーティリティ
 * 
 * 16種類のページタイプに対応した共通プロンプト生成ロジック
 * ※ comprehensive_improvement（改善案生成）は対象外
 */

/**
 * ページタイプごとのメタ情報
 */
const PAGE_TYPE_META = {
  dashboard: {
    displayName: 'ダッシュボード',
    category: '全体概要',
    expertRole: 'Webサイト全体のパフォーマンス分析の専門家',
    analysisGoal: '全体的なサイトパフォーマンスの把握と主要な改善ポイントの特定',
    keyMetrics: ['ユーザー数', 'セッション数', 'PV数', 'エンゲージメント率', 'CV数', 'CVR'],
  },
  
  summary: {
    displayName: '全体サマリー',
    category: '全体概要',
    expertRole: 'Webサイト分析の専門家',
    analysisGoal: '期間全体のトレンド把握と重要な変化の特定',
    keyMetrics: ['ユーザー数', 'セッション数', 'PV数', 'エンゲージメント率', 'CV数', '月次推移'],
  },
  
  users: {
    displayName: 'ユーザー属性',
    category: 'ユーザー分析',
    expertRole: 'ユーザー行動分析とペルソナ設計の専門家',
    analysisGoal: 'ターゲット顧客層の把握とマーケティング戦略の最適化',
    keyMetrics: ['デバイス分布', '地域分布', '年齢層', '性別'],
  },
  
  day: {
    displayName: '日別分析',
    category: '時系列分析',
    expertRole: 'Webサイトの時系列パフォーマンス分析の専門家',
    analysisGoal: '日次トレンドの把握と異常値・ピークの特定',
    keyMetrics: ['日別セッション数', '日別CV数', 'CVR推移'],
  },
  
  week: {
    displayName: '曜日別分析',
    category: '時系列分析',
    expertRole: 'Webサイトの時系列パフォーマンス分析の専門家',
    analysisGoal: '曜日別パターンの把握とコンテンツ公開タイミングの最適化',
    keyMetrics: ['曜日別セッション数', '曜日別CV数', '曜日パターン'],
  },
  
  hour: {
    displayName: '時間帯別分析',
    category: '時系列分析',
    expertRole: 'Webサイトの時系列パフォーマンス分析の専門家',
    analysisGoal: '時間帯別パターンの把握と広告配信タイミングの最適化',
    keyMetrics: ['時間帯別セッション数', '時間帯別CV数', 'ピーク時間帯'],
  },
  
  channels: {
    displayName: '集客チャネル',
    category: '集客分析',
    expertRole: 'デジタルマーケティングとチャネル最適化の専門家',
    analysisGoal: '集客チャネルの効果測定とマーケティング予算配分の最適化',
    keyMetrics: ['チャネル別セッション数', 'チャネル別CV数', 'チャネル別CVR'],
  },
  
  keywords: {
    displayName: '流入キーワード',
    category: '集客分析',
    expertRole: '検索エンジン最適化（SEO）の専門家',
    analysisGoal: '検索流入の拡大とSEO戦略の最適化',
    keyMetrics: ['クリック数', 'インプレッション数', 'CTR', '掲載順位'],
  },
  
  referrals: {
    displayName: '被リンク元',
    category: '集客分析',
    expertRole: 'リファラルマーケティングとパートナーシップ戦略の専門家',
    analysisGoal: '外部流入の拡大とパートナーシップの強化',
    keyMetrics: ['参照元別セッション数', '参照元別CV数', '参照元別CVR'],
  },
  
  pages: {
    displayName: 'ページ別',
    category: 'エンゲージメント分析',
    expertRole: 'Webサイトコンテンツ最適化の専門家',
    analysisGoal: 'コンテンツパフォーマンスの把握とページ改善の優先順位付け',
    keyMetrics: ['ページ別PV数', 'ページ別ENG率', 'ページ別CV数'],
  },
  
  pageCategories: {
    displayName: 'ページ分類別',
    category: 'エンゲージメント分析',
    expertRole: 'サイト構造最適化の専門家',
    analysisGoal: 'サイト構造とナビゲーションの改善',
    keyMetrics: ['カテゴリ別PV数', 'カテゴリ別ページ数', 'カテゴリ別ENG率'],
  },
  
  landingPages: {
    displayName: 'ランディングページ',
    category: 'エンゲージメント分析',
    expertRole: 'ランディングページ最適化（LPO）の専門家',
    analysisGoal: '新規ユーザー獲得とランディングページの改善',
    keyMetrics: ['LP別セッション数', 'LP別CV数', 'LP別CVR', '直帰率'],
  },
  
  fileDownloads: {
    displayName: 'ファイルダウンロード',
    category: 'エンゲージメント分析',
    expertRole: 'コンテンツマーケティングとリード獲得の専門家',
    analysisGoal: '資料ダウンロードの最適化とリード獲得の向上',
    keyMetrics: ['ファイル別DL数', 'ユーザー数', '平均DL数/人'],
  },
  
  externalLinks: {
    displayName: '外部リンククリック',
    category: 'エンゲージメント分析',
    expertRole: 'ユーザー行動分析とアフィリエイト最適化の専門家',
    analysisGoal: '外部リンククリックの把握とパートナーシップ戦略の最適化',
    keyMetrics: ['リンク別クリック数', 'ユーザー数', '平均クリック数/人'],
  },
  
  conversions: {
    displayName: 'コンバージョン一覧',
    category: 'コンバージョン分析',
    expertRole: 'コンバージョン最適化（CRO）の専門家',
    analysisGoal: 'コンバージョン傾向の把握と改善施策の提案',
    keyMetrics: ['イベント別CV数', 'CV推移', 'CV合計'],
  },
  
  reverseFlow: {
    displayName: '逆算フロー',
    category: 'コンバージョン分析',
    expertRole: 'ユーザー行動フローとファネル最適化の専門家',
    analysisGoal: 'CVに至るユーザー行動の把握とファネル改善',
    keyMetrics: ['CVからの逆算フロー', '主要な到達経路', '離脱ポイント'],
  },
};

/**
 * 共通プロンプトを生成
 * @param {string} pageType - ページタイプ
 * @param {Object} metrics - メトリクスデータ
 * @param {string} period - 期間文字列
 * @returns {string} プロンプト
 */
function buildPrompt(pageType, metrics, period) {
  const meta = PAGE_TYPE_META[pageType];
  
  if (!meta) {
    throw new Error(`Unknown pageType: ${pageType}`);
  }
  
  // 共通プロンプト構造
  const prompt = `あなたは${meta.expertRole}です。${period}のWebサイトの${meta.displayName}データを分析し、**${meta.analysisGoal}に役立つビジネスインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【分析データ】
${formatMetricsSection(pageType, metrics)}

【分析の視点】
${getAnalysisPerspectives(pageType, meta, metrics)}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **全体傾向の分析**：${meta.keyMetrics.join('、')}から主要なパフォーマンスを評価
- **成功要因の特定**：高パフォーマンスの要素を分析
- **改善機会の抽出**：課題や改善の余地がある領域を特定
- **具体的なアクションを1-3点提案**：
${getActionProposals(pageType, meta)}
  - 各提案の実装難易度と効果を明示
- 数値の羅列ではなく、「どの要素を、どう改善すべきか」を具体的に記述

【データ使用の厳守事項】
- **提供されたデータに記載されている具体的な数値を必ず引用すること**（例：「セッション数10,471回」「CVR1.19%」など）
- **提供されたデータに記載されている実際の名称（ページパス、チャネル名、キーワードなど）を必ず使用すること**
- **架空の名称（「ページA」「ページB」「チャネルX」「キーワードY」「サイトZ」など）は絶対に使用禁止**
- **データにないページ名・チャネル名・キーワードは一切言及しないこと**
- 分析は必ず「【分析データ】」セクションに記載された実際の数値と名称のみに基づいて行うこと
`;

  return prompt;
}

/**
 * メトリクスセクションをフォーマット
 */
function formatMetricsSection(pageType, metrics) {
  const sections = [];
  
  // 集計値
  if (metrics.aggregates) {
    const agg = metrics.aggregates;
    const lines = [];
    
    if (agg.totalUsers !== undefined) lines.push(`- 総ユーザー数: ${agg.totalUsers?.toLocaleString() || 0}人`);
    if (agg.sessions !== undefined) lines.push(`- 総セッション数: ${agg.sessions?.toLocaleString() || 0}回`);
    if (agg.totalSessions !== undefined) lines.push(`- 総セッション数: ${agg.totalSessions?.toLocaleString() || 0}回`);
    if (agg.pageViews !== undefined) lines.push(`- 総PV数: ${agg.pageViews?.toLocaleString() || 0}回`);
    if (agg.totalPageViews !== undefined) lines.push(`- 総PV数: ${agg.totalPageViews?.toLocaleString() || 0}回`);
    if (agg.engagementRate !== undefined) lines.push(`- エンゲージメント率: ${(agg.engagementRate * 100).toFixed(1)}%`);
    if (agg.conversions !== undefined) lines.push(`- 総CV数: ${agg.conversions?.toLocaleString() || 0}件`);
    if (agg.totalConversions !== undefined) lines.push(`- 総CV数: ${agg.totalConversions?.toLocaleString() || 0}件`);
    if (agg.conversionRate !== undefined) lines.push(`- CVR: ${(agg.conversionRate * 100).toFixed(2)}%`);
    if (agg.totalClicks !== undefined) lines.push(`- 総クリック数: ${agg.totalClicks?.toLocaleString() || 0}回`);
    if (agg.totalImpressions !== undefined) lines.push(`- 総インプレッション数: ${agg.totalImpressions?.toLocaleString() || 0}回`);
    if (agg.avgCTR !== undefined) lines.push(`- 平均CTR: ${agg.avgCTR?.toFixed(2)}%`);
    if (agg.avgPosition !== undefined) lines.push(`- 平均掲載順位: ${agg.avgPosition?.toFixed(1)}位`);
    if (agg.channelCount !== undefined) lines.push(`- チャネル数: ${agg.channelCount}件`);
    if (agg.keywordCount !== undefined) lines.push(`- キーワード数: ${agg.keywordCount}件`);
    if (agg.referralCount !== undefined) lines.push(`- 参照元数: ${agg.referralCount}件`);
    if (agg.pageCount !== undefined) lines.push(`- ページ数: ${agg.pageCount}件`);
    if (agg.categoryCount !== undefined) lines.push(`- カテゴリ数: ${agg.categoryCount}件`);
    if (agg.landingPageCount !== undefined) lines.push(`- ランディングページ数: ${agg.landingPageCount}件`);
    if (agg.totalDownloads !== undefined) lines.push(`- 総ダウンロード数: ${agg.totalDownloads?.toLocaleString() || 0}回`);
    if (agg.downloadCount !== undefined) lines.push(`- ファイル数: ${agg.downloadCount}件`);
    if (agg.clickCount !== undefined) lines.push(`- リンク数: ${agg.clickCount}件`);
    if (agg.dataPoints !== undefined) lines.push(`- データポイント数: ${agg.dataPoints}件`);
    if (agg.monthlyDataPoints !== undefined) lines.push(`- 月次データ数: ${agg.monthlyDataPoints}件`);
    if (agg.conversionEventCount !== undefined) lines.push(`- CVイベント数: ${agg.conversionEventCount}件`);
    
    if (lines.length > 0) {
      sections.push(lines.join('\n'));
    }
  }
  
  // トップN詳細データ
  if (metrics.topPages) sections.push(`\n【トップページ10】\n${metrics.topPages}`);
  if (metrics.topCategories) sections.push(`\n【トップカテゴリ5】\n${metrics.topCategories}`);
  if (metrics.topChannels) sections.push(`\n【トップチャネル10】\n${metrics.topChannels}`);
  if (metrics.topKeywords) sections.push(`\n【トップキーワード10】\n${metrics.topKeywords}`);
  if (metrics.topReferrals) sections.push(`\n【トップ参照元10】\n${metrics.topReferrals}`);
  if (metrics.topLandingPages) sections.push(`\n【トップランディングページ10】\n${metrics.topLandingPages}`);
  if (metrics.topDownloads) sections.push(`\n【トップダウンロードファイル10】\n${metrics.topDownloads}`);
  if (metrics.topLinks) sections.push(`\n【トップ外部リンク10】\n${metrics.topLinks}`);
  if (metrics.topDays) sections.push(`\n【トップ日別10】\n${metrics.topDays}`);
  if (metrics.weekPattern) sections.push(`\n【曜日別パターン】\n${metrics.weekPattern}`);
  if (metrics.topHours) sections.push(`\n【トップ時間帯10】\n${metrics.topHours}`);
  if (metrics.eventSummary) sections.push(`\n【CVイベント合計】\n${metrics.eventSummary}`);
  
  // サマリー
  if (metrics.summary) sections.push(`\n【概要】${metrics.summary}`);
  
  return sections.join('\n');
}

/**
 * 分析の視点を生成
 */
function getAnalysisPerspectives(pageType, meta, metrics) {
  const perspectives = {
    dashboard: '- 全体的なサイトパフォーマンスの健全性評価\n- 主要KPIの達成状況（具体的な数値を明記）\n- 最も改善が必要な領域の特定',
    summary: '- 期間全体のトレンドと変化点の分析（具体的な増減率を明記）\n- 月次推移から見る成長性\n- 季節性やイベントによる影響',
    users: '- 主要なターゲット顧客層の特定\n- デバイス・地域・年齢・性別の傾向分析\n- ペルソナに基づくコンテンツ最適化',
    day: '- 日次のトレンドとピーク日の特定（具体的な日付と数値）\n- 異常値や急激な変化の要因分析\n- 定期的なパターンの発見',
    week: '- 曜日別のユーザー行動パターン（具体的な曜日と数値）\n- 平日と週末のパフォーマンス差\n- コンテンツ公開の最適タイミング',
    hour: '- 時間帯別のアクセスパターン（具体的な時間帯と数値）\n- ピーク時間帯とオフピーク時間帯の特定\n- 広告配信やメール送信の最適タイミング',
    channels: '- 高ROIチャネルの特定（データに記載されているチャネル名と実際のCVRを明記）\n- チャネル別のユーザー品質評価\n- マーケティング予算配分の最適化',
    keywords: '- 高パフォーマンスキーワードの特徴（データに記載されている実際のキーワードとCTR・順位を明記）\n- CTRや順位から見る改善機会\n- 新規コンテンツのキーワード選定',
    referrals: '- 主要な参照元とトラフィック品質（データに記載されている実際の参照元URLと数値を明記）\n- パートナーシップの効果測定\n- 新規参照元の開拓機会',
    pages: '- 高エンゲージメントページの特徴（データに記載されている実際のページパスとPV数・ENG率を明記）\n- 低パフォーマンスページの課題\n- コンテンツの優先改善順位',
    pageCategories: '- カテゴリ別のユーザー関心度（データに記載されている実際のカテゴリ名とPV数を明記）\n- サイト構造とナビゲーションの課題\n- カテゴリ再編の必要性',
    landingPages: '- 高CVRランディングページの特徴（データに記載されている実際のページパスとCVRを明記）\n- 流入は多いが離脱が多いページ\n- 新規ユーザー獲得の改善ポイント',
    fileDownloads: '- 人気資料とユーザーニーズ（データに記載されている実際のファイル名とDL数を明記）\n- ダウンロード導線の最適化\n- リード獲得の改善機会',
    externalLinks: '- ユーザーの関心がある外部コンテンツ（データに記載されている実際のリンクURLとクリック数を明記）\n- アフィリエイトやパートナーシップの効果\n- 内部コンテンツ強化の機会',
    conversions: '- CVイベント別のパフォーマンス（データに記載されている実際のイベント名とCV数を明記）\n- CV数の推移とトレンド\n- CV最適化の優先順位',
    reverseFlow: '- CVに至る主要な行動パターン（データに記載されている実際のページパスを明記）\n- ファネルのボトルネック\n- 離脱ポイントと改善機会',
  };
  
  return perspectives[pageType] || '- データの全体傾向を分析\n- 改善機会を抽出\n- 具体的なアクションを提案';
}

/**
 * アクション提案の指針を生成
 */
function getActionProposals(pageType, meta) {
  const proposals = {
    dashboard: '  - 最も改善効果の高いKPIの特定と施策提案（具体的な数値目標を明示）\n  - クイックウィン（短期改善）とロングターム施策の提示\n  - 定期的にモニタリングすべき指標の提示',
    summary: '  - トレンドに基づく今後の施策方針（具体的な増減率に基づく）\n  - 成長を加速させるための重点領域\n  - 季節性を考慮した計画立案',
    users: '  - ターゲット顧客層に最適化したコンテンツ改善\n  - デバイス・地域別の最適化施策\n  - 新規顧客層の開拓機会',
    day: '  - ピーク日を活用したキャンペーン施策（具体的な日付を明示）\n  - 低パフォーマンス日の改善策\n  - 定期的なコンテンツ更新タイミング',
    week: '  - 曜日別のコンテンツ公開戦略（具体的な曜日を明示）\n  - 週末向け・平日向けコンテンツの最適化\n  - メールマガジンやSNS投稿の最適タイミング',
    hour: '  - ピーク時間帯に合わせた広告配信最適化（具体的な時間帯を明示）\n  - リアルタイムサポートの人員配置調整\n  - プッシュ通知やメール配信のタイミング最適化',
    channels: '  - 高ROIチャネルへの予算シフト（データに記載されている実際のチャネル名とCVRを明示）\n  - 低パフォーマンスチャネルの改善または撤退\n  - 新規チャネルの開拓機会',
    keywords: '  - タイトル・メタディスクリプションの改善（データに記載されている実際のキーワードを明示）\n  - コンテンツの追加・強化（具体的なキーワードに基づく）\n  - 新規コンテンツのキーワード選定',
    referrals: '  - 主要参照元との関係強化（データに記載されている実際の参照元URLを明示）\n  - 新規パートナーシップの開拓\n  - 被リンク獲得施策の強化',
    pages: '  - 高パフォーマンスページの横展開（データに記載されている実際のページパスを明示）\n  - 低パフォーマンスページの改善（具体的なページパスとPV数・ENG率を明示）\n  - 内部リンク構造の最適化',
    pageCategories: '  - 人気カテゴリへのアクセス導線強化（データに記載されている実際のカテゴリ名を明示）\n  - カテゴリ再編とナビゲーション改善\n  - 低PVカテゴリのコンテンツ強化（具体的なカテゴリ名を明示）',
    landingPages: '  - 高CVRページへの流入増加施策（データに記載されている実際のページパスとCVRを明示）\n  - 低CVRページの改善（具体的なページパスを明示）\n  - 新規ランディングページの作成',
    fileDownloads: '  - 人気資料への導線強化（データに記載されている実際のファイル名を明示）\n  - 新規資料の企画・制作\n  - ダウンロード後のフォローアップ改善',
    externalLinks: '  - 人気外部リンクに関連する内部コンテンツ強化（データに記載されている実際のリンクURLを明示）\n  - アフィリエイトリンクの最適配置\n  - パートナーコンテンツの拡充',
    conversions: '  - 高パフォーマンスCVイベントの強化（データに記載されている実際のイベント名とCV数を明示）\n  - 低パフォーマンスCVの改善施策\n  - マイクロコンバージョンの設定',
    reverseFlow: '  - CVに至る主要経路の強化（データに記載されている実際のページパスを明示）\n  - ファネルのボトルネック解消\n  - 離脱ポイントの改善',
  };
  
  return proposals[pageType] || '  - データに基づく具体的な改善施策\n  - 実装難易度と効果の明示\n  - 優先順位の提示';
}

export { buildPrompt, PAGE_TYPE_META };

