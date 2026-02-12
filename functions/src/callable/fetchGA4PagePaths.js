import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';

/**
 * GA4ページパス一覧取得 Callable Function
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - ページパス一覧
 */
export async function fetchGA4PagePathsCallable(request) {
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

  console.log(`[fetchGA4PagePaths] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}`);

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
    
    const response = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' }
        ],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 1000,
      },
    });

    // 4. データ整形（パスとタイトルのマップを作成）
    const pageMap = new Map();
    
    response.data.rows?.forEach(row => {
      const path = row.dimensionValues[0].value;
      const title = row.dimensionValues[1].value;
      
      if (path && path !== '(not set)') {
        // 同じパスで複数のタイトルがある場合、最初のもの（PV数が多い）を使用
        if (!pageMap.has(path)) {
          pageMap.set(path, {
            path,
            title: title && title !== '(not set)' ? title : path,
          });
        }
      }
    });

    // パス順にソート
    const pageData = Array.from(pageMap.values()).sort((a, b) => a.path.localeCompare(b.path));

    console.log(`[fetchGA4PagePaths] Success: ${pageData.length} paths`);
    
    return {
      success: true,
      data: pageData,
      period: {
        startDate,
        endDate,
      },
      fetchedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[fetchGA4PagePaths] Error:', error);

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'ga4_page_paths_fetch_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('[fetchGA4PagePaths] Error logging failed:', logError);
    }

    // HttpsErrorの場合はそのまま投げる
    if (error instanceof HttpsError) {
      throw error;
    }

    // その他のエラーは internal エラーとして投げる
    throw new HttpsError(
      'internal',
      'ページパス一覧の取得に失敗しました: ' + error.message
    );
  }
}

