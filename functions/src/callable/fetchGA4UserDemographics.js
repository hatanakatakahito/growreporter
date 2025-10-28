import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4ユーザー属性データを取得
 */
export const fetchGA4UserDemographicsCallable = async (request) => {
  const { siteId, startDate, endDate } = request.data;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  if (!siteId || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'siteId, startDate, and endDate are required');
  }

  try {
    logger.info(`[fetchGA4UserDemographics] Fetching demographics for site: ${siteId}`);

    const db = getFirestore();
    
    // サイト情報を取得
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found');
    }

    const siteData = siteDoc.data();
    if (siteData.userId !== userId) {
      throw new HttpsError('permission-denied', 'Access denied');
    }

    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError('failed-precondition', 'GA4 property not connected');
    }

    // OAuthトークン取得・更新
    const { oauth2Client } = await getAndRefreshToken(siteData.ga4OauthTokenId);
    const credentials = await oauth2Client.getAccessToken();
    const accessToken = credentials.token;

    // 各ディメンションごとにデータを取得
    const [newReturning, gender, age, device, country, region, city] = await Promise.all([
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'newVsReturning'),
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'userGender'),
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'userAgeBracket'),
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'deviceCategory'),
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'country'),
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'region'),
      fetchDimension(siteData.ga4PropertyId, startDate, endDate, accessToken, 'city'),
    ]);

    return {
      success: true,
      data: {
        newReturning: formatNewReturning(newReturning),
        gender: formatGender(gender),
        age: formatAge(age),
        device: formatDevice(device),
        location: {
          country: formatLocation(country),
          region: formatLocation(region),
          city: formatLocation(city),
        },
      },
    };
  } catch (error) {
    logger.error('[fetchGA4UserDemographics] Error:', error);
    throw new HttpsError('internal', error.message);
  }
};

/**
 * 指定されたディメンションでGA4データを取得
 */
async function fetchDimension(propertyId, startDate, endDate, accessToken, dimension) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  
  const requestBody = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: dimension }],
    metrics: [{ name: 'activeUsers' }],
    limit: dimension.includes('country') || dimension.includes('region') || dimension.includes('city') ? 10 : 100,
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[fetchDimension] API Error for ${dimension}:`, errorText);
    throw new Error(`GA4 API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 新規/リピーターデータのフォーマット
 */
function formatNewReturning(data) {
  if (!data.rows) return [];
  
  const total = data.rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);
  
  return data.rows.map(row => {
    const value = parseInt(row.metricValues[0].value);
    const dimensionValue = row.dimensionValues[0].value;
    let name = dimensionValue === 'new' ? '新規ユーザー' : 'リピーター';
    
    return {
      name,
      value,
      percentage: (value / total) * 100,
    };
  });
}

/**
 * 性別データのフォーマット
 */
function formatGender(data) {
  if (!data.rows) return [];
  
  const total = data.rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);
  
  const genderMap = {
    'male': '男性',
    'female': '女性',
    '(not set)': '不明',
  };
  
  return data.rows.map(row => {
    const value = parseInt(row.metricValues[0].value);
    const dimensionValue = row.dimensionValues[0].value;
    
    return {
      name: genderMap[dimensionValue] || dimensionValue,
      value,
      percentage: (value / total) * 100,
    };
  });
}

/**
 * 年齢データのフォーマット
 */
function formatAge(data) {
  if (!data.rows) return [];
  
  const total = data.rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);
  
  // 年齢順にソート
  const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  
  const formatted = data.rows
    .map(row => {
      const value = parseInt(row.metricValues[0].value);
      const dimensionValue = row.dimensionValues[0].value;
      
      return {
        name: dimensionValue === '(not set)' ? '不明' : dimensionValue,
        value,
        percentage: (value / total) * 100,
      };
    })
    .filter(item => item.name !== '不明'); // 不明を除外
  
  // ageOrderに基づいてソート
  formatted.sort((a, b) => {
    const indexA = ageOrder.indexOf(a.name);
    const indexB = ageOrder.indexOf(b.name);
    return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
  });
  
  return formatted;
}

/**
 * デバイスデータのフォーマット
 */
function formatDevice(data) {
  if (!data.rows) return [];
  
  const total = data.rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);
  
  const deviceMap = {
    'desktop': 'デスクトップ',
    'mobile': 'モバイル',
    'tablet': 'タブレット',
  };
  
  return data.rows.map(row => {
    const value = parseInt(row.metricValues[0].value);
    const dimensionValue = row.dimensionValues[0].value;
    
    return {
      name: deviceMap[dimensionValue] || dimensionValue,
      value,
      percentage: (value / total) * 100,
    };
  });
}

/**
 * 地域データのフォーマット（上位10件）
 */
function formatLocation(data) {
  if (!data.rows) return [];
  
  const total = data.rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);
  
  return data.rows
    .slice(0, 10) // 上位10件
    .map(row => {
      const value = parseInt(row.metricValues[0].value);
      const name = row.dimensionValues[0].value;
      
      return {
        name: name === '(not set)' ? '不明' : name,
        value,
        percentage: (value / total) * 100,
      };
    });
}

