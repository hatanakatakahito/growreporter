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
import { isFeatureEnabled } from './featureFlags.js';

/**
 * 改善案生成のための包括的データを取得（サーバー側）
 * @param {string} siteId
 * @returns {Promise<object>}
 */
export async function fetchComprehensiveDataForImprovement(siteId, options = {}) {
  const db = getFirestore();
  const startTime = Date.now();
  logger.info('[serverDataFetcher] 開始', { siteId, options });

  // サイトデータ取得
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) throw new Error('サイトが見つかりません');
  const siteData = siteDoc.data();

  // 期間設定
  const today = new Date();
  // 月別トレンド用: 過去24ヶ月分を取得（長期トレンド分析に対応）
  const twentyFourMonthsAgo = new Date(today);
  twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
  const monthlyStart = formatDate(twentyFourMonthsAgo);

  // recent 期間: オプションで上書き可能（指定なければ直近30日）
  let recentStart;
  let recentEnd;
  if (options.startDate && options.endDate) {
    recentStart = options.startDate;
    recentEnd = options.endDate;
  } else {
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    recentStart = formatDate(thirtyDaysAgo);
    recentEnd = formatDate(today);
  }

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

  // アプリ側で制御する CV イベント一覧（GA4ネイティブ conversions 指標ではなく、
  // siteData.conversionEvents に登録されたイベントのみをカウント対象とする）
  const conversionEventNames = (siteData.conversionEvents || [])
    .map(e => e?.eventName)
    .filter(Boolean);

  // サイト属性コンテキスト（vivid Phase 2 RAG 注入と AI プロンプトの文脈付けに使用）
  // タクソノミー V2 フィールド: businessModel / industryMajor / industryMinor / siteRole
  const siteContext = {
    businessModel: siteData.businessModel || null,
    industryMajor: siteData.industryMajor || null,
    industryMinor: siteData.industryMinor || null,
    siteRole: siteData.siteRole || null,
  };

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
    scrollEventsResult,
    scrapingDataResult,
    aiAnalysisResult,
  ] = await Promise.allSettled([
    // 全体サマリー
    ga4Client ? fetchGA4Summary(ga4Client, ga4PropertyId, recentStart, recentEnd, siteData) : null,
    // 月次トレンド（13ヶ月）
    ga4Client ? fetchGA4MonthlyTrend(ga4Client, ga4PropertyId, monthlyStart, recentEnd) : null,
    // ユーザー属性
    ga4Client ? fetchGA4UserDemographics(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // 集客チャネル
    ga4Client ? fetchGA4Channels(ga4Client, ga4PropertyId, recentStart, recentEnd, conversionEventNames) : null,
    // GSCキーワード
    gscClient ? fetchGSCKeywords(gscClient, siteData.gscSiteUrl, recentStart, recentEnd) : null,
    // ページ別
    ga4Client ? fetchGA4Pages(ga4Client, ga4PropertyId, recentStart, recentEnd, conversionEventNames) : null,
    // ランディングページ
    ga4Client ? fetchGA4LandingPages(ga4Client, ga4PropertyId, recentStart, recentEnd, conversionEventNames) : null,
    // ページ分類別
    ga4Client ? fetchGA4PageCategories(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // 月次コンバージョン
    ga4Client ? fetchGA4MonthlyConversions(ga4Client, ga4PropertyId, monthlyStart, recentEnd, siteData) : null,
    // 日別（CVはアプリ設定のイベントで別取得してマージ）
    ga4Client ? fetchGA4DailyWithCV(ga4Client, ga4PropertyId, recentStart, recentEnd, conversionEventNames) : null,
    // 曜日別
    ga4Client ? fetchGA4CustomReport(ga4Client, ga4PropertyId, recentStart, recentEnd, ['dayOfWeek'], ['sessions', 'totalUsers']) : null,
    // 時間帯別
    ga4Client ? fetchGA4CustomReport(ga4Client, ga4PropertyId, recentStart, recentEnd, ['hour'], ['sessions', 'totalUsers']) : null,
    // 被リンク元
    ga4Client ? fetchGA4Referrals(ga4Client, ga4PropertyId, recentStart, recentEnd, conversionEventNames) : null,
    // ファイルダウンロード
    ga4Client ? fetchGA4FileDownloads(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // 外部リンク
    ga4Client ? fetchGA4ExternalLinks(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // スクロールイベント（ページ別完読率用）
    ga4Client ? fetchGA4ScrollEvents(ga4Client, ga4PropertyId, recentStart, recentEnd) : null,
    // スクレイピングデータ
    fetchScrapingData(db, siteId),
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

  // Phase 3: 前年同月データ（チャット用）- recent 期間を1年前にシフト
  const oneYearAgoStart = new Date(recentStart);
  oneYearAgoStart.setFullYear(oneYearAgoStart.getFullYear() - 1);
  const oneYearAgoEnd = new Date(recentEnd);
  oneYearAgoEnd.setFullYear(oneYearAgoEnd.getFullYear() - 1);
  const prevYearStart = formatDate(oneYearAgoStart);
  const prevYearEnd = formatDate(oneYearAgoEnd);

  const [
    prevChannelsResult,
    prevKeywordsResult,
    prevPagesResult,
    prevLandingPagesResult,
  ] = await Promise.allSettled([
    ga4Client ? fetchGA4Channels(ga4Client, ga4PropertyId, prevYearStart, prevYearEnd, conversionEventNames) : null,
    gscClient ? fetchGSCKeywords(gscClient, siteData.gscSiteUrl, prevYearStart, prevYearEnd) : null,
    ga4Client ? fetchGA4Pages(ga4Client, ga4PropertyId, prevYearStart, prevYearEnd, conversionEventNames) : null,
    ga4Client ? fetchGA4LandingPages(ga4Client, ga4PropertyId, prevYearStart, prevYearEnd, conversionEventNames) : null,
  ]);

  // Phase 4: improvementKnowledge RAG 取得（vivid Phase 2）
  // 同業種・同BM・同役割の過去成功施策（exceeded/met）を 4段階フォールバックで最大10件取得
  // Feature flag (improvementKnowledgeRagInjection) で緊急ロールバック可能
  let improvementKnowledge = [];
  try {
    const ragEnabled = await isFeatureEnabled('improvementKnowledgeRagInjection');
    if (ragEnabled) {
      improvementKnowledge = await fetchImprovementKnowledgeWithFallback(db, siteContext);
    } else {
      logger.info('[improvementKnowledge] Feature flag OFF, skip RAG injection');
    }
  } catch (err) {
    logger.warn('[improvementKnowledge] RAG fetch failed, continue without injection', { error: err.message });
  }

  // Phase 5: industryBenchmark 取得（lively-aggregating-bobcat Phase C）
  // 同業種×同役割の最新ベンチマーク（中央値・四分位）を AI プロンプトの内部入力として使用
  // 補強材なので、改善実績データ（vivid）よりも優先度は低い
  // Feature flag (industryBenchmarkInjection) で緊急ロールバック可能
  let industryBenchmark = null;
  try {
    const benchmarkEnabled = await isFeatureEnabled('industryBenchmarkInjection');
    if (benchmarkEnabled) {
      industryBenchmark = await fetchLatestIndustryBenchmark(db, siteContext);
    } else {
      logger.info('[industryBenchmark] Feature flag OFF, skip injection');
    }
  } catch (err) {
    logger.warn('[industryBenchmark] fetch failed, continue without injection', { error: err.message });
  }

  const comprehensiveData = {
    siteId,
    siteContext, // vivid Phase 2: サイト属性 (businessModel/industryMajor/industryMinor/siteRole)
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
    scrollEvents: resolve(scrollEventsResult) || {},
    pageFlow: pageFlowData,
    monthlyConversions: resolve(monthlyConversionsResult),
    reverseFlow: reverseFlowData,
    aiComprehensiveAnalysis: resolve(aiAnalysisResult),
    scrapingData: resolve(scrapingDataResult),
    improvementKnowledge, // vivid Phase 2: 同業種・同BM・同役割の過去成功施策（最大10件）
    industryBenchmark, // lively Phase C: 同業種×同役割の業界ベンチマーク（中央値・四分位）
    // 前年同月データ（過去比較用）
    prevYear: {
      period: { startDate: prevYearStart, endDate: prevYearEnd },
      channels: resolve(prevChannelsResult) || [],
      keywords: resolve(prevKeywordsResult) || [],
      pages: resolve(prevPagesResult) || [],
      landingPages: resolve(prevLandingPagesResult) || [],
    },
  };

  logger.info(`[serverDataFetcher] 完了: ${Date.now() - startTime}ms`, {
    improvementKnowledgeCount: improvementKnowledge.length,
  });
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

/**
 * CV イベント数を指定ディメンション別に集計（アプリ設定の conversionEvents に限定）
 * @returns {Promise<Object<string, number>>} { [dimensionValue]: cvCount }
 */
async function fetchCVByDimension(auth, propertyId, startDate, endDate, dimensionName, conversionEventNames) {
  if (!conversionEventNames?.length) return {};
  try {
    const data = await runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: dimensionName }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: conversionEventNames },
        },
      },
    });
    const result = {};
    (data.rows || []).forEach(row => {
      const dimValue = row.dimensionValues[0]?.value;
      const count = parseInt(row.metricValues[0]?.value || '0');
      if (dimValue) result[dimValue] = (result[dimValue] || 0) + count;
    });
    return result;
  } catch (e) {
    logger.warn(`[fetchCVByDimension] エラー (${dimensionName}):`, e.message);
    return {};
  }
}

