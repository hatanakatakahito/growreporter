/**
 * Google Search Console Data Service
 * Search Consoleからデータを取得するためのサービス
 */

export interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCTimeSeriesData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GSCDataService {
  /**
   * GSCメトリクスを取得
   */
  static async getMetrics(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<GSCMetrics> {
    console.log('🔍 GSCメトリクス取得リクエスト:', {
      userId,
      siteUrl,
      startDate,
      endDate
    });

    const response = await fetch('/api/gsc/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        siteUrl,
        startDate,
        endDate
      }),
    });

    console.log('📊 GSCメトリクスレスポンスステータス:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GSCメトリクスエラーレスポンス (text):', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      console.error('❌ GSCメトリクス取得エラー:', errorData);
      throw new Error(`Failed to fetch GSC metrics: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ GSCメトリクス取得成功:', data);
    
    return data.metrics;
  }

  /**
   * GSC時系列データを取得
   */
  static async getTimeSeries(
    userId: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<GSCTimeSeriesData[]> {
    console.log('🔍 GSC時系列データ取得リクエスト:', {
      userId,
      siteUrl,
      startDate,
      endDate
    });

    const response = await fetch('/api/gsc/timeseries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        siteUrl,
        startDate,
        endDate
      }),
    });

    console.log('📊 GSC時系列データレスポンスステータス:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GSC時系列データエラーレスポンス (text):', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      console.error('❌ GSC時系列データ取得エラー:', errorData);
      throw new Error(`Failed to fetch GSC time series: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ GSC時系列データ取得成功:', data.timeSeries?.length, '件');
    
    return data.timeSeries;
  }
}

