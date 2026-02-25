import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { getCache, setCache, generateCacheKey } from '../utils/cacheManager.js';

/**
 * GA4日別コンバージョンデータ取得 Callable Function
 */
export async function fetchGA4DailyConversionDataCallable(request) {
  const db = getFirestore();
  const { siteId, startDate, endDate } = request.data;

  if (!siteId || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'siteId, startDate, endDate are required');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User authentication is required');
  }

  const userId = request.auth.uid;

  try {
    // キャッシュチェック（パフォーマンス最適化）
    const cacheKey = generateCacheKey('ga4-daily-conv', siteId, startDate, endDate);
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      console.log(`[fetchGA4DailyConversionData] Returning cached data: ${cacheKey}`);
      return cachedData;
    }

    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found');
    }

    const siteData = siteDoc.data();
    
    // サイト所有者本人、または管理者権限（admin/editor/viewer）がある場合のみアクセス許可
    if (siteData.userId !== userId) {
      const adminDoc = await db.collection('adminUsers').doc(userId).get();
      if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data().role)) {
        throw new HttpsError('permission-denied', 'Access denied');
      }
    }

    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError('failed-precondition', 'GA4 not configured');
    }

    const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
    const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    const analyticsData = google.analyticsdata('v1beta');

    // 🚀 パフォーマンス最適化: sessionsとconversionsを並列取得
    const promises = [
      analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'sessions' }],
        },
      }),
    ];

    if (siteData.conversionEvents && siteData.conversionEvents.length > 0) {
      promises.push(
        analyticsData.properties.runReport({
          auth: oauth2Client,
          property: `properties/${siteData.ga4PropertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }, { name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                inListFilter: {
                  values: siteData.conversionEvents.map(e => e.eventName),
                },
              },
            },
          },
        })
      );
    }

    const results = await Promise.all(promises);
    const sessionsResponse = results[0];
    const conversionsResponse = results.length > 1 ? results[1] : null;

    const dailyData = {};
    (sessionsResponse.data.rows || []).forEach(row => {
      const date = row.dimensionValues[0].value;
      dailyData[date] = {
        date,
        sessions: parseInt(row.metricValues[0].value || 0),
        conversions: 0,
      };
    });

    if (conversionsResponse) {
      (conversionsResponse.data.rows || []).forEach(row => {
        const date = row.dimensionValues[0].value;
        const eventCount = parseInt(row.metricValues[0].value || 0);
        if (dailyData[date]) {
          dailyData[date].conversions += eventCount;
        }
      });
    }

    const result = {
      rows: Object.values(dailyData),
      hasConversionEvents: siteData.conversionEvents && siteData.conversionEvents.length > 0,
      conversionEventNames: siteData.conversionEvents ? siteData.conversionEvents.map(e => e.eventName) : [],
    };

    // キャッシュに保存（パフォーマンス最適化）
    await setCache(cacheKey, result, siteId, userId);

    return result;

  } catch (error) {
    console.error('[fetchGA4DailyConversionData] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to fetch GA4 daily data: ${error.message}`);
  }
}
