/**
 * GA4時系列データ取得API
 * GA4 Data API を使用して時系列データを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';
import { runGA4Report } from '@/lib/api/ga4Client';

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
    
    console.log('📊 GA4 時系列データ取得開始:', { propertyId, startDate, endDate });

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // GA4 Data APIを呼び出し
    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'activeUsers' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    // レスポンスデータを整形
    const timeSeries = data.rows?.map((row: any) => ({
      date: row.dimensionValues[0].value,
      totalUsers: parseInt(row.metricValues[0].value || '0'),
      newUsers: parseInt(row.metricValues[1].value || '0'),
      sessions: parseInt(row.metricValues[2].value || '0'),
      activeUsers: parseInt(row.metricValues[3].value || '0'),
      conversions: 0 // 時系列データではコンバージョンは含めない（必要に応じて別途取得）
    })) || [];

    return NextResponse.json({ timeSeries });
  } catch (error: any) {
    console.error('❌ GA4時系列データ取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 time series data', message: error.message },
      { status: 500 }
    );
  }
}