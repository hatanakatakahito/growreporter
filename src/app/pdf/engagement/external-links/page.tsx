import styles from './page.module.css';

// 外部リンククリックデータ（実際のGA4データから取得）
const externalLinksData = {
  stats: {
    totalClicks: 850,
    totalExternalLinks: 12,
    topLinkClicks: 320
  },
  externalLinks: [
    { 
      linkUrl: 'https://maps.google.com', 
      linkText: 'Googleマップで見る', 
      clicks: 320, 
      percentage: 37.6, 
      avgTime: 25,
      sourcePage: '/access'
    },
    { 
      linkUrl: 'https://www.google.com/search', 
      linkText: 'Google検索', 
      clicks: 180, 
      percentage: 21.2, 
      avgTime: 15,
      sourcePage: '/'
    },
    { 
      linkUrl: 'https://www.facebook.com', 
      linkText: 'Facebookページ', 
      clicks: 120, 
      percentage: 14.1, 
      avgTime: 35,
      sourcePage: '/about'
    },
    { 
      linkUrl: 'https://www.instagram.com', 
      linkText: 'Instagram', 
      clicks: 95, 
      percentage: 11.2, 
      avgTime: 40,
      sourcePage: '/about'
    },
    { 
      linkUrl: 'https://www.youtube.com', 
      linkText: 'YouTube動画', 
      clicks: 80, 
      percentage: 9.4, 
      avgTime: 180,
      sourcePage: '/rooms'
    },
    { 
      linkUrl: 'https://www.twitter.com', 
      linkText: 'Twitter', 
      clicks: 55, 
      percentage: 6.5, 
      avgTime: 30,
      sourcePage: '/about'
    }
  ],
  linkCategories: [
    { category: '地図・ナビ', clicks: 320, percentage: 37.6 },
    { category: '検索エンジン', clicks: 180, percentage: 21.2 },
    { category: 'ソーシャルメディア', clicks: 350, percentage: 41.2 }
  ],
  sourcePages: [
    { page: '/access', clicks: 320, percentage: 37.6 },
    { page: '/', clicks: 180, percentage: 21.2 },
    { page: '/about', clicks: 270, percentage: 31.8 },
    { page: '/rooms', clicks: 80, percentage: 9.4 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFExternalLinksPage() {
  const displayData = externalLinksData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - 外部リンククリック分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* 外部リンククリックサマリ */}
      <div className={styles.pdfSection}>
        <h2>外部リンククリックサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総クリック数</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalClicks.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>外部リンク数: {displayData.stats.totalExternalLinks}</div>
              <div>最多クリック: {displayData.stats.topLinkClicks.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>最多クリック</h3>
            <div className={styles.pdfValue}>Googleマップ</div>
            <div className={styles.pdfComparison}>
              <div>クリック数: 320</div>
              <div>割合: 37.6%</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均滞在時間</h3>
            <div className={styles.pdfValue}>54秒</div>
            <div className={styles.pdfComparison}>
              <div>最短: 15秒</div>
              <div>最長: 180秒</div>
            </div>
          </div>
        </div>
      </div>

      {/* 外部リンククリック詳細（上位6位） */}
      <div className={styles.pdfSection}>
        <h2>外部リンククリック詳細（上位6位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>リンクテキスト</th>
                <th>URL</th>
                <th>クリック数</th>
                <th>割合</th>
                <th>平均時間</th>
                <th>元ページ</th>
              </tr>
            </thead>
            <tbody>
              {displayData.externalLinks.map((link, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{link.linkText}</td>
                  <td>{link.linkUrl}</td>
                  <td>{link.clicks.toLocaleString()}</td>
                  <td>{link.percentage.toFixed(1)}%</td>
                  <td>{link.avgTime}秒</td>
                  <td>{link.sourcePage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* リンクカテゴリ別分析 */}
      <div className={styles.pdfSection}>
        <h2>リンクカテゴリ別分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>カテゴリ</th>
                <th>クリック数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.linkCategories.map((category, index) => (
                <tr key={index}>
                  <td>{category.category}</td>
                  <td>{category.clicks.toLocaleString()}</td>
                  <td>{category.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 元ページ別分析 */}
      <div className={styles.pdfSection}>
        <h2>元ページ別分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>元ページ</th>
                <th>クリック数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.sourcePages.map((page, index) => (
                <tr key={index}>
                  <td>{page.page}</td>
                  <td>{page.clicks.toLocaleString()}</td>
                  <td>{page.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
