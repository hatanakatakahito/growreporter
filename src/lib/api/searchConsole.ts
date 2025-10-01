// Google Search Console API設定
export const GSC_CONFIG = {
  scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly'
  ],
  baseUrl: 'https://searchconsole.googleapis.com/webmasters/v3'
};

// GSC OAuth URL生成
export const generateGSCAuthUrl = (clientId: string, redirectUri: string, state: string) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GSC_CONFIG.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// GSC サイト一覧取得
export interface GSCSite {
  siteUrl: string;
  permissionLevel: 'siteFullUser' | 'siteOwner' | 'siteRestrictedUser' | 'siteUnverifiedUser';
}

export const getGSCSites = async (accessToken: string): Promise<GSCSite[]> => {
  try {
    const response = await fetch(
      `${GSC_CONFIG.baseUrl}/sites`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GSC API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.siteEntry || [];
  } catch (error) {
    console.error('GSC Sites取得エラー:', error);
    throw error;
  }
};

// GSC 検索パフォーマンスデータ取得
export interface GSCSearchAnalyticsRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: ('country' | 'device' | 'page' | 'query' | 'searchAppearance')[];
  type?: 'web' | 'image' | 'video' | 'news';
  dimensionFilterGroups?: Array<{
    groupType: 'and' | 'or';
    filters: Array<{
      dimension: string;
      operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'includingRegex' | 'excludingRegex';
      expression: string;
    }>;
  }>;
  rowLimit?: number;
  startRow?: number;
}

export interface GSCSearchAnalyticsResponse {
  rows?: Array<{
    keys?: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  responseAggregationType?: string;
}

export const getGSCSearchAnalytics = async (
  accessToken: string,
  request: GSCSearchAnalyticsRequest
): Promise<GSCSearchAnalyticsResponse> => {
  try {
    const encodedSiteUrl = encodeURIComponent(request.siteUrl);
    const response = await fetch(
      `${GSC_CONFIG.baseUrl}/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: request.startDate,
          endDate: request.endDate,
          dimensions: request.dimensions,
          type: request.type || 'web',
          dimensionFilterGroups: request.dimensionFilterGroups,
          rowLimit: request.rowLimit || 1000,
          startRow: request.startRow || 0
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GSC Search Analytics API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GSC Search Analytics取得エラー:', error);
    throw error;
  }
};

// GSC サイトマップ取得
export interface GSCSitemap {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: 'sitemap' | 'rssFeed' | 'atomFeed' | 'notSitemap';
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
}

export const getGSCSitemaps = async (
  accessToken: string,
  siteUrl: string
): Promise<GSCSitemap[]> => {
  try {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const response = await fetch(
      `${GSC_CONFIG.baseUrl}/sites/${encodedSiteUrl}/sitemaps`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GSC Sitemaps API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.sitemap || [];
  } catch (error) {
    console.error('GSC Sitemaps取得エラー:', error);
    throw error;
  }
};

// 基本的なGSCディメンション定義
export const GSC_DIMENSIONS = {
  query: 'query',
  page: 'page',
  country: 'country',
  device: 'device',
  searchAppearance: 'searchAppearance'
};

// GSCデバイスタイプ
export const GSC_DEVICE_TYPES = {
  desktop: 'DESKTOP',
  mobile: 'MOBILE',
  tablet: 'TABLET'
};

// GSC検索タイプ
export const GSC_SEARCH_TYPES = {
  web: 'web',
  image: 'image',
  video: 'video',
  news: 'news'
};
