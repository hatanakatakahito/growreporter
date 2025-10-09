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

    console.log('📊 GA4 ランディングページデータ取得開始:', { userId, propertyId, startDate, endDate });

    if (!userId || !propertyId) {
      console.error('❌ 必須パラメータが不足:', { userId, propertyId });
      return NextResponse.json(
        { error: 'Missing required parameters', details: { userId: !!userId, propertyId: !!propertyId } },
        { status: 400 }
      );
    }

    const { accessToken } = await getValidGA4Token(userId);

    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'landingPage' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'conversions' }
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

    const landingPageData = data.rows?.map((row: any) => {
      const users = parseInt(row.metricValues[0].value || '0');
      const sessions = parseInt(row.metricValues[1].value || '0');
      const conversions = parseInt(row.metricValues[2].value || '0');
      const cvr = sessions > 0 ? (conversions / sessions) * 100 : 0;

      return {
        landingPage: row.dimensionValues[0].value,
        users,
        sessions,
        cvr,
        conversions
      };
    }) || [];

    console.log('✅ GA4 ランディングページデータ取得成功:', landingPageData.length, '件');

    return NextResponse.json({ landingPageData });

  } catch (error: any) {
    console.error('❌ GA4 ランディングページデータ取得エラー (catch):', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 landing page data', message: error.message },
      { status: 500 }
    );
  }
}


