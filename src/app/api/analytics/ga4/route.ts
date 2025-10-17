import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, dateRange, metrics, dimensions, accessToken } = body;

    if (!propertyId || !accessToken) {
      return NextResponse.json(
        { error: 'Property ID and access token are required' },
        { status: 400 }
      );
    }

    // GA4 Data API v1beta エンドポイント
    const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const requestBody = {
      dateRanges: dateRange || [
        {
          startDate: '30daysAgo',
          endDate: 'today'
        }
      ],
      metrics: metrics || [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' }
      ],
      dimensions: dimensions || [
        { name: 'date' }
      ],
      orderBys: [
        {
          dimension: {
            dimensionName: 'date'
          }
        }
      ]
    };

    console.log('🔧 GA4 API Request:', {
      url: apiUrl,
      propertyId,
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
      console.error('GA4 API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      
      return NextResponse.json(
        { 
          error: 'GA4 API request failed',
          details: `${response.status}: ${response.statusText}`,
          body: errorBody
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ GA4 API Success:', {
      rowCount: data.rowCount || 0,
      metricHeaders: data.metricHeaders?.length || 0,
      dimensionHeaders: data.dimensionHeaders?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: data,
      summary: {
        propertyId,
        rowCount: data.rowCount || 0,
        dateRange: requestBody.dateRanges[0],
        metrics: requestBody.metrics.map((m: any) => m.name),
        dimensions: requestBody.dimensions.map((d: any) => d.name)
      }
    });

  } catch (error) {
    console.error('GA4 API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



