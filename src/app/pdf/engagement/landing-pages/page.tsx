import styles from './page.module.css';

// ランディングページデータ（実際のGA4データから取得）
const landingPagesData = {
  stats: {
    totalLandingSessions: 10350,
    totalLandingPages: 15,
    topLandingSessions: 4200
  },
  landingPages: [
    { 
      page: '/', 
      sessions: 4200, 
      percentage: 40.6, 
      bounceRate: 35.2, 
      avgTime: 195,
      exitRate: 25.8,
      pageViews: 8500
    },
    { 
      page: '/rooms', 
      sessions: 2100, 
      percentage: 20.3, 
      bounceRate: 42.1, 
      avgTime: 180,
      exitRate: 30.5,
      pageViews: 4200
    },
    { 
      page: '/access', 
      sessions: 1600, 
      percentage: 15.5, 
      bounceRate: 38.5, 
      avgTime: 165,
      exitRate: 28.2,
      pageViews: 3200
    },
    { 
      page: '/about', 
      sessions: 1400, 
      percentage: 13.5, 
      bounceRate: 45.2, 
      avgTime: 150,
      exitRate: 35.1,
      pageViews: 2800
    },
    { 
      page: '/contact', 
      sessions: 1050, 
      percentage: 10.1, 
      bounceRate: 40.0, 
      avgTime: 140,
      exitRate: 32.8,
      pageViews: 2100
    }
  ],
  bounceRateAnalysis: [
    { range: '0-30%', count: 1, percentage: 20.0 },
    { range: '30-40%', count: 2, percentage: 40.0 },
    { range: '40-50%', count: 2, percentage: 40.0 },
    { range: '50%以上', count: 0, percentage: 0.0 }
  ],
  avgTimeAnalysis: [
    { range: '0-120秒', count: 0, percentage: 0.0 },
    { range: '120-150秒', count: 2, percentage: 40.0 },
    { range: '150-180秒', count: 2, percentage: 40.0 },
    { range: '180秒以上', count: 1, percentage: 20.0 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFLandingPagesPage() {
  const displayData = landingPagesData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - ランディングページ分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* ランディングページサマリ */}
      <div className={styles.pdfSection}>
        <h2>ランディングページサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総ランディングセッション</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalLandingSessions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>ランディングページ数: {displayData.stats.totalLandingPages}</div>
              <div>最多セッション: {displayData.stats.topLandingSessions.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均バウンス率</h3>
            <div className={styles.pdfValue}>40.2%</div>
            <div className={styles.pdfComparison}>
              <div>最低: 35.2%</div>
              <div>最高: 45.2%</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均滞在時間</h3>
            <div className={styles.pdfValue}>166秒</div>
            <div className={styles.pdfComparison}>
              <div>最低: 140秒</div>
              <div>最高: 195秒</div>
            </div>
          </div>
        </div>
      </div>

      {/* ランディングページ詳細（上位5位） */}
      <div className={styles.pdfSection}>
        <h2>ランディングページ詳細（上位5位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>ページ</th>
                <th>セッション数</th>
                <th>割合</th>
                <th>バウンス率</th>
                <th>平均滞在時間</th>
                <th>離脱率</th>
                <th>ページビュー</th>
              </tr>
            </thead>
            <tbody>
              {displayData.landingPages.map((page, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{page.page}</td>
                  <td>{page.sessions.toLocaleString()}</td>
                  <td>{page.percentage.toFixed(1)}%</td>
                  <td>{page.bounceRate.toFixed(1)}%</td>
                  <td>{page.avgTime}秒</td>
                  <td>{page.exitRate.toFixed(1)}%</td>
                  <td>{page.pageViews.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* バウンス率分析 */}
      <div className={styles.pdfSection}>
        <h2>バウンス率分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>バウンス率範囲</th>
                <th>ページ数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.bounceRateAnalysis.map((analysis, index) => (
                <tr key={index}>
                  <td>{analysis.range}</td>
                  <td>{analysis.count}</td>
                  <td>{analysis.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 平均滞在時間分析 */}
      <div className={styles.pdfSection}>
        <h2>平均滞在時間分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>滞在時間範囲</th>
                <th>ページ数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.avgTimeAnalysis.map((analysis, index) => (
                <tr key={index}>
                  <td>{analysis.range}</td>
                  <td>{analysis.count}</td>
                  <td>{analysis.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
