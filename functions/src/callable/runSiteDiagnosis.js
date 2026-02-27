import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { google } from 'googleapis';
import { canAccessSite } from '../utils/permissionHelper.js';
import { checkCanGenerate, incrementGenerationCount } from '../utils/planManager.js';
import { calculateContentQualityScore, identifyPageIssues } from '../utils/analyzePageQuality.js';
import { getAndRefreshToken } from '../utils/tokenManager.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間
const PSI_TIMEOUT_MS = 45000; // 45秒

/**
 * サイト診断実行 Cloud Function
 * PSI API + スクレイピングデータ + GSC/GA4データを統合してスコア計算
 */
export async function runSiteDiagnosisCallable(request) {
  const db = getFirestore();
  const { siteId, cacheOnly = false, forceRefresh = false } = request.data || {};

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'siteId is required');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const userId = request.auth.uid;

  // 権限チェック
  const hasAccess = await canAccessSite(userId, siteId);
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
  }

  // サイト情報取得
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', 'サイトが見つかりません');
  }
  const siteData = siteDoc.data();
  const siteUrl = siteData.siteUrl || siteData.url;
  const siteOwnerId = siteData.userId;

  if (!siteUrl) {
    throw new HttpsError('failed-precondition', 'サイトURLが設定されていません');
  }

  // キャッシュチェック（forceRefresh時はスキップ）
  const cacheRef = db.collection('sites').doc(siteId).collection('diagnosisCache').doc('latest');
  const cacheDoc = await cacheRef.get();

  if (!forceRefresh && cacheDoc.exists) {
    const cacheData = cacheDoc.data();
    const cacheAge = Date.now() - (cacheData.timestamp?.toMillis?.() || 0);

    if (cacheAge < CACHE_TTL_MS) {
      logger.info(`[SiteDiagnosis] キャッシュ返却: ${siteId}`);
      return { ...cacheData.result, fromCache: true };
    }
  }

  // cacheOnlyの場合はキャッシュがなければnull返却
  if (cacheOnly) {
    return { cached: false };
  }

  // プラン制限チェック
  const canGenerate = await checkCanGenerate(siteOwnerId, 'diagnosis');
  if (!canGenerate) {
    throw new HttpsError('resource-exhausted', '今月のサイト診断の利用回数上限に達しました。プランのアップグレードをご検討ください。');
  }

  logger.info(`[SiteDiagnosis] 診断開始: ${siteId}, URL: ${siteUrl}`);

  // データ取得（全て並列）
  const [
    psiMobileResult,
    psiDesktopResult,
    scrapingDataResult,
    ga4SummaryResult,
  ] = await Promise.allSettled([
    fetchPSI(siteUrl, 'mobile'),
    fetchPSI(siteUrl, 'desktop'),
    fetchScrapingData(db, siteId),
    fetchGA4EngagementData(db, siteId, siteData),
  ]);

  const psiMobile = psiMobileResult.status === 'fulfilled' ? psiMobileResult.value : null;
  const psiDesktop = psiDesktopResult.status === 'fulfilled' ? psiDesktopResult.value : null;
  const scrapingData = scrapingDataResult.status === 'fulfilled' ? scrapingDataResult.value : null;
  const ga4Data = ga4SummaryResult.status === 'fulfilled' ? ga4SummaryResult.value : null;

  if (!psiMobile && !psiDesktop) {
    throw new HttpsError('unavailable', 'PageSpeed Insights APIからデータを取得できませんでした。しばらく待ってから再試行してください。');
  }

  // コンテンツ品質分析
  const contentQuality = analyzeContentQuality(scrapingData, siteUrl);

  // SEO分析（GSCデータはGA4データに同梱しない、別途取得）
  const seo = analyzeSEO(psiMobile, psiDesktop, siteData, ga4Data);

  // エンゲージメント分析（スクレイピングデータからも補完）
  const engagement = analyzeEngagement(ga4Data, scrapingData);

  // 総合スコア計算
  const perfScore = calculatePerformanceScore(psiMobile, psiDesktop);
  const overallScore = calculateOverallScore(perfScore, seo.score, contentQuality.score, engagement.score, contentQuality.available, engagement.available);

  const result = {
    overallScore,
    diagnosedAt: new Date().toISOString(),
    siteUrl,
    fromCache: false,

    psi: {
      mobile: psiMobile ? formatPSIResult(psiMobile) : null,
      desktop: psiDesktop ? formatPSIResult(psiDesktop) : null,
    },

    contentQuality,
    seo,
    engagement,
  };

  // 使用回数インクリメント
  await incrementGenerationCount(siteOwnerId, 'diagnosis');

  // キャッシュ保存
  await cacheRef.set({
    result,
    timestamp: Timestamp.now(),
    siteUrl,
  });

  logger.info(`[SiteDiagnosis] 診断完了: ${siteId}, スコア: ${overallScore}`);
  return result;
}

