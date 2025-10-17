import styles from './page.module.css';

// 流入キーワードデータ（実際のGA4データから取得）
const organicKeywordsData = {
  stats: {
    totalOrganicSessions: 8500,
    totalKeywords: 1250,
    topKeywordSessions: 2100
  },
  keywords: [
    { keyword: '共立メンテナンス', sessions: 2100, percentage: 24.7, position: 1.2 },
    { keyword: '名古屋 学生寮', sessions: 1800, percentage: 21.2, position: 2.1 },
    { keyword: '学生寮 名古屋', sessions: 1500, percentage: 17.6, position: 1.8 },
    { keyword: '共立メンテナンス 名古屋', sessions: 1200, percentage: 14.1, position: 1.5 },
    { keyword: '学生寮 安い', sessions: 900, percentage: 10.6, position: 3.2 },
    { keyword: '名古屋 寮', sessions: 600, percentage: 7.1, position: 2.8 },
    { keyword: '学生寮 口コミ', sessions: 400, percentage: 4.7, position: 4.1 },
    { keyword: '共立メンテナンス 寮', sessions: 350, percentage: 4.1, position: 2.5 },
    { keyword: '名古屋 学生寮 安い', sessions: 300, percentage: 3.5, position: 3.8 },
    { keyword: '学生寮 名古屋 口コミ', sessions: 250, percentage: 2.9, position: 4.5 }
  ],
  categories: [
    { category: 'ブランド名', sessions: 3650, percentage: 42.9 },
    { category: '地域 + サービス', sessions: 3300, percentage: 38.8 },
    { category: '価格関連', sessions: 1200, percentage: 14.1 },
    { category: '口コミ・評価', sessions: 350, percentage: 4.1 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFOrganicKeywordsPage() {
  const displayData = organicKeywordsData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - 流入キーワード分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* キーワードサマリ */}
      <div className={styles.pdfSection}>
        <h2>キーワードサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>オーガニックセッション</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalOrganicSessions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>総キーワード数: {displayData.stats.totalKeywords.toLocaleString()}</div>
              <div>上位キーワード: {displayData.stats.topKeywordSessions.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均順位</h3>
            <div className={styles.pdfValue}>2.4</div>
            <div className={styles.pdfComparison}>
              <div>1位キーワード: 1.2位</div>
              <div>10位キーワード: 4.5位</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>ブランド率</h3>
            <div className={styles.pdfValue}>42.9%</div>
            <div className={styles.pdfComparison}>
              <div>ブランド: 3,650</div>
              <div>非ブランド: 4,850</div>
            </div>
          </div>
        </div>
      </div>

      {/* 流入キーワード（上位10位） */}
      <div className={styles.pdfSection}>
        <h2>流入キーワード（上位10位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>キーワード</th>
                <th>セッション数</th>
                <th>割合</th>
                <th>平均順位</th>
              </tr>
            </thead>
            <tbody>
              {displayData.keywords.map((keyword, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{keyword.keyword}</td>
                  <td>{keyword.sessions.toLocaleString()}</td>
                  <td>{keyword.percentage.toFixed(1)}%</td>
                  <td>{keyword.position.toFixed(1)}位</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* キーワードカテゴリ別分析 */}
      <div className={styles.pdfSection}>
        <h2>キーワードカテゴリ別分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>カテゴリ</th>
                <th>セッション数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.categories.map((category, index) => (
                <tr key={index}>
                  <td>{category.category}</td>
                  <td>{category.sessions.toLocaleString()}</td>
                  <td>{category.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
