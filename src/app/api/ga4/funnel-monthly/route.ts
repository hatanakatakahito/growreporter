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
    const { 
      propertyId, 
      formPagePath,
      conversionEventName
    } = body;

    if (!propertyId || !formPagePath || !conversionEventName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    console.log('📊 GA4 月次ファネルデータ取得開始:', { 
      propertyId, 
      formPagePath,
      conversionEventName 
    });

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // 過去13ヶ月の期間を計算（前月末まで）
    const today = new Date();
    // 前月末を計算
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const endDate = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`;
    
    // 前月から遡って12ヶ月前の月初を開始日とする（合計13ヶ月）
    const startDate = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth() - 12, 1);
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

    // 1. 月別全PV数を取得
    const totalPVData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate: startDateStr, endDate }],
      dimensions: [
        { name: 'yearMonth' }
      ],
      metrics: [
        { name: 'screenPageViews' }
      ]
    });

    // 2. 月別フォームページのPV数を取得
    const formPVData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate: startDateStr, endDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'pagePathPlusQueryString' }
      ],
      metrics: [
        { name: 'screenPageViews' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePathPlusQueryString',
          stringFilter: {
            matchType: 'BEGINS_WITH',
            value: formPagePath
          }
        }
      }
    });

    // 3. 月別コンバージョンイベントの数を取得
    const conversionData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate: startDateStr, endDate }],
      dimensions: [
        { name: 'yearMonth' },
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: conversionEventName
          }
        }
      }
    });

    // データを整形
    const monthlyData: { [key: string]: any } = {};

    // 全PV数を月別に集計
    totalPVData.rows?.forEach((row: any) => {
      const yearMonth = row.dimensionValues[0].value;
      const totalPV = parseInt(row.metricValues[0].value || '0');
      
      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { yearMonth, totalPageViews: 0, formPageViews: 0, conversions: 0 };
      }
      monthlyData[yearMonth].totalPageViews = totalPV;
    });

    // フォームPV数を月別に集計（完全一致のみ）
    const normalizedFormPath = formPagePath.replace(/\/$/, '');
    formPVData.rows?.forEach((row: any) => {
      const yearMonth = row.dimensionValues[0].value;
      const pagePath = row.dimensionValues[1].value;
      const normalizedPagePath = pagePath.split('?')[0].replace(/\/$/, '');
      
      // 完全一致する場合のみカウント
      if (normalizedPagePath === normalizedFormPath) {
        const formPV = parseInt(row.metricValues[0].value || '0');
        
        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = { yearMonth, totalPageViews: 0, formPageViews: 0, conversions: 0 };
        }
        monthlyData[yearMonth].formPageViews += formPV;
      }
    });

    // コンバージョン数を月別に集計
    conversionData.rows?.forEach((row: any) => {
      const yearMonth = row.dimensionValues[0].value;
      const conversions = parseInt(row.metricValues[0].value || '0');
      
      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { yearMonth, totalPageViews: 0, formPageViews: 0, conversions: 0 };
      }
      monthlyData[yearMonth].conversions = conversions;
    });

    // 遷移率を計算
    const monthlyArray = Object.values(monthlyData).map((month: any) => {
      const formToTotalRate = month.totalPageViews > 0 
        ? (month.formPageViews / month.totalPageViews) * 100 
        : 0;
      
      const conversionToFormRate = month.formPageViews > 0 
        ? (month.conversions / month.formPageViews) * 100 
        : 0;
      
      const conversionToTotalRate = month.totalPageViews > 0 
        ? (month.conversions / month.totalPageViews) * 100 
        : 0;

      // 表示用の年月名を生成
      const year = month.yearMonth.substring(0, 4);
      const monthNum = parseInt(month.yearMonth.substring(4, 6));
      const displayName = `${year}年${monthNum}月`;

      return {
        yearMonth: month.yearMonth,
        displayName,
        totalPageViews: month.totalPageViews,
        formPageViews: month.formPageViews,
        conversions: month.conversions,
        formToTotalRate,
        conversionToFormRate,
        conversionToTotalRate
      };
    });

    // 年月でソート（新しい順）
    monthlyArray.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    console.log('✅ GA4 月次ファネルデータ取得成功:', monthlyArray.length, 'ヶ月分');

    return NextResponse.json({ monthlyData: monthlyArray });

  } catch (error: any) {
    console.error('❌ GA4 月次ファネルデータ取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 monthly funnel data', message: error.message },
      { status: 500 }
    );
  }
}

