/**
 * GA4月別データ取得API
 * 過去13ヶ月分の月別集計データを取得
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
    const { propertyId, endDate } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }
    
    console.log('📊 GA4 月別データ取得開始:', { propertyId, endDate });

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // 指定された終了日から遡って13ヶ月分のデータを取得
    // endDateが指定されていない場合は今日を使用
    const referenceDate = endDate ? new Date(endDate) : new Date();
    
    // 終了日の月から遡って12ヶ月前の月初を開始日とする（合計13ヶ月）
    const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 12, 1);
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    console.log('📅 月別データ期間:', { 
      startDate: formatDate(startDate), 
      endDate: endDate || 'today',
      referenceMonth: `${referenceDate.getFullYear()}年${referenceDate.getMonth() + 1}月`
    });

    // GA4 Data APIを呼び出し（yearMonthディメンションを使用）
    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ 
        startDate: formatDate(startDate), 
        endDate: endDate || 'today' 
      }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'keyEvents' },
        { name: 'sessionsPerUser' },
        { name: 'sessionConversionRate' }
      ],
      orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: true }]
    });

    // レスポンスデータを整形
    const monthlyData = data.rows?.map((row: any) => {
      const yearMonth = row.dimensionValues[0].value; // YYYYMM形式
      const year = yearMonth.substring(0, 4);
      const month = yearMonth.substring(4, 6);
      
      return {
        yearMonth: yearMonth,
        year: parseInt(year),
        month: parseInt(month),
        displayName: `${year}年${parseInt(month)}月`,
        totalUsers: parseInt(row.metricValues[0].value || '0'),
        newUsers: parseInt(row.metricValues[1].value || '0'),
        sessions: parseInt(row.metricValues[2].value || '0'),
        screenPageViews: parseInt(row.metricValues[3].value || '0'),
        engagementRate: parseFloat(row.metricValues[4].value || '0') * 100,
        keyEvents: parseInt(row.metricValues[5].value || '0'),
        sessionsPerUser: parseFloat(row.metricValues[6].value || '0'),
        conversionRate: parseFloat(row.metricValues[7].value || '0') * 100
      };
    }) || [];

    console.log('✅ GA4 月別データ取得成功:', monthlyData.length, 'ヶ月分');

    return NextResponse.json({ monthlyData });
  } catch (error: any) {
    console.error('❌ GA4月別データ取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 monthly data', message: error.message },
      { status: 500 }
    );
  }
}

