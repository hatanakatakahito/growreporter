import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { getCache, setCache, generateCacheKey } from '../utils/cacheManager.js';
import { canAccessSite } from '../utils/permissionHelper.js';

/**
 * GA4 Channel Group → 5層ジャーニー Source Type マッピング
 * Source の最終結果が 5 種類になるよう正規化
 */
const SOURCE_TYPE_MAP = {
  'Organic Search': 'organic',
  'Paid Search': 'paid',
  'Paid Social': 'paid',
  'Paid Other': 'paid',
  'Paid Shopping': 'paid',
  'Paid Video': 'paid',
  'Display': 'paid',
  'Cross-network': 'paid',
  'Organic Social': 'sns',
  'Direct': 'direct',
  '(Other)': 'direct',
  'Unassigned': 'direct',
  'Referral': 'referral',
  'Email': 'referral',
  'Affiliates': 'referral',
  'Audio': 'referral',
  'Mobile Push Notifications': 'referral',
  'Organic Shopping': 'organic',
  'Organic Video': 'organic',
  'SMS': 'referral',
};

const SOURCE_LABELS = {
  organic: '自然検索',
  paid: '広告',
  sns: 'SNS',
  direct: '直接',
  referral: '被リンク',
};

const SOURCE_COLORS_FOR_TABLE = {
  organic: 'primary',
  paid: 'purple',
  sns: 'amber',
  direct: 'gray',
  referral: 'emerald',
};

const SOURCE_KEYWORD_LABELS = {
  organic: 'GSC キーワード',
  paid: '広告 KW',
  sns: 'SNS 参照元',
  referral: '参照元ドメイン',
};

const TOP_NODES_PER_COLUMN = 6;
const TOP_PATHS = 6;
const TOP_KEYWORDS_PER_LP = 5;

/**
 * GA4 ユーザージャーニーデータ取得 Callable Function
 *
 * 5層構造: 流入元 → KW/参照元 → LP → 中間ページ → 結果
 *
 * @param {object} request - { siteId, startDate, endDate }
 * @returns {Promise<object>} - { totalSessions, nodes, links, storyTop3, detailPaths }
 */
