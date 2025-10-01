import { GoogleAuth } from 'google-auth-library';

// Google Analytics 4 API設定
export const GA4_CONFIG = {
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.manage.users.readonly'
  ],
  discoveryUrl: 'https://analyticsreporting.googleapis.com/$discovery/rest?version=v4'
};

// GA4 OAuth URL生成
export const generateGA4AuthUrl = (clientId: string, redirectUri: string, state: string) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GA4_CONFIG.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// GA4 プロパティ一覧取得
export interface GA4Property {
  name: string;
  displayName: string;
  propertyType: string;
  createTime: string;
  updateTime: string;
}

export const getGA4Properties = async (accessToken: string): Promise<GA4Property[]> => {
  try {
    // まずアカウント一覧を取得 (v1alpha を使用)
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
      throw new Error(`GA4 Accounts API Error: ${accountsResponse.status} ${accountsResponse.statusText}`);
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];
    
    console.log(`🔧 GA4 取得したアカウント数: ${accounts.length}`);

    // 各アカウントのプロパティを並行取得
    const allProperties: GA4Property[] = [];
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
          const properties = propertiesData.properties || [];
          console.log(`🔧 アカウント ${account.displayName} のプロパティ数: ${properties.length}`);
          return properties;
        } else {
          console.warn(`アカウント ${account.displayName} のプロパティ取得失敗: ${propertiesResponse.status}`);
          return [];
        }
      } catch (error) {
        console.warn(`アカウント ${account.displayName} のプロパティ取得エラー:`, error);
        return [];
      }
    });

    const propertiesArrays = await Promise.all(propertyPromises);
    propertiesArrays.forEach(properties => {
      allProperties.push(...properties);
    });

    console.log(`🔧 取得した全プロパティ数: ${allProperties.length}`);
    return allProperties;
  } catch (error) {
    console.error('GA4 Properties取得エラー:', error);
    throw error;
  }
};

// GA4 レポートデータ取得
export interface GA4ReportRequest {
  propertyId: string;
  dateRanges: Array<{
    startDate: string;
    endDate: string;
  }>;
  metrics: Array<{
    name: string;
  }>;
  dimensions?: Array<{
    name: string;
  }>;
}

export const getGA4Report = async (
  accessToken: string,
  request: GA4ReportRequest
): Promise<any> => {
  try {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${request.propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateRanges: request.dateRanges,
          metrics: request.metrics,
          dimensions: request.dimensions
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GA4 Report API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GA4 Report取得エラー:', error);
    throw error;
  }
};

// 基本的なGA4メトリクス定義
export const GA4_METRICS = {
  // セッション関連
  sessions: 'sessions',
  totalUsers: 'totalUsers',
  newUsers: 'newUsers',
  
  // エンゲージメント
  engagementRate: 'engagementRate',
  engagedSessions: 'engagedSessions',
  averageSessionDuration: 'averageSessionDuration',
  
  // ページビュー
  screenPageViews: 'screenPageViews',
  screenPageViewsPerSession: 'screenPageViewsPerSession',
  
  // コンバージョン
  conversions: 'conversions',
  totalRevenue: 'totalRevenue'
};

// 基本的なGA4ディメンション定義
export const GA4_DIMENSIONS = {
  // 時間
  date: 'date',
  year: 'year',
  month: 'month',
  week: 'week',
  day: 'day',
  hour: 'hour',
  
  // ユーザー
  country: 'country',
  city: 'city',
  deviceCategory: 'deviceCategory',
  operatingSystem: 'operatingSystem',
  browser: 'browser',
  
  // トラフィック
  sessionSource: 'sessionSource',
  sessionMedium: 'sessionMedium',
  sessionCampaignName: 'sessionCampaignName',
  
  // ページ
  pagePath: 'pagePath',
  pageTitle: 'pageTitle',
  landingPage: 'landingPage'
};
