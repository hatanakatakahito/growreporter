import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';
import { runGA4Report } from '@/lib/api/ga4Client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const propertyId = request.nextUrl.searchParams.get('propertyId');
    const startDate = request.nextUrl.searchParams.get('startDate') || '30daysAgo';
    const endDate = request.nextUrl.searchParams.get('endDate') || 'today';

    console.log('📊 GA4トラフィック獲得データ取得開始:', { userId, propertyId, startDate, endDate });

    if (!userId || !propertyId) {
      console.error('❌ 必須パラメータが不足:', { userId, propertyId });
      return NextResponse.json(
        { error: 'Missing required parameters', details: { userId: !!userId, propertyId: !!propertyId } },
        { status: 400 }
      );
    }

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // GA4 Data APIを呼び出し
    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'keyEvents' }
      ],
      orderBys: [
        {
          metric: {
            metricName: 'totalUsers'
          },
          desc: true
        }
      ]
    });

    // データを整形
    const trafficData = data.rows?.map((row: any) => ({
      channel: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value || '0'),
      newUsers: parseInt(row.metricValues[1].value || '0'),
      sessions: parseInt(row.metricValues[2].value || '0'),
      pageviews: parseInt(row.metricValues[3].value || '0'),
      engagementRate: parseFloat(row.metricValues[4].value || '0') * 100,
      keyEvents: parseInt(row.metricValues[5].value || '0')
    })) || [];

    // 合計を計算
    const totalData = trafficData.reduce((acc: any, curr: any) => ({
      users: acc.users + curr.users,
      newUsers: acc.newUsers + curr.newUsers,
      sessions: acc.sessions + curr.sessions,
      pageviews: acc.pageviews + curr.pageviews,
      keyEvents: acc.keyEvents + curr.keyEvents
    }), { users: 0, newUsers: 0, sessions: 0, pageviews: 0, keyEvents: 0 });

    // 平均エンゲージメント率を計算
    const averageEngagementRate = trafficData.length > 0
      ? trafficData.reduce((sum: number, curr: any) => sum + curr.engagementRate, 0) / trafficData.length
      : 0;

    return NextResponse.json({
      trafficData,
      totalData
    });

  } catch (error: any) {
    console.error('❌ GA4トラフィック獲得データ取得エラー (catch):', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 traffic acquisition data', message: error.message },
      { status: 500 }
    );
  }
}