/**
 * CV イベント数を複数ディメンション別に集計
 * @returns {Promise<Object<string, number>>} { `${dim1}__${dim2}`: cvCount }
 */
async function fetchCVByMultiDimension(auth, propertyId, startDate, endDate, dimensionNames, conversionEventNames) {
  if (!conversionEventNames?.length) return {};
  try {
    const data = await runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [...dimensionNames.map(n => ({ name: n })), { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: conversionEventNames },
        },
      },
    });
    const result = {};
    (data.rows || []).forEach(row => {
      const key = dimensionNames.map((_, i) => row.dimensionValues[i]?.value || '').join('__');
      const count = parseInt(row.metricValues[0]?.value || '0');
      result[key] = (result[key] || 0) + count;
    });
    return result;
  } catch (e) {
    logger.warn(`[fetchCVByMultiDimension] エラー (${dimensionNames.join(',')}):`, e.message);
    return {};
  }
}

async function fetchGA4Channels(auth, propertyId, startDate, endDate, conversionEventNames) {
  const [baseData, cvMap] = await Promise.all([
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    }),
    fetchCVByDimension(auth, propertyId, startDate, endDate, 'sessionDefaultChannelGroup', conversionEventNames),
  ]);
  return (baseData.rows || []).map(row => {
    const channel = row.dimensionValues[0]?.value || 'Unknown';
    return {
      channel,
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
      conversions: cvMap[channel] || 0,
    };
  });
}

