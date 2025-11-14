import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { getCache, setCache, generateCacheKey } from '../utils/cacheManager.js';

/**
 * GSCデータ取得 Callable Function
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - GSCデータ
 */
export async function fetchGSCDataCallable(request) {
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

  console.log(`[fetchGSCData] Start: siteId=${siteId}, period=${startDate} to ${endDate}, userId=${userId}`);

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

    // GSC設定の確認
    if (!siteData.gscSiteUrl || !siteData.gscOauthTokenId) {
      throw new HttpsError(
        'failed-precondition',
        'Search Consoleの設定が完了していません'
      );
    }

    // 2. キャッシュチェック（パフォーマンス最適化）
    const cacheKey = generateCacheKey('gsc', siteId, startDate, endDate);
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      console.log(`[fetchGSCData] Returning cached data: ${cacheKey}`);
      return cachedData;
    }

    // 3. OAuthトークン取得・更新
    const { oauth2Client } = await getAndRefreshToken(siteData.gscOauthTokenId);

    // 4. Search Console API 呼び出し
    const searchConsole = google.searchconsole('v1');
    
    // 🚀 パフォーマンス最適化: 基本メトリクス、トップクエリ、トップページを並列取得
    console.log(`[fetchGSCData] Fetching metrics, queries, and pages in parallel...`);
    
    const [response, topQueriesResponse, topPagesResponse] = await Promise.all([
      // 基本指標の取得
      searchConsole.searchanalytics.query({
        auth: oauth2Client,
        siteUrl: siteData.gscSiteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: [], // 全体の集計
          rowLimit: 1,
        },
      }),
      // トップクエリの取得（最大25,000件）
      searchConsole.searchanalytics.query({
        auth: oauth2Client,
        siteUrl: siteData.gscSiteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 25000,
        },
      }),
      // トップページの取得（最大25,000件）
      searchConsole.searchanalytics.query({
        auth: oauth2Client,
        siteUrl: siteData.gscSiteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 25000,
        },
      }),
    ]);

    // 5. データ整形
    const result = {
      metrics: {
        clicks: response.data.rows?.[0]?.clicks || 0,
        impressions: response.data.rows?.[0]?.impressions || 0,
        ctr: response.data.rows?.[0]?.ctr || 0,
        position: response.data.rows?.[0]?.position || 0,
      },
      topQueries: topQueriesResponse.data.rows?.map(row => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })) || [],
      topPages: topPagesResponse.data.rows?.map(row => ({
        page: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })) || [],
      period: {
        startDate,
        endDate,
      },
      fetchedAt: new Date().toISOString(),
      source: 'api',
    };

    console.log(`[fetchGSCData] Success: siteId=${siteId}, period=${startDate} to ${endDate}`);
    
    // キャッシュに保存（パフォーマンス最適化）
    await setCache(cacheKey, result, siteId, userId);
    
    return result;

  } catch (error) {
    console.error('[fetchGSCData] Error:', error);

    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'gsc_fetch_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error('[fetchGSCData] Error logging failed:', logError);
    }

    // HttpsErrorの場合はそのまま投げる
    if (error instanceof HttpsError) {
      throw error;
    }

    // その他のエラーは internal エラーとして投げる
    throw new HttpsError(
      'internal',
      'Search Consoleデータの取得に失敗しました: ' + error.message
    );
  }
}

