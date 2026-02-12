import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4逆算フローデータ取得 Callable Function
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 逆算フローデータ
 */
export async function fetchGA4ReverseFlowDataCallable(request) {
  const db = getFirestore();
  const {
    siteId,
    startDate, // YYYY-MM-DD
    endDate,   // YYYY-MM-DD
    formPagePath,
    targetCvEvent,
  } = request.data;

  // 入力バリデーション
  if (!siteId || !startDate || !endDate || !formPagePath || !targetCvEvent) {
    throw new HttpsError(
      'invalid-argument',
      'siteId, startDate, endDate, formPagePath, targetCvEvent are required'
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

  console.log(`[fetchGA4ReverseFlowData] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}`);

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
    
    // 全サイトPV
    const totalSiteViewsResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'screenPageViews' }],
      },
    });

    const totalSiteViews = parseInt(totalSiteViewsResponse.data.rows?.[0]?.metricValues?.[0]?.value || 0);

    // フォームページPV
    const formPageViewsResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'EXACT',
              value: formPagePath,
            },
          },
        },
      },
    });

    console.log(`[fetchGA4ReverseFlowData] フォームページパス検索: ${formPagePath}`);
    console.log(`[fetchGA4ReverseFlowData] フォームページPV応答:`, JSON.stringify(formPageViewsResponse.data.rows || []));

    const formPageViews = parseInt(formPageViewsResponse.data.rows?.[0]?.metricValues?.[0]?.value || 0);
    
    console.log(`[fetchGA4ReverseFlowData] フォームページPV: ${formPageViews}`);

    // 送信完了（CV）
    const submissionCompleteResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT',
              value: targetCvEvent,
            },
          },
        },
      },
    });

    console.log(`[fetchGA4ReverseFlowData] CVイベント検索: ${targetCvEvent}`);
    console.log(`[fetchGA4ReverseFlowData] CVイベント応答:`, JSON.stringify(submissionCompleteResponse.data.rows || []));

    const submissionComplete = parseInt(submissionCompleteResponse.data.rows?.[0]?.metricValues?.[0]?.value || 0);
    
    console.log(`[fetchGA4ReverseFlowData] 送信完了: ${submissionComplete}`);

    // 4. 月次データの取得
    const monthlyResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'yearMonth' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
      },
    });

    const monthlyTotals = {};
    monthlyResponse.data.rows?.forEach(row => {
      const yearMonth = row.dimensionValues[0].value;
      monthlyTotals[yearMonth] = {
        yearMonth,
        totalSiteViews: parseInt(row.metricValues[0].value || 0),
        formPageViews: 0,
        submissionComplete: 0,
      };
    });

    // 月次フォームページPV
    const monthlyFormResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'yearMonth' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'EXACT',
              value: formPagePath,
            },
          },
        },
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
      },
    });

    monthlyFormResponse.data.rows?.forEach(row => {
      const yearMonth = row.dimensionValues[0].value;
      if (monthlyTotals[yearMonth]) {
        monthlyTotals[yearMonth].formPageViews = parseInt(row.metricValues[0].value || 0);
      }
    });

    // 月次送信完了
    const monthlySubmissionResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'yearMonth' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT',
              value: targetCvEvent,
            },
          },
        },
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
      },
    });

    monthlySubmissionResponse.data.rows?.forEach(row => {
      const yearMonth = row.dimensionValues[0].value;
      if (monthlyTotals[yearMonth]) {
        monthlyTotals[yearMonth].submissionComplete = parseInt(row.metricValues[0].value || 0);
      }
    });

    const monthlyTable = Object.values(monthlyTotals).sort((a, b) => 
      a.yearMonth.localeCompare(b.yearMonth)
    );

    console.log(`[fetchGA4ReverseFlowData] Success`);
    
    return {
      success: true,
      summary: {
        totalSiteViews,
        formPageViews,
        submissionComplete,
      },
      monthlyTable,
      period: {
        startDate,
        endDate,
      },
      fetchedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[fetchGA4ReverseFlowData] Error:', error);

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'ga4_reverse_flow_fetch_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('[fetchGA4ReverseFlowData] Error logging failed:', logError);
    }

    // HttpsErrorの場合はそのまま投げる
    if (error instanceof HttpsError) {
      throw error;
    }

    // その他のエラーは internal エラーとして投げる
    throw new HttpsError(
      'internal',
      '逆算フローデータの取得に失敗しました: ' + error.message
    );
  }
}

