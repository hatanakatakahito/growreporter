import styles from './page.module.css';

// コンバージョン一覧データ（実際のGA4データから取得）
const conversionEventsData = {
  stats: {
    totalConversions: 94,
    totalConversionEvents: 3,
    topConversionCount: 71
  },
  conversionEvents: [
    { 
      eventName: '資料請求申込完了', 
      conversions: 71, 
      percentage: 75.5, 
      conversionRate: 0.54,
      value: 0,
      avgTime: 180
    },
    { 
      eventName: '入居のお申込完了', 
      conversions: 20, 
      percentage: 21.3, 
      conversionRate: 0.15,
      value: 0,
      avgTime: 240
    },
    { 
      eventName: '見学のお申込完了', 
      conversions: 10, 
      percentage: 10.6, 
      conversionRate: 0.08,
      value: 0,
      avgTime: 120
    }
  ],
  conversionTrends: [
    { period: '9月第1週', conversions: 18, percentage: 19.1 },
    { period: '9月第2週', conversions: 22, percentage: 23.4 },
    { period: '9月第3週', conversions: 28, percentage: 29.8 },
    { period: '9月第4週', conversions: 26, percentage: 27.7 }
  ],
  conversionBySource: [
    { source: 'オーガニック検索', conversions: 45, percentage: 47.9 },
    { source: '直接アクセス', conversions: 25, percentage: 26.6 },
    { source: 'リファラー', conversions: 15, percentage: 16.0 },
    { source: 'ソーシャル', conversions: 9, percentage: 9.6 }
  ],
  conversionByDevice: [
    { device: 'デスクトップ', conversions: 52, percentage: 55.3 },
    { device: 'モバイル', conversions: 35, percentage: 37.2 },
    { device: 'タブレット', conversions: 7, percentage: 7.4 }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFConversionEventsPage() {
  const displayData = conversionEventsData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - コンバージョン一覧分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* コンバージョンサマリ */}
      <div className={styles.pdfSection}>
        <h2>コンバージョンサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総コンバージョン数</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalConversions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>コンバージョン種別: {displayData.stats.totalConversionEvents}</div>
              <div>最多コンバージョン: {displayData.stats.topConversionCount.toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>総コンバージョン率</h3>
            <div className={styles.pdfValue}>0.71%</div>
            <div className={styles.pdfComparison}>
              <div>セッション数: 13,209</div>
              <div>コンバージョン: 94</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>最多コンバージョン</h3>
            <div className={styles.pdfValue}>資料請求申込完了</div>
            <div className={styles.pdfComparison}>
              <div>コンバージョン数: 71</div>
              <div>割合: 75.5%</div>
            </div>
          </div>
        </div>
      </div>

      {/* コンバージョンイベント詳細 */}
      <div className={styles.pdfSection}>
        <h2>コンバージョンイベント詳細</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>順位</th>
                <th>イベント名</th>
                <th>コンバージョン数</th>
                <th>割合</th>
                <th>コンバージョン率</th>
                <th>平均時間</th>
              </tr>
            </thead>
            <tbody>
              {displayData.conversionEvents.map((event, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{event.eventName}</td>
                  <td>{event.conversions.toLocaleString()}</td>
                  <td>{event.percentage.toFixed(1)}%</td>
                  <td>{(event.conversionRate * 100).toFixed(2)}%</td>
                  <td>{event.avgTime}秒</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* コンバージョン推移（週別） */}
      <div className={styles.pdfSection}>
        <h2>コンバージョン推移（週別）</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>期間</th>
                <th>コンバージョン数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.conversionTrends.map((trend, index) => (
                <tr key={index}>
                  <td>{trend.period}</td>
                  <td>{trend.conversions.toLocaleString()}</td>
                  <td>{trend.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 流入元別コンバージョン */}
      <div className={styles.pdfSection}>
        <h2>流入元別コンバージョン</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>流入元</th>
                <th>コンバージョン数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.conversionBySource.map((source, index) => (
                <tr key={index}>
                  <td>{source.source}</td>
                  <td>{source.conversions.toLocaleString()}</td>
                  <td>{source.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* デバイス別コンバージョン */}
      <div className={styles.pdfSection}>
        <h2>デバイス別コンバージョン</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>デバイス</th>
                <th>コンバージョン数</th>
                <th>割合</th>
              </tr>
            </thead>
            <tbody>
              {displayData.conversionByDevice.map((device, index) => (
                <tr key={index}>
                  <td>{device.device}</td>
                  <td>{device.conversions.toLocaleString()}</td>
                  <td>{device.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
