/**
 * GA4メトリクス取得API
 * GA4 Data API を使用して基本的なメトリクスを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';
import { runGA4Report } from '@/lib/api/ga4Client';
import { ConversionService } from '@/lib/conversion/conversionService';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { propertyId, startDate = '30daysAgo', endDate = 'today' } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }
    
    console.log('📊 GA4 メトリクス取得開始:', { propertyId, startDate, endDate });

    // ユーザー定義のコンバージョンを取得
    const conversions = await ConversionService.getActiveConversions(userId);
    console.log('🎯 定義済みコンバージョン:', conversions.map(c => c.eventName));

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // GA4 Data APIを呼び出し（基本メトリクス）
    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'engagementRate' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }
      ]
    });

    // レスポンスデータを整形
    const metrics: any = {};
    if (data.rows && data.rows.length > 0) {
      const row = data.rows[0];
      
      console.log('📊 GA4 API 生データ:', {
        metricHeaders: data.metricHeaders?.map((h: any) => h.name),
        metricValues: row.metricValues?.map((v: any) => v.value)
      });
      
      metrics.totalUsers = parseInt(row.metricValues[0]?.value || '0');
      metrics.newUsers = parseInt(row.metricValues[1]?.value || '0');
      metrics.sessions = parseInt(row.metricValues[2]?.value || '0');
      metrics.activeUsers = parseInt(row.metricValues[3]?.value || '0');
      metrics.engagementRate = parseFloat(row.metricValues[4]?.value || '0') * 100;
      metrics.screenPageViews = parseInt(row.metricValues[5]?.value || '0');
      metrics.averageSessionDuration = parseFloat(row.metricValues[6]?.value || '0');
      
      console.log('📊 整形後のメトリクス（コンバージョン前）:', metrics);
    }

    // ユーザー定義のコンバージョン数を取得
    let conversionCount = 0;
    if (conversions.length > 0) {
      const conversionReport = await runGA4Report(accessToken, {
        propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: conversions.map(c => c.eventName)
            }
          }
        }
      });

      // イベントカウントを合計
      conversionReport.rows?.forEach((row: any) => {
        conversionCount += parseInt(row.metricValues[0].value || '0');
      });
      
      console.log('📊 コンバージョン合計:', conversionCount);
    }

    metrics.conversions = conversionCount;
    
    // CVR（コンバージョン率）を計算
    metrics.conversionRate = metrics.sessions > 0 
      ? (metrics.conversions / metrics.sessions) * 100 
      : 0;
    
    console.log('📊 最終メトリクス:', metrics);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('❌ GA4メトリクス取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 metrics', message: error.message },
      { status: 500 }
    );
  }
}