import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteUrl, dateRange, dimensions, accessToken } = body;

    if (!siteUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Site URL and access token are required' },
        { status: 400 }
      );
    }

    // Search Console API エンドポイント
    const apiUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    const requestBody = {
      startDate: dateRange?.startDate || '2024-12-01', // 30日前から
      endDate: dateRange?.endDate || '2024-12-30',     // 今日まで
      dimensions: dimensions || ['date'],
      rowLimit: 25000,
      startRow: 0
    };

    console.log('🔧 GSC API Request:', {
      url: apiUrl,
      siteUrl,
      requestBody: JSON.stringify(requestBody, null, 2)
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('GSC API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      
      return NextResponse.json(
        { 
          error: 'GSC API request failed',
          details: `${response.status}: ${response.statusText}`,
          body: errorBody
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ GSC API Success:', {
      rowCount: data.rows?.length || 0
    });

    // データを整理
    const processedData = {
      rows: data.rows || [],
      totalClicks: data.rows?.reduce((sum: number, row: any) => sum + (row.clicks || 0), 0) || 0,
      totalImpressions: data.rows?.reduce((sum: number, row: any) => sum + (row.impressions || 0), 0) || 0,
      averageCTR: data.rows?.length > 0 
        ? data.rows.reduce((sum: number, row: any) => sum + (row.ctr || 0), 0) / data.rows.length 
        : 0,
      averagePosition: data.rows?.length > 0 
        ? data.rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / data.rows.length 
        : 0
    };

    return NextResponse.json({
      success: true,
      data: processedData,
      summary: {
        siteUrl,
        rowCount: data.rows?.length || 0,
        dateRange: {
          startDate: requestBody.startDate,
          endDate: requestBody.endDate
        },
        dimensions: requestBody.dimensions,
        totalClicks: processedData.totalClicks,
        totalImpressions: processedData.totalImpressions,
        averageCTR: Math.round(processedData.averageCTR * 10000) / 100, // パーセント表示
        averagePosition: Math.round(processedData.averagePosition * 10) / 10
      }
    });

  } catch (error) {
    console.error('GSC API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



