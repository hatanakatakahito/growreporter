import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../../utils/tokenManager.js';
import { saveCachedAnalysis, getCachedAnalysis } from '../../utils/aiCacheManager.js';
import { getPromptTemplate } from '../../prompts/templates.js';

/**
 * 管理者用：全サイト一括AI分析生成
 * 各サイトの summary ページタイプの AI 分析を生成する
 *
 * @param {Object} request.data
 * @param {string[]} [request.data.siteIds] - 対象サイトID（省略時は全サイト）
 * @param {string[]} [request.data.pageTypes] - 対象ページタイプ（省略時は ['summary']）
 * @param {boolean} [request.data.skipCached] - キャッシュ済みをスキップ（デフォルト true）
 */
export const batchGenerateAISummariesCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const db = getFirestore();

  // 管理者権限チェック
  const adminDoc = await db.collection('adminUsers').doc(uid).get();
  if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data()?.role)) {
    throw new HttpsError('permission-denied', '管理者（admin/editor）権限が必要です');
  }

  const {
    siteIds = null,
    pageTypes = ['summary'],
    skipCached = true,
  } = request.data || {};

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new HttpsError('failed-precondition', 'GEMINI_API_KEY が設定されていません');
  }

  logger.info('[batchGenerateAI] 一括AI分析生成開始', { siteIds, pageTypes, skipCached });

  // 対象サイト取得
  let siteDocs;
  if (siteIds && siteIds.length > 0) {
    // 指定サイトのみ
    const refs = siteIds.map(id => db.collection('sites').doc(id));
    const snaps = await db.getAll(...refs);
    siteDocs = snaps.filter(s => s.exists);
  } else {
    // 全サイト
    const snap = await db.collection('sites').get();
    siteDocs = snap.docs;
  }

  // GA4 設定済みサイトのみフィルタ
  const ga4Sites = siteDocs.filter(doc => {
    const d = doc.data();
    return d.ga4PropertyId && d.ga4OauthTokenId;
  });

  logger.info(`[batchGenerateAI] 対象サイト数: ${ga4Sites.length} / ${siteDocs.length}`);

  const results = [];
  const now = new Date();

  // 期間: 先月1日〜末日
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const startDate = formatDate(lastMonth);
  const endDate = formatDate(lastMonthEnd);

  // 前月比用: 先々月
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  const prevStartDate = formatDate(twoMonthsAgo);
  const prevEndDate = formatDate(twoMonthsAgoEnd);

  for (const siteDoc of ga4Sites) {
    const siteId = siteDoc.id;
    const siteData = siteDoc.data();
    const siteOwnerId = siteData.userId;
    const siteName = siteData.siteName || siteData.siteUrl || siteId;

    for (const pageType of pageTypes) {
      const resultEntry = { siteId, siteName, pageType, status: 'pending' };

      try {
        // キャッシュチェック
        if (skipCached) {
          const cached = await getCachedAnalysis(siteOwnerId, siteId, pageType, startDate, endDate);
          if (cached) {
            resultEntry.status = 'cached';
            results.push(resultEntry);
            logger.info(`[batchGenerateAI] キャッシュ済みスキップ: ${siteName} (${pageType})`);
            continue;
          }
        }

        // GA4データ取得
        logger.info(`[batchGenerateAI] GA4データ取得中: ${siteName}`);
        const tokenOwnerId = siteData.ga4TokenOwner || siteOwnerId;
        const { oauth2Client } = await getAndRefreshToken(tokenOwnerId, siteData.ga4OauthTokenId);
        const propertyId = siteData.ga4PropertyId;

        // 当月と前月のメトリクスを取得
        const [currentMetrics, previousMetrics] = await Promise.all([
          fetchGA4Metrics(oauth2Client, propertyId, startDate, endDate, siteData),
          fetchGA4Metrics(oauth2Client, propertyId, prevStartDate, prevEndDate, siteData),
        ]);

        if (!currentMetrics) {
          resultEntry.status = 'no_data';
          resultEntry.error = 'GA4データ取得失敗';
          results.push(resultEntry);
          continue;
        }

        // rawData を summary 形式で構築
        const rawData = buildRawDataForSummary(currentMetrics, previousMetrics, siteData);
        const metrics = formatSummaryMetrics(rawData);

        // プロンプト生成
        const period = `${startDate}から${endDate}までの期間`;
        const prompt = getPromptTemplate(pageType, period, metrics, startDate, endDate);

        // Gemini API 呼び出し
        logger.info(`[batchGenerateAI] AI生成中: ${siteName} (${pageType})`);
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
        const aiResult = await callGeminiAPI(geminiApiKey, geminiModel, prompt);

        if (!aiResult.summary) {
          resultEntry.status = 'ai_error';
          resultEntry.error = 'AI生成結果が空';
          results.push(resultEntry);
          continue;
        }

        // キャッシュに保存
        await saveCachedAnalysis(
          siteOwnerId, siteId, pageType,
          aiResult.summary, aiResult.recommendations,
          startDate, endDate
        );

        // 旧キャッシュにも保存
        await db.collection('sites').doc(siteId).collection('aiSummaries').add({
          userId: siteOwnerId,
          siteId,
          pageType,
          startDate,
          endDate,
          summary: aiResult.summary,
          recommendations: aiResult.recommendations,
          metrics: JSON.parse(JSON.stringify(metrics)),
          generatedAt: Timestamp.fromDate(new Date()),
          createdAt: Timestamp.fromDate(new Date()),
        });

        resultEntry.status = 'generated';
        results.push(resultEntry);
        logger.info(`[batchGenerateAI] 生成完了: ${siteName} (${pageType})`);

        // Rate limit 対策: 3秒待機
        await sleep(3000);

      } catch (err) {
        logger.error(`[batchGenerateAI] エラー: ${siteName} (${pageType})`, { error: err.message });
        resultEntry.status = 'error';
        resultEntry.error = err.message;
        results.push(resultEntry);

        // エラー時も少し待機（rate limit対策）
        await sleep(2000);
      }
    }
  }

  const summary = {
    total: results.length,
    generated: results.filter(r => r.status === 'generated').length,
    cached: results.filter(r => r.status === 'cached').length,
    errors: results.filter(r => r.status === 'error' || r.status === 'ai_error' || r.status === 'no_data').length,
  };

  logger.info('[batchGenerateAI] 一括生成完了', summary);

  return { summary, results };
};

