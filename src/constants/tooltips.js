/**
 * ツールチップ説明文の定数
 * 旧形式から引き継いだ説明文を一元管理
 */

export const TOOLTIPS = {
  // 基本指標
  sessions: 'ユーザーがサイトを訪問した回数（30分以上の間隔で区切られる）',
  users: 'サイトを訪問したユニークユーザーの総数',
  pageViews: 'ページが閲覧された総回数（同じページの再表示も含む）',
  avgPageviews: '1セッションあたりの平均ページビュー数',
  engagementRate: 'エンゲージメント率：10秒以上滞在または2ページ以上閲覧したセッションの割合',
  bounceRate: '1ページのみ閲覧して離脱したセッションの割合。',
  avgSessionDuration: 'セッションあたりの平均滞在時間。',
  
  // コンバージョン
  conversions: 'サイト設定で定義したコンバージョンの合計数',
  conversionRate: 'コンバージョンが発生したセッションの割合',
  
  // SEO指標
  keywords: 'ユーザーがGoogle検索で使用した検索クエリ（キーワード）。Search Consoleから取得されます。',
  clicks: 'Google検索結果からサイトへのクリック数。',
  impressions: 'Google検索結果にサイトが表示された回数。',
  ctr: 'クリック率。表示回数に対するクリック数の割合。（クリック数 ÷ 表示回数）× 100',
  position: 'Google検索結果での平均掲載順位。数値が小さいほど上位に表示されています。',
  
  // ユーザー属性
  newUsers: '初めてサイトを訪れたユーザー数。',
  returningUsers: '過去にサイトを訪れたことがあるユーザー数。',
  
  // デバイス
  device: 'ユーザーが使用したデバイスの種類（デスクトップ、モバイル、タブレット）。',
  
  // 集客
  channel: 'ユーザーがサイトに到達した経路（オーガニック検索、ダイレクト、ソーシャル、リファラルなど）。',
  source: 'トラフィックの参照元（google、yahoo、facebookなど）。',
  medium: 'トラフィックのメディア（organic、cpc、referral、emailなど）。',
  
  // エンゲージメント
  pageTitle: 'ページのタイトル。',
  pagePath: 'ページのURL パス。',
  landingPage: 'ユーザーが最初に訪れたページ。',
  exitPage: 'ユーザーが最後に閲覧したページ。',
  avgSessionDuration: 'セッションあたりの平均滞在時間。',
  
  // 時系列
  date: '日付。',
  dayOfWeek: '曜日。',
  hour: '時間帯。',
  
  // KPI
  targetSessions: '目標セッション数。月次での目標値を設定します。',
  targetUsers: '目標ユーザー数。月次での目標値を設定します。',
  targetConversions: '目標コンバージョン数。月次での目標値を設定します。',
  targetConversionRate: '目標コンバージョン率。月次での目標値を設定します。',
  
  // その他
  eventName: 'イベント名。GA4で計測されているイベントの名前。',
  eventCount: 'イベントの発生回数。',
  fileName: 'ダウンロードされたファイル名。',
  linkUrl: 'クリックされた外部リンクのURL。',
  
  // 改善管理
  improvementStatus: '改善課題のステータス（起案、対応中、完了）。',
  improvementPriority: '改善課題の優先度（高、中、低）。',
  improvementCategory: '改善課題のカテゴリ（集客、コンテンツ、デザイン、機能、その他）。',
  
  // レポート
  reportPeriod: 'レポート対象期間。',
  reportType: 'レポートの種類（週次、月次、カスタム）。',
};

/**
 * ツールチップテキストを取得
 * @param {string} key - ツールチップのキー
 * @returns {string} - ツールチップテキスト
 */
export function getTooltip(key) {
  return TOOLTIPS[key] || '';
}



