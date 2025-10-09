import { NextRequest, NextResponse } from 'next/server';
import { getValidGA4Token } from '@/lib/api/ga4TokenHelper';
import { runGA4Report } from '@/lib/api/ga4Client';

/**
 * GA4 Demographics API
 * ユーザー属性データ（性別、年齢、デバイス、地域）を取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const propertyId = request.nextUrl.searchParams.get('propertyId');
    const startDate = request.nextUrl.searchParams.get('startDate') || '30daysAgo';
    const endDate = request.nextUrl.searchParams.get('endDate') || 'today';

    console.log('📊 GA4ユーザー属性データ取得開始:', { userId, propertyId, startDate, endDate });

    if (!userId || !propertyId) {
      console.error('❌ 必須パラメータが不足:', { userId: !!userId, propertyId: !!propertyId });
      return NextResponse.json(
        { error: 'Missing required parameters', details: { userId: !!userId, propertyId: !!propertyId } },
        { status: 400 }
      );
    }

    // 有効なアクセストークンを取得（自動リフレッシュ付き）
    const { accessToken } = await getValidGA4Token(userId);

    // 1. 新規 vs リピーター
    const newVsReturningData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'totalUsers' }]
    });

    // 2. 性別
    const genderData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'userGender' }],
      metrics: [{ name: 'totalUsers' }]
    });

    // 3. 年齢
    const ageData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'userAgeBracket' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ dimension: { dimensionName: 'userAgeBracket' } }]
    });

    // 4. デバイス
    const deviceData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'totalUsers' }]
    });

    // 5. 地域（市区町村 - デフォルト）
    const regionType = request.nextUrl.searchParams.get('regionType') || 'city';
    let regionDimension = 'city'; // デフォルトは市区町村
    
    if (regionType === 'country') {
      regionDimension = 'country';
    } else if (regionType === 'region') {
      regionDimension = 'region';
    }
    
    const regionData = await runGA4Report(accessToken, {
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: regionDimension }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [
        {
          metric: {
            metricName: 'totalUsers'
          },
          desc: true
        }
      ],
      limit: 10 // 上位10地域
    });

    // データを整形
    const demographics = {
      newVsReturning: newVsReturningData.rows?.map((row: any) => ({
        type: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value || '0')
      })) || [],
      
      gender: genderData.rows?.map((row: any) => ({
        gender: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value || '0')
      })) || [],
      
      age: ageData.rows?.map((row: any) => ({
        ageBracket: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value || '0')
      })) || [],
      
      device: deviceData.rows?.map((row: any) => ({
        category: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value || '0')
      })) || [],
      
      region: regionData.rows?.map((row: any) => ({
        region: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value || '0')
      })) || []
    };

    console.log('✅ GA4ユーザー属性データ取得成功:', {
      newVsReturningCount: demographics.newVsReturning.length,
      genderCount: demographics.gender.length,
      ageCount: demographics.age.length,
      deviceCount: demographics.device.length,
      regionCount: demographics.region.length
    });

    return NextResponse.json(demographics);

  } catch (error: any) {
    console.error('❌ GA4ユーザー属性データ取得エラー (catch):', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 demographics data', message: error.message },
      { status: 500 }
    );
  }
}
