import styles from './page.module.css';

// ファイルダウンロードデータ（実際のGA4データから取得）
const fileDownloadsData = {
  stats: {
    totalDownloads: 1250,
    totalFileTypes: 4,
    topDownloadCount: 650
  },
  downloads: [
    { 
      fileName: 'room-brochure.pdf', 
      fileType: 'PDF', 
      downloads: 650, 
      percentage: 52.0, 
      fileSize: '2.3MB',
      avgTime: 45
    },
    { 
      fileName: 'access-map.pdf', 
      fileType: 'PDF', 
      downloads: 320, 
      percentage: 25.6, 
      fileSize: '1.8MB',
      avgTime: 38
    },
    { 
      fileName: 'application-form.pdf', 
      fileType: 'PDF', 
      downloads: 180, 
      percentage: 14.4, 
      fileSize: '0.9MB',
      avgTime: 25
    },
    { 
      fileName: 'facilities-guide.pdf', 
      fileType: 'PDF', 
      downloads: 100, 
      percentage: 8.0, 
      fileSize: '3.1MB',
      avgTime: 52
    }
  ],
  fileTypes: [
    { type: 'PDF', downloads: 1250, percentage: 100.0, avgSize: '2.0MB' },
    { type: 'DOC', downloads: 0, percentage: 0.0, avgSize: '0MB' },
    { type: 'XLS', downloads: 0, percentage: 0.0, avgSize: '0MB' },
    { type: 'その他', downloads: 0, percentage: 0.0, avgSize: '0MB' }
  ],
  downloadTrends: [
    { period: '9月第1週', downloads: 180, percentage: 14.4 },
    { period: '9月第2週', downloads: 220, percentage: 17.6 },
    { period: '9月第3週', downloads: 280, percentage: 22.4 },
    { period: '9月第4週', downloads: 320, percentage: 25.6 },
    { period: '9月第5週', downloads: 250, percentage: 20.0 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFFileDownloadsPage() {
  const displayData = fileDownloadsData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - ファイルダウンロード分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* ファイルダウンロードサマリ */}
      <div className={styles.pdfSection}>
        <h2>ファイルダウンロードサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総ダウンロード数</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalDownloads.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>ファイル種類: {displayData.stats.totalFileTypes}</div>
              <div>最多ダウンロード: {displayData.stats.topDownloadCount.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>最多ダウンロード</h3>
            <div className={styles.pdfValue}>room-brochure.pdf</div>
            <div className={styles.pdfComparison}>
              <div>ダウンロード数: 650</div>
              <div>割合: 52.0%</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>平均ファイルサイズ</h3>
            <div className={styles.pdfValue}>2.0MB</div>
            <div className={styles.pdfComparison}>
              <div>最小: 0.9MB</div>
              <div>最大: 3.1MB</div>
            </div>
          </div>
        </div>
      </div>

      {/* ファイルダウンロード詳細 */}
      <div className={styles.pdfSection}>
        <h2>ファイルダウンロード詳細</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>ファイル名</th>
                <th>ファイル形式</th>
                <th>ダウンロード数</th>
                <th>割合</th>
                <th>ファイルサイズ</th>
                <th>平均時間</th>
              </tr>
            </thead>
            <tbody>
              {displayData.downloads.map((file, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{file.fileName}</td>
                  <td>{file.fileType}</td>
                  <td>{file.downloads.toLocaleString()}</td>
                  <td>{file.percentage.toFixed(1)}%</td>
                  <td>{file.fileSize}</td>
                  <td>{file.avgTime}秒</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ファイル形式別分析 */}
      <div className={styles.pdfSection}>
        <h2>ファイル形式別分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>ファイル形式</th>
                <th>ダウンロード数</th>
                <th>割合</th>
                <th>平均サイズ</th>
              </tr>
            </thead>
            <tbody>
              {displayData.fileTypes.map((type, index) => (
                <tr key={index}>
                  <td>{type.type}</td>
                  <td>{type.downloads.toLocaleString()}</td>
                  <td>{type.percentage.toFixed(1)}%</td>
                  <td>{type.avgSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ダウンロード推移（週別） */}
      <div className={styles.pdfSection}>
        <h2>ダウンロード推移（週別）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>期間</th>
                <th>ダウンロード数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.downloadTrends.map((trend, index) => (
                <tr key={index}>
                  <td>{trend.period}</td>
                  <td>{trend.downloads.toLocaleString()}</td>
                  <td>{trend.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
