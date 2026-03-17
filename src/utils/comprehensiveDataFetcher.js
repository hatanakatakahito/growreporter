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
 * @param {string} siteId - サイトID
 * @returns {Promise<object>} - 包括的データ
 */
export async function fetchComprehensiveDataForImprovement(siteId) {
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
    // 各Cloud Functionを並列で呼び出し
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
      scrapingDataResult,
      diagnosisDataResult,
    ] = await Promise.allSettled([
      // 直近30日のサマリーデータ
      fetchGA4Summary(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 過去13ヶ月の月次トレンドデータ
      fetchGA4MonthlyTrend(siteId),

      // 直近30日のユーザー属性
      fetchGA4UserDemographics(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 直近30日の集客チャネル
      fetchGA4Channels(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 直近30日のキーワード（GSC）
      fetchGSCKeywords(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 直近30日のページ別データ
      fetchGA4Pages(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 直近30日のランディングページ
      fetchGA4LandingPages(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 直近30日のページ分類別データ
      fetchGA4PageCategories(siteId, recentPeriod.startDate, recentPeriod.endDate),

      // 過去13ヶ月のコンバージョンデータ
      fetchGA4MonthlyConversions(siteId),

      // スクレイピングデータ（上位50ページ）
      fetchScrapingData(siteId),

      // サイト診断キャッシュ
      fetchDiagnosisCache(siteId),
    ]);

    // 結果を整形
    const comprehensiveData = {
      siteId,
      period: {
        recent: recentPeriod,  // 直近30日（分析重点期間）
        full: fullPeriod,      // 過去365日（参照データ）
      },
      
      // 直近30日のサマリー
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
      
      // 過去13ヶ月のトレンド
      monthlyTrend: monthlyDataResult.status === 'fulfilled' ? monthlyDataResult.value : null,
      
      // 直近30日の詳細データ
      demographics: userDemographicsResult.status === 'fulfilled' ? userDemographicsResult.value : null,
      channels: channelsResult.status === 'fulfilled' ? channelsResult.value : [],
      keywords: keywordsResult.status === 'fulfilled' ? keywordsResult.value : [],
      pages: pagesResult.status === 'fulfilled' ? pagesResult.value : [],
      landingPages: landingPagesResult.status === 'fulfilled' ? landingPagesResult.value : [],
      pageCategories: pageCategoriesResult.status === 'fulfilled' ? pageCategoriesResult.value : [],
      
      // 過去13ヶ月のコンバージョンデータ
      monthlyConversions: monthlyConversionResult.status === 'fulfilled' ? monthlyConversionResult.value : null,
      
      // スクレイピングデータ
      scrapingData: scrapingDataResult.status === 'fulfilled' ? scrapingDataResult.value : null,

      // サイト診断データ
      diagnosisData: diagnosisDataResult.status === 'fulfilled' ? diagnosisDataResult.value : null,

      // エラー情報
      errors: {
        summary: summaryResult.status === 'rejected' ? summaryResult.reason : null,
        monthlyTrend: monthlyDataResult.status === 'rejected' ? monthlyDataResult.reason : null,
        demographics: userDemographicsResult.status === 'rejected' ? userDemographicsResult.reason : null,
        channels: channelsResult.status === 'rejected' ? channelsResult.reason : null,
        keywords: keywordsResult.status === 'rejected' ? keywordsResult.reason : null,
        pages: pagesResult.status === 'rejected' ? pagesResult.reason : null,
        landingPages: landingPagesResult.status === 'rejected' ? landingPagesResult.reason : null,
        pageCategories: pageCategoriesResult.status === 'rejected' ? pageCategoriesResult.reason : null,
        monthlyConversions: monthlyConversionResult.status === 'rejected' ? monthlyConversionResult.reason : null,
        scrapingData: scrapingDataResult.status === 'rejected' ? scrapingDataResult.reason : null,
        diagnosisData: diagnosisDataResult.status === 'rejected' ? diagnosisDataResult.reason : null,
      },
    };

    console.log('[ComprehensiveDataFetcher] データ取得完了:', comprehensiveData);
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

