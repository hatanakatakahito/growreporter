import { google } from 'googleapis';
import { getAndRefreshToken } from './tokenManager.js';

/**
 * サーバー側でサイトのGA4メトリクスを取得する（認証不要・スケジュール等から利用）
 * @param {FirebaseFirestore.Firestore} db - Firestore インスタンス
 * @param {string} siteId - サイトID
 * @param {string} startDate - 開始日 YYYY-MM-DD
 * @param {string} endDate - 終了日 YYYY-MM-DD
 * @returns {Promise<object|null>} - { sessions, totalUsers, newUsers, screenPageViews, engagementRate, totalConversions, conversionRate, bounceRate } または null
 */
/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function getGA4MetricsForSite(db, siteId, startDate, endDate) {
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) return null;

  const siteData = siteDoc.data();
  if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) return null;

  const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
  let oauth2Client;
  try {
    const tokenResult = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    oauth2Client = tokenResult.oauth2Client;
  } catch (err) {
    console.error('[ga4ServerHelper] Token error for site', siteId, err.message);
    return null;
  }

  const analyticsData = google.analyticsdata('v1beta');

  const metricsList = [
    'sessions',
    'totalUsers',
    'newUsers',
    'screenPageViews',
    'engagementRate',
  ];

  const promises = [
    analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: metricsList.map((name) => ({ name })),
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
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: siteData.conversionEvents.map((e) => e.eventName),
              },
            },
          },
        },
      })
    );
  }

  const results = await Promise.allSettled(promises);
  const basic = results[0].status === 'fulfilled' ? results[0].value : null;
  if (!basic || !basic.data?.rows?.[0]) return null;

  const row = basic.data.rows[0].metricValues;
  const sessions = parseInt(row[0]?.value || 0);
  const totalUsers = parseInt(row[1]?.value || 0);
  const newUsers = parseInt(row[2]?.value || 0);
  const screenPageViews = parseInt(row[3]?.value || 0);
  const engagementRate = parseFloat(row[4]?.value || 0);

  let totalConversions = 0;
  if (results.length > 1 && results[1].status === 'fulfilled' && results[1].value?.data?.rows) {
    results[1].value.data.rows.forEach((r) => {
      totalConversions += parseInt(r.metricValues[0]?.value || 0);
    });
  }
  const conversionRate = sessions > 0 ? totalConversions / sessions : 0;

  // bounceRate: GA4 では engagementRate の逆（非エンゲージ＝直帰）で近似。APIで bounceRate が無い場合
  const bounceRate = 100 - (engagementRate * 100);

  const averagePageviews = totalUsers > 0 ? screenPageViews / totalUsers : 0;

  return {
    sessions,
    totalUsers,
    newUsers,
    screenPageViews,
    averagePageviews,
    engagementRate: engagementRate * 100,
    totalConversions,
    conversionRate: conversionRate * 100,
    bounceRate,
  };
}

export { getGA4MetricsForSite };
