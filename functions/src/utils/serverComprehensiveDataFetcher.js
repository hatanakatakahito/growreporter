/**
 * サーバー側包括的データ取得
 *
 * クライアント側 comprehensiveDataFetcher.js のサーバー版。
 * httpsCallable のオーバーヘッドなしで GA4/GSC API を直接呼び出す。
 * siteStructureData は廃止済みのため取得しない。
 */
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from './tokenManager.js';
import { logger } from 'firebase-functions/v2';

/**
 * 改善案生成のための包括的データを取得（サーバー側）
 * @param {string} siteId
 * @returns {Promise<object>}
 */
export async function fetchComprehensiveDataForImprovement(siteId) {
  const db = getFirestore();
  const startTime = Date.now();
  logger.info('[serverDataFetcher] 開始', { siteId });

  // サイトデータ取得
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) throw new Error('サイトが見つかりません');
  const siteData = siteDoc.data();

  // 期間設定
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirteenMonthsAgo = new Date(today);
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

  const recentStart = formatDate(thirtyDaysAgo);
  const recentEnd = formatDate(today);
  const monthlyStart = formatDate(thirteenMonthsAgo);

  // GA4 OAuth クライアント取得
  let ga4Client = null;
  if (siteData.ga4PropertyId && siteData.ga4OauthTokenId) {
    const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
    const result = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    ga4Client = result.oauth2Client;
  }

  // GSC OAuth クライアント取得
  let gscClient = null;
  if (siteData.gscSiteUrl && siteData.gscOauthTokenId) {
    const tokenOwnerId = siteData.gscTokenOwner || siteData.userId;
    const result = await getAndRefreshToken(tokenOwnerId, siteData.gscOauthTokenId);
    gscClient = result.oauth2Client;
  }

  const ga4PropertyId = siteData.ga4PropertyId;

  // Phase 1: 全データソースを並列取得
  const [
    summaryResult,
    monthlyTrendResult,
    userDemographicsResult,
    channelsResult,
    keywordsResult,
    pagesResult,
    landingPagesResult,
    pageCategoriesResult,
    monthlyConversionsResult,
    dailyDataResult,
    weeklyDataResult,
    hourlyDataResult,
    referralsResult,
    fileDownloadsResult,
    externalLinksResult,
    scrapingDataResult,
    diagnosisDataResult,
    aiAnalysisResult,
  ] = await Promise.allSettled([
    // 全体サマリー
    ga4Client ? fetchGA4Summary(ga4Client, ga4PropertyId, recentStart, recentEnd, siteData) : null,
    // 月次トレンド（13ヶ月）
    ga4Client ? fetchGA4MonthlyTrend(ga4Client, ga4PropertyId, monthlyStart, recentEnd) : null,
    // ユーザー属性
    ga4Client ? fetchGA4UserDemographics(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // 集客チャネル
    ga4Client ? fetchGA4Channels(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // GSCキーワード
    gscClient ? fetchGSCKeywords(gscClient, siteData.gscSiteUrl, recentStart, recentEnd) : null,
    // ページ別
    ga4Client ? fetchGA4Pages(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // ランディングページ
    ga4Client ? fetchGA4LandingPages(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // ページ分類別
    ga4Client ? fetchGA4PageCategories(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // 月次コンバージョン
    ga4Client ? fetchGA4MonthlyConversions(ga4Client, ga4PropertyId, monthlyStart, recentEnd, siteData) : null,
    // 日別
    ga4Client ? fetchGA4CustomReport(ga4Client, ga4PropertyId, recentStart, recentEnd, ['date'], ['sessions', 'totalUsers', 'conversions']) : null,
    // 曜日別
    ga4Client ? fetchGA4CustomReport(ga4Client, ga4PropertyId, recentStart, recentEnd, ['dayOfWeek'], ['sessions', 'totalUsers']) : null,
    // 時間帯別
    ga4Client ? fetchGA4CustomReport(ga4Client, ga4PropertyId, recentStart, recentEnd, ['hour'], ['sessions', 'totalUsers']) : null,
    // 被リンク元
    ga4Client ? fetchGA4Referrals(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // ファイルダウンロード
    ga4Client ? fetchGA4FileDownloads(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // 外部リンク
    ga4Client ? fetchGA4ExternalLinks(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // スクレイピングデータ
    fetchScrapingData(db, siteId),
    // サイト診断キャッシュ
    fetchDiagnosisCache(db, siteId),
    // AI総合分析キャッシュ
    fetchAIAnalysisCache(db, siteId),
  ]);

  const resolve = (r) => r.status === 'fulfilled' ? r.value : null;
  const pages = resolve(pagesResult) || [];

  // Phase 2: ページフロー + 逆算フロー
  const pageFlowData = ga4Client
    ? await fetchPageFlowForTopPages(ga4Client, ga4PropertyId, pages, recentStart, recentEnd)
    : [];

  const reverseFlowSettings = siteData.reverse_flow_settings || [];
  const reverseFlowData = ga4Client
    ? await fetchReverseFlowData(ga4Client, ga4PropertyId, reverseFlowSettings, recentStart, recentEnd)
    : [];

  const comprehensiveData = {
    siteId,
    period: {
      recent: { startDate: recentStart, endDate: recentEnd },
    },
    summary: resolve(summaryResult),
    monthlyTrend: resolve(monthlyTrendResult),
    dailyData: resolve(dailyDataResult),
    weeklyData: resolve(weeklyDataResult),
    hourlyData: resolve(hourlyDataResult),
    demographics: resolve(userDemographicsResult),
    channels: resolve(channelsResult) || [],
    keywords: resolve(keywordsResult) || [],
    referrals: resolve(referralsResult) || [],
    pages,
    landingPages: resolve(landingPagesResult) || [],
    pageCategories: resolve(pageCategoriesResult) || [],
    fileDownloads: resolve(fileDownloadsResult) || [],
    externalLinks: resolve(externalLinksResult) || [],
    pageFlow: pageFlowData,
    monthlyConversions: resolve(monthlyConversionsResult),
    reverseFlow: reverseFlowData,
    aiComprehensiveAnalysis: resolve(aiAnalysisResult),
    scrapingData: resolve(scrapingDataResult),
    diagnosisData: resolve(diagnosisDataResult),
  };

  logger.info(`[serverDataFetcher] 完了: ${Date.now() - startTime}ms`);
  return comprehensiveData;
}

// ==================== ヘルパー ====================

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function ga4Api() {
  return google.analyticsdata('v1beta');
}

async function runGA4Report(auth, propertyId, requestBody) {
  const response = await ga4Api().properties.runReport({
    auth,
    property: `properties/${propertyId}`,
    requestBody,
  });
  return response.data;
}

// ==================== GA4 データ取得関数 ====================

async function fetchGA4Summary(auth, propertyId, startDate, endDate, siteData) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
    ],
  });

  const row = data.rows?.[0];
  const metrics = {
    sessions: parseInt(row?.metricValues?.[0]?.value || '0'),
    totalUsers: parseInt(row?.metricValues?.[1]?.value || '0'),
    newUsers: parseInt(row?.metricValues?.[2]?.value || '0'),
    screenPageViews: parseInt(row?.metricValues?.[3]?.value || '0'),
    engagementRate: parseFloat(row?.metricValues?.[4]?.value || '0'),
    conversions: {},
    totalConversions: 0,
    conversionRate: 0,
  };

  // コンバージョンイベント取得
  if (siteData.conversionEvents?.length > 0) {
    try {
      const cvData = await runGA4Report(auth, propertyId, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: siteData.conversionEvents.map(e => e.eventName) },
          },
        },
      });
      cvData.rows?.forEach(r => {
        metrics.conversions[r.dimensionValues[0].value] = parseInt(r.metricValues[0].value);
      });
      metrics.totalConversions = Object.values(metrics.conversions).reduce((s, v) => s + v, 0);
      metrics.conversionRate = metrics.sessions > 0 ? metrics.totalConversions / metrics.sessions : 0;
    } catch (e) {
      logger.warn('[serverDataFetcher] CV取得エラー:', e.message);
    }
  }

  return { metrics, period: { startDate, endDate } };
}

