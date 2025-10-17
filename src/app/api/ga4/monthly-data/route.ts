/**
 * GA4月別データ取得API
 * 過去13ヶ月分の月別集計データを取得
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
    const { propertyId, startDate, endDate } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }
    
    console.log('📊 GA4 月別データ取得開始:', { propertyId, startDate, endDate });

    // ユーザー定義のコンバージョンを取得
    const conversions = await ConversionService.getActiveConversions(userId);
    console.log('🎯 定義済みコンバージョン:', conversions.map(c => c.eventName));

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // 期間設定が指定されている場合は終了日から遡って13ヶ月分、そうでなければ前月から13ヶ月分
    let dataStartDate: Date;
    let dataEndDate: Date;
    
    if (startDate && endDate) {
      // 期間設定が指定されている場合、終了日から遡って13ヶ月分のデータを取得
      dataEndDate = new Date(endDate);
      dataStartDate = new Date(dataEndDate.getFullYear(), dataEndDate.getMonth() - 12, 1);
    } else if (endDate) {
      // endDateのみ指定されている場合（後方互換性）
      dataEndDate = new Date(endDate);
      dataStartDate = new Date(dataEndDate.getFullYear(), dataEndDate.getMonth() - 12, 1);
    } else {
      // 何も指定されていない場合は前月末から13ヶ月分
      const today = new Date();
      dataEndDate = new Date(today.getFullYear(), today.getMonth(), 0); // 前月末日
      dataStartDate = new Date(dataEndDate.getFullYear(), dataEndDate.getMonth() - 12, 1);
    }
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    console.log('📅 月別データ期間:', { 
      startDate: formatDate(dataStartDate), 
      endDate: formatDate(dataEndDate),
      referenceMonth: `${dataEndDate.getFullYear()}年${dataEndDate.getMonth() + 1}月`
    });

    // 基本メトリクスを取得
    const data = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ 
        startDate: formatDate(dataStartDate), 
        endDate: formatDate(dataEndDate)
      }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'engagedSessions' },
        { name: 'sessionsPerUser' },
        { name: 'sessionConversionRate' }
      ],
      orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: true }]
    });

    // コンバージョンが定義されている場合は、それらのイベントカウントを取得
    let conversionData: any = {};
    let conversionBreakdown: any = {};
    if (conversions.length > 0) {
      const conversionReport = await runGA4Report(accessToken, {
        propertyId,
        dateRanges: [{ 
          startDate: formatDate(dataStartDate), 
          endDate: formatDate(dataEndDate)
        }],
        dimensions: [{ name: 'yearMonth' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: conversions.map(c => c.eventName)
            }
          }
        },
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: true }]
      });

      // 月別・イベント別のカウントを集計
      conversionReport.rows?.forEach((row: any) => {
        const yearMonth = row.dimensionValues[0].value;
        const eventName = row.dimensionValues[1].value;
        const eventCount = parseInt(row.metricValues[0].value || '0');
        
        // 合計用
        if (!conversionData[yearMonth]) {
          conversionData[yearMonth] = 0;
        }
        conversionData[yearMonth] += eventCount;
        
        // 内訳用
        if (!conversionBreakdown[yearMonth]) {
          conversionBreakdown[yearMonth] = {};
        }
        conversionBreakdown[yearMonth][eventName] = eventCount;
      });
      
      console.log('📊 コンバージョンデータ:', conversionData);
      console.log('📊 コンバージョン内訳（最新月）:', conversionBreakdown[Object.keys(conversionBreakdown)[0]]);
    }

    // レスポンスデータを整形
    const monthlyData = data.rows?.map((row: any) => {
      const yearMonth = row.dimensionValues[0].value; // YYYYMM形式
      const year = yearMonth.substring(0, 4);
      const month = yearMonth.substring(4, 6);
      
      // ユーザー定義のコンバージョン合計数を取得（定義がない場合は0）
      const conversionCount = conversionData[yearMonth] || 0;
      const breakdown = conversionBreakdown[yearMonth] || {};
      const sessions = parseInt(row.metricValues[2].value || '0');
      
      // CVRをユーザー定義のコンバージョンから計算
      const conversionRate = sessions > 0 ? (conversionCount / sessions) * 100 : 0;
      
      return {
        yearMonth: yearMonth,
        year: parseInt(year),
        month: parseInt(month),
        displayName: `${year}年${parseInt(month)}月`,
        totalUsers: parseInt(row.metricValues[0].value || '0'),
        newUsers: parseInt(row.metricValues[1].value || '0'),
        sessions: sessions,
        screenPageViews: parseInt(row.metricValues[3].value || '0'),
        engagementRate: parseFloat(row.metricValues[4].value || '0') * 100,
        engagedSessions: parseInt(row.metricValues[5].value || '0'),
        conversions: conversionCount, // ユーザー定義のコンバージョン合計
        conversionBreakdown: breakdown, // イベント別の内訳
        sessionsPerUser: parseFloat(row.metricValues[6].value || '0'),
        conversionRate: conversionRate // ユーザー定義のコンバージョンから計算
      };
    }) || [];

    console.log('✅ GA4 月別データ取得成功:', monthlyData.length, 'ヶ月分');
    console.log('📊 月別データサンプル（最新3ヶ月）:', monthlyData.slice(0, 3).map(d => ({
      displayName: d.displayName,
      conversions: d.conversions,
      sessions: d.sessions
    })));

    return NextResponse.json({ monthlyData });
  } catch (error: any) {
    console.error('❌ GA4月別データ取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 monthly data', message: error.message },
      { status: 500 }
    );
  }
}

