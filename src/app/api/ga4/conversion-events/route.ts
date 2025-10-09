import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';
import { ConversionService } from '@/lib/conversion/conversionService';

/**
 * GA4 コンバージョンイベント取得API
 * ユーザーが定義したコンバージョンイベントのみを取得
 */
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

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Property ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    console.log('📊 GA4 コンバージョンイベント取得開始:', {
      userId,
      propertyId,
      startDate,
      endDate
    });

    // ユーザーが定義したコンバージョンを取得
    const userConversions = await ConversionService.getActiveConversions(userId);
    
    if (userConversions.length === 0) {
      console.log('⚠️ コンバージョンが定義されていません');
      return NextResponse.json({
        events: [],
        totalEvents: 0,
        message: 'コンバージョンが定義されていません。サイト設定から定義してください。'
      });
    }

    const conversionEventNames = userConversions.map(c => c.eventName);
    console.log('📋 定義済みコンバージョン:', conversionEventNames);

    // アクセストークンを取得（自動リフレッシュ対応）
    let tokenResult;
    try {
      tokenResult = await getValidGA4Token(userId);
      console.log('✅ アクセストークン取得成功');
    } catch (tokenError) {
      console.error('❌ アクセストークン取得エラー:', tokenError);
      throw tokenError;
    }
    
    const accessToken = tokenResult.accessToken;

    // GA4 Data APIを呼び出し
    const requestBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'keyEvents' }
      ],
      orderBys: [
        {
          metric: {
            metricName: 'keyEvents'
          },
          desc: true
        }
      ],
      limit: 100
    };

    console.log('📤 GA4 API リクエスト送信:', {
      url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      body: requestBody
    });

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log('📥 GA4 API レスポンス受信:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GA4 API エラー:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`GA4 API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ GA4 API レスポンス受信:', {
      rowCount: data.rows?.length || 0,
      hasRows: !!data.rows
    });

    // データを整形し、定義済みコンバージョンのみをフィルタリング
    const events = (data.rows || [])
      .map((row: any) => ({
        eventName: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value || '0', 10),
        keyEvents: parseInt(row.metricValues[1].value || '0', 10)
      }))
      .filter((event: any) => {
        // 定義済みコンバージョンに含まれているかチェック
        return conversionEventNames.includes(event.eventName);
      });

    console.log('📊 整形後のイベントデータ:', {
      totalRows: data.rows?.length || 0,
      definedConversions: conversionEventNames.length,
      filteredEventCount: events.length,
      sample: events.slice(0, 3)
    });

    return NextResponse.json({
      events,
      totalEvents: events.length,
      definedConversions: conversionEventNames
    });

  } catch (error) {
    console.error('❌ コンバージョンイベント取得エラー:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch conversion events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

