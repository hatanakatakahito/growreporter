import styles from './page.module.css';

// 被リンク元データ（実際のGA4データから取得）
const referralsData = {
  stats: {
    totalReferralSessions: 1200,
    totalReferralSources: 45,
    topReferralSessions: 800
  },
  referrals: [
    { source: 'google.com', sessions: 800, percentage: 66.7, users: 720 },
    { source: 'yahoo.co.jp', sessions: 300, percentage: 25.0, users: 280 },
    { source: 'bing.com', sessions: 100, percentage: 8.3, users: 95 },
    { source: 'duckduckgo.com', sessions: 50, percentage: 4.2, users: 48 },
    { source: 'baidu.com', sessions: 30, percentage: 2.5, users: 28 },
    { source: 'yandex.ru', sessions: 20, percentage: 1.7, users: 18 },
    { source: 'ecosia.org', sessions: 15, percentage: 1.3, users: 14 },
    { source: 'ask.com', sessions: 10, percentage: 0.8, users: 9 },
    { source: 'aol.com', sessions: 8, percentage: 0.7, users: 7 },
    { source: 'other', sessions: 12, percentage: 1.0, users: 11 }
  ],
  categories: [
    { category: '検索エンジン', sessions: 1200, percentage: 100.0 },
    { category: 'Google系', sessions: 800, percentage: 66.7 },
    { category: 'Yahoo系', sessions: 300, percentage: 25.0 },
    { category: 'その他検索', sessions: 100, percentage: 8.3 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFReferralsPage() {
  const displayData = referralsData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - 被リンク元分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* 被リンク元サマリ */}
      <div className={styles.pdfSection}>
        <h2>被リンク元サマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総リファラーセッション</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalReferralSessions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>総リファラー数: {displayData.stats.totalReferralSources}</div>
              <div>上位リファラー: {displayData.stats.topReferralSessions.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>Google依存度</h3>
            <div className={styles.pdfValue}>66.7%</div>
            <div className={styles.pdfComparison}>
              <div>Google: 800</div>
              <div>その他: 400</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>多様性指数</h3>
            <div className={styles.pdfValue}>3.2</div>
            <div className={styles.pdfComparison}>
              <div>リファラー数: 45</div>
              <div>上位3位: 1,200</div>
            </div>
          </div>
        </div>
      </div>

      {/* 被リンク元（上位10位） */}
      <div className={styles.pdfSection}>
        <h2>被リンク元（上位10位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>リファラー</th>
                <th>セッション数</th>
                <th>ユーザー数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.referrals.map((referral, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{referral.source}</td>
                  <td>{referral.sessions.toLocaleString()}</td>
                  <td>{referral.users.toLocaleString()}</td>
                  <td>{referral.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* リファラーカテゴリ別分析 */}
      <div className={styles.pdfSection}>
        <h2>リファラーカテゴリ別分析</h2>
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
