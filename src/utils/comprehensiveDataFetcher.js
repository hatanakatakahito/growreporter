import { functions, db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { format, subDays, subMonths } from 'date-fns';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

/**
 * 改善案生成のための包括的データを取得
 *
 * データ取得範囲: 過去365日
 * 分析重点期間: 直近30日
 *
 * データソース一覧:
 * ■ 全体サマリー / ユーザー属性
 * ■ 時系列: 月別 / 日別 / 曜日別 / 時間帯別
 * ■ 集客: 集客チャネル / 流入キーワード元 / 被リンク元
 * ■ ページ: ページ別 / ページ分類別 / ランディングページ / ファイルダウンロード / 外部リンククリック / ページフロー
 * ■ コンバージョン: コンバージョン一覧 / 逆算フロー
 * ■ AI総合分析キャッシュ
 * ■ スクレイピングデータ / サイト診断 / サイト構造データ
 *
 * @param {string} siteId - サイトID
 * @param {object} [siteData] - サイトドキュメントデータ（reverse_flow_settings等を含む）
 * @returns {Promise<object>} - 包括的データ
 */
export async function fetchComprehensiveDataForImprovement(siteId, siteData = null) {
  console.log('[ComprehensiveDataFetcher] データ取得開始:', { siteId });

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const oneYearAgo = subDays(today, 365);

  // 期間設定
  const recentPeriod = {
    startDate: format(thirtyDaysAgo, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };

  const fullPeriod = {
    startDate: format(oneYearAgo, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };

  try {
    // Phase 1: 並列で取得可能なデータソースをすべて取得
    const [
      summaryResult,
      monthlyDataResult,
      userDemographicsResult,
      channelsResult,
      keywordsResult,
      pagesResult,
      landingPagesResult,
      pageCategoriesResult,
      monthlyConversionResult,
      dailyDataResult,
      weeklyDataResult,
      hourlyDataResult,
      referralsResult,
      fileDownloadsResult,
      externalLinksResult,
      scrapingDataResult,
      diagnosisDataResult,
      siteStructureDataResult,
      aiComprehensiveAnalysisResult,
    ] = await Promise.allSettled([
      // ── 全体サマリー ──
      fetchGA4Summary(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── 時系列: 月別（過去13ヶ月） ──
      fetchGA4MonthlyTrend(siteId),

      // ── ユーザー属性 ──
      fetchGA4UserDemographics(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── 集客: 集客チャネル ──
      fetchGA4Channels(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── 集客: 流入キーワード元（GSC）──
      fetchGSCKeywords(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── ページ: ページ別 ──
      fetchGA4Pages(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── ページ: ランディングページ ──
      fetchGA4LandingPages(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── ページ: ページ分類別 ──
      fetchGA4PageCategories(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── コンバージョン: コンバージョン一覧（過去13ヶ月） ──
      fetchGA4MonthlyConversions(siteId),

      // ── 時系列: 日別 ──
      fetchGA4DailyData(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── 時系列: 曜日別 ──
      fetchGA4WeeklyData(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── 時系列: 時間帯別 ──
      fetchGA4HourlyData(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── 集客: 被リンク元 ──
      fetchGA4Referrals(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── ページ: ファイルダウンロード ──
      fetchGA4FileDownloads(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── ページ: 外部リンククリック ──
      fetchGA4ExternalLinks(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // ── スクレイピングデータ（上位50ページ） ──
      fetchScrapingData(siteId),

      // ── サイト診断キャッシュ ──
      fetchDiagnosisCache(siteId),

      // ── サイト構造データ（コレクタースクリプト収集分） ──
      fetchSiteStructureData(siteId),

      // ── AI総合分析キャッシュ ──
      fetchAIComprehensiveAnalysisCache(siteId),
    ]);

    // Phase 2: サイト設定に依存するデータ（逆算フロー・ページフロー）を取得
    const pages = pagesResult.status === 'fulfilled' ? pagesResult.value : [];

    // ページフロー: 上位5ページの遷移データを取得
    const pageFlowData = await fetchPageFlowForTopPages(siteId, pages, recentPeriod.startDate, recentPeriod.endDate);

    // 逆算フロー: サイトに reverse_flow_settings が設定されている場合のみ取得
    const reverseFlowSettings = siteData?.reverse_flow_settings || [];
    const reverseFlowData = await fetchReverseFlowData(siteId, reverseFlowSettings, recentPeriod.startDate, recentPeriod.endDate);

    // 結果を整形
    const comprehensiveData = {
      siteId,
      period: {
        recent: recentPeriod,  // 直近30日（分析重点期間）
        full: fullPeriod,      // 過去365日（参照データ）
      },

      // ── 全体サマリー ──
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,

      // ── 時系列 ──
      monthlyTrend: monthlyDataResult.status === 'fulfilled' ? monthlyDataResult.value : null,
      dailyData: dailyDataResult.status === 'fulfilled' ? dailyDataResult.value : null,
      weeklyData: weeklyDataResult.status === 'fulfilled' ? weeklyDataResult.value : null,
      hourlyData: hourlyDataResult.status === 'fulfilled' ? hourlyDataResult.value : null,

      // ── ユーザー属性 ──
      demographics: userDemographicsResult.status === 'fulfilled' ? userDemographicsResult.value : null,

      // ── 集客 ──
      channels: channelsResult.status === 'fulfilled' ? channelsResult.value : [],
      keywords: keywordsResult.status === 'fulfilled' ? keywordsResult.value : [],
      referrals: referralsResult.status === 'fulfilled' ? referralsResult.value : [],

      // ── ページ ──
      pages,
      landingPages: landingPagesResult.status === 'fulfilled' ? landingPagesResult.value : [],
      pageCategories: pageCategoriesResult.status === 'fulfilled' ? pageCategoriesResult.value : [],
      fileDownloads: fileDownloadsResult.status === 'fulfilled' ? fileDownloadsResult.value : [],
      externalLinks: externalLinksResult.status === 'fulfilled' ? externalLinksResult.value : [],
      pageFlow: pageFlowData,

      // ── コンバージョン ──
      monthlyConversions: monthlyConversionResult.status === 'fulfilled' ? monthlyConversionResult.value : null,
      reverseFlow: reverseFlowData,

      // ── AI総合分析キャッシュ ──
      aiComprehensiveAnalysis: aiComprehensiveAnalysisResult.status === 'fulfilled' ? aiComprehensiveAnalysisResult.value : null,

      // ── スクレイピング・診断・構造データ ──
      scrapingData: scrapingDataResult.status === 'fulfilled' ? scrapingDataResult.value : null,
      diagnosisData: diagnosisDataResult.status === 'fulfilled' ? diagnosisDataResult.value : null,
      siteStructureData: siteStructureDataResult.status === 'fulfilled' ? siteStructureDataResult.value : null,

      // エラー情報
      errors: {
        summary: summaryResult.status === 'rejected' ? summaryResult.reason : null,
        monthlyTrend: monthlyDataResult.status === 'rejected' ? monthlyDataResult.reason : null,
        dailyData: dailyDataResult.status === 'rejected' ? dailyDataResult.reason : null,
        weeklyData: weeklyDataResult.status === 'rejected' ? weeklyDataResult.reason : null,
        hourlyData: hourlyDataResult.status === 'rejected' ? hourlyDataResult.reason : null,
        demographics: userDemographicsResult.status === 'rejected' ? userDemographicsResult.reason : null,
        channels: channelsResult.status === 'rejected' ? channelsResult.reason : null,
        keywords: keywordsResult.status === 'rejected' ? keywordsResult.reason : null,
        referrals: referralsResult.status === 'rejected' ? referralsResult.reason : null,
        pages: pagesResult.status === 'rejected' ? pagesResult.reason : null,
        landingPages: landingPagesResult.status === 'rejected' ? landingPagesResult.reason : null,
        pageCategories: pageCategoriesResult.status === 'rejected' ? pageCategoriesResult.reason : null,
        fileDownloads: fileDownloadsResult.status === 'rejected' ? fileDownloadsResult.reason : null,
        externalLinks: externalLinksResult.status === 'rejected' ? externalLinksResult.reason : null,
        monthlyConversions: monthlyConversionResult.status === 'rejected' ? monthlyConversionResult.reason : null,
        scrapingData: scrapingDataResult.status === 'rejected' ? scrapingDataResult.reason : null,
        diagnosisData: diagnosisDataResult.status === 'rejected' ? diagnosisDataResult.reason : null,
        siteStructureData: siteStructureDataResult.status === 'rejected' ? siteStructureDataResult.reason : null,
        aiComprehensiveAnalysis: aiComprehensiveAnalysisResult.status === 'rejected' ? aiComprehensiveAnalysisResult.reason : null,
      },
    };

    console.log('[ComprehensiveDataFetcher] データ取得完了:', {
      sources: Object.keys(comprehensiveData).filter(k => k !== 'errors' && k !== 'siteId' && k !== 'period').length,
      pageFlow: pageFlowData.length,
      reverseFlow: reverseFlowData.length,
    });
    return comprehensiveData;

  } catch (error) {
    console.error('[ComprehensiveDataFetcher] データ取得エラー:', error);
    throw error;
  }
}

// ==================== 個別データ取得関数 ====================

/**
 * GA4サマリーデータ取得
 */
async function fetchGA4Summary(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  const result = await fetchGA4Data({ siteId, startDate, endDate });
  return result.data;
}

/**
 * GA4月次トレンドデータ取得（過去13ヶ月）
 */
async function fetchGA4MonthlyTrend(siteId) {
  const fetchGA4MonthlyData = httpsCallable(functions, 'fetchGA4MonthlyData');
  const thirteenMonthsAgo = subMonths(new Date(), 13);
  const result = await fetchGA4MonthlyData({
    siteId,
    startDate: format(thirteenMonthsAgo, 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  return result.data;
}

/**
 * GA4日別データ取得
 */
async function fetchGA4DailyData(siteId, startDate, endDate) {
  const fn = httpsCallable(functions, 'fetchGA4DailyConversionData');
  const result = await fn({ siteId, startDate, endDate });
  return result.data;
}

/**
 * GA4曜日別データ取得
 */
async function fetchGA4WeeklyData(siteId, startDate, endDate) {
  const fn = httpsCallable(functions, 'fetchGA4WeeklyConversionData');
  const result = await fn({ siteId, startDate, endDate });
  return result.data;
}

/**
 * GA4時間帯別データ取得
 */
async function fetchGA4HourlyData(siteId, startDate, endDate) {
  const fn = httpsCallable(functions, 'fetchGA4HourlyConversionData');
  const result = await fn({ siteId, startDate, endDate });
  return result.data;
}

/**
 * GA4ユーザー属性データ取得
 */
async function fetchGA4UserDemographics(siteId, startDate, endDate) {
  const fetchGA4UserDemographics = httpsCallable(functions, 'fetchGA4UserDemographics');
  const result = await fetchGA4UserDemographics({ siteId, startDate, endDate });
  return result.data;
}

/**
 * GA4集客チャネルデータ取得
 */
async function fetchGA4Channels(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  const result = await fetchGA4Data({
    siteId,
    startDate,
    endDate,
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: ['sessions', 'totalUsers', 'conversions'],
  });

  if (!result.data?.rows) return [];

  return result.data.rows.map(row => ({
    channel: row.dimensionValues[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    conversions: parseInt(row.metricValues[2]?.value || '0'),
  }));
}

/**
 * GSCキーワードデータ取得
 */
async function fetchGSCKeywords(siteId, startDate, endDate) {
  const fetchGSCData = httpsCallable(functions, 'fetchGSCData');
  try {
    const result = await fetchGSCData({ siteId, startDate, endDate });
    return result.data?.queries || [];
  } catch (error) {
    console.warn('[ComprehensiveDataFetcher] GSCデータ取得失敗（スキップ）:', error.message);
    return [];
  }
}

/**
 * GA4被リンク元（リファラル）データ取得
 */
async function fetchGA4Referrals(siteId, startDate, endDate) {
  const fn = httpsCallable(functions, 'fetchGA4ReferralConversionData');
  try {
    const result = await fn({ siteId, startDate, endDate });
    return result.data?.rows || [];
  } catch (error) {
    console.warn('[ComprehensiveDataFetcher] 被リンク元データ取得失敗（スキップ）:', error.message);
    return [];
  }
}

/**
 * GA4ページ別データ取得
 */
async function fetchGA4Pages(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  const result = await fetchGA4Data({
    siteId,
    startDate,
    endDate,
    dimensions: ['pagePath', 'pageTitle'],
    metrics: ['screenPageViews', 'totalUsers', 'conversions'],
  });

  if (!result.data?.rows) return [];

  return result.data.rows.slice(0, 50).map(row => ({
    path: row.dimensionValues[0]?.value || '',
    title: row.dimensionValues[1]?.value || '',
    pageViews: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    conversions: parseInt(row.metricValues[2]?.value || '0'),
  }));
}

/**
 * GA4ランディングページデータ取得
 */
async function fetchGA4LandingPages(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  const result = await fetchGA4Data({
    siteId,
    startDate,
    endDate,
    dimensions: ['landingPage'],
    metrics: ['sessions', 'totalUsers', 'engagementRate', 'conversions'],
  });

  if (!result.data?.rows) return [];

  return result.data.rows.slice(0, 30).map(row => ({
    page: row.dimensionValues[0]?.value || '',
    sessions: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
    conversions: parseInt(row.metricValues[3]?.value || '0'),
  }));
}

/**
 * GA4ページ分類別データ取得
 */
async function fetchGA4PageCategories(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  const result = await fetchGA4Data({
    siteId,
    startDate,
    endDate,
    dimensions: ['pagePathLevel1'],
    metrics: ['screenPageViews', 'totalUsers', 'engagementRate'],
  });

  if (!result.data?.rows) return [];

  return result.data.rows.slice(0, 20).map(row => ({
    category: row.dimensionValues[0]?.value || '/',
    pageViews: parseInt(row.metricValues[0]?.value || '0'),
    users: parseInt(row.metricValues[1]?.value || '0'),
    engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
  }));
}

/**
 * GA4ファイルダウンロードデータ取得
 */
async function fetchGA4FileDownloads(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  try {
    const result = await fetchGA4Data({
      siteId,
      startDate,
      endDate,
      dimensions: ['eventName', 'linkUrl'],
      metrics: ['eventCount', 'totalUsers'],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'file_download', matchType: 'EXACT' } },
      },
    });
    if (!result.data?.rows) return [];
    return result.data.rows.slice(0, 20).map(row => ({
      url: row.dimensionValues[1]?.value || '',
      downloads: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
    }));
  } catch (error) {
    console.warn('[ComprehensiveDataFetcher] ファイルダウンロード取得失敗（スキップ）:', error.message);
    return [];
  }
}

/**
 * GA4外部リンククリックデータ取得
 */
async function fetchGA4ExternalLinks(siteId, startDate, endDate) {
  const fetchGA4Data = httpsCallable(functions, 'fetchGA4Data');
  try {
    const result = await fetchGA4Data({
      siteId,
      startDate,
      endDate,
      dimensions: ['eventName', 'linkUrl'],
      metrics: ['eventCount', 'totalUsers'],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'click', matchType: 'EXACT' } },
      },
    });
    if (!result.data?.rows) return [];
    return result.data.rows.slice(0, 20).map(row => ({
      url: row.dimensionValues[1]?.value || '',
      clicks: parseInt(row.metricValues[0]?.value || '0'),
      users: parseInt(row.metricValues[1]?.value || '0'),
    }));
  } catch (error) {
    console.warn('[ComprehensiveDataFetcher] 外部リンク取得失敗（スキップ）:', error.message);
    return [];
  }
}

/**
 * GA4月次コンバージョンデータ取得（過去13ヶ月）
 */
async function fetchGA4MonthlyConversions(siteId) {
  const fetchGA4MonthlyConversionData = httpsCallable(functions, 'fetchGA4MonthlyConversionData');
  const thirteenMonthsAgo = subMonths(new Date(), 13);
  const result = await fetchGA4MonthlyConversionData({
    siteId,
    startDate: format(thirteenMonthsAgo, 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  return result.data;
}

/**
 * ページフロー: 上位ページの遷移データを取得（Phase 2）
 */
async function fetchPageFlowForTopPages(siteId, pages, startDate, endDate) {
  if (!pages || pages.length === 0) return [];

  const fn = httpsCallable(functions, 'fetchGA4PageTransition');
  // 上位5ページの遷移データを取得
  const topPaths = pages.slice(0, 5).map(p => p.path).filter(Boolean);

  const results = await Promise.allSettled(
    topPaths.map(pagePath =>
      fn({ siteId, pagePath, startDate, endDate })
        .then(r => ({ pagePath, ...r.data }))
    )
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * 逆算フロー: サイト設定に基づくコンバージョンフローデータ取得（Phase 2）
 */
async function fetchReverseFlowData(siteId, reverseFlowSettings, startDate, endDate) {
  if (!reverseFlowSettings || reverseFlowSettings.length === 0) return [];

  const fn = httpsCallable(functions, 'fetchGA4ReverseFlowData');

  const results = await Promise.allSettled(
    reverseFlowSettings.slice(0, 3).map(flow =>
      fn({
        siteId,
        startDate,
        endDate,
        formPagePath: flow.formPagePath,
        targetCvEvent: flow.targetCvEvent,
        entryPagePath: flow.entryPagePath || undefined,
      }).then(r => ({ flowName: flow.name || flow.formPagePath, ...r.data }))
    )
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * サイト診断キャッシュ取得
 */
async function fetchDiagnosisCache(siteId) {
  try {
    const cacheDoc = await getDoc(doc(db, 'sites', siteId, 'diagnosisCache', 'latest'));
    if (!cacheDoc.exists()) return null;
    const data = cacheDoc.data();
    // 24h以内のキャッシュのみ有効
    const timestamp = data.timestamp?.toMillis?.() || data.timestamp?.seconds * 1000 || 0;
    const age = Date.now() - timestamp;
    if (age > 24 * 60 * 60 * 1000) return null;
    return data.result || null;
  } catch (error) {
    console.warn('[fetchDiagnosisCache] エラー:', error.message);
    return null;
  }
}

/**
 * スクレイピングデータ取得（上位50ページ）
 */
async function fetchScrapingData(siteId) {
  try {
    // Firestoreから直接取得
    const scrapingDataQuery = await getDocs(
      query(
        collection(db, 'sites', siteId, 'pageScrapingData'),
        orderBy('pageViews', 'desc'),
        limit(50)
      )
    );

    const scrapingData = [];
    scrapingDataQuery.forEach(doc => {
      scrapingData.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // メタデータも取得
    const metaDoc = await getDoc(doc(db, 'sites', siteId, 'pageScrapingMeta', 'default'));
    const metaData = metaDoc.exists() ? metaDoc.data() : null;

    console.log('[fetchScrapingData] 取得:', scrapingData.length, 'ページ（AI改善案に反映）');
    return {
      pages: scrapingData,
      meta: metaData,
      totalPages: scrapingData.length,
    };
  } catch (error) {
    console.warn('[fetchScrapingData] エラー:', error.message);
    return {
      pages: [],
      meta: null,
      totalPages: 0,
    };
  }
}

/**
 * サイト構造データ取得（コレクタースクリプト収集分）
 */
async function fetchSiteStructureData(siteId) {
  try {
    const structureQuery = await getDocs(
      query(
        collection(db, 'sites', siteId, 'siteStructureData'),
        orderBy('collectedAt', 'desc'),
        limit(20)
      )
    );

    if (structureQuery.empty) return null;

    const pages = [];
    structureQuery.forEach(doc => {
      pages.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log('[fetchSiteStructureData] 取得:', pages.length, 'ページ');
    return {
      pages,
      totalPages: pages.length,
    };
  } catch (error) {
    console.warn('[fetchSiteStructureData] エラー:', error.message);
    return null;
  }
}

/**
 * AI総合分析キャッシュ取得
 */
async function fetchAIComprehensiveAnalysisCache(siteId) {
  try {
    const cacheQuery = await getDocs(
      query(
        collection(db, 'sites', siteId, 'aiAnalysisCache'),
        where('pageType', '==', 'comprehensive_analysis'),
        orderBy('generatedAt', 'desc'),
        limit(1)
      )
    );

    if (cacheQuery.empty) return null;

    const cacheData = cacheQuery.docs[0].data();
    // 7日以内のキャッシュのみ有効
    const generatedAt = cacheData.generatedAt?.toMillis?.() || cacheData.generatedAt?.seconds * 1000 || 0;
    const age = Date.now() - generatedAt;
    if (age > 7 * 24 * 60 * 60 * 1000) return null;

    console.log('[fetchAIComprehensiveAnalysisCache] AI総合分析キャッシュ取得成功');
    return cacheData.summary || null;
  } catch (error) {
    console.warn('[fetchAIComprehensiveAnalysisCache] エラー:', error.message);
    return null;
  }
}
