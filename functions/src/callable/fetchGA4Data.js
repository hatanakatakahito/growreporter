import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { getCache, setCache, generateCacheKey } from '../utils/cacheManager.js';

/**
 * GA4データ取得 Callable Function
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - GA4データ
 */
export async function fetchGA4DataCallable(request) {
  const db = getFirestore();
  const {
    siteId,
    startDate,
    endDate,
    dimensions = null,  // カスタムディメンション (例: ['date'], ['dayOfWeek', 'hour'])
    metrics = null,     // カスタムメトリクス (例: ['sessions', 'conversions'])
    dimensionFilter = null  // ディメンションフィルター
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

  // カスタムディメンション/メトリクスの使用有無
  // ディメンションが指定されている場合のみカスタムクエリとして扱う
  const isCustomQuery = dimensions !== null && dimensions.length > 0;
  const dimensionsStr = dimensions ? dimensions.join(',') : '';
  const metricsStr = metrics ? metrics.join(',') : '';

  console.log(`[fetchGA4Data] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}, custom=${isCustomQuery}, dimensions=${dimensionsStr}, metrics=${metricsStr}`);

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

    // 4. GA4 Data API 呼び出し
    const analyticsData = google.analyticsdata('v1beta');
    
    // カスタムディメンション/メトリクスが指定されている場合
    if (isCustomQuery) {
      console.log(`[fetchGA4Data] Fetching custom query from GA4 API...`);
      
      // リクエストボディの構築
      const requestBody = {
        dateRanges: [{ startDate, endDate }],
      };
      
      // ディメンションの追加
      if (dimensions && dimensions.length > 0) {
        requestBody.dimensions = dimensions.map(dim => ({ name: dim }));
      }
      
      // メトリクスの追加 (指定がない場合はデフォルトでsessionsを使用)
      if (metrics && metrics.length > 0) {
        requestBody.metrics = metrics.map(met => ({ name: met }));
      } else {
        requestBody.metrics = [{ name: 'sessions' }];
      }
      
      // ディメンションフィルターの追加
      if (dimensionFilter) {
        requestBody.dimensionFilter = dimensionFilter;
      }
      
      const response = await analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody,
      });
      
      // カスタムクエリの結果を整形
      const rows = response.data.rows || [];
      const result = {
        rows: rows.map(row => {
          const rowData = {};
          
          // ディメンション値
          if (dimensions) {
            dimensions.forEach((dim, idx) => {
              rowData[dim] = row.dimensionValues[idx].value;
            });
          }
          
          // メトリクス値
          const metricsToUse = metrics && metrics.length > 0 ? metrics : ['sessions'];
          metricsToUse.forEach((met, idx) => {
            rowData[met] = parseFloat(row.metricValues[idx].value || 0);
          });
          
          return rowData;
        }),
        period: {
          startDate,
          endDate,
        },
        fetchedAt: new Date().toISOString(),
        source: 'api',
      };
      
      console.log(`[fetchGA4Data] Success (custom): rows=${result.rows.length}`);
      return result;
    }
    
    // 基本指標の取得（既存のロジック）
    console.log(`[fetchGA4Data] Fetching basic metrics from GA4 API...`);
    const response = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
        ],
      },
    });

    // 5. データ整形
    const metricsData = {
      sessions: parseInt(response.data.rows?.[0]?.metricValues?.[0]?.value || 0),
      totalUsers: parseInt(response.data.rows?.[0]?.metricValues?.[1]?.value || 0),
      newUsers: parseInt(response.data.rows?.[0]?.metricValues?.[2]?.value || 0),
      screenPageViews: parseInt(response.data.rows?.[0]?.metricValues?.[3]?.value || 0),
      engagementRate: parseFloat(response.data.rows?.[0]?.metricValues?.[4]?.value || 0),
    };

    // 6. コンバージョンイベントの取得
    const conversions = {};
    
    if (siteData.conversionEvents && siteData.conversionEvents.length > 0) {
      console.log(`[fetchGA4Data] Fetching conversion events (${siteData.conversionEvents.length} events)...`);
      
      try {
        const cvResponse = await analyticsData.properties.runReport({
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
                  values: siteData.conversionEvents.map(e => e.eventName),
                },
              },
            },
          },
        });

        cvResponse.data.rows?.forEach(row => {
          const eventName = row.dimensionValues[0].value;
          const count = parseInt(row.metricValues[0].value);
          conversions[eventName] = count;
        });
      } catch (cvError) {
        console.error('[fetchGA4Data] Error fetching conversion events:', cvError);
        // コンバージョンデータの取得エラーは致命的ではないので続行
      }
    }

    // 7. コンバージョン率の計算
    const totalConversions = Object.values(conversions).reduce((sum, val) => sum + val, 0);
    const conversionRate = metricsData.sessions > 0 ? totalConversions / metricsData.sessions : 0;

    // 8. 結果の構築
    const result = {
      metrics: {
        ...metricsData,
        conversions,
        totalConversions,
        conversionRate,
      },
      period: {
        startDate,
        endDate,
      },
      fetchedAt: new Date().toISOString(),
      source: 'api',
    };

    console.log(`[fetchGA4Data] Success: siteId=${siteId}, period=${startDate} to ${endDate}`);
    
    return result;

  } catch (error) {
    console.error('[fetchGA4Data] Error:', error);

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'ga4_fetch_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error('[fetchGA4Data] Error logging failed:', logError);
    }

    // HttpsErrorの場合はそのまま投げる
    if (error instanceof HttpsError) {
      throw error;
    }

    // その他のエラーは internal エラーとして投げる
    throw new HttpsError(
      'internal',
      'GA4データの取得に失敗しました: ' + error.message
    );
  }
}