export async function fetchGA4UserJourneyDataCallable(request) {
  const db = getFirestore();
  const { siteId, startDate, endDate, compStartDate, compEndDate } = request.data;

  if (!siteId || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'siteId, startDate, endDate are required');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const isComparing = !!(compStartDate && compEndDate);
  const userId = request.auth.uid;
  console.log(`[fetchGA4UserJourneyData] Start: siteId=${siteId}, period=${startDate} to ${endDate}${isComparing ? `, comp=${compStartDate} to ${compEndDate}` : ''}`);

  try {
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }
    const siteData = siteDoc.data();

    const hasAccess = await canAccessSite(userId, siteId);
    if (!hasAccess) {
      throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
    }

    if (!siteData.ga4PropertyId || !siteData.ga4OauthTokenId) {
      throw new HttpsError('failed-precondition', 'GA4 の設定が完了していません');
    }

    // キャッシュチェック（比較期間込み）
    const cacheKey = generateCacheKey('ga4-user-journey', siteId, startDate, endDate, compStartDate || '', compEndDate || '');
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log(`[fetchGA4UserJourneyData] Returning cached data: ${cacheKey}`);
      return cachedData;
    }

    // OAuth トークン取得
    const tokenOwnerId = siteData.ga4TokenOwner || siteData.userId;
    const { oauth2Client: ga4Auth } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
    const analyticsData = google.analyticsdata('v1beta');
    const propertyId = `properties/${siteData.ga4PropertyId}`;

    const conversionEventNames = (siteData.conversionEvents || []).map((e) => e.eventName);
    const cvEventDisplayMap = {};
    (siteData.conversionEvents || []).forEach((e) => {
      cvEventDisplayMap[e.eventName] = e.displayName || e.eventName;
    });

    // GA4 並列クエリ
    const ga4Promises = [
      // 1. チャネル × LP × Sessions
      analyticsData.properties.runReport({
        auth: ga4Auth,
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'sessionDefaultChannelGroup' },
            { name: 'landingPage' },
          ],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 500,
        },
      }),

      // 2. LP × CV イベント別 eventCount
      conversionEventNames.length > 0
        ? analyticsData.properties.runReport({
            auth: ga4Auth,
            property: propertyId,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'landingPage' }, { name: 'eventName' }],
              metrics: [{ name: 'eventCount' }],
              dimensionFilter: {
                filter: {
                  fieldName: 'eventName',
                  inListFilter: { values: conversionEventNames },
                },
              },
              limit: 1000,
            },
          })
        : Promise.resolve({ data: { rows: [] } }),

      // 3. LP × pagePath × screenPageViews（中間ページ近似）
      analyticsData.properties.runReport({
        auth: ga4Auth,
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'landingPage' }, { name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 2000,
        },
      }),

      // 4. 全セッション数
      analyticsData.properties.runReport({
        auth: ga4Auth,
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
        },
      }),
    ];

    // 5. GSC キーワード × ページ（連携時のみ）
    const gscEnabled = !!(siteData.gscSiteUrl && siteData.gscOauthTokenId);
    if (gscEnabled) {
      ga4Promises.push(fetchGSCQueryPagePairs(siteData, startDate, endDate));
    } else {
      ga4Promises.push(Promise.resolve(null));
    }

    // 6. 比較期間用クエリ（compStartDate/compEndDate が指定された場合のみ）
    if (isComparing) {
      // 6-a. チャネル × LP × Sessions（比較期間）
      ga4Promises.push(
        analyticsData.properties.runReport({
          auth: ga4Auth,
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: compStartDate, endDate: compEndDate }],
            dimensions: [
              { name: 'sessionDefaultChannelGroup' },
              { name: 'landingPage' },
            ],
            metrics: [{ name: 'sessions' }],
            limit: 500,
          },
        })
      );
      // 6-b. LP × CV イベント別 eventCount（比較期間）
      ga4Promises.push(
        conversionEventNames.length > 0
          ? analyticsData.properties.runReport({
              auth: ga4Auth,
              property: propertyId,
              requestBody: {
                dateRanges: [{ startDate: compStartDate, endDate: compEndDate }],
                dimensions: [{ name: 'landingPage' }, { name: 'eventName' }],
                metrics: [{ name: 'eventCount' }],
                dimensionFilter: {
                  filter: {
                    fieldName: 'eventName',
                    inListFilter: { values: conversionEventNames },
                  },
                },
                limit: 1000,
              },
            })
          : Promise.resolve({ data: { rows: [] } })
      );
    } else {
      ga4Promises.push(Promise.resolve(null));
      ga4Promises.push(Promise.resolve(null));
    }

    const [channelLPResult, lpCvResult, lpPagePathResult, totalResult, gscResult, compChannelLPResult, compLpCvResult] =
      await Promise.allSettled(ga4Promises);

    // 比較期間データを集計
    let compAggregations = null;
    if (isComparing) {
      const compChannelRows =
        compChannelLPResult.status === 'fulfilled' && compChannelLPResult.value?.data
          ? compChannelLPResult.value.data.rows || []
          : [];
      const compCvRows =
        compLpCvResult.status === 'fulfilled' && compLpCvResult.value?.data
          ? compLpCvResult.value.data.rows || []
          : [];
      compAggregations = aggregateComparisonData(compChannelRows, compCvRows);
    }

    // GSC: ページ → キーワード逆引きマップを buildJourneyData の前に作成
    const gscDataResult = gscResult.status === 'fulfilled' ? gscResult.value : null;
    const pageToKeywords = {};
    if (gscEnabled && Array.isArray(gscDataResult)) {
      gscDataResult.forEach((r) => {
        if (!pageToKeywords[r.page]) pageToKeywords[r.page] = [];
        pageToKeywords[r.page].push({
          query: r.query,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          position: r.position,
        });
      });
      Object.keys(pageToKeywords).forEach((p) => {
        pageToKeywords[p].sort((a, b) => b.clicks - a.clicks);
      });
    }

    // データ整形
    const journey = buildJourneyData({
      channelLPRows: channelLPResult.status === 'fulfilled' ? channelLPResult.value.data?.rows || [] : [],
      lpCvRows: lpCvResult.status === 'fulfilled' ? lpCvResult.value.data?.rows || [] : [],
      lpPagePathRows: lpPagePathResult.status === 'fulfilled' ? lpPagePathResult.value.data?.rows || [] : [],
      totalSessions: totalResult.status === 'fulfilled'
        ? parseInt(totalResult.value.data?.rows?.[0]?.metricValues?.[0]?.value || 0)
        : 0,
      bounceRate: totalResult.status === 'fulfilled'
        ? parseFloat(totalResult.value.data?.rows?.[0]?.metricValues?.[1]?.value || 0)
        : 0,
      gscData: gscDataResult,
      pageToKeywords,
      conversionEvents: siteData.conversionEvents || [],
      cvEventDisplayMap,
      gscEnabled,
      compAggregations,
    });

    // ストーリーカードの AI コメントを Gemini で生成（任意・失敗時は決定論的フォールバック）
    if (journey.storyTop3?.length > 0 && process.env.GEMINI_API_KEY) {
      try {
        const aiComments = await generateStoryCommentsWithGemini(journey.storyTop3, siteData);
        if (Array.isArray(aiComments) && aiComments.length === journey.storyTop3.length) {
          journey.storyTop3.forEach((s, i) => {
            if (aiComments[i] && typeof aiComments[i] === 'string') {
              s.aiComment = aiComments[i];
            }
          });
          console.log('[fetchGA4UserJourneyData] AI story comments generated successfully');
        }
      } catch (aiErr) {
        console.warn('[fetchGA4UserJourneyData] AI comment generation failed, using deterministic:', aiErr.message);
      }
    }

    journey.period = { startDate, endDate };
    journey.comparisonPeriod = isComparing ? { startDate: compStartDate, endDate: compEndDate } : null;
    journey.gscEnabled = gscEnabled;
    journey.fetchedAt = new Date().toISOString();
    journey.source = 'api';

    console.log(`[fetchGA4UserJourneyData] Success: nodes=${journey.nodes.length}, links=${journey.links.length}`);
    await setCache(cacheKey, journey, siteId, userId);

    return journey;
  } catch (error) {
    console.error('[fetchGA4UserJourneyData] Error:', error);

    try {
      await db.collection('error_logs').add({
        type: 'ga4_user_journey_fetch_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error('[fetchGA4UserJourneyData] Error logging failed:', logError);
    }

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'ジャーニーデータの取得に失敗しました: ' + error.message);
  }
}

