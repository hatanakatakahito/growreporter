import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { refreshGSCToken } from './refreshToken.js';

const db = getFirestore();

/**
 * GSCデータを取得してFirestoreに保存
 */
export async function fetchGSCData(siteId, siteData) {
  console.log(`[fetchGSCData] 開始: ${siteId}`);

  try {
    // トークン取得
    const tokenDoc = await db.collection('oauth_tokens').doc(siteData.gscOauthTokenId).get();
    
    if (!tokenDoc.exists) {
      throw new Error('GSC token not found');
    }

    let tokenData = tokenDoc.data();

    // トークンの有効期限チェック
    const expiresAt = tokenData.expires_at.toDate();
    const now = new Date();

    if (expiresAt <= now) {
      console.log('[fetchGSCData] トークン期限切れ、更新中...');
      await refreshGSCToken(siteData.gscOauthTokenId);
      
      // 更新されたトークンを再取得
      const updatedTokenDoc = await db.collection('oauth_tokens').doc(siteData.gscOauthTokenId).get();
      tokenData = updatedTokenDoc.data();
    }

    // データ取得期間（過去30日間）
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3); // GSCは3日前までのデータ
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[fetchGSCData] 期間: ${startDateStr} ~ ${endDateStr}`);

    // GSC Search Analytics API呼び出し
    const requestBody = {
      startDate: startDateStr,
      endDate: endDateStr,
      dimensions: ['date', 'query', 'page', 'device'],
      rowLimit: 25000,
      dataState: 'final',
    };

    const siteUrlEncoded = encodeURIComponent(siteData.gscSiteUrl);
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrlEncoded}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GSC API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`[fetchGSCData] データ取得成功: ${data.rows?.length || 0}行`);

    // データ整形
    const processedData = processGSCData(data);

    // Firestoreに保存
    const batch = db.batch();

    // 日次データ保存
    for (const dailyData of processedData.daily) {
      const docRef = db
        .collection('sites')
        .doc(siteId)
        .collection('gsc_data')
        .doc(dailyData.date);

      batch.set(docRef, {
        ...dailyData,
        fetchedAt: Timestamp.now(),
      }, { merge: true });
    }

    // トップクエリ保存
    const topQueriesRef = db
      .collection('sites')
      .doc(siteId)
      .collection('gsc_data')
      .doc('_top_queries');

    batch.set(topQueriesRef, {
      queries: processedData.topQueries,
      lastFetchedAt: Timestamp.now(),
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    }, { merge: true });

    // トップページ保存
    const topPagesRef = db
      .collection('sites')
      .doc(siteId)
      .collection('gsc_data')
      .doc('_top_pages');

    batch.set(topPagesRef, {
      pages: processedData.topPages,
      lastFetchedAt: Timestamp.now(),
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    }, { merge: true });

    // サマリーデータ保存
    const summaryRef = db
      .collection('sites')
      .doc(siteId)
      .collection('gsc_data')
      .doc('_summary');

    batch.set(summaryRef, {
      ...processedData.summary,
      lastFetchedAt: Timestamp.now(),
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    }, { merge: true });

    await batch.commit();

    // サイトドキュメントの最終更新日時を更新
    await db.collection('sites').doc(siteId).update({
      'dataStatus.gscLastFetched': Timestamp.now(),
      'dataStatus.gscStatus': 'success',
    });

    console.log(`[fetchGSCData] 完了: ${siteId}`);

    return {
      success: true,
      rowCount: data.rows?.length || 0,
    };
  } catch (error) {
    console.error(`[fetchGSCData] エラー: ${siteId}`, error);

    // エラー状態を保存
    await db.collection('sites').doc(siteId).update({
      'dataStatus.gscLastFetched': Timestamp.now(),
      'dataStatus.gscStatus': 'error',
      'dataStatus.gscError': error.message,
    });

    throw error;
  }
}

/**
 * GSCデータを整形
 */
function processGSCData(rawData) {
  const rows = rawData.rows || [];

  // 日次データ
  const dailyDataMap = new Map();
  const queryMap = new Map();
  const pageMap = new Map();

  for (const row of rows) {
    const date = row.keys[0];
    const query = row.keys[1];
    const page = row.keys[2];
    const device = row.keys[3];

    const clicks = row.clicks;
    const impressions = row.impressions;
    const ctr = row.ctr;
    const position = row.position;

    // 日次データ集計
    if (!dailyDataMap.has(date)) {
      dailyDataMap.set(date, {
        date,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        byDevice: {},
        count: 0,
      });
    }

    const dailyData = dailyDataMap.get(date);
    dailyData.clicks += clicks;
    dailyData.impressions += impressions;
    dailyData.ctr += ctr;
    dailyData.position += position;
    dailyData.count++;

    // デバイス別
    if (!dailyData.byDevice[device]) {
      dailyData.byDevice[device] = { clicks: 0, impressions: 0 };
    }
    dailyData.byDevice[device].clicks += clicks;
    dailyData.byDevice[device].impressions += impressions;

    // クエリ集計
    if (!queryMap.has(query)) {
      queryMap.set(query, {
        query,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        count: 0,
      });
    }
    const queryData = queryMap.get(query);
    queryData.clicks += clicks;
    queryData.impressions += impressions;
    queryData.ctr += ctr;
    queryData.position += position;
    queryData.count++;

    // ページ集計
    if (!pageMap.has(page)) {
      pageMap.set(page, {
        page,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        count: 0,
      });
    }
    const pageData = pageMap.get(page);
    pageData.clicks += clicks;
    pageData.impressions += impressions;
    pageData.ctr += ctr;
    pageData.position += position;
    pageData.count++;
  }

  // 平均値を計算
  const daily = Array.from(dailyDataMap.values()).map(data => ({
    ...data,
    ctr: data.count > 0 ? data.ctr / data.count : 0,
    position: data.count > 0 ? data.position / data.count : 0,
  }));

  // トップクエリ（クリック数順、上位100件）
  const topQueries = Array.from(queryMap.values())
    .map(data => ({
      ...data,
      ctr: data.count > 0 ? data.ctr / data.count : 0,
      position: data.count > 0 ? data.position / data.count : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 100);

  // トップページ（クリック数順、上位100件）
  const topPages = Array.from(pageMap.values())
    .map(data => ({
      ...data,
      ctr: data.count > 0 ? data.ctr / data.count : 0,
      position: data.count > 0 ? data.position / data.count : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 100);

  // サマリーデータ（全期間の合計）
  const summary = {
    totalClicks: daily.reduce((sum, d) => sum + d.clicks, 0),
    totalImpressions: daily.reduce((sum, d) => sum + d.impressions, 0),
    avgCtr: daily.length > 0 
      ? daily.reduce((sum, d) => sum + d.ctr, 0) / daily.length 
      : 0,
    avgPosition: daily.length > 0 
      ? daily.reduce((sum, d) => sum + d.position, 0) / daily.length 
      : 0,
  };

  return {
    daily,
    topQueries,
    topPages,
    summary,
  };
}

