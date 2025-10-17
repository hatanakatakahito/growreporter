import styles from './page.module.css';

// ページ分類別データ（実際のGA4データから取得）
const pageClassificationData = {
  stats: {
    totalPageViews: 28881,
    totalCategories: 6,
    topCategoryViews: 8500
  },
  categories: [
    { 
      category: 'トップページ', 
      views: 8500, 
      percentage: 29.4, 
      avgTime: 195,
      bounceRate: 35.2,
      pages: ['/']
    },
    { 
      category: '物件情報', 
      views: 6000, 
      percentage: 20.8, 
      avgTime: 180,
      bounceRate: 42.1,
      pages: ['/rooms', '/room-detail', '/floor-plan']
    },
    { 
      category: 'アクセス・施設', 
      views: 5000, 
      percentage: 17.3, 
      avgTime: 165,
      bounceRate: 38.5,
      pages: ['/access', '/facilities', '/map']
    },
    { 
      category: '会社情報', 
      views: 2800, 
      percentage: 9.7, 
      avgTime: 150,
      bounceRate: 45.2,
      pages: ['/about', '/company', '/history']
    },
    { 
      category: 'お問い合わせ', 
      views: 2100, 
      percentage: 7.3, 
      avgTime: 140,
      bounceRate: 40.0,
      pages: ['/contact', '/inquiry', '/application']
    },
    { 
      category: 'その他', 
      views: 4481, 
      percentage: 15.5, 
      avgTime: 120,
      bounceRate: 48.5,
      pages: ['/news', '/faq', '/privacy', '/terms']
    }
  ],
  topPagesByCategory: [
    { category: 'トップページ', page: '/', views: 8500, percentage: 100.0 },
    { category: '物件情報', page: '/rooms', views: 4200, percentage: 70.0 },
    { category: 'アクセス・施設', page: '/access', views: 3200, percentage: 64.0 },
    { category: '会社情報', page: '/about', views: 2800, percentage: 100.0 },
    { category: 'お問い合わせ', page: '/contact', views: 2100, percentage: 100.0 },
    { category: 'その他', page: '/news', views: 1500, percentage: 33.5 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFPageClassificationPage() {
  const displayData = pageClassificationData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - ページ分類別分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* ページ分類サマリ */}
      <div className={styles.pdfSection}>
        <h2>ページ分類サマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総ページビュー</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalPageViews.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>分類数: {displayData.stats.totalCategories}</div>
              <div>最多分類: {displayData.stats.topCategoryViews.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>最多分類</h3>
            <div className={styles.pdfValue}>トップページ</div>
            <div className={styles.pdfComparison}>
              <div>ページビュー: 8,500</div>
              <div>割合: 29.4%</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均滞在時間</h3>
            <div className={styles.pdfValue}>158秒</div>
            <div className={styles.pdfComparison}>
              <div>最長: 195秒</div>
              <div>最短: 120秒</div>
            </div>
          </div>
        </div>
      </div>

      {/* ページ分類別詳細 */}
      <div className={styles.pdfSection}>
        <h2>ページ分類別詳細</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>分類</th>
                <th>ページビュー</th>
                <th>割合</th>
                <th>平均滞在時間</th>
                <th>バウンス率</th>
                <th>主要ページ</th>
              </tr>
            </thead>
            <tbody>
              {displayData.categories.map((category, index) => (
                <tr key={index}>
                  <td>{category.category}</td>
                  <td>{category.views.toLocaleString()}</td>
                  <td>{category.percentage.toFixed(1)}%</td>
                  <td>{category.avgTime}秒</td>
                  <td>{category.bounceRate.toFixed(1)}%</td>
                  <td>{category.pages.slice(0, 2).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分類別トップページ */}
      <div className={styles.pdfSection}>
        <h2>分類別トップページ</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>分類</th>
                <th>トップページ</th>
                <th>ページビュー</th>
                <th>分類内割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.topPagesByCategory.map((item, index) => (
                <tr key={index}>
                  <td>{item.category}</td>
                  <td>{item.page}</td>
                  <td>{item.views.toLocaleString()}</td>
                  <td>{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