// ==================== PSI API ====================

/**
 * PageSpeed Insights API呼出し
 */
async function fetchPSI(url, strategy) {
  const apiKey = process.env.PSI_API_KEY;
  if (!apiKey) {
    logger.warn('[SiteDiagnosis] PSI_API_KEY not configured');
    return null;
  }

  const categories = ['performance', 'seo', 'accessibility', 'best-practices'];
  const categoryParams = categories.map(c => `category=${c}`).join('&');
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}&locale=ja&key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[SiteDiagnosis] PSI API error (${strategy}): ${response.status} - ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error(`[SiteDiagnosis] PSI fetch error (${strategy}):`, error.message);
    return null;
  }
}

/**
 * PSI結果をフォーマット
 */
function formatPSIResult(psiData) {
  const categories = psiData.lighthouseResult?.categories || {};
  const audits = psiData.lighthouseResult?.audits || {};

  // カテゴリスコア（0-100に変換）
  const performance = Math.round((categories.performance?.score || 0) * 100);
  const seo = Math.round((categories.seo?.score || 0) * 100);
  const accessibility = Math.round((categories.accessibility?.score || 0) * 100);
  const bestPractices = Math.round((categories['best-practices']?.score || 0) * 100);

  // Core Web Vitals
  const cwv = {
    lcp: extractCWVMetric(audits, 'largest-contentful-paint', 's'),
    cls: extractCWVMetric(audits, 'cumulative-layout-shift', ''),
    tbt: extractCWVMetric(audits, 'total-blocking-time', 'ms'),
    fcp: extractCWVMetric(audits, 'first-contentful-paint', 's'),
    ttfb: extractCWVMetric(audits, 'server-response-time', 'ms'),
    si: extractCWVMetric(audits, 'speed-index', 's'),
  };

  // 失敗Audit一覧（score < 0.9）
  const topAudits = Object.values(audits)
    .filter(a => a.score !== null && a.score < 0.9 && a.title)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 15)
    .map(a => ({
      title: a.title,
      description: (a.description || '').slice(0, 200),
      score: a.score,
      displayValue: a.displayValue || '',
    }));

  return {
    performance,
    seo,
    accessibility,
    bestPractices,
    cwv,
    topAudits,
  };
}

/**
 * CWVメトリクスを抽出
 */
function extractCWVMetric(audits, auditId, defaultUnit) {
  const audit = audits[auditId];
  if (!audit) return { value: null, unit: defaultUnit, rating: 'unknown' };

  let value = audit.numericValue;
  let unit = defaultUnit;

  // 秒単位に変換（ミリ秒からの変換）
  if (unit === 's' && value > 100) {
    value = value / 1000;
  }

  // 小数点以下の桁数を調整
  if (typeof value === 'number') {
    value = unit === '' ? Math.round(value * 100) / 100 : Math.round(value * 10) / 10;
  }

  // rating判定
  const rating = getCWVRating(auditId, audit.numericValue);

  return { value, unit, rating };
}

/**
 * CWV判定（Good/Needs Improvement/Poor）
 */
function getCWVRating(auditId, rawValue) {
  if (rawValue === null || rawValue === undefined) return 'unknown';

  const thresholds = {
    'largest-contentful-paint': [2500, 4000],       // ms
    'cumulative-layout-shift': [0.1, 0.25],
    'total-blocking-time': [200, 600],              // ms
    'first-contentful-paint': [1800, 3000],         // ms
    'server-response-time': [800, 1800],            // ms
    'speed-index': [3400, 5800],                    // ms
  };

  const [good, poor] = thresholds[auditId] || [0, 0];
  if (rawValue <= good) return 'good';
  if (rawValue <= poor) return 'needs-improvement';
  return 'poor';
}

// ==================== コンテンツ品質 ====================

/**
 * コンテンツ品質分析
 */
