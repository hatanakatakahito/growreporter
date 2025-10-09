import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';

/**
 * GA4 外部リンククリック取得API
 * link_click イベント（外部リンク）のデータを取得
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

    console.log('📊 GA4 外部リンククリック取得開始:', {
      userId,
      propertyId,
      startDate,
      endDate
    });

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
        { name: 'linkUrl' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'eventName',
                stringFilter: {
                  matchType: 'EXACT',
                  value: 'click'
                }
              }
            },
            {
              filter: {
                fieldName: 'outbound',
                stringFilter: {
                  matchType: 'EXACT',
                  value: 'true'
                }
              }
            }
          ]
        }
      },
      orderBys: [
        {
          metric: {
            metricName: 'eventCount'
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

    // データを整形
    const links = (data.rows || []).map((row: any) => ({
      linkUrl: row.dimensionValues[0].value,
      clicks: parseInt(row.metricValues[0].value || '0', 10)
    }));

    console.log('📊 整形後の外部リンクデータ:', {
      totalRows: data.rows?.length || 0,
      linkCount: links.length,
      sample: links.slice(0, 3)
    });

    return NextResponse.json({
      links,
      totalLinks: links.length
    });

  } catch (error) {
    console.error('❌ 外部リンククリック取得エラー:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch external links',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


