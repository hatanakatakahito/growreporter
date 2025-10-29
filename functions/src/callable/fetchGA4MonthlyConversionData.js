import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4月次コンバージョンデータ取得 Callable Function
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 月次コンバージョンデータ
 */
export async function fetchGA4MonthlyConversionDataCallable(request) {
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

  console.log(`[fetchGA4MonthlyConversionData] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}`);

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

    // コンバージョンイベントの確認
    if (!siteData.conversionEvents || siteData.conversionEvents.length === 0) {
      throw new HttpsError(
        'failed-precondition',
        'コンバージョンイベントが設定されていません'
      );
    }

    // 2. OAuthトークン取得・更新
    const { oauth2Client } = await getAndRefreshToken(siteData.ga4OauthTokenId);

    // 3. GA4 Data API 呼び出し（月別）
    const analyticsData = google.analyticsdata('v1beta');
    
    console.log(`[fetchGA4MonthlyConversionData] Fetching monthly conversion data from GA4 API...`);
    
    const response = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'yearMonth' },
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
        orderBys: [
          { dimension: { dimensionName: 'yearMonth' }, desc: false }
        ],
      },
    });

    // 4. データ整形
    const rows = response.data.rows || [];
    
    // yearMonth でグループ化
    const monthlyData = {};
    
    rows.forEach(row => {
      const yearMonth = row.dimensionValues[0].value;
      const eventName = row.dimensionValues[1].value;
      const count = parseInt(row.metricValues[0].value || 0);
      
      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { yearMonth };
      }
      
      monthlyData[yearMonth][eventName] = count;
    });

    // 配列に変換してソート
    const result = Object.values(monthlyData).sort((a, b) => 
      a.yearMonth.localeCompare(b.yearMonth)
    );

    console.log(`[fetchGA4MonthlyConversionData] Success: ${result.length} months`);
    
    return {
      success: true,
      data: result,
      period: {
        startDate,
        endDate,
      },
      fetchedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[fetchGA4MonthlyConversionData] Error:', error);

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'ga4_monthly_conversion_fetch_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('[fetchGA4MonthlyConversionData] Error logging failed:', logError);
    }

    // HttpsErrorの場合はそのまま投げる
    if (error instanceof HttpsError) {
      throw error;
    }

    // その他のエラーは internal エラーとして投げる
    throw new HttpsError(
      'internal',
      '月次コンバージョンデータの取得に失敗しました: ' + error.message
    );
  }
}

