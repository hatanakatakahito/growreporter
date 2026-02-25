/**
 * ページタイプの表示名マッピング
 */
export const PAGE_TYPE_LABELS = {
  'dashboard': 'ダッシュボード',
  'analysis/summary': '分析サマリー',
  'analysis/day': '曜日別分析',
  'analysis/week': '週次分析',
  'analysis/hour': '時間帯別分析',
  'analysis/users': 'ユーザー分析',
  'analysis/channels': '流入チャネル分析',
  'analysis/keywords': 'キーワード分析',
  'analysis/referrals': '参照元分析',
  'analysis/pages': 'ページ分析',
  'analysis/page-categories': 'ページカテゴリ分析',
  'analysis/landing-pages': 'ランディングページ分析',
  'analysis/file-downloads': 'ファイルダウンロード分析',
  'analysis/external-links': '外部リンク分析',
  'analysis/page-flow': 'ページフロー',
  'analysis/conversions': 'コンバージョン一覧',
  'analysis/reverse-flow': '逆引きフロー',
};

/**
 * ページタイプから表示名を取得
 * @param {string} pageType - ページタイプ
 * @returns {string} 表示名
 */
export function getPageTypeLabel(pageType) {
  return PAGE_TYPE_LABELS[pageType] || pageType;
}