async function fetchGA4MonthlyTrend(auth, propertyId, startDate, endDate) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'yearMonth' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
    ],
    orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
  });
  return { rows: data.rows || [] };
}

async function fetchGA4UserDemographics(auth, propertyId, startDate, endDate) {
  const [genderData, ageData, deviceData] = await Promise.allSettled([
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'userGender' }],
      metrics: [{ name: 'totalUsers' }],
    }),
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'userAgeBracket' }],
      metrics: [{ name: 'totalUsers' }],
    }),
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'totalUsers' }],
    }),
  ]);
  return {
    gender: genderData.status === 'fulfilled' ? genderData.value.rows || [] : [],
    age: ageData.status === 'fulfilled' ? ageData.value.rows || [] : [],
    device: deviceData.status === 'fulfilled' ? deviceData.value.rows || [] : [],
  };
}

async function fetchGA4Channels(auth, propertyId, startDate, endDate) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }],
  });
  return (data.rows || []).map(row => ({
    channel: row.dimensionValues[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    conversions: parseInt(row.metricValues[2]?.value || '0'),
  }));
}

async function fetchGA4Pages(auth, propertyId, startDate, endDate) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'conversions' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 50,
  });
  return (data.rows || []).map(row => ({
    path: row.dimensionValues[0]?.value || '',
    title: row.dimensionValues[1]?.value || '',
    pageViews: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    conversions: parseInt(row.metricValues[2]?.value || '0'),
  }));
}