async function fetchGA4Pages(auth, propertyId, startDate, endDate, conversionEventNames) {
  const [baseData, cvMap] = await Promise.all([
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 50,
    }),
    fetchCVByDimension(auth, propertyId, startDate, endDate, 'pagePath', conversionEventNames),
  ]);
  return (baseData.rows || []).map(row => {
    const path = row.dimensionValues[0]?.value || '';
    return {
      path,
      title: row.dimensionValues[1]?.value || '',
      pageViews: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
      engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[3]?.value || '0'),
      averageSessionDuration: parseFloat(row.metricValues[4]?.value || '0'),
      conversions: cvMap[path] || 0,
    };
  });
}

async function fetchGA4LandingPages(auth, propertyId, startDate, endDate, conversionEventNames) {
  const [baseData, cvMap] = await Promise.all([
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 30,
    }),
    fetchCVByDimension(auth, propertyId, startDate, endDate, 'landingPage', conversionEventNames),
  ]);
  return (baseData.rows || []).map(row => {
    const page = row.dimensionValues[0]?.value || '';
    return {
      page,
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
      engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
      conversions: cvMap[page] || 0,
    };
  });
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

async function fetchGA4Referrals(auth, propertyId, startDate, endDate, conversionEventNames) {
  try {
    const [baseData, cvMap] = await Promise.all([
      runGA4Report(auth, propertyId, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 30,
      }),
      fetchCVByMultiDimension(auth, propertyId, startDate, endDate, ['sessionSource', 'sessionMedium'], conversionEventNames),
    ]);
    return (baseData.rows || []).map(row => {
      const source = row.dimensionValues[0]?.value || '';
      const medium = row.dimensionValues[1]?.value || '';
      return {
        source,
        medium,
        sessions: parseInt(row.metricValues[0]?.value || '0'),
        users: parseInt(row.metricValues[1]?.value || '0'),
        conversions: cvMap[`${source}__${medium}`] || 0,
      };
    });
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

async function fetchGA4ScrollEvents(auth, propertyId, startDate, endDate) {
  try {
    const data = await runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'scroll', matchType: 'EXACT' } },
      },
      limit: 50,
    });
    const map = {};
    (data.rows || []).forEach(row => {
      const path = row.dimensionValues[0]?.value || '';
      map[path] = parseInt(row.metricValues[0]?.value || '0');
    });
    return map;
  } catch { return {}; }
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