// ── ヘルパー関数 ──

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GA4 メトリクスを取得
 */
async function fetchGA4Metrics(oauth2Client, propertyId, startDate, endDate, siteData) {
  try {
    const analyticsData = google.analyticsdata('v1beta');

    // コンバージョンイベント名を取得
    const conversionEvents = siteData.conversionEvents || [];
    const conversionEventNames = conversionEvents.map(e => e.eventName).filter(Boolean);

    // 基本メトリクス取得
    const response = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate.replace(/\//g, '-'), endDate: endDate.replace(/\//g, '-') }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
        ],
      },
    });

    const row = response.data?.rows?.[0];
    if (!row) return null;

    const values = row.metricValues || [];
    const baseMetrics = {
      totalUsers: parseInt(values[0]?.value || '0', 10),
      newUsers: parseInt(values[1]?.value || '0', 10),
      sessions: parseInt(values[2]?.value || '0', 10),
      pageViews: parseInt(values[3]?.value || '0', 10),
      engagementRate: parseFloat(values[4]?.value || '0'),
      bounceRate: parseFloat(values[5]?.value || '0'),
    };

    // コンバージョン取得
    let totalConversions = 0;
    const conversionBreakdown = {};

    if (conversionEventNames.length > 0) {
      try {
        const convResponse = await analyticsData.properties.runReport({
          auth: oauth2Client,
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate: startDate.replace(/\//g, '-'), endDate: endDate.replace(/\//g, '-') }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                inListFilter: {
                  values: conversionEventNames,
                },
              },
            },
          },
        });

        for (const convRow of (convResponse.data?.rows || [])) {
          const eventName = convRow.dimensionValues?.[0]?.value;
          const count = parseInt(convRow.metricValues?.[0]?.value || '0', 10);
          if (eventName) {
            conversionBreakdown[eventName] = count;
            totalConversions += count;
          }
        }
      } catch (convErr) {
        logger.warn('[batchGenerateAI] コンバージョン取得エラー（スキップ）', { error: convErr.message });
      }
    }

    return {
      ...baseMetrics,
      totalConversions,
      conversionBreakdown,
    };
  } catch (err) {
    logger.error('[batchGenerateAI] GA4メトリクス取得エラー', { error: err.message, propertyId });
    return null;
  }
}

/**
 * summary 形式の rawData を構築
 */
function buildRawDataForSummary(current, previous, siteData) {
  return {
    current: {
      metrics: {
        totalUsers: current.totalUsers,
        users: current.totalUsers,
        newUsers: current.newUsers,
        sessions: current.sessions,
        pageViews: current.pageViews,
        engagementRate: current.engagementRate,
        bounceRate: current.bounceRate,
      },
      totalConversions: current.totalConversions,
      conversionBreakdown: current.conversionBreakdown,
    },
    previousMonth: previous ? {
      metrics: {
        totalUsers: previous.totalUsers,
        users: previous.totalUsers,
        sessions: previous.sessions,
        engagementRate: previous.engagementRate,
      },
      totalConversions: previous.totalConversions,
    } : null,
    yearAgo: null,
    monthlyTrend: [],
    hasConversionEvents: (siteData.conversionEvents || []).length > 0,
    conversionEventNames: (siteData.conversionEvents || []).map(e => e.eventName).filter(Boolean),
  };
}

