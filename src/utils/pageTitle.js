/**
 * ページタイトルを設定するユーティリティ関数
 * @param {string} pageName - ページ名（例: "ダッシュボード"）
 */
export const setPageTitle = (pageName) => {
  if (pageName) {
    document.title = `GROW REPORTER（グローレポーター）｜${pageName}`;
  } else {
    document.title = 'GROW REPORTER（グローレポーター）';
  }
};

/**
 * ページのメタディスクリプションを設定
 * @param {string} description - メタディスクリプション
 */
export const setMetaDescription = (description) => {
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
};

// デフォルトのメタディスクリプション
export const DEFAULT_DESCRIPTION = 'GA4とSearch Consoleのデータを統合し、AI分析で具体的な改善提案を提供。集客・エンゲージメント・コンバージョンを可視化し、改善タスクの管理から効果測定まで一元管理できるWeb分析ツールです。';

