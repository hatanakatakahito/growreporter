/**
 * GA4 Data API サービス
 * Google Analytics 4 Data API を使用してデータを取得
 */

export interface GA4Metrics {
  newUsers: number;
  sessions: number;
  totalUsers: number;
  activeUsers: number;
  keyEvents: number;
  keyEventRate: number;
}

export interface GA4TimeSeriesData {
  date: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  keyEvents: number;
}

export class GA4DataService {
  /**
   * GA4メトリクスを取得
   */
  static async getMetrics(
    userId: string,
    propertyId: string,
    startDate: string = '30daysAgo',
    endDate: string = 'today'
  ): Promise<GA4Metrics> {
    try {
      console.log('📊 GA4メトリクス取得リクエスト:', { userId, propertyId, startDate, endDate });

      const response = await fetch('/api/ga4/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          propertyId,
          startDate,
          endDate
        })
      });

      console.log('📊 GA4メトリクスレスポンスステータス:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GA4メトリクスエラーレスポンス (text):', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Response parse error', text: errorText };
        }
        
        console.error('❌ GA4メトリクス取得エラー:', errorData);
        throw new Error(`Failed to fetch GA4 metrics: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('✅ GA4メトリクス取得成功:', data);
      return data.metrics;
    } catch (error) {
      console.error('❌ GA4メトリクス取得エラー (catch):', error);
      throw error;
    }
  }

  /**
   * GA4時系列データを取得
   */
  static async getTimeSeriesData(
    userId: string,
    propertyId: string,
    startDate: string = '30daysAgo',
    endDate: string = 'today'
  ): Promise<GA4TimeSeriesData[]> {
    try {
      const response = await fetch('/api/ga4/timeseries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          propertyId,
          startDate,
          endDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch GA4 time series data');
      }

      const data = await response.json();
      return data.timeSeries;
    } catch (error) {
      console.error('❌ GA4時系列データ取得エラー:', error);
      throw error;
    }
  }
}