/**
 * rawData から summary 用 metrics に変換（generateAISummary.js の formatRawDataToMetrics と同じロジック）
 */
function formatSummaryMetrics(rawData) {
  const summCurrent = rawData.current || {};
  const summPrev = rawData.previousMonth || null;
  const summMetrics = summCurrent.metrics || summCurrent;
  const summPrevMetrics = summPrev?.metrics || summPrev;
  const currentTotalConv = summCurrent.totalConversions ?? summMetrics.conversions ?? 0;
  const prevTotalConv = summPrev?.totalConversions ?? summPrevMetrics?.conversions ?? 0;

  let summMonthOverMonth = null;
  if (summPrev && summPrevMetrics) {
    const currentUsers = summMetrics.users || summMetrics.totalUsers || 0;
    const prevUsers = summPrevMetrics.users || summPrevMetrics.totalUsers || 0;
    summMonthOverMonth = {
      users: {
        current: currentUsers,
        previous: prevUsers,
        change: prevUsers > 0 ? ((currentUsers - prevUsers) / prevUsers) * 100 : 0,
      },
      sessions: {
        current: summMetrics.sessions || 0,
        previous: summPrevMetrics.sessions || 0,
        change: summPrevMetrics.sessions > 0
          ? ((summMetrics.sessions || 0) - summPrevMetrics.sessions) / summPrevMetrics.sessions * 100
          : 0,
      },
      conversions: {
        current: currentTotalConv,
        previous: prevTotalConv,
        change: prevTotalConv > 0 ? ((currentTotalConv - prevTotalConv) / prevTotalConv) * 100 : 0,
      },
      engagementRate: {
        current: summMetrics.engagementRate || 0,
        previous: summPrevMetrics.engagementRate || 0,
        change: summPrevMetrics.engagementRate > 0
          ? ((summMetrics.engagementRate || 0) - summPrevMetrics.engagementRate) / summPrevMetrics.engagementRate * 100
          : 0,
      },
    };
  }

  return {
    users: summMetrics.users || summMetrics.totalUsers || 0,
    sessions: summMetrics.sessions || 0,
    pageViews: summMetrics.pageViews || summMetrics.screenPageViews || 0,
    conversions: currentTotalConv,
    engagementRate: summMetrics.engagementRate || 0,
    conversionRate: summMetrics.sessions > 0 ? currentTotalConv / summMetrics.sessions : 0,
    monthOverMonth: summMonthOverMonth,
    yearAgoData: null,
    monthlyData: rawData.monthlyTrend || [],
    hasConversionDefinitions: rawData.hasConversionEvents || false,
    conversionEventNames: rawData.conversionEventNames || [],
    conversionBreakdown: summCurrent.conversionBreakdown || null,
  };
}

/**
 * Gemini API を呼び出してAI分析を生成
 */
async function callGeminiAPI(apiKey, model, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `あなたはGoogle Analytics 4のデータ分析の専門家です。データを分析し、ビジネスインサイトを提供する日本語の要約を生成してください。\n\n${prompt}`,
          }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const rawSummary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawSummary || rawSummary.trim().length === 0) {
    return { summary: null, recommendations: [] };
  }

  // 推奨アクションを抽出（簡易版）
  const recommendations = extractSimpleRecommendations(rawSummary);
  const summary = removeActionSection(rawSummary);

  return { summary, recommendations };
}

/**
 * 簡易的な推奨アクション抽出
 */
function extractSimpleRecommendations(text) {
  const recommendations = [];
  // 「アクションプラン」や「推奨」セクション以降の箇条書きを抽出
  const actionMatch = text.match(/(?:アクションプラン|推奨アクション|今後の施策|改善提案)[：:]\s*([\s\S]*?)(?:\n\n|$)/i);
  if (actionMatch) {
    const lines = actionMatch[1].split('\n');
    for (const line of lines) {
      const cleaned = line.replace(/^[\s\-\*\d.・•]+/, '').trim();
      if (cleaned.length > 5 && cleaned.length < 200) {
        recommendations.push(cleaned);
      }
    }
  }
  return recommendations.slice(0, 5);
}

/**
 * アクションプランセクションを削除
 */
function removeActionSection(text) {
  return text
    .replace(/(?:アクションプラン|推奨アクション|今後の施策|改善提案)[：:][\s\S]*?(?:\n\n|$)/gi, '')
    .trim();
}