async function fetchGA4LandingPages(auth, propertyId, startDate, endDate) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }, { name: 'conversions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 30,
  });
  return (data.rows || []).map(row => ({
    page: row.dimensionValues[0]?.value || '',
    sessions: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
    conversions: parseInt(row.metricValues[3]?.value || '0'),
  }));
}

async function fetchGA4PageCategories(auth, propertyId, startDate, endDate) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePathLevel1' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  });
  return (data.rows || []).map(row => ({
    category: row.dimensionValues[0]?.value || '/',
    pageViews: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
  }));
}

async function fetchGA4Referrals(auth, propertyId, startDate, endDate) {
  try {
    const data = await runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 30,
    });
    return data.rows || [];
  } catch { return []; }
}

async function fetchGA4FileDownloads(auth, propertyId, startDate, endDate) {
  try {
    const data = await runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }, { name: 'linkUrl' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'file_download', matchType: 'EXACT' } },
      },
      limit: 20,
    });
    return (data.rows || []).map(row => ({
      url: row.dimensionValues[1]?.value || '',
      downloads: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
    }));
  } catch { return []; }
}

async function fetchGA4ExternalLinks(auth, propertyId, startDate, endDate) {
  try {
    const data = await runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }, { name: 'linkUrl' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'click', matchType: 'EXACT' } },
      },
      limit: 20,
    });
    return (data.rows || []).map(row => ({
      url: row.dimensionValues[1]?.value || '',
      clicks: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
    }));
  } catch { return []; }
}

async function fetchGA4MonthlyConversions(auth, propertyId, startDate, endDate, siteData) {
  if (!siteData.conversionEvents?.length) return null;
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'yearMonth' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: siteData.conversionEvents.map(e => e.eventName) },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
  });
  return { rows: data.rows || [] };
}

async function fetchGA4CustomReport(auth, propertyId, startDate, endDate, dimensions, metrics) {
  const data = await runGA4Report(auth, propertyId, {
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensions.map(d => ({ name: d })),
    metrics: metrics.map(m => ({ name: m })),
  });
  return {
    rows: (data.rows || []).map(row => {
      const rowData = {};
      dimensions.forEach((dim, idx) => { rowData[dim] = row.dimensionValues[idx].value; });
      metrics.forEach((met, idx) => { rowData[met] = parseFloat(row.metricValues[idx].value || 0); });
      return rowData;
    }),
  };
}

