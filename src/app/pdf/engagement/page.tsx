import styles from './page.module.css';

// エンゲージメントデータ（実際のGA4データから取得）
const engagementData = {
  stats: {
    totalPageViews: 28881,
    averageSessionDuration: 178, // 秒
    engagementRate: 51.5,
    bounceRate: 48.5
  },
  topPages: [
    { page: '/', views: 8500, percentage: 29.4, avgTime: 195 },
    { page: '/rooms', views: 4200, percentage: 14.5, avgTime: 180 },
    { page: '/access', views: 3200, percentage: 11.1, avgTime: 165 },
    { page: '/about', views: 2800, percentage: 9.7, avgTime: 150 },
    { page: '/contact', views: 2100, percentage: 7.3, avgTime: 140 },
    { page: '/facilities', views: 1800, percentage: 6.2, avgTime: 135 },
    { page: '/news', views: 1500, percentage: 5.2, avgTime: 120 },
    { page: '/faq', views: 1200, percentage: 4.2, avgTime: 110 }
  ],
  pageCategories: [
    { category: 'トップページ', views: 8500, percentage: 29.4 },
    { category: '物件情報', views: 6000, percentage: 20.8 },
    { category: 'アクセス・施設', views: 5000, percentage: 17.3 },
    { category: '会社情報', views: 2800, percentage: 9.7 },
    { category: 'お問い合わせ', views: 2100, percentage: 7.3 },
    { category: 'その他', views: 4481, percentage: 15.5 }
  ],
  landingPages: [
    { page: '/', sessions: 4200, bounceRate: 35.2, avgTime: 195 },
    { page: '/rooms', sessions: 2100, bounceRate: 42.1, avgTime: 180 },
    { page: '/access', sessions: 1600, bounceRate: 38.5, avgTime: 165 },
    { page: '/about', sessions: 1400, bounceRate: 45.2, avgTime: 150 },
    { page: '/contact', sessions: 1050, bounceRate: 40.0, avgTime: 140 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFEngagementPage() {
  const displayData = engagementData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - エンゲージメント分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* エンゲージメントサマリ */}
      <div className={styles.pdfSection}>
        <h2>エンゲージメントサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総ページビュー</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalPageViews.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>平均滞在時間: {displayData.stats.averageSessionDuration}秒</div>
              <div>エンゲージメント率: {displayData.stats.engagementRate}%</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均滞在時間</h3>
            <div className={styles.pdfValue}>{displayData.stats.averageSessionDuration}秒</div>
            <div className={styles.pdfComparison}>
              <div>約{Math.round(displayData.stats.averageSessionDuration / 60)}分</div>
              <div>前月比: +12秒</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>エンゲージメント率</h3>
            <div className={styles.pdfValue}>{displayData.stats.engagementRate}%</div>
            <div className={styles.pdfComparison}>
              <div>バウンス率: {displayData.stats.bounceRate}%</div>
              <div>前月比: +2.1%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 人気ページ（上位8位） */}
      <div className={styles.pdfSection}>
        <h2>人気ページ（上位8位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>ページ</th>
                <th>ページビュー</th>
                <th>割合</th>
                <th>平均滞在時間</th>
              </tr>
            </thead>
            <tbody>
              {displayData.topPages.map((page, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{page.page}</td>
                  <td>{page.views.toLocaleString()}</td>
                  <td>{page.percentage.toFixed(1)}%</td>
                  <td>{page.avgTime}秒</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページカテゴリ別分析 */}
      <div className={styles.pdfSection}>
        <h2>ページカテゴリ別分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>カテゴリ</th>
                <th>ページビュー</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.pageCategories.map((category, index) => (
                <tr key={index}>
                  <td>{category.category}</td>
                  <td>{category.views.toLocaleString()}</td>
                  <td>{category.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ランディングページ（上位5位） */}
      <div className={styles.pdfSection}>
        <h2>ランディングページ（上位5位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>ページ</th>
                <th>セッション数</th>
                <th>バウンス率</th>
                <th>平均滞在時間</th>
              </tr>
            </thead>
            <tbody>
              {displayData.landingPages.map((page, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{page.page}</td>
                  <td>{page.sessions.toLocaleString()}</td>
                  <td>{page.bounceRate.toFixed(1)}%</td>
                  <td>{page.avgTime}秒</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
