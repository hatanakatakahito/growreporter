/**
 * ツールチップ説明文の定数
 *
 * 指標（GA4/GSC メトリクス）の説明は `shared/metrics.json` の description を SSoT とし、
 * このファイルは非メトリクスのツールチップ（ディメンション・サイト診断・Core Web Vitals 等）
 * のみを保持する。
 * getTooltip() は metrics 辞書を優先し、fallback として TOOLTIPS を参照する。
 */

import { getTooltip as getMetricTooltip, resolveAlias } from './metrics';

export const TOOLTIPS = {
  // 非メトリクスのディメンション
  keywords: 'ユーザーがGoogle検索で使用した検索クエリ（キーワード）。Search Consoleから取得されます。',
  device: 'ユーザーが使用したデバイスの種類（デスクトップ、モバイル、タブレット）。',
  channel: 'ユーザーがサイトに到達した経路（オーガニック検索、ダイレクト、ソーシャル、リファラルなど）。',
  source: 'トラフィックの参照元（google、yahoo、facebookなど）。',
  medium: 'トラフィックのメディア（organic、cpc、referral、emailなど）。',
  pageTitle: 'ページのタイトル。',
  pagePath: 'ページのURL パス。',
  landingPage: 'ユーザーが最初に訪れたページ。',
  exitPage: 'ユーザーが最後に閲覧したページ。',
  date: '日付。',
  dayOfWeek: '曜日。',
  hour: '時間帯。',
  eventName: 'イベント名。GA4で計測されているイベントの名前。',
  eventCount: 'イベントの発生回数。',
  fileName: 'ダウンロードされたファイル名。',
  linkUrl: 'クリックされた外部リンクのURL。',

  // ユーザー属性（GA4 指標だが、dictionary に未登録のもの）
  returningUsers: '過去にサイトを訪れたことがあるユーザー数。',

  // コンテンツ興味度（カスタム計算指標）
  interestScore: 'コンテンツ興味度スコア（0〜100）。エンゲージメント率・スクロール完読率・平均滞在時間・非直帰率の各25%加重平均で算出。',
  scrollRate: 'ページの90%以上までスクロールしたユーザーの割合。GA4の拡張計測機能で自動取得されるscrollイベントに基づきます。',

  // 目標（目標値）
  targetSessions: '目標セッション数。月次での目標値を設定します。',
  targetUsers: '目標ユーザー数。月次での目標値を設定します。',
  targetConversions: '目標コンバージョン数。月次での目標値を設定します。',
  targetConversionRate: '目標コンバージョン率。月次での目標値を設定します。',

  // 改善管理
  improvementStatus: '改善課題のステータス（起案、対応中、完了）。',
  improvementPriority: '改善課題の優先度（高、中、低）。',
  improvementCategory: '改善課題のカテゴリ（集客、コンテンツ、デザイン、機能、その他）。',

  // レポート
  reportPeriod: 'レポート対象期間。',
  reportType: 'レポートの種類（週次、月次、カスタム）。',

  // サイト診断 - 総合スコア
  siteHealthScore: 'パフォーマンス（30%）・SEO（30%）・コンテンツ品質（20%）・エンゲージメント（20%）の加重平均で算出されるサイト全体の健全度スコア。',

  // サイト診断 - カテゴリスコア
  diagPerformance: 'PageSpeed Insightsが測定するページの表示速度スコア。モバイルとデスクトップの平均値。90以上で良好。',
  diagSeo: 'PSIのSEOスコア・メタタグの最適度・Search Consoleの指標を総合したSEO評価。',
  diagContentQuality: 'スクレイピングデータをもとに、見出し構造・画像alt属性・テキスト量・メタ情報の充実度を評価したスコア。',
  diagEngagement: 'GA4データから算出。エンゲージメント率（10秒以上滞在または2ページ以上閲覧した訪問の割合）をもとに評価。',

  // サイト診断 - SEO詳細
  psiSeoMobile: 'PageSpeed Insightsがモバイル端末で測定したSEOスコア。メタタグ・クロール可能性・モバイルフレンドリーなどを評価。',
  psiSeoDesktop: 'PageSpeed Insightsがデスクトップ端末で測定したSEOスコア。メタタグ・クロール可能性・構造化データなどを評価。',

  // サイト診断 - Core Web Vitals
  lcp: 'LCP（Largest Contentful Paint）。ページ内で最も大きな画像やテキストが表示されるまでの時間。2.5秒以内が良好。',
  cls: 'CLS（Cumulative Layout Shift）。ページ読み込み中にレイアウトがどれくらいズレるかの指標。0.1以下が良好。',
  tbt: 'TBT（Total Blocking Time）。ページ操作がブロックされる合計時間。200ms以内が良好。',
  fcp: 'FCP（First Contentful Paint）。ページで最初のテキストや画像が表示されるまでの時間。1.8秒以内が良好。',
  ttfb: 'TTFB（Time to First Byte）。ブラウザがサーバーから最初のデータを受け取るまでの時間。800ms以内が良好。',
  si: 'SI（Speed Index）。ページの表示内容が目に見える速度を数値化した指標。3.4秒以内が良好。',
};

/**
 * ツールチップテキストを取得
 *
 * 1. 指標辞書（metrics.js）で解決を試みる（alias / target_ プレフィックス対応）
 * 2. 非メトリクスの TOOLTIPS にフォールバック
 *
 * @param {string} key - ツールチップのキー
 * @returns {string} - ツールチップテキスト
 */
export function getTooltip(key) {
  if (!key) return '';
  if (resolveAlias(key)) {
    return getMetricTooltip(key);
  }
  return TOOLTIPS[key] || '';
}