/**
 * GA4 のページパスを正規化
 * - "(not set)", 空文字, null/undefined → "(不明)"
 * - 末尾スラッシュは保持（GA4 のオリジナル）
 */
function normalizePagePath(path) {
  if (!path) return '(不明)';
  const trimmed = String(path).trim();
  if (!trimmed || trimmed === '(not set)') return '(不明)';
  return trimmed;
}

/**
 * Gemini で TOP 3 ストーリーカードの AI コメントを一括生成
 * @returns {Promise<string[] | null>} 各ストーリーに対する 1-2 文のコメント配列、失敗時は null
 */
async function generateStoryCommentsWithGemini(stories, siteData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const siteName = siteData?.siteName || '本サイト';
  const siteIndustry = siteData?.industry || '';
  const siteType = siteData?.siteType || '';
  const sitePurpose = siteData?.sitePurpose || '';

  const siteContext = [siteIndustry, siteType, sitePurpose].filter(Boolean).join(' / ');
  const ctx = siteContext ? `\nサイト前提: ${siteContext}` : '';

  const storyDescriptions = stories
    .map((s, i) => {
      const kwLine = s.keywords?.length > 0 ? `, 主要 KW: ${s.keywords.slice(0, 3).join(' / ')}` : '';
      return `${i + 1}. ${s.title} | 流入元=${s.sourceType} / セッション=${s.sessions.toLocaleString()} (${s.sharePct}%) / CV 率=${s.cvRate.toFixed(1)}% / 性質=${s.type}${kwLine}`;
    })
    .join('\n');

  const prompt = `あなたは Web サイトのアクセス分析専門家です。${siteName} の主要ジャーニー TOP 3 パターンに対して、それぞれ 1-2 文の改善示唆コメントを日本語で生成してください。${ctx}

【入力ジャーニー】
${storyDescriptions}

【出力ルール】
- 各パターンに対して 1-2 文のコメントのみ生成（具体的で実行可能な示唆）
- 数値・KW・ページ名を引用して具体的に書く
- 性質「success」: 成功要因と更に伸ばす方法 / 「warning」: 改善余地が大きい点と具体策 / 「normal」: 中位パターンの伸ばし方
- 出力は必ず以下の純粋な JSON 配列形式（マークダウンや余計な説明文・コードブロック・前後のテキストは絶対に付けない）

["コメント1の内容", "コメント2の内容", "コメント3の内容"]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`[generateStoryCommentsWithGemini] Gemini API error ${response.status}:`, errText);
    return null;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) return null;

  // JSON parse with fallback to extracting array from text
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // フォールバック: テキスト中の最初の JSON 配列を抽出
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

/**
 * 比較期間データを集計
 * - sourceAgg: { organic, paid, sns, direct, referral }
 * - lpAgg: { [LP path]: sessions }
 * - cvAgg: { [eventName]: count }
 */
function aggregateComparisonData(compChannelRows, compCvRows) {
  const sourceAgg = { organic: 0, paid: 0, sns: 0, direct: 0, referral: 0 };
  const lpAgg = {};

  compChannelRows.forEach((row) => {
    const channelGroup = row.dimensionValues[0].value;
    const lp = normalizePagePath(row.dimensionValues[1].value);
    const sessions = parseInt(row.metricValues[0].value || 0);
    const sourceType = SOURCE_TYPE_MAP[channelGroup] || 'direct';
    sourceAgg[sourceType] += sessions;
    lpAgg[lp] = (lpAgg[lp] || 0) + sessions;
  });

  const cvAgg = {};
  compCvRows.forEach((row) => {
    const eventName = row.dimensionValues[1].value;
    const count = parseInt(row.metricValues[0].value || 0);
    cvAgg[eventName] = (cvAgg[eventName] || 0) + count;
  });

  return { sourceAgg, lpAgg, cvAgg };
}

/**
 * 変化率を計算: (current - previous) / previous
 * - 前期 0 で当期あり → null（無限大を避ける）
 * - 当期 = 前期 → 0
 */
function computeChange(current, previous) {
  if (previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * GSC API から query × page のペアを取得
 */
async function fetchGSCQueryPagePairs(siteData, startDate, endDate) {
  try {
    const gscOwnerId = siteData.gscTokenOwner || siteData.userId;
    const { oauth2Client } = await getAndRefreshToken(gscOwnerId, siteData.gscOauthTokenId);
    const searchConsole = google.searchconsole('v1');

    const response = await searchConsole.searchanalytics.query({
      auth: oauth2Client,
      siteUrl: siteData.gscSiteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowLimit: 5000,
      },
    });

    return (response.data.rows || []).map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));
  } catch (e) {
    console.warn('[fetchGA4UserJourneyData] GSC fetch failed (continuing without GSC):', e.message);
    return null;
  }
}

/**
 * 取得した GA4/GSC データから 5層ジャーニーノードとリンクを構築
 */
function buildJourneyData({
  channelLPRows,
  lpCvRows,
  lpPagePathRows,
  totalSessions,
  bounceRate,
  gscData,
  pageToKeywords = {},
  conversionEvents,
  cvEventDisplayMap,
  gscEnabled,
  compAggregations,
}) {
  // ===== Step 1: 流入元 (Source) を集計 =====
  // GA4 Channel Group → 5タイプにマッピング (organic/paid/sns/direct/referral)
  const sourceAgg = { organic: 0, paid: 0, sns: 0, direct: 0, referral: 0 };
  // (sourceType, lp) → sessions のマップを構築
  const sourceLPSessions = {}; // { sourceType: { lp: sessions } }
  Object.keys(sourceAgg).forEach((s) => { sourceLPSessions[s] = {}; });

  channelLPRows.forEach((row) => {
    const channelGroup = row.dimensionValues[0].value;
    const lp = normalizePagePath(row.dimensionValues[1].value);
    const sessions = parseInt(row.metricValues[0].value || 0);
    const sourceType = SOURCE_TYPE_MAP[channelGroup] || 'direct';
    sourceAgg[sourceType] += sessions;
    sourceLPSessions[sourceType][lp] = (sourceLPSessions[sourceType][lp] || 0) + sessions;
  });

  // ===== Step 2: 上位 LP を選定 =====
  const lpAgg = {}; // lp → total sessions
  Object.values(sourceLPSessions).forEach((lpMap) => {
    Object.entries(lpMap).forEach(([lp, sessions]) => {
      lpAgg[lp] = (lpAgg[lp] || 0) + sessions;
    });
  });
  const topLPs = Object.entries(lpAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP_NODES_PER_COLUMN - 1)
    .map(([lp]) => lp);
  const otherLPSessions = Object.entries(lpAgg)
    .filter(([lp]) => !topLPs.includes(lp))
    .reduce((sum, [, s]) => sum + s, 0);

  // ===== Step 3: GSC キーワード × LP マップを準備 =====
  // queryPagesMap: query → { page → clicks }
  const gscQueryToLP = {}; // query → [{ page, clicks }]
  if (gscEnabled && Array.isArray(gscData)) {
    gscData.forEach((r) => {
      if (!gscQueryToLP[r.query]) gscQueryToLP[r.query] = [];
      gscQueryToLP[r.query].push({ page: r.page, clicks: r.clicks });
    });
  }
  // 集計: organic 流入総量から、KW 別配分を作る
  // 各 KW のクリック総数を計算
  const kwTotalClicks = {};
  Object.entries(gscQueryToLP).forEach(([query, pages]) => {
    kwTotalClicks[query] = pages.reduce((sum, p) => sum + p.clicks, 0);
  });
  const sortedKWs = Object.entries(kwTotalClicks)
    .sort(([, a], [, b]) => b - a)
    .map(([q]) => q);
  // organic 用 KW (上位 N - 1 + その他)
  const topGSCKeywords = sortedKWs.slice(0, 3);

  // ===== Step 4: 中間ページ集計 =====
  // lpPagePathRows: (LP, pagePath, screenPageViews)
  // LP 自身は除外する
  const middlePageAgg = {}; // pagePath → total views from non-LP transitions
  const lpToMiddleFlow = {}; // (LP, middle) → views
  lpPagePathRows.forEach((row) => {
    const lp = normalizePagePath(row.dimensionValues[0].value);
    const page = normalizePagePath(row.dimensionValues[1].value);
    const views = parseInt(row.metricValues[0].value || 0);
    if (page === lp) return; // LP 自身は除外（着地ページのカウント分）
    middlePageAgg[page] = (middlePageAgg[page] || 0) + views;
    const key = `${lp}|||${page}`;
    lpToMiddleFlow[key] = (lpToMiddleFlow[key] || 0) + views;
  });

  // 上位中間ページを選定
  const topMiddlePages = Object.entries(middlePageAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP_NODES_PER_COLUMN - 2) // -2: 直帰用に1枠空ける
    .map(([page]) => page);

  // ===== Step 5: CV イベント集計 =====
  // lpCvRows: (LP, eventName, eventCount)
  const lpToCvFlow = {}; // (LP, eventName) → count
  const cvAgg = {}; // eventName → total
  lpCvRows.forEach((row) => {
    const lp = normalizePagePath(row.dimensionValues[0].value);
    const eventName = row.dimensionValues[1].value;
    const count = parseInt(row.metricValues[0].value || 0);
    cvAgg[eventName] = (cvAgg[eventName] || 0) + count;
    const key = `${lp}|||${eventName}`;
    lpToCvFlow[key] = (lpToCvFlow[key] || 0) + count;
  });
  const totalCv = Object.values(cvAgg).reduce((s, v) => s + v, 0);
  const totalExit = Math.max(0, totalSessions - totalCv);

  // ===== Step 6: 5 層ノード構築 =====
  const nodes = [];
  const links = [];

  // 列 0: 流入元
  ['organic', 'paid', 'sns', 'direct', 'referral'].forEach((sourceType) => {
    const value = sourceAgg[sourceType];
    if (value > 0) {
      const change = compAggregations
        ? computeChange(value, compAggregations.sourceAgg?.[sourceType])
        : null;
      // detail: この流入元の上位 LP（最大 5 件）
      const lpEntries = Object.entries(sourceLPSessions[sourceType] || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lp, sessions]) => ({ name: lp, value: sessions, share: value > 0 ? sessions / value : 0 }));
      nodes.push({
        id: `src-${sourceType}`,
        column: 0,
        name: SOURCE_LABELS[sourceType],
        type: 'source',
        value,
        share: totalSessions > 0 ? value / totalSessions : 0,
        change,
        detail: {
          topLPs: lpEntries,
        },
      });
    }
  });

  // 列 1: KW / 参照元（流入元タイプ別。直接はスキップ）
  // organic: 上位 GSC KW + その他
  if (sourceAgg.organic > 0 && topGSCKeywords.length > 0) {
    let assignedClicks = 0;
    topGSCKeywords.forEach((kw, idx) => {
      const totalKwClicks = kwTotalClicks[kw];
      // organic セッション総数比率で按分（GSC クリック合計に対する比率）
      const totalAllKwClicks = sortedKWs.reduce((s, q) => s + kwTotalClicks[q], 0);
      const ratio = totalAllKwClicks > 0 ? totalKwClicks / totalAllKwClicks : 0;
      const value = Math.round(sourceAgg.organic * ratio);
      assignedClicks += value;
      nodes.push({
        id: `kw-organic-${idx}`,
        column: 1,
        name: kw,
        type: 'keyword',
        subtype: 'gsc',
        sourceType: 'organic',
        value,
      });
      links.push({
        source: `src-organic`,
        target: `kw-organic-${idx}`,
        value,
      });
    });
    const otherOrganic = sourceAgg.organic - assignedClicks;
    if (otherOrganic > 0) {
      nodes.push({
        id: 'kw-organic-other',
        column: 1,
        name: 'その他 KW',
        type: 'keyword',
        subtype: 'mix',
        sourceType: 'organic',
        value: otherOrganic,
      });
      links.push({ source: 'src-organic', target: 'kw-organic-other', value: otherOrganic });
    }
  } else if (sourceAgg.organic > 0) {
    // GSC 未連携 → organic 全体を「(GSC 未連携)」として 1 ノード
    nodes.push({
      id: 'kw-organic-unknown',
      column: 1,
      name: '(GSC 未連携)',
      type: 'keyword',
      subtype: 'mix',
      sourceType: 'organic',
      value: sourceAgg.organic,
    });
    links.push({ source: 'src-organic', target: 'kw-organic-unknown', value: sourceAgg.organic });
  }

  // paid / sns / referral はチャネル名のみ表示（KW 詳細は今後の Phase で広告 API 連携）
  ['paid', 'sns', 'referral'].forEach((sourceType) => {
    if (sourceAgg[sourceType] > 0) {
      nodes.push({
        id: `kw-${sourceType}`,
        column: 1,
        name: SOURCE_KEYWORD_LABELS[sourceType],
        type: 'keyword',
        subtype: sourceType,
        sourceType,
        value: sourceAgg[sourceType],
      });
      links.push({ source: `src-${sourceType}`, target: `kw-${sourceType}`, value: sourceAgg[sourceType] });
    }
  });

  // direct は KW 列スキップ → 後でリンクで直接 LP に接続

  // 列 2: LP（詳細データ付き）
  topLPs.forEach((lp, idx) => {
    const change = compAggregations
      ? computeChange(lpAgg[lp], compAggregations.lpAgg?.[lp])
      : null;

    // 流入元 TOP 5（このLPに来たソース別セッション）
    const inboundSources = ['organic', 'paid', 'sns', 'direct', 'referral']
      .map((st) => {
        const sessions = sourceLPSessions[st]?.[lp] || 0;
        return sessions > 0
          ? { name: SOURCE_LABELS[st], sourceType: st, value: sessions, share: lpAgg[lp] > 0 ? sessions / lpAgg[lp] : 0 }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 次のページ TOP 5（中間ページ別セッション）
    const nextPagesEntries = topMiddlePages
      .map((mid) => ({
        name: mid,
        value: lpToMiddleFlow[`${lp}|||${mid}`] || 0,
        isBounce: false,
      }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value);
    // 直帰を最後に追加（推定: LP セッション × bounceRate）
    const lpBounce = Math.round((lpAgg[lp] || 0) * (bounceRate || 0));
    if (lpBounce > 0) {
      nextPagesEntries.push({ name: '直帰', value: lpBounce, isBounce: true });
    }
    const nextPages = nextPagesEntries
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((e) => ({ ...e, share: lpAgg[lp] > 0 ? e.value / lpAgg[lp] : 0 }));

    // GSC キーワード TOP 5（GSC 連携時のみ）
    const gscKeywords = (pageToKeywords[lp] || [])
      .slice(0, 5)
      .map((k) => ({ query: k.query, clicks: k.clicks, position: k.position, ctr: k.ctr, impressions: k.impressions }));

    // この LP からの CV 集計
    const cvFromLP = Object.entries(lpToCvFlow)
      .filter(([key]) => key.startsWith(`${lp}|||`))
      .map(([key, count]) => ({
        eventName: key.split('|||')[1],
        displayName: cvEventDisplayMap[key.split('|||')[1]] || key.split('|||')[1],
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const totalCvFromLP = cvFromLP.reduce((s, c) => s + c.count, 0);
    const cvRate = lpAgg[lp] > 0 ? totalCvFromLP / lpAgg[lp] : 0;

    nodes.push({
      id: `lp-${idx}`,
      column: 2,
      name: lp,
      type: 'lp',
      value: lpAgg[lp],
      change,
      detail: {
        inboundSources,
        nextPages,
        gscKeywords,
        cvBreakdown: cvFromLP,
        cvRate,
        bounceRate: bounceRate || 0, // サイト全体平均（LP 個別は GA4 標準では取れない）
      },
    });
  });
  if (otherLPSessions > 0) {
    nodes.push({
      id: 'lp-other',
      column: 2,
      name: 'その他 LP',
      type: 'lp',
      value: otherLPSessions,
    });
  }

  // KW 列 → LP リンクを構築（GSC のキーワード→ページペアから）
  if (sourceAgg.organic > 0 && topGSCKeywords.length > 0) {
    topGSCKeywords.forEach((kw, idx) => {
      const pages = gscQueryToLP[kw] || [];
      // pages の clicks 比率で配分（kw ノード値を LP に分配）
      const totalKwClicks = kwTotalClicks[kw];
      const kwNode = nodes.find((n) => n.id === `kw-organic-${idx}`);
      if (!kwNode) return;
      pages.forEach((p) => {
        const lpIdx = topLPs.indexOf(p.page);
        const targetId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
        const ratio = totalKwClicks > 0 ? p.clicks / totalKwClicks : 0;
        const value = Math.round(kwNode.value * ratio);
        if (value > 0) {
          links.push({ source: `kw-organic-${idx}`, target: targetId, value });
        }
      });
    });
    // organic-other も比例配分
    const otherKW = nodes.find((n) => n.id === 'kw-organic-other');
    if (otherKW && otherKW.value > 0) {
      // 残り KW のクリック分布で按分
      const remainingKWs = sortedKWs.slice(3);
      const remainingPagesAgg = {};
      remainingKWs.forEach((q) => {
        (gscQueryToLP[q] || []).forEach((p) => {
          remainingPagesAgg[p.page] = (remainingPagesAgg[p.page] || 0) + p.clicks;
        });
      });
      const totalRemaining = Object.values(remainingPagesAgg).reduce((s, v) => s + v, 0);
      Object.entries(remainingPagesAgg).forEach(([page, clicks]) => {
        const lpIdx = topLPs.indexOf(page);
        const targetId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
        const ratio = totalRemaining > 0 ? clicks / totalRemaining : 0;
        const value = Math.round(otherKW.value * ratio);
        if (value > 0) {
          links.push({ source: 'kw-organic-other', target: targetId, value });
        }
      });
    }
  } else if (sourceAgg.organic > 0) {
    // GSC 未連携: organic を sourceLPSessions['organic'] の分布で LP に配分
    Object.entries(sourceLPSessions.organic || {}).forEach(([lp, sessions]) => {
      const lpIdx = topLPs.indexOf(lp);
      const targetId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
      links.push({ source: 'kw-organic-unknown', target: targetId, value: sessions });
    });
  }

  // paid / sns / referral の KW → LP リンク
  ['paid', 'sns', 'referral'].forEach((sourceType) => {
    if (sourceAgg[sourceType] === 0) return;
    Object.entries(sourceLPSessions[sourceType] || {}).forEach(([lp, sessions]) => {
      const lpIdx = topLPs.indexOf(lp);
      const targetId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
      links.push({ source: `kw-${sourceType}`, target: targetId, value: sessions });
    });
  });

  // direct → LP（KW スキップ）
  if (sourceAgg.direct > 0) {
    Object.entries(sourceLPSessions.direct || {}).forEach(([lp, sessions]) => {
      const lpIdx = topLPs.indexOf(lp);
      const targetId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
      links.push({ source: 'src-direct', target: targetId, value: sessions, skipKeyword: true });
    });
  }

  // 列 3: 中間ページ（詳細データ付き）
  topMiddlePages.forEach((page, idx) => {
    // この中間ページへ流入する LP TOP 5
    const inboundLPs = topLPs
      .map((lp) => ({
        name: lp,
        value: lpToMiddleFlow[`${lp}|||${page}`] || 0,
      }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    nodes.push({
      id: `mid-${idx}`,
      column: 3,
      name: page,
      type: 'middle',
      value: middlePageAgg[page],
      detail: {
        inboundLPs,
      },
    });
  });
  // 直帰ノードを追加
  const totalBouncedSessions = Math.round(totalSessions * (bounceRate || 0));
  if (totalBouncedSessions > 0) {
    nodes.push({
      id: 'mid-bounce',
      column: 3,
      name: '直帰',
      type: 'middle',
      value: totalBouncedSessions,
    });
  }

  // LP → 中間 リンク（lpToMiddleFlow から）
  Object.entries(lpToMiddleFlow).forEach(([key, views]) => {
    const [lp, middle] = key.split('|||');
    const lpIdx = topLPs.indexOf(lp);
    const lpId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
    const midIdx = topMiddlePages.indexOf(middle);
    if (midIdx < 0) return; // 上位中間でなければ無視（簡略化）
    links.push({ source: lpId, target: `mid-${midIdx}`, value: views });
  });

  // LP → 直帰 リンク（各 LP の bounceRate を均等に適用、簡略化）
  if (totalBouncedSessions > 0) {
    [...topLPs, 'lp-other'].forEach((lp, idx) => {
      const lpId = idx < topLPs.length ? `lp-${idx}` : 'lp-other';
      const lpSessions = lp === 'lp-other' ? otherLPSessions : (lpAgg[lp] || 0);
      // 全体の bounceRate × LP セッション数 で近似
      const lpBounce = Math.round(lpSessions * (bounceRate || 0));
      if (lpBounce > 0) {
        links.push({ source: lpId, target: 'mid-bounce', value: lpBounce });
      }
    });
  }

  // 列 4: 結果
  // CV ノード（詳細データ付き）
  Object.entries(cvAgg).forEach(([eventName, count]) => {
    const displayName = cvEventDisplayMap[eventName] || eventName;
    const change = compAggregations
      ? computeChange(count, compAggregations.cvAgg?.[eventName])
      : null;

    // この CV に至った LP TOP 5
    const inboundLPs = topLPs
      .map((lp) => ({
        name: lp,
        value: lpToCvFlow[`${lp}|||${eventName}`] || 0,
      }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    nodes.push({
      id: `cv-${eventName}`,
      column: 4,
      name: displayName,
      type: 'cv',
      value: count,
      share: totalSessions > 0 ? count / totalSessions : 0,
      change,
      detail: {
        inboundLPs,
        cvRate: totalSessions > 0 ? count / totalSessions : 0,
      },
    });
  });
  // 離脱ノード
  if (totalExit > 0) {
    nodes.push({
      id: 'cv-exit',
      column: 4,
      name: '離脱',
      type: 'exit',
      value: totalExit,
      share: totalSessions > 0 ? totalExit / totalSessions : 0,
    });
  }

  // 中間 → 結果 リンク
  // CV: lpToCvFlow から、LP→中間ページの分布で按分
  Object.entries(lpToCvFlow).forEach(([key, count]) => {
    const [lp, eventName] = key.split('|||');
    const lpIdx = topLPs.indexOf(lp);
    const lpId = lpIdx >= 0 ? `lp-${lpIdx}` : 'lp-other';
    // 簡略: LP の中間流入の最大ノードに集約してリンク（モックアップに近い見た目）
    const middleLink = links.find((l) => l.source === lpId && l.target.startsWith('mid-') && l.target !== 'mid-bounce');
    const sourceMidId = middleLink ? middleLink.target : `mid-${0}`;
    links.push({ source: sourceMidId, target: `cv-${eventName}`, value: count });
  });
  // 中間 → 離脱（直帰以外）
  topMiddlePages.forEach((_, idx) => {
    const midId = `mid-${idx}`;
    const midNode = nodes.find((n) => n.id === midId);
    if (!midNode) return;
    const cvOutgoing = links
      .filter((l) => l.source === midId && l.target.startsWith('cv-'))
      .reduce((s, l) => s + l.value, 0);
    const exitFromMid = Math.max(0, midNode.value - cvOutgoing);
    if (exitFromMid > 0) {
      links.push({ source: midId, target: 'cv-exit', value: exitFromMid });
    }
  });
  // 直帰 → 離脱
  if (totalBouncedSessions > 0) {
    links.push({ source: 'mid-bounce', target: 'cv-exit', value: totalBouncedSessions });
  }

  // ===== 詳細パステーブル =====
  // 流入元 → LP → 中間 → 結果 を上位 N 件抽出
  const detailPaths = buildDetailPaths({
    sourceLPSessions,
    sourceAgg,
    topLPs,
    lpToMiddleFlow,
    topMiddlePages,
    middlePageAgg,
    lpToCvFlow,
    cvEventDisplayMap,
    totalSessions,
  });

  // ===== ストーリーカード TOP 3 =====
  // pageToKeywords は引数で渡される（GSC データから事前構築）
  const storyTop3 = buildStoryTop3({
    detailPaths,
    totalSessions,
    pageToKeywords,
  });

  return {
    totalSessions,
    nodes,
    links,
    storyTop3,
    detailPaths,
  };
}

/**
 * ストーリーカード TOP 3 を決定論的に構築
 * 上位 3 パスから流入元タイプ・GSC キーワード・AI 風コメントを生成
 */
function buildStoryTop3({ detailPaths, totalSessions, pageToKeywords }) {
  const sourceLabelToType = {
    '自然検索': 'organic',
    '広告': 'paid',
    'SNS': 'sns',
    '直接': 'direct',
    '被リンク': 'referral',
  };

  const sourceKeywordLabel = {
    organic: 'GSC キーワード',
    paid: '広告 KW',
    sns: 'SNS 参照元',
    direct: '直接 (KW なし)',
    referral: '参照元ドメイン',
  };

  return detailPaths.slice(0, 3).map((path, idx) => {
    const sourceType = sourceLabelToType[path.source] || 'direct';
    const sharePct = totalSessions > 0 ? Math.round((path.sessions / totalSessions) * 100) : 0;

    // 性質判定: success / warning / normal
    let type = 'normal';
    if (path.cvRate >= 5) type = 'success';
    else if (path.cvRate < 1 && path.sessions > totalSessions * 0.05) type = 'warning';

    // キーワード抽出
    let keywords = [];
    let additionalKwCount = 0;
    if (sourceType === 'organic') {
      const lpKeywords = (pageToKeywords[path.lp] || []).map((k) => k.query);
      keywords = lpKeywords.slice(0, 3);
      additionalKwCount = Math.max(0, lpKeywords.length - 3);
    } else if (sourceType === 'sns') {
      keywords = ['X 主体']; // 主要 SNS（実装後で詳細化）
    } else if (sourceType === 'paid') {
      keywords = ['広告キーワード']; // Google Ads API 連携で実データ化（別フェーズ）
    } else if (sourceType === 'referral') {
      keywords = ['参照元ドメイン'];
    } else {
      keywords = ['(直接アクセス)'];
    }

    // タイトル生成（流入元 + 結果）
    const lpShort = path.lp.split('/').filter(Boolean).pop() || 'トップ';
    const title = `${path.source} → ${lpShort} → ${path.result}`;

    // ナラティブ
    const narrativePrefix = sourceType === 'organic' ? '上記キーワードで検索' : `${path.source} から流入`;
    const narrative = path.middle
      ? `${narrativePrefix} → ${path.lp} → ${path.middle} → ${path.result}`
      : `${narrativePrefix} → ${path.lp} → ${path.result}`;

    // AI 風コメント（決定論的、Phase 3.1 で AI 化予定）
    let aiComment;
    if (type === 'success') {
      aiComment = `CV 率 ${path.cvRate.toFixed(1)}% は好調。同パターンの拡張で更に伸びる可能性あり`;
    } else if (type === 'warning') {
      aiComment = `流入は多いが CV 率 ${path.cvRate.toFixed(1)}% と低い。LP / CTA 改善で底上げ余地大`;
    } else {
      aiComment = `CV 率 ${path.cvRate.toFixed(1)}%。LP の改善で更に伸ばせる可能性あり`;
    }

    return {
      id: `top${idx + 1}`,
      rank: idx + 1,
      title,
      sharePct,
      cvRate: path.cvRate,
      sessions: path.sessions,
      conversions: Math.round((path.sessions * path.cvRate) / 100),
      type,
      sourceType,
      keywordLabel: sourceKeywordLabel[sourceType],
      keywords,
      additionalKwCount,
      narrative,
      aiComment,
      improvePath: `/improve?source=journey&pattern=top${idx + 1}`,
    };
  });
}

/**
 * 詳細パステーブル（上位 N 件のジャーニーパス）を構築
 */
function buildDetailPaths({
  sourceLPSessions,
  sourceAgg,
  topLPs,
  lpToMiddleFlow,
  topMiddlePages,
  middlePageAgg,
  lpToCvFlow,
  cvEventDisplayMap,
  totalSessions,
}) {
  const paths = [];

  Object.entries(sourceLPSessions).forEach(([sourceType, lpMap]) => {
    Object.entries(lpMap).forEach(([lp, sessions]) => {
      if (!topLPs.includes(lp)) return; // 上位 LP のみ
      // 主要 中間ページ
      const middleCandidates = topMiddlePages
        .map((mid) => ({
          mid,
          views: lpToMiddleFlow[`${lp}|||${mid}`] || 0,
        }))
        .filter((m) => m.views > 0)
        .sort((a, b) => b.views - a.views);
      const topMid = middleCandidates[0];

      // 主要 CV
      const cvCandidates = Object.entries(lpToCvFlow)
        .filter(([key]) => key.startsWith(`${lp}|||`))
        .map(([key, cnt]) => ({
          eventName: key.split('|||')[1],
          count: cnt,
        }))
        .sort((a, b) => b.count - a.count);
      const topCv = cvCandidates[0];
      const totalCvForLP = cvCandidates.reduce((s, c) => s + c.count, 0);

      paths.push({
        source: SOURCE_LABELS[sourceType],
        sourceColor: SOURCE_COLORS_FOR_TABLE[sourceType],
        lp,
        middle: topMid ? topMid.mid : null,
        result: topCv ? (cvEventDisplayMap[topCv.eventName] || topCv.eventName) : '離脱',
        sessions,
        cvRate: sessions > 0 ? +((totalCvForLP / sessions) * 100).toFixed(1) : 0,
        change: 0, // 期間比較は別フェーズで
      });
    });
  });

  paths.sort((a, b) => b.sessions - a.sessions);
  return paths.slice(0, TOP_PATHS).map((p, i) => ({ ...p, rank: i + 1 }));
}
