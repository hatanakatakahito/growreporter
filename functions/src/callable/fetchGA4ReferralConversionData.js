import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4被リンク元別コンバージョンデータ取得 Callable Function
 */
export async function fetchGA4ReferralConversionDataCallable(request) {
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
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found');
    }

    const siteData = siteDoc.data();
    if (siteData.userId !== userId) {
      throw new HttpsError('permission-denied', 'Access denied');
    }

    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError('failed-precondition', 'GA4 not configured');
    }

    const { oauth2Client } = await getAndRefreshToken(siteData.ga4OauthTokenId);
    const analyticsData = google.analyticsdata('v1beta');

    const sessionsResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionMedium',
            stringFilter: {
              matchType: 'EXACT',
              value: 'referral',
            },
          },
        },
      },
    });

    const referralData = {};
    (sessionsResponse.data.rows || []).forEach(row => {
      const source = row.dimensionValues[0].value;
      const sessions = parseInt(row.metricValues[0].value || 0);
      const users = parseInt(row.metricValues[1].value || 0);
      const engagementRate = parseFloat(row.metricValues[2].value || 0);
      const averageSessionDuration = parseFloat(row.metricValues[3].value || 0);
      referralData[source] = { source, sessions, users, engagementRate, averageSessionDuration, conversions: 0 };
    });

    if (siteData.conversionEvents && siteData.conversionEvents.length > 0) {
      const conversionsResponse = await analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: 'sessionMedium',
                    stringFilter: { matchType: 'EXACT', value: 'referral' },
                  },
                },
                {
                  filter: {
                    fieldName: 'eventName',
                    inListFilter: {
                      values: siteData.conversionEvents.map(e => e.eventName),
                    },
                  },
                },
              ],
            },
          },
        },
      });

      (conversionsResponse.data.rows || []).forEach(row => {
        const source = row.dimensionValues[0].value;
        const eventCount = parseInt(row.metricValues[0].value || 0);
        if (referralData[source]) {
          referralData[source].conversions += eventCount;
        }
      });
    }

    return {
      rows: Object.values(referralData),
      hasConversionEvents: siteData.conversionEvents && siteData.conversionEvents.length > 0,
      conversionEventNames: siteData.conversionEvents ? siteData.conversionEvents.map(e => e.eventName) : [],
    };

  } catch (error) {
    console.error('[fetchGA4ReferralConversionData] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to fetch GA4 referral data: ${error.message}`);
  }
}