function analyzeContentQuality(scrapingData, siteUrl) {
  if (!scrapingData || scrapingData.pages.length === 0) {
    return {
      available: false,
      score: 0,
      lastScrapedAt: null,
      totalPages: 0,
      problematicPages: 0,
      topIssues: [],
      topPageDetails: null,
    };
  }

  // スクレイピングデータのフィールド名を正規化
  // pageScrapingData: metaTitle/metaDescription → analyzePageQuality: title/description
  const pages = scrapingData.pages.map(page => ({
    ...page,
    title: page.title || page.metaTitle || '',
    description: page.description || page.metaDescription || '',
    path: page.path || page.pagePath || '',
    url: page.url || page.pageUrl || '',
  }));

  // 各ページのスコアと問題を計算
  const scoredPages = pages.map(page => {
    const contentScore = calculateContentQualityScore(page);
    const issues = identifyPageIssues(page, contentScore);
    return { ...page, contentScore, issues };
  });

  // 平均スコア
  const avgScore = scoredPages.length > 0
    ? Math.round(scoredPages.reduce((sum, p) => sum + p.contentScore, 0) / scoredPages.length)
    : 0;

  // 問題のあるページ数
  const problematicPages = scoredPages.filter(p => p.issues.length > 0).length;

  // 問題種別カウント＋該当ページパス収集
  const issueMap = {};
  scoredPages.forEach(p => {
    const pagePath = p.path || p.url || '';
    p.issues.forEach(issue => {
      if (!issueMap[issue]) issueMap[issue] = [];
      issueMap[issue].push(pagePath);
    });
  });
  const topIssues = Object.entries(issueMap)
    .map(([issue, pages]) => ({ issue, count: pages.length, pages }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // トップページの詳細を探す
  const normalizedUrl = siteUrl.replace(/\/+$/, '');
  const topPage = scoredPages.find(p =>
    p.path === '/' || p.path === '' || p.url === normalizedUrl || p.url === normalizedUrl + '/'
  ) || scoredPages[0];

  const topPageDetails = topPage ? {
    textLength: topPage.textLength || 0,
    headingStructure: topPage.headingStructure || {},
    imagesWithAlt: topPage.imagesWithAlt || 0,
    imagesWithoutAlt: topPage.imagesWithoutAlt || 0,
    hasTitle: !!(topPage.title && topPage.title.length > 0),
    titleLength: (topPage.title || '').length,
    hasDescription: !!(topPage.description && topPage.description.length > 0),
    descriptionLength: (topPage.description || '').length,
  } : null;

  return {
    available: true,
    score: avgScore,
    lastScrapedAt: scrapingData.meta?.lastScrapedAt?.toDate?.()?.toISOString() || null,
    totalPages: pages.length,
    problematicPages,
    topIssues,
    topPageDetails,
  };
}

// ==================== SEO分析 ====================

/**
 * SEO分析
 */
function analyzeSEO(psiMobile, psiDesktop, siteData, ga4Data) {
  const mobileSeo = psiMobile ? Math.round((psiMobile.lighthouseResult?.categories?.seo?.score || 0) * 100) : null;
  const desktopSeo = psiDesktop ? Math.round((psiDesktop.lighthouseResult?.categories?.seo?.score || 0) * 100) : null;

  // メタタグ分析
  const titleLength = (siteData.metaTitle || '').length;
  const descLength = (siteData.metaDescription || '').length;
  const titleOptimal = titleLength >= 30 && titleLength <= 60;
  const descOptimal = descLength >= 50 && descLength <= 160;

  // メタタグスコア（0-100）
  let metaScore = 0;
  if (titleLength > 0) metaScore += titleOptimal ? 50 : 25;
  if (descLength > 0) metaScore += descOptimal ? 50 : 25;

  // GSCデータ（gscSiteUrl + gscOauthTokenId の両方が必要）
  const gscConnected = !!(siteData.gscSiteUrl && siteData.gscOauthTokenId);
  const gscMetrics = ga4Data?.gscMetrics || null;

  // SEOスコア計算
  let score;
  const psiAvg = calculateAvg(mobileSeo, desktopSeo);

  if (gscConnected && gscMetrics) {
    // GSC接続: PSI SEO 40% + メタタグ 30% + GSC指標 30%
    const gscScore = calculateGSCScore(gscMetrics);
    score = Math.round(psiAvg * 0.4 + metaScore * 0.3 + gscScore * 0.3);
  } else {
    // GSC未接続: PSI SEO 60% + メタタグ 40%
    score = Math.round(psiAvg * 0.6 + metaScore * 0.4);
  }

  const issues = [];
  if (!titleOptimal && titleLength > 0) issues.push('タイトルの長さが最適範囲（30-60文字）外です');
  if (titleLength === 0) issues.push('メタタイトルが設定されていません');
  if (!descOptimal && descLength > 0) issues.push('meta descriptionの長さが最適範囲（50-160文字）外です');
  if (descLength === 0) issues.push('meta descriptionが設定されていません');
  if (!gscConnected) issues.push('Google Search Consoleが接続されていません');

  return {
    score,
    psiSeoScore: { mobile: mobileSeo, desktop: desktopSeo },
    metaAnalysis: {
      titleLength,
      titleOptimal,
      descLength,
      descOptimal,
    },
    gscConnected,
    gscMetrics,
    issues,
  };
}

/**
 * GSCメトリクスからスコア計算（0-100）
 */
function calculateGSCScore(gscMetrics) {
  let score = 50; // ベーススコア（接続しているだけで50点）

  const avgPosition = gscMetrics.avgPosition || 100;
  const avgCtr = gscMetrics.avgCtr || 0;

  // 平均順位（30点満点）
  if (avgPosition <= 3) score += 30;
  else if (avgPosition <= 10) score += 20;
  else if (avgPosition <= 20) score += 10;
  else if (avgPosition <= 50) score += 5;

  // CTR（20点満点）
  if (avgCtr >= 0.1) score += 20;
  else if (avgCtr >= 0.05) score += 15;
  else if (avgCtr >= 0.02) score += 10;
  else if (avgCtr > 0) score += 5;

  return Math.min(score, 100);
}

// ==================== エンゲージメント ====================

/**
 * エンゲージメント分析（api_cacheまたはスクレイピングデータから）
 */
function analyzeEngagement(ga4Data, scrapingData) {
  // api_cacheからのGA4データがあればそれを使用
  if (ga4Data?.engagement) {
    const { avgEngagementRate = 0, lowEngagementPages = [] } = ga4Data.engagement;
    return buildEngagementResult(avgEngagementRate, lowEngagementPages);
  }

  // フォールバック: スクレイピングデータからエンゲージメント率を集計
  if (scrapingData?.pages?.length > 0) {
    const pagesWithEngagement = scrapingData.pages.filter(p =>
      p.engagementRate !== undefined && p.engagementRate !== null && (p.pageViews || 0) > 0
    );

    if (pagesWithEngagement.length > 0) {
      // PV数で加重平均（ダッシュボード/全体サマリーと整合させるため）
      const totalWeighted = pagesWithEngagement.reduce((sum, p) => sum + (p.engagementRate || 0) * (p.pageViews || 0), 0);
      const totalPV = pagesWithEngagement.reduce((sum, p) => sum + (p.pageViews || 0), 0);
      const avgEngagementRate = totalPV > 0 ? totalWeighted / totalPV : 0;

      const lowEngagementPages = pagesWithEngagement
        .filter(p => p.engagementRate < 0.4 && (p.pageViews || 0) >= 50)
        .sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0))
        .slice(0, 5)
        .map(p => ({
          path: p.pagePath || p.path || '',
          pageViews: p.pageViews || 0,
          engagementRate: Math.round((p.engagementRate || 0) * 100) / 100,
        }));

      return buildEngagementResult(avgEngagementRate, lowEngagementPages);
    }
  }

  return {
    available: false,
    score: 0,
    metrics: { avgEngagementRate: 0 },
    lowEngagementPages: [],
  };
}

