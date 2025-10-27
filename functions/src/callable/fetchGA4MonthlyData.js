import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4月次データ取得 Callable Function
 * 過去13ヶ月の月次データを取得
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 月次GA4データ
 */
export async function fetchGA4MonthlyDataCallable(request) {
  const db = getFirestore();
  const { siteId, startDate, endDate } = request.data;

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

  console.log(`[fetchGA4MonthlyData] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}`);

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

    // 3. GA4 Data API 呼び出し（月次ディメンション付き）
    const analyticsData = google.analyticsdata('v1beta');
    
    console.log(`[fetchGA4MonthlyData] Fetching monthly metrics from GA4 API...`);
    const response = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'yearMonth' }, // YYYYMM形式
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
        ],
        orderBys: [
          { dimension: { dimensionName: 'yearMonth' }, desc: true }
        ],
      },
    });

    // 4. データ整形
    const monthlyData = [];
    
    if (response.data.rows) {
      for (const row of response.data.rows) {
        const yearMonth = row.dimensionValues[0].value; // YYYYMM
        const sessions = parseInt(row.metricValues[0].value || 0);
        const users = parseInt(row.metricValues[1].value || 0);
        const pageViews = parseInt(row.metricValues[2].value || 0);
        const engagementRate = parseFloat(row.metricValues[3].value || 0);

        // YYYYMM -> yyyy-MM形式に変換
        const year = yearMonth.substring(0, 4);
        const month = yearMonth.substring(4, 6);
        const formattedMonth = `${year}-${month}`;

        monthlyData.push({
          month: formattedMonth,
          yearMonth: parseInt(yearMonth),
          label: `${year}年${month}月`,
          users,
          sessions,
          pageViews,
          avgPageviews: sessions > 0 ? pageViews / sessions : 0,
          engagementRate,
          conversions: 0, // コンバージョンは別途取得
          conversionRate: 0,
        });
      }
    }

    // 5. コンバージョンイベントの取得（月次）
    if (siteData.conversionEvents && siteData.conversionEvents.length > 0) {
      console.log(`[fetchGA4MonthlyData] Fetching conversion events...`);
      
      for (const event of siteData.conversionEvents) {
        try {
          const conversionResponse = await analyticsData.properties.runReport({
            auth: oauth2Client,
            property: `properties/${siteData.ga4PropertyId}`,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [
                { name: 'yearMonth' },
              ],
              metrics: [
                { name: 'eventCount' },
              ],
              dimensionFilter: {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    value: event.eventName,
                  },
                },
              },
              orderBys: [
                { dimension: { dimensionName: 'yearMonth' }, desc: true }
              ],
            },
          });

          // 月次データにコンバージョンを追加
          if (conversionResponse.data.rows) {
            for (const row of conversionResponse.data.rows) {
              const yearMonth = row.dimensionValues[0].value;
              const eventCount = parseInt(row.metricValues[0].value || 0);

              // 対応する月のデータを探して追加
              const monthData = monthlyData.find(m => m.yearMonth === parseInt(yearMonth));
              if (monthData) {
                monthData.conversions += eventCount;
              }
            }
          }
        } catch (err) {
          console.error(`[fetchGA4MonthlyData] Error fetching conversion event ${event.eventName}:`, err);
        }
      }

      // CVRを計算
      monthlyData.forEach(month => {
        month.conversionRate = month.sessions > 0 ? month.conversions / month.sessions : 0;
      });
    }

    console.log(`[fetchGA4MonthlyData] Success: ${monthlyData.length} months retrieved`);

    const result = {
      monthlyData,
      startDate,
      endDate,
      retrievedAt: new Date().toISOString(),
    };

    return result;

  } catch (error) {
    console.error('[fetchGA4MonthlyData] Error:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError(
      'internal',
      `GA4データの取得に失敗しました: ${error.message}`
    );
  }
}

