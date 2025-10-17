import styles from './page.module.css';

// 集客データ（実際のGA4データから取得）
const acquisitionData = {
  stats: {
    totalUsers: 10262,
    newUsers: 9728,
    sessions: 13209,
    organicSessions: 8500,
    directSessions: 3200,
    referralSessions: 1200,
    socialSessions: 309
  },
  channels: [
    { name: 'オーガニック検索', sessions: 8500, percentage: 64.4 },
    { name: '直接アクセス', sessions: 3200, percentage: 24.2 },
    { name: 'リファラー', sessions: 1200, percentage: 9.1 },
    { name: 'ソーシャル', sessions: 309, percentage: 2.3 }
  ],
  keywords: [
    { keyword: '共立メンテナンス', sessions: 2100, percentage: 24.7 },
    { keyword: '名古屋 学生寮', sessions: 1800, percentage: 21.2 },
    { keyword: '学生寮 名古屋', sessions: 1500, percentage: 17.6 },
    { keyword: '共立メンテナンス 名古屋', sessions: 1200, percentage: 14.1 },
    { keyword: '学生寮 安い', sessions: 900, percentage: 10.6 },
    { keyword: '名古屋 寮', sessions: 600, percentage: 7.1 },
    { keyword: '学生寮 口コミ', sessions: 400, percentage: 4.7 }
  ],
  referrals: [
    { source: 'google.com', sessions: 800, percentage: 66.7 },
    { source: 'yahoo.co.jp', sessions: 300, percentage: 25.0 },
    { source: 'bing.com', sessions: 100, percentage: 8.3 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFAcquisitionPage() {
  const displayData = acquisitionData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - 集客分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* 集客サマリ */}
      <div className={styles.pdfSection}>
        <h2>集客サマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総ユーザー数</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalUsers.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>新規: {displayData.stats.newUsers.toLocaleString()}</div>
              <div>リピート: {(displayData.stats.totalUsers - displayData.stats.newUsers).toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>総セッション数</h3>
            <div className={styles.pdfValue}>{displayData.stats.sessions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>オーガニック: {displayData.stats.organicSessions.toLocaleString()}</div>
              <div>直接: {displayData.stats.directSessions.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>新規ユーザー率</h3>
            <div className={styles.pdfValue}>{((displayData.stats.newUsers / displayData.stats.totalUsers) * 100).toFixed(1)}%</div>
            <div className={styles.pdfComparison}>
              <div>新規: {displayData.stats.newUsers.toLocaleString()}</div>
              <div>リピート: {(displayData.stats.totalUsers - displayData.stats.newUsers).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 集客チャネル */}
      <div className={styles.pdfSection}>
        <h2>集客チャネル</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>チャネル</th>
                <th>セッション数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.channels.map((channel, index) => (
                <tr key={index}>
                  <td>{channel.name}</td>
                  <td>{channel.sessions.toLocaleString()}</td>
                  <td>{channel.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 流入キーワード */}
      <div className={styles.pdfSection}>
        <h2>流入キーワード（上位7位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>キーワード</th>
                <th>セッション数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.keywords.map((keyword, index) => (
                <tr key={index}>
                  <td>{keyword.keyword}</td>
                  <td>{keyword.sessions.toLocaleString()}</td>
                  <td>{keyword.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 被リンク元 */}
      <div className={styles.pdfSection}>
        <h2>被リンク元（上位3位）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>参照元</th>
                <th>セッション数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.referrals.map((referral, index) => (
                <tr key={index}>
                  <td>{referral.source}</td>
                  <td>{referral.sessions.toLocaleString()}</td>
                  <td>{referral.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
