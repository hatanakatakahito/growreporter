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
      startDate = '30daysAgo', 
      endDate = 'today',
      formPagePath,
      conversionEventName
    } = body;

    if (!propertyId || !formPagePath || !conversionEventName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    console.log('📊 GA4 ファネルデータ取得開始:', { 
      propertyId, 
      startDate, 
      endDate, 
      formPagePath,
      conversionEventName 
    });

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // 1. 全PV数を取得
    const totalPVData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'screenPageViews' }
      ]
    });

    // 2. フォームページのPV数を取得
    const formPVData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
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

    // 3. 指定されたコンバージョンイベントの数を取得
    const conversionData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
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
    const totalPageViews = totalPVData.rows?.[0]?.metricValues?.[0]?.value 
      ? parseInt(totalPVData.rows[0].metricValues[0].value) 
      : 0;

    // フォームページのPV数を合計（完全一致のみカウント）
    let formPageViews = 0;
    if (formPVData.rows && formPVData.rows.length > 0) {
      // 末尾のスラッシュを正規化して完全一致を判定
      const normalizedFormPath = formPagePath.replace(/\/$/, '');
      
      formPageViews = formPVData.rows.reduce((sum, row) => {
        const pagePath = row.dimensionValues?.[0]?.value || '';
        const normalizedPagePath = pagePath.split('?')[0].replace(/\/$/, ''); // クエリパラメータを除去し、末尾スラッシュを削除
        
        // 完全一致する場合のみカウント
        if (normalizedPagePath === normalizedFormPath) {
          return sum + parseInt(row.metricValues?.[0]?.value || '0');
        }
        return sum;
      }, 0);
    }

    const conversions = conversionData.rows?.[0]?.metricValues?.[0]?.value 
      ? parseInt(conversionData.rows[0].metricValues[0].value) 
      : 0;

    // 遷移率を計算
    const formToTotalRate = totalPageViews > 0 
      ? (formPageViews / totalPageViews) * 100 
      : 0;
    
    const conversionToFormRate = formPageViews > 0 
      ? (conversions / formPageViews) * 100 
      : 0;
    
    const conversionToTotalRate = totalPageViews > 0 
      ? (conversions / totalPageViews) * 100 
      : 0;

    const funnelData = {
      totalPageViews,
      formPageViews,
      conversions,
      formToTotalRate,
      conversionToFormRate,
      conversionToTotalRate
    };

    console.log('✅ GA4 ファネルデータ取得成功:', funnelData);

    return NextResponse.json(funnelData);

  } catch (error: any) {
    console.error('❌ GA4 ファネルデータ取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 funnel data', message: error.message },
      { status: 500 }
    );
  }
}