// ==================== GSC データ取得 ====================

async function fetchGSCKeywords(auth, gscSiteUrl, startDate, endDate) {
  try {
    const searchConsole = google.searchconsole('v1');
    const response = await searchConsole.searchanalytics.query({
      auth,
      siteUrl: gscSiteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 1000,
      },
    });
    return (response.data.rows || []).map(row => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  } catch (e) {
    logger.warn('[serverDataFetcher] GSC取得エラー:', e.message);
    return [];
  }
}

// ==================== ページフロー / 逆算フロー ====================

async function fetchPageFlowForTopPages(auth, propertyId, pages, startDate, endDate) {
  if (!pages || pages.length === 0) return [];
  const topPaths = pages.slice(0, 5).map(p => p.path).filter(Boolean);

  const results = await Promise.allSettled(
    topPaths.map(async (pagePath) => {
      // ページ遷移データ: そのページからの遷移先
      const data = await runGA4Report(auth, propertyId, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        dimensionFilter: {
          filter: { fieldName: 'previousPagePath', stringFilter: { value: pagePath, matchType: 'EXACT' } },
        },
        limit: 10,
      });
      return {
        pagePath,
        nextPages: (data.rows || []).map(row => ({
          path: row.dimensionValues[0]?.value,
          pageViews: parseInt(row.metricValues[0]?.value || '0'),
        })),
      };
    })
  );

  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

async function fetchReverseFlowData(auth, propertyId, settings, startDate, endDate) {
  if (!settings || settings.length === 0) return [];

  const results = await Promise.allSettled(
    settings.slice(0, 3).map(async (flow) => {
      const data = await runGA4Report(auth, propertyId, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        dimensionFilter: {
          filter: { fieldName: 'pagePath', stringFilter: { value: flow.formPagePath, matchType: 'EXACT' } },
        },
        limit: 10,
      });
      return { flowName: flow.name || flow.formPagePath, rows: data.rows || [] };
    })
  );

  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

// ==================== Firestore データ取得 ====================

async function fetchScrapingData(db, siteId) {
  try {
    const snap = await db.collection('sites').doc(siteId).collection('pageScrapingData')
      .orderBy('pageViews', 'desc').limit(50).get();

    const pages = [];
    snap.forEach(doc => pages.push({ id: doc.id, ...doc.data() }));

    const metaDoc = await db.collection('sites').doc(siteId).collection('pageScrapingMeta').doc('default').get();

    return {
      pages,
      meta: metaDoc.exists ? metaDoc.data() : null,
      totalPages: pages.length,
    };
  } catch (e) {
    logger.warn('[serverDataFetcher] スクレイピングデータ取得エラー:', e.message);
    return { pages: [], meta: null, totalPages: 0 };
  }
}

async function fetchDiagnosisCache(db, siteId) {
  try {
    const doc = await db.collection('sites').doc(siteId).collection('diagnosisCache').doc('latest').get();
    if (!doc.exists) return null;
    const data = doc.data();
    const timestamp = data.timestamp?.toMillis?.() || data.timestamp?.seconds * 1000 || 0;
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return null;
    return data.result || null;
  } catch { return null; }
}

async function fetchAIAnalysisCache(db, siteId) {
  try {
    const snap = await db.collection('sites').doc(siteId).collection('aiAnalysisCache')
      .where('pageType', '==', 'comprehensive_analysis')
      .orderBy('generatedAt', 'desc').limit(1).get();

    if (snap.empty) return null;
    const data = snap.docs[0].data();
    const generatedAt = data.generatedAt?.toMillis?.() || data.generatedAt?.seconds * 1000 || 0;
    if (Date.now() - generatedAt > 7 * 24 * 60 * 60 * 1000) return null;
    return data.summary || null;
  } catch { return null; }
}