/**
 * エンゲージメント結果を構築（エンゲージメント率のみで評価）
 */
function buildEngagementResult(avgEngagementRate, lowEngagementPages) {
  let score = 0;

  // エンゲージメント率（100点満点）
  if (avgEngagementRate >= 0.8) score = 100;
  else if (avgEngagementRate >= 0.7) score = 85;
  else if (avgEngagementRate >= 0.6) score = 70;
  else if (avgEngagementRate >= 0.5) score = 55;
  else if (avgEngagementRate >= 0.4) score = 40;
  else if (avgEngagementRate >= 0.25) score = 25;
  else score = 10;

  return {
    available: true,
    score: Math.min(score, 100),
    metrics: {
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    },
    lowEngagementPages: lowEngagementPages.slice(0, 5),
  };
}

// ==================== スコア計算 ====================

/**
 * パフォーマンススコア計算
 */
function calculatePerformanceScore(psiMobile, psiDesktop) {
  const mobile = psiMobile ? Math.round((psiMobile.lighthouseResult?.categories?.performance?.score || 0) * 100) : null;
  const desktop = psiDesktop ? Math.round((psiDesktop.lighthouseResult?.categories?.performance?.score || 0) * 100) : null;
  return calculateAvg(mobile, desktop);
}

/**
 * 総合スコア計算（カテゴリ重み付け）
 */
function calculateOverallScore(perfScore, seoScore, contentScore, engagementScore, contentAvailable, engagementAvailable) {
  // 重み定義
  let weights = {
    performance: 30,
    seo: 30,
    content: 20,
    engagement: 20,
  };

  // 利用不可のカテゴリは重み0にして按分
  if (!contentAvailable) weights.content = 0;
  if (!engagementAvailable) weights.engagement = 0;

  const totalWeight = weights.performance + weights.seo + weights.content + weights.engagement;
  if (totalWeight === 0) return 0;

  const weighted =
    (perfScore * weights.performance +
     seoScore * weights.seo +
     contentScore * weights.content +
     engagementScore * weights.engagement) / totalWeight;

  return Math.round(weighted);
}

