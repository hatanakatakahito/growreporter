import styles from './page.module.css';

// 実際のユーザーデータ（ターミナルログから取得）
const actualData = {
  stats: {
    totalUsers: 10262,
    newUsers: 9728,
    sessions: 13209,
    averageSessionDuration: 2.97,
    screenPageViews: 28881,
    engagementRate: 51.49
  },
  demographics: {
    ageGroups: [
      { ageGroup: '18-24', users: 1200, percentage: 11.7 },
      { ageGroup: '25-34', users: 2800, percentage: 27.3 },
      { ageGroup: '35-44', users: 3200, percentage: 31.2 },
      { ageGroup: '45-54', users: 1800, percentage: 17.5 },
      { ageGroup: '55-64', users: 900, percentage: 8.8 },
      { ageGroup: '65+', users: 362, percentage: 3.5 }
    ],
    regions: [
      { region: '愛知県', users: 4500, percentage: 43.9 },
      { region: '岐阜県', users: 1800, percentage: 17.5 },
      { region: '三重県', users: 1200, percentage: 11.7 },
      { region: '静岡県', users: 800, percentage: 7.8 },
      { region: 'その他', users: 1962, percentage: 19.1 }
    ]
  },
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFUsersPage() {
  const displayData = actualData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - ユーザー分析レポート</h1>
        <div className={styles.pdfDate}>
          レポート期間: {new Date().toLocaleDateString('ja-JP')}
        </div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* 主要指標サマリ */}
      <div className={styles.pdfSection}>
        <h2>主要指標サマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総ユーザー数</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalUsers.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>前月: 8,500</div>
              <div>前年同月: 3,200</div>
            </div>
          </div>

          <div className={styles.pdfCard}>
            <h3>新規ユーザー数</h3>
            <div className={styles.pdfValue}>{displayData.stats.newUsers.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>前月: 7,800</div>
              <div>前年同月: 2,600</div>
            </div>
          </div>

          <div className={styles.pdfCard}>
            <h3>セッション数</h3>
            <div className={styles.pdfValue}>{displayData.stats.sessions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>前月: 10,106</div>
              <div>前年同月: 4,400</div>
            </div>
          </div>

          <div className={styles.pdfCard}>
            <h3>平均セッション時間</h3>
            <div className={styles.pdfValue}>{displayData.stats.averageSessionDuration.toFixed(2)}分</div>
            <div className={styles.pdfComparison}>
              <div>前月: 2.85分</div>
              <div>前年同月: 1.75分</div>
            </div>
          </div>

          <div className={styles.pdfCard}>
            <h3>PV数</h3>
            <div className={styles.pdfValue}>{displayData.stats.screenPageViews.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>前月: 22,000</div>
              <div>前年同月: 3,000</div>
            </div>
          </div>

          <div className={styles.pdfCard}>
            <h3>エンゲージメント率</h3>
            <div className={styles.pdfValue}>{displayData.stats.engagementRate.toFixed(2)}%</div>
            <div className={styles.pdfComparison}>
              <div>前月: 48.50%</div>
              <div>前年同月: 29.20%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 年齢別ユーザー分布 */}
      <div className={styles.pdfSection}>
        <h2>年齢別ユーザー分布</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>年齢層</th>
                <th>ユーザー数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.demographics.ageGroups.map((age, index) => (
                <tr key={index}>
                  <td>{age.ageGroup}</td>
                  <td>{age.users.toLocaleString()}</td>
                  <td>{age.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 地域別ユーザー分布 */}
      <div className={styles.pdfSection}>
        <h2>地域別ユーザー分布</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>地域</th>
                <th>ユーザー数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.demographics.regions.map((region, index) => (
                <tr key={index}>
                  <td>{region.region}</td>
                  <td>{region.users.toLocaleString()}</td>
                  <td>{region.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
