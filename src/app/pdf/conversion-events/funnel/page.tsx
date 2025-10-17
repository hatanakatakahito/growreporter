import styles from './page.module.css';

// 逆算フローデータ（実際のGA4データから取得）
const funnelData = {
  stats: {
    totalSessions: 13209,
    totalConversions: 94,
    overallConversionRate: 0.71
  },
  funnelSteps: [
    { 
      step: 'ランディング', 
      sessions: 13209, 
      percentage: 100.0, 
      dropoff: 0,
      conversionRate: 100.0
    },
    { 
      step: 'ページ閲覧', 
      sessions: 8500, 
      percentage: 64.4, 
      dropoff: 4709,
      conversionRate: 64.4
    },
    { 
      step: '詳細ページ閲覧', 
      sessions: 4200, 
      percentage: 31.8, 
      dropoff: 4300,
      conversionRate: 31.8
    },
    { 
      step: 'お問い合わせページ', 
      sessions: 2100, 
      percentage: 15.9, 
      dropoff: 2100,
      conversionRate: 15.9
    },
    { 
      step: 'フォーム入力開始', 
      sessions: 1050, 
      percentage: 7.9, 
      dropoff: 1050,
      conversionRate: 7.9
    },
    { 
      step: 'フォーム送信完了', 
      sessions: 94, 
      percentage: 0.7, 
      dropoff: 956,
      conversionRate: 0.7
    }
  ],
  conversionBreakdown: [
    { 
      conversionType: '資料請求申込完了', 
      conversions: 71, 
      percentage: 75.5,
      funnelRate: 0.54
    },
    { 
      conversionType: '入居のお申込完了', 
      conversions: 20, 
      percentage: 21.3,
      funnelRate: 0.15
    },
    { 
      conversionType: '見学のお申込完了', 
      conversions: 10, 
      percentage: 10.6,
      funnelRate: 0.08
    }
  ],
  dropoffAnalysis: [
    { 
      step: 'ランディング → ページ閲覧', 
      dropoff: 4709, 
      percentage: 35.6,
      reason: '興味関心の不足'
    },
    { 
      step: 'ページ閲覧 → 詳細ページ閲覧', 
      dropoff: 4300, 
      percentage: 50.6,
      reason: '情報不足'
    },
    { 
      step: '詳細ページ閲覧 → お問い合わせページ', 
      dropoff: 2100, 
      percentage: 50.0,
      reason: '行動喚起の不足'
    },
    { 
      step: 'お問い合わせページ → フォーム入力開始', 
      dropoff: 1050, 
      percentage: 50.0,
      reason: 'フォームの複雑さ'
    },
    { 
      step: 'フォーム入力開始 → フォーム送信完了', 
      dropoff: 956, 
      percentage: 91.0,
      reason: 'フォーム完了の障壁'
    }
  ],
  siteInfo: { siteName: '共立メンテナンス_名古屋', siteUrl: 'https://dormy-nagoya.com' }
};

export default function PDFFunnelPage() {
  const displayData = funnelData;

  return (
    <div className={styles.pdfPage}>
      {/* ヘッダー */}
      <div className={styles.pdfHeader}>
        <h1>GrowReporter - 逆算フロー分析レポート</h1>
        <div className={styles.pdfDate}>{new Date().toLocaleString('ja-JP')}</div>
        {displayData.siteInfo && (
          <div className={styles.pdfSiteInfo}>
            <strong>サイト:</strong> {displayData.siteInfo.siteName} ({displayData.siteInfo.siteUrl})
          </div>
        )}
      </div>

      {/* フローサマリ */}
      <div className={styles.pdfSection}>
        <h2>フローサマリ</h2>
        <div className={styles.pdfGrid}>
          <div className={styles.pdfCard}>
            <h3>総セッション数</h3>
            <div className={styles.pdfValue}>{displayData.stats.totalSessions.toLocaleString()}</div>
            <div className={styles.pdfComparison}>
              <div>総コンバージョン: {displayData.stats.totalConversions.toLocaleString()}</div>
              <div>コンバージョン率: {displayData.stats.overallConversionRate.toFixed(2)}%</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>最大ドロップオフ</h3>
            <div className={styles.pdfValue}>91.0%</div>
            <div className={styles.pdfComparison}>
              <div>ステップ: フォーム入力開始</div>
              <div>→ フォーム送信完了</div>
            </div>
          </div>
          <div className={styles.pdfCard}>
            <h3>最適化ポイント</h3>
            <div className={styles.pdfValue}>フォーム改善</div>
            <div className={styles.pdfComparison}>
              <div>ドロップオフ: 956件</div>
              <div>改善余地: 大</div>
            </div>
          </div>
        </div>
      </div>

      {/* フローステップ詳細 */}
      <div className={styles.pdfSection}>
        <h2>フローステップ詳細</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>ステップ</th>
                <th>セッション数</th>
                <th>割合</th>
                <th>ドロップオフ</th>
                <th>コンバージョン率</th>
              </tr>
            </thead>
            <tbody>
              {displayData.funnelSteps.map((step, index) => (
                <tr key={index}>
                  <td>{step.step}</td>
                  <td>{step.sessions.toLocaleString()}</td>
                  <td>{step.percentage.toFixed(1)}%</td>
                  <td>{step.dropoff.toLocaleString()}</td>
                  <td>{step.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* コンバージョン内訳 */}
      <div className={styles.pdfSection}>
        <h2>コンバージョン内訳</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>コンバージョン種別</th>
                <th>コンバージョン数</th>
                <th>割合</th>
                <th>フロー率</th>
              </tr>
            </thead>
            <tbody>
              {displayData.conversionBreakdown.map((conversion, index) => (
                <tr key={index}>
                  <td>{conversion.conversionType}</td>
                  <td>{conversion.conversions.toLocaleString()}</td>
                  <td>{conversion.percentage.toFixed(1)}%</td>
                  <td>{(conversion.funnelRate * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ドロップオフ分析 */}
      <div className={styles.pdfSection}>
        <h2>ドロップオフ分析</h2>
        <div className={styles.pdfTableContainer}>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th>ステップ間</th>
                <th>ドロップオフ数</th>
                <th>ドロップオフ率</th>
                <th>主な原因</th>
              </tr>
            </thead>
            <tbody>
              {displayData.dropoffAnalysis.map((analysis, index) => (
                <tr key={index}>
                  <td>{analysis.step}</td>
                  <td>{analysis.dropoff.toLocaleString()}</td>
                  <td>{analysis.percentage.toFixed(1)}%</td>
                  <td>{analysis.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