/**
 * 2値の平均（null安全）
 */
function calculateAvg(a, b) {
  if (a !== null && b !== null) return Math.round((a + b) / 2);
  if (a !== null) return a;
  if (b !== null) return b;
  return 0;
}

// ==================== データ取得ヘルパー ====================

/**
 * スクレイピングデータ取得
 */
async function fetchScrapingData(db, siteId) {
  try {
    const scrapingQuery = await db.collection('sites').doc(siteId)
      .collection('pageScrapingData')
      .orderBy('pageViews', 'desc')
      .limit(50)
      .get();

    const pages = [];
    scrapingQuery.forEach(doc => {
      pages.push({ id: doc.id, ...doc.data() });
    });

    const metaDoc = await db.collection('sites').doc(siteId)
      .collection('pageScrapingMeta').doc('default').get();
    const meta = metaDoc.exists ? metaDoc.data() : null;

    return { pages, meta };
  } catch (error) {
    logger.warn('[SiteDiagnosis] スクレイピングデータ取得エラー:', error.message);
    return { pages: [], meta: null };
  }
}

/**
 * GA4エンゲージメントデータ取得（GA4 APIから直接取得）
 */
async function fetchGA4EngagementData(db, siteId, siteData) {
  try {
    // GA4接続がなければスキップ
    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      logger.info('[SiteDiagnosis] GA4未接続のためエンゲージメントスキップ');
      return null;
    }

    const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
    const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    const analyticsData = google.analyticsdata('v1beta');

    // 過去30日間の日付範囲
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const fmt = (d) => d.toISOString().split('T')[0];

    // ① サイト全体のエンゲージメント率を取得
    const overallResponse = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${siteData.ga4PropertyId}`,
      requestBody: {
        dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
        metrics: [{ name: 'engagementRate' }],
      },
    });

    const avgEngagementRate = parseFloat(
      overallResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0'
    );

    // ② ページ別エンゲージメント率（低エンゲージメントページ検出用）
    let lowEngagementPages = [];
    try {
      const pageResponse = await analyticsData.properties.runReport({
        auth: oauth2Client,
        property: `properties/${siteData.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 50,
        },
      });

      const pageRows = pageResponse.data.rows || [];
      lowEngagementPages = pageRows
        .map(row => ({
          path: row.dimensionValues?.[0]?.value || '',
          pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
          engagementRate: parseFloat(row.metricValues?.[1]?.value || '0'),
        }))
        .filter(p => p.engagementRate < 0.4 && p.pageViews >= 50)
        .slice(0, 5);
    } catch (pageErr) {
      logger.warn('[SiteDiagnosis] ページ別エンゲージメント取得エラー:', pageErr.message);
    }

    // ③ GSCメトリクス取得
    let gscMetrics = null;
    if (siteData.gscSiteUrl && siteData.gscOauthTokenId) {
      try {
        const gscTokenOwnerId = siteData.gscTokenOwner || siteData.userId;
        const gscTokenId = siteData.gscOauthTokenId;
        const { oauth2Client: gscOAuth } = await getAndRefreshToken(gscTokenOwnerId, gscTokenId);
        const searchConsole = google.searchconsole('v1');

        const gscResponse = await searchConsole.searchanalytics.query({
          auth: gscOAuth,
          siteUrl: siteData.gscSiteUrl,
          requestBody: {
            startDate: fmt(startDate),
            endDate: fmt(endDate),
            dimensions: [],
          },
        });

        const gscRows = gscResponse.data.rows || [];
        if (gscRows.length > 0) {
          gscMetrics = {
            avgPosition: Math.round((gscRows[0].position || 0) * 10) / 10,
            totalClicks: gscRows[0].clicks || 0,
            totalImpressions: gscRows[0].impressions || 0,
            avgCtr: Math.round((gscRows[0].ctr || 0) * 1000) / 1000,
          };
        }
      } catch (gscErr) {
        logger.warn('[SiteDiagnosis] GSCメトリクス取得エラー:', gscErr.message);
      }
    }

    return {
      engagement: {
        avgEngagementRate,
        lowEngagementPages,
      },
      gscMetrics,
    };
  } catch (error) {
    logger.warn('[SiteDiagnosis] GA4エンゲージメントデータ取得エラー:', error.message);
    return null;
  }
}
