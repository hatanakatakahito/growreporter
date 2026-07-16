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
  'analysis/keywords': '検索キーワード',
  'analysis/referrals': '参照元サイト',
  'analysis/pages': 'ページ分析',
  'analysis/page-categories': 'ページカテゴリ分析',
  'analysis/landing-pages': '入口ページ',
  'analysis/file-downloads': '資料ダウンロード',
  'analysis/external-links': '外部リンク分析',
  'analysis/page-flow': '次に見たページ',
  'analysis/conversions': 'コンバージョン一覧',
  'analysis/reverse-flow': '成果までの到達ステップ',
};

/**
 * ページタイプから表示名を取得
 * @param {string} pageType - ページタイプ
 * @returns {string} 表示名
 */
export function getPageTypeLabel(pageType) {
  return PAGE_TYPE_LABELS[pageType] || pageType;
}
