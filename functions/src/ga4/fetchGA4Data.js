import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { refreshGA4Token } from './refreshToken.js';

const db = getFirestore();

/**
 * GA4データを取得してFirestoreに保存
 */
export async function fetchGA4Data(siteId, siteData) {
  console.log(`[fetchGA4Data] 開始: ${siteId}`);

  try {
    // トークン取得
    const tokenDoc = await db.collection('oauth_tokens').doc(siteData.ga4OauthTokenId).get();
    
    if (!tokenDoc.exists) {
      throw new Error('GA4 token not found');
    }

    let tokenData = tokenDoc.data();

    // トークンの有効期限チェック
    const expiresAt = tokenData.expires_at.toDate();
    const now = new Date();

    if (expiresAt <= now) {
      console.log('[fetchGA4Data] トークン期限切れ、更新中...');
      await refreshGA4Token(siteData.ga4OauthTokenId);
      
      // 更新されたトークンを再取得
      const updatedTokenDoc = await db.collection('oauth_tokens').doc(siteData.ga4OauthTokenId).get();
      tokenData = updatedTokenDoc.data();
    }

    // データ取得期間（過去30日間）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[fetchGA4Data] 期間: ${startDateStr} ~ ${endDateStr}`);

    // GA4 Data API呼び出し
    const requestBody = {
      dateRanges: [
        {
          startDate: startDateStr,
          endDate: endDateStr,
        }
      ],
      dimensions: [
        { name: 'date' },
        { name: 'deviceCategory' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [
        {
          dimension: { dimensionName: 'date' },
          desc: false,
        }
      ],
    };

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${siteData.ga4PropertyId}:runReport`,
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
      throw new Error(`GA4 API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`[fetchGA4Data] データ取得成功: ${data.rows?.length || 0}行`);

    // データ整形
    const processedData = processGA4Data(data);

    // Firestoreに保存
    const batch = db.batch();

    // 日次データ保存
    for (const dailyData of processedData.daily) {
      const docRef = db
        .collection('sites')
        .doc(siteId)
        .collection('ga4_data')
        .doc(dailyData.date);

      batch.set(docRef, {
        ...dailyData,
        fetchedAt: Timestamp.now(),
      }, { merge: true });
    }

    // サマリーデータ保存
    const summaryRef = db
      .collection('sites')
      .doc(siteId)
      .collection('ga4_data')
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
      'dataStatus.ga4LastFetched': Timestamp.now(),
      'dataStatus.ga4Status': 'success',
    });

    console.log(`[fetchGA4Data] 完了: ${siteId}`);

    return {
      success: true,
      rowCount: data.rows?.length || 0,
    };
  } catch (error) {
    console.error(`[fetchGA4Data] エラー: ${siteId}`, error);

    // エラー状態を保存
    await db.collection('sites').doc(siteId).update({
      'dataStatus.ga4LastFetched': Timestamp.now(),
      'dataStatus.ga4Status': 'error',
      'dataStatus.ga4Error': error.message,
    });

    throw error;
  }
}

/**
 * GA4データを整形
 */
function processGA4Data(rawData) {
  const rows = rawData.rows || [];

  // 日次データ
  const dailyDataMap = new Map();

  for (const row of rows) {
    const date = row.dimensionValues[0].value;
    const device = row.dimensionValues[1].value;
    const channel = row.dimensionValues[2].value;

    const sessions = parseInt(row.metricValues[0].value);
    const users = parseInt(row.metricValues[1].value);
    const pageViews = parseInt(row.metricValues[2].value);
    const engagementRate = parseFloat(row.metricValues[3].value);
    const bounceRate = parseFloat(row.metricValues[4].value);
    const avgSessionDuration = parseFloat(row.metricValues[5].value);

    if (!dailyDataMap.has(date)) {
      dailyDataMap.set(date, {
        date,
        sessions: 0,
        users: 0,
        pageViews: 0,
        engagementRate: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        byDevice: {},
        byChannel: {},
        count: 0,
      });
    }

    const dailyData = dailyDataMap.get(date);

    // 合計値
    dailyData.sessions += sessions;
    dailyData.users += users;
    dailyData.pageViews += pageViews;
    dailyData.engagementRate += engagementRate;
    dailyData.bounceRate += bounceRate;
    dailyData.avgSessionDuration += avgSessionDuration;
    dailyData.count++;

    // デバイス別
    if (!dailyData.byDevice[device]) {
      dailyData.byDevice[device] = { sessions: 0, users: 0 };
    }
    dailyData.byDevice[device].sessions += sessions;
    dailyData.byDevice[device].users += users;

    // チャネル別
    if (!dailyData.byChannel[channel]) {
      dailyData.byChannel[channel] = { sessions: 0, users: 0 };
    }
    dailyData.byChannel[channel].sessions += sessions;
    dailyData.byChannel[channel].users += users;
  }

  // 平均値を計算
  const daily = Array.from(dailyDataMap.values()).map(data => ({
    ...data,
    engagementRate: data.count > 0 ? data.engagementRate / data.count : 0,
    bounceRate: data.count > 0 ? data.bounceRate / data.count : 0,
    avgSessionDuration: data.count > 0 ? data.avgSessionDuration / data.count : 0,
  }));

  // サマリーデータ（全期間の合計）
  const summary = {
    totalSessions: daily.reduce((sum, d) => sum + d.sessions, 0),
    totalUsers: daily.reduce((sum, d) => sum + d.users, 0),
    totalPageViews: daily.reduce((sum, d) => sum + d.pageViews, 0),
    avgEngagementRate: daily.length > 0 
      ? daily.reduce((sum, d) => sum + d.engagementRate, 0) / daily.length 
      : 0,
    avgBounceRate: daily.length > 0 
      ? daily.reduce((sum, d) => sum + d.bounceRate, 0) / daily.length 
      : 0,
    avgSessionDuration: daily.length > 0 
      ? daily.reduce((sum, d) => sum + d.avgSessionDuration, 0) / daily.length 
      : 0,
  };

  return {
    daily,
    summary,
  };
}

