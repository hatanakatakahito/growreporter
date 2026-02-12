import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4チャネル別コンバージョンデータ取得 Callable Function
 * サイト設定で定義したコンバージョンイベントのみをカウント
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - チャネル別コンバージョンデータ
 */
export async function fetchGA4ChannelConversionDataCallable(request) {
  const db = getFirestore();
  const {
    siteId,
    startDate, // YYYY-MM-DD
    endDate,   // YYYY-MM-DD
  } = request.data;

  // 入力バリデーション
  if (!siteId || !startDate || !endDate) {
    throw new HttpsError(
      'invalid-argument',
      'siteId, startDate, endDate are required'
    );
  }

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'ユーザー認証が必要です'
    );
  }

  const userId = request.auth.uid;

  console.log(`[fetchGA4ChannelConversionData] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}`);

  try {
    // 1. サイトの所有権確認
    const siteDoc = await db.collection('sites').doc(siteId).get();
    
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }

    const siteData = siteDoc.data();
    
    if (siteData.userId !== userId) {
      throw new HttpsError(
        'permission-denied',
        'このサイトにアクセスする権限がありません'
      );
    }

    // GA4設定の確認
    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError(
        'failed-precondition',
        'GA4の設定が完了していません'
      );
    }

    // 2. OAuthトークン取得・更新
    const { oauth2Client } = await getAndRefreshToken(siteData.ga4OauthTokenId);

    // 3. GA4 Data API 呼び出し
    const analyticsData = google.analyticsdata('v1beta');
    
    console.log(`[fetchGA4ChannelConversionData] Fetching channel data from GA4 API...`);
    
    // セッションとユーザーデータを取得
    const sessionsResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'sessionDefaultChannelGroup' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' }
        ],
      },
    });

    // チャネルデータを整形
    const channelData = {};
    (sessionsResponse.data.rows || []).forEach(row => {
      const channel = row.dimensionValues[0].value;
      const sessions = parseInt(row.metricValues[0].value || 0);
      const activeUsers = parseInt(row.metricValues[1].value || 0);
      
      channelData[channel] = {
        sessionDefaultChannelGroup: channel,
        sessions,
        activeUsers,
        conversions: 0,
      };
    });

    // コンバージョンイベントが定義されている場合のみ取得
    if (siteData.conversionEvents && siteData.conversionEvents.length > 0) {
      console.log(`[fetchGA4ChannelConversionData] Fetching conversion data for ${siteData.conversionEvents.length} events...`);
      
      const conversionsResponse = await analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'sessionDefaultChannelGroup' },
            { name: 'eventName' }
          ],
          metrics: [
            { name: 'eventCount' }
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: siteData.conversionEvents.map(e => e.eventName),
              },
            },
          },
        },
      });

      // コンバージョンデータを集計
      (conversionsResponse.data.rows || []).forEach(row => {
        const channel = row.dimensionValues[0].value;
        const eventCount = parseInt(row.metricValues[0].value || 0);
        
        if (channelData[channel]) {
          channelData[channel].conversions += eventCount;
        }
      });
    }

    // 配列に変換
    const rows = Object.values(channelData);

    console.log(`[fetchGA4ChannelConversionData] Success: ${rows.length} channels`);

    return {
      rows,
      hasConversionEvents: siteData.conversionEvents && siteData.conversionEvents.length > 0,
      conversionEventNames: siteData.conversionEvents ? siteData.conversionEvents.map(e => e.eventName) : [],
    };

  } catch (error) {
    console.error('[fetchGA4ChannelConversionData] Error:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError(
      'internal',
      `GA4チャネル別コンバージョンデータの取得に失敗しました: ${error.message}`
    );
  }
}

