import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';
import { runGA4Report } from '@/lib/api/ga4Client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const propertyId = request.nextUrl.searchParams.get('propertyId');
    let startDate = request.nextUrl.searchParams.get('startDate') || '30daysAgo';
    let endDate = request.nextUrl.searchParams.get('endDate') || 'today';

    // YYYYMMDD形式をYYYY-MM-DD形式に変換
    if (startDate.length === 8 && /^\d{8}$/.test(startDate)) {
      startDate = `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`;
    }
    if (endDate.length === 8 && /^\d{8}$/.test(endDate)) {
      endDate = `${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`;
    }

    console.log('📊 GA4 ページデータ取得開始:', { userId, propertyId, startDate, endDate });

    if (!userId || !propertyId) {
      console.error('❌ 必須パラメータが不足:', { userId, propertyId });
      return NextResponse.json(
        { error: 'Missing required parameters', details: { userId: !!userId, propertyId: !!propertyId } },
        { status: 400 }
      );
    }

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // GA4 Data APIを呼び出し - ページパスとスクリーンクラス別データ
    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePathPlusQueryString' },
        { name: 'unifiedScreenClass' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'screenPageViewsPerSession' },
        { name: 'engagementRate' }
      ],
      orderBys: [
        {
          metric: {
            metricName: 'totalUsers'
          },
          desc: true
        }
      ],
      limit: 100
    });

    // データを整形
    const pageData = data.rows?.map((row: any) => ({
      pagePath: row.dimensionValues[0].value,
      screenClass: row.dimensionValues[1].value,
      users: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      pageviews: parseInt(row.metricValues[2].value || '0'),
      viewsPerUser: parseFloat(row.metricValues[3].value || '0'),
      engagementRate: parseFloat(row.metricValues[4].value || '0') * 100
    })) || [];

    console.log('✅ GA4 ページデータ取得成功:', pageData.length, '件');

    return NextResponse.json({ pageData });

  } catch (error: any) {
    console.error('❌ GA4 ページデータ取得エラー (catch):', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 page data', message: error.message },
      { status: 500 }
    );
  }
}

