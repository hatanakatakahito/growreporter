import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const search = searchParams.get('search') || '';
  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token required' }, { status: 400 });
  }

  try {
    console.log(`🔧 GA4 Properties API - search: "${search}", offset: ${offset}, limit: ${limit}`);

    // アカウント一覧を取得
    const accountsResponse = await fetch(
      'https://analyticsadmin.googleapis.com/v1alpha/accounts',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!accountsResponse.ok) {
      throw new Error(`GA4 Accounts API Error: ${accountsResponse.statusText}`);
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];

    // 各アカウントのプロパティを取得
    const propertyPromises = accounts.map(async (account: any) => {
      try {
        const propertiesResponse = await fetch(
          `https://analyticsadmin.googleapis.com/v1alpha/properties?filter=parent:${account.name}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json();
          return propertiesData.properties || [];
        } else {
          console.warn(`プロパティ取得失敗 (${account.displayName}):`, propertiesResponse.statusText);
          return [];
        }
      } catch (error) {
        console.warn(`プロパティ取得エラー (${account.displayName}):`, error);
        return [];
      }
    });

    const allProperties = await Promise.all(propertyPromises);
    let properties = allProperties.flat();

    // 検索フィルタリング
    if (search) {
      const searchLower = search.toLowerCase();
      properties = properties.filter(property => 
        property.displayName.toLowerCase().includes(searchLower) ||
        property.name.toLowerCase().includes(searchLower)
      );
    }

    // ページネーション
    const total = properties.length;
    const paginatedProperties = properties.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      properties: paginatedProperties,
      total,
      offset,
      limit,
      hasMore,
      search
    });

  } catch (error) {
    console.error('GA4 Properties API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties', details: String(error) },
      { status: 500 }
    );
  }
}