/**
 * 日別データ取得（CVはアプリ設定の conversionEvents で別計測してマージ）
 * 戻り値: { rows: [{ date, sessions, totalUsers, conversions }] }
 */
async function fetchGA4DailyWithCV(auth, propertyId, startDate, endDate, conversionEventNames) {
  const [baseReport, cvMap] = await Promise.all([
    runGA4Report(auth, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    }),
    fetchCVByDimension(auth, propertyId, startDate, endDate, 'date', conversionEventNames),
  ]);
  return {
    rows: (baseReport.rows || []).map(row => {
      const date = row.dimensionValues[0]?.value || '';
      return {
        date,
        sessions: parseInt(row.metricValues[0]?.value || '0'),
        totalUsers: parseInt(row.metricValues[1]?.value || '0'),
        conversions: cvMap[date] || 0,
      };
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

/**
 * vivid Phase 2: 同業種・同BM・同役割の過去成功施策を 4段階フォールバックで取得。
 * AI 改善提案プロンプトへの RAG 注入用。
 *
 * 4 段階フォールバック仕様 (vivid-swinging-alpaca v1.1 合意済):
 *   Step 1: BM × 業種大分類 × 役割 × exceeded/met
 *   Step 2: BM × 業種大分類 × exceeded/met（役割フィルタ除外）
 *   Step 3: BM × exceeded/met（業種フィルタ除外）
 *   Step 4: exceeded/met 全体（最終手段）
 *
 * 各 step は (10 - 既取得件数) 件で limit、累計で最大 10 件を返す。
 * siteContext が不完全（businessModel/industryMajor/siteRole のいずれかが null）の場合は空配列。
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {{businessModel: string|null, industryMajor: string|null, industryMinor: string|null, siteRole: string|null}} siteContext
 * @returns {Promise<Array<object>>}
 */
async function fetchImprovementKnowledgeWithFallback(db, siteContext) {
  const { businessModel, industryMajor, siteRole } = siteContext || {};

  if (!businessModel || !industryMajor || !siteRole) {
    logger.info('[improvementKnowledge] siteContext incomplete, skip RAG injection', {
      siteContext,
    });
    return [];
  }

  const collection = db.collection('improvementKnowledge');
  const results = [];
  const seenIds = new Set();
  const TOTAL_LIMIT = 10;

  const addUnique = (docs) => {
    for (const doc of docs) {
      if (seenIds.has(doc.id)) continue;
      seenIds.add(doc.id);
      results.push({ id: doc.id, ...doc.data() });
      if (results.length >= TOTAL_LIMIT) break;
    }
  };

  const remaining = () => Math.max(0, TOTAL_LIMIT - results.length);

  // ---- Step 1: BM × 業種大分類 × 役割 × exceeded/met ----
  try {
    const step1 = await collection
      .where('businessModel', '==', businessModel)
      .where('industryMajor', '==', industryMajor)
      .where('siteRole', '==', siteRole)
      .where('metrics.achievementLevel', 'in', ['exceeded', 'met'])
      .orderBy('metrics.overallScore', 'desc')
      .limit(TOTAL_LIMIT)
      .get();
    addUnique(step1.docs);
    logger.info('[improvementKnowledge] Step 1 (BM×industry×role×success)', {
      fetched: step1.size,
      total: results.length,
    });
  } catch (err) {
    logger.warn('[improvementKnowledge] Step 1 query failed (composite index missing?)', {
      error: err.message,
    });
  }
  if (results.length >= TOTAL_LIMIT) return results;

  // ---- Step 2: BM × 業種大分類 × exceeded/met（役割フィルタ除外）----
  try {
    const step2 = await collection
      .where('businessModel', '==', businessModel)
      .where('industryMajor', '==', industryMajor)
      .where('metrics.achievementLevel', 'in', ['exceeded', 'met'])
      .orderBy('metrics.overallScore', 'desc')
      .limit(TOTAL_LIMIT)
      .get();
    addUnique(step2.docs);
    logger.info('[improvementKnowledge] Step 2 (BM×industry×success)', {
      fetched: step2.size,
      total: results.length,
    });
  } catch (err) {
    logger.warn('[improvementKnowledge] Step 2 query failed', { error: err.message });
  }
  if (results.length >= TOTAL_LIMIT) return results;

  // ---- Step 3: BM × exceeded/met（業種フィルタ除外）----
  try {
    const step3 = await collection
      .where('businessModel', '==', businessModel)
      .where('metrics.achievementLevel', 'in', ['exceeded', 'met'])
      .orderBy('metrics.overallScore', 'desc')
      .limit(TOTAL_LIMIT)
      .get();
    addUnique(step3.docs);
    logger.info('[improvementKnowledge] Step 3 (BM×success)', {
      fetched: step3.size,
      total: results.length,
    });
  } catch (err) {
    logger.warn('[improvementKnowledge] Step 3 query failed', { error: err.message });
  }
  if (results.length >= TOTAL_LIMIT) return results;

  // ---- Step 4: exceeded/met 全体（最終手段）----
  try {
    const step4 = await collection
      .where('metrics.achievementLevel', 'in', ['exceeded', 'met'])
      .orderBy('metrics.overallScore', 'desc')
      .limit(TOTAL_LIMIT)
      .get();
    addUnique(step4.docs);
    logger.info('[improvementKnowledge] Step 4 (success only, final fallback)', {
      fetched: step4.size,
      total: results.length,
    });
  } catch (err) {
    logger.warn('[improvementKnowledge] Step 4 query failed', { error: err.message });
  }

  return results;
}

/**
 * lively Phase C: 業界ベンチマークの最新文書を取得
 *
 * 取得優先順位（フォールバック）:
 *   1. (industryMajor, siteRole) で最新 period
 *   2. (industryMajor, 'all') で最新 period（役割不問）
 *   3. null（ベンチマーク注入なし）
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {{industryMajor, siteRole}} siteContext
 * @returns {Promise<object | null>}
 */
async function fetchLatestIndustryBenchmark(db, siteContext) {
  const { industryMajor, siteRole } = siteContext || {};
  if (!industryMajor) {
    logger.info('[industryBenchmark] industryMajor 不明、スキップ');
    return null;
  }

  const collection = db.collection('industryBenchmarks');

  // Step 1: industry × role
  if (siteRole) {
    try {
      const snap = await collection
        .where('industryMajor', '==', industryMajor)
        .where('siteRole', '==', siteRole)
        .orderBy('period', 'desc')
        .limit(1)
        .get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        logger.info('[industryBenchmark] Step 1 (industry×role) 取得', {
          industryMajor,
          siteRole,
          period: doc.data().period,
        });
        return { id: doc.id, ...doc.data() };
      }
    } catch (err) {
      logger.warn('[industryBenchmark] Step 1 query failed', { error: err.message });
    }
  }

  // Step 2: industry × all
  try {
    const snap = await collection
      .where('industryMajor', '==', industryMajor)
      .where('siteRole', '==', 'all')
      .orderBy('period', 'desc')
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      logger.info('[industryBenchmark] Step 2 (industry×all) 取得', {
        industryMajor,
        period: doc.data().period,
      });
      return { id: doc.id, ...doc.data() };
    }
  } catch (err) {
    logger.warn('[industryBenchmark] Step 2 query failed', { error: err.message });
  }

  logger.info('[industryBenchmark] no benchmark found', { industryMajor, siteRole });
  return null;
}
