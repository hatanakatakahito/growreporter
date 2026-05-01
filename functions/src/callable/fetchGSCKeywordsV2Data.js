/**
 * GSC 流入キーワード V2 データ取得 Callable
 *
 * 既存の fetchGSCData をベースに以下を追加:
 *  - 5 層 AI 分類（指名/純顕在/顕在/潜在/無関係）
 *  - 意味的クラスタリング + AI 命名
 *  - CV 貢献スコア（GA4 LP × CV を結合して KW 単位で推定）
 *  - CTR 損失検出（同順位帯の平均 CTR と比較）
 *  - 比較期間データ（オプション）
 *
 * キャッシュ戦略:
 *  - 全体結果: gsc-kw-v2:{siteId}:{startDate}:{endDate} / TTL 1h
 *  - AI 分類のみ: 別途 firestore に gscKeywordClassifyCache/{siteId}_{yyyymm}
 *    （月次 + オンデマンド再分類で更新。新月になったら自動的に新キャッシュへ）
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { getAndRefreshToken } from '../utils/tokenManager.js';
import { getCache, setCache, generateCacheKey } from '../utils/cacheManager.js';
import { canAccessSite } from '../utils/permissionHelper.js';
import {
  classifyKeywordsByLayer,
  clusterKeywords,
  FUNNEL_LAYERS,
  LAYER_LABELS_JA,
} from '../utils/keywordClassifier.js';

const CLASSIFY_CACHE_COLLECTION = 'gscKeywordClassifyCache';
// キャッシュバージョン: ロジック変更時にバンプして古いキャッシュを自動破棄
const CLASSIFY_CACHE_VERSION = 6;

/**
 * KW マッチング用の正規化:
 *  - 小文字化
 *  - 全種類のスペース（半角/全角/タブ）を除去
 *  - 前後の空白除去
 *
 * 例: "Grow Group" / "growgroup" / "GROWGROUP" / "Grow　Group" → すべて "growgroup" 扱い
 */
function normalizeForMatch(s) {
  if (s == null) return '';
  return String(s).toLowerCase().replace(/[\s　]+/g, '').trim();
}

/**
 * GSC の `page`（フル URL `https://example.com/path/?q=x`）と
 * GA4 `landingPagePlusQueryString`（パス `/path/?q=x`）の形式差を吸収するため、
 * 両方をパス + 末尾スラッシュ正規化に統一する。
 */
function toPagePathKey(input) {
  if (!input) return '';
  let s = String(input).trim();
  if (!s || s === '(not set)') return '';
  // フル URL ならパス部分のみ抽出
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s);
      s = u.pathname + (u.search || '');
    } catch {
      // URL parse 失敗時はそのまま
    }
  }
  // クエリ文字列を除去（KW × LP の集約は path のみで十分）
  const qIdx = s.indexOf('?');
  if (qIdx >= 0) s = s.slice(0, qIdx);
  // 末尾スラッシュ正規化
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  if (!s.startsWith('/')) s = '/' + s;
  return s;
}

export async function fetchGSCKeywordsV2DataCallable(request) {
  const db = getFirestore();
  const { siteId, startDate, endDate, comparisonRange, forceReclassify } = request.data || {};

  if (!siteId || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'siteId, startDate, endDate are required');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }
  const userId = request.auth.uid;

  console.log(`[fetchGSCKeywordsV2Data] Start: siteId=${siteId}, period=${startDate}-${endDate}, userId=${userId}`);

  try {
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) throw new HttpsError('not-found', 'サイトが見つかりません');
    const siteData = siteDoc.data();

    const hasAccess = await canAccessSite(userId, siteId);
    if (!hasAccess) throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
    if (!siteData.gscSiteUrl || !siteData.gscOauthTokenId) {
      throw new HttpsError('failed-precondition', 'Search Consoleの設定が完了していません');
    }

    const compStart = comparisonRange?.startDate;
    const compEnd = comparisonRange?.endDate;
    const isComparing = !!(compStart && compEnd);

    // 1. 全体結果のキャッシュチェック
    const cacheKey = generateCacheKey(
      'gsc-kw-v2',
      siteId,
      startDate,
      endDate,
      isComparing ? `${compStart}_${compEnd}` : 'none'
    );
    if (!forceReclassify) {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log(`[fetchGSCKeywordsV2Data] Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    // 2. OAuth トークン
    const tokenOwnerId = siteData.gscTokenOwner || siteData.userId;
    const { oauth2Client: gscAuth } = await getAndRefreshToken(tokenOwnerId, siteData.gscOauthTokenId);

    const searchConsole = google.searchconsole('v1');

    // 3. GSC 並列クエリ（当期は必須、比較期間は失敗してもフェイルセーフで null を返す）
    const safeGscQuery = (requestBody, label) =>
      searchConsole.searchanalytics
        .query({ auth: gscAuth, siteUrl: siteData.gscSiteUrl, requestBody })
        .catch((e) => {
          console.warn(`[fetchGSCKeywordsV2Data] GSC ${label} query failed:`, e?.message || e);
          return { data: { rows: [] } };
        });

    const gscPromises = [
      // 当期 KW（失敗時 throw して関数全体エラー — これは必須）
      searchConsole.searchanalytics.query({
        auth: gscAuth,
        siteUrl: siteData.gscSiteUrl,
        requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 25000 },
      }),
      // 当期 query × page（失敗時は空配列で続行）
      safeGscQuery({ startDate, endDate, dimensions: ['query', 'page'], rowLimit: 25000 }, 'queryPage'),
    ];
    if (isComparing) {
      // 比較期間（失敗時は空配列で続行 — 当期データが取れていれば 前期比 = null になるだけ）
      gscPromises.push(
        safeGscQuery(
          { startDate: compStart, endDate: compEnd, dimensions: ['query'], rowLimit: 25000 },
          'comparison'
        )
      );
    }

    // 4. GA4 ページ別 CV 取得（CV 貢献スコア用、GA4 連携時のみ）
    const ga4Enabled = !!(siteData.ga4PropertyId && siteData.ga4OauthTokenId);
    let ga4LpCvMap = {}; // { [page]: cvCount }
    let ga4LpSessionsMap = {}; // { [page]: sessions }
    if (ga4Enabled) {
      try {
        const tokenIdGA4 = siteData.ga4OauthTokenId;
        const ga4OwnerId = siteData.ga4TokenOwner || siteData.userId;
        const { oauth2Client: ga4Auth } = await getAndRefreshToken(ga4OwnerId, tokenIdGA4);
        const analyticsData = google.analyticsdata('v1beta');
        const propertyId = `properties/${siteData.ga4PropertyId}`;
        const conversionEventNames = (siteData.conversionEvents || []).map((e) => e.eventName);

        const ga4Promises = [
          // LP × sessions
          analyticsData.properties.runReport({
            auth: ga4Auth,
            property: propertyId,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'landingPagePlusQueryString' }],
              metrics: [{ name: 'sessions' }],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              limit: 2000,
            },
          }),
          // LP × CV イベント別 eventCount
          conversionEventNames.length > 0
            ? analyticsData.properties.runReport({
                auth: ga4Auth,
                property: propertyId,
                requestBody: {
                  dateRanges: [{ startDate, endDate }],
                  dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'eventName' }],
                  metrics: [{ name: 'eventCount' }],
                  dimensionFilter: {
                    filter: {
                      fieldName: 'eventName',
                      inListFilter: { values: conversionEventNames },
                    },
                  },
                  limit: 2000,
                },
              })
            : Promise.resolve({ data: { rows: [] } }),
        ];

        const [lpSessionsRes, lpCvRes] = await Promise.all(ga4Promises);
        (lpSessionsRes.data?.rows || []).forEach((row) => {
          const key = toPagePathKey(row.dimensionValues?.[0]?.value || '');
          const sessions = parseInt(row.metricValues?.[0]?.value || 0, 10);
          if (key) ga4LpSessionsMap[key] = (ga4LpSessionsMap[key] || 0) + sessions;
        });
        (lpCvRes.data?.rows || []).forEach((row) => {
          const key = toPagePathKey(row.dimensionValues?.[0]?.value || '');
          const cv = parseInt(row.metricValues?.[0]?.value || 0, 10);
          if (key) ga4LpCvMap[key] = (ga4LpCvMap[key] || 0) + cv;
        });
        const totalGa4Cv = Object.values(ga4LpCvMap).reduce((a, b) => a + b, 0);
        console.log(`[fetchGSCKeywordsV2Data] GA4 fetched: ${Object.keys(ga4LpSessionsMap).length} LP sessions, ${Object.keys(ga4LpCvMap).length} LP CV pages, total CV = ${totalGa4Cv}`);
      } catch (e) {
        console.warn('[fetchGSCKeywordsV2Data] GA4 fetch failed (non-fatal):', e.message);
      }
    }

    // 5. GSC レスポンス整形
    const [topQueriesRes, queryPageRes, compQueriesRes] = await Promise.all(gscPromises);

    const queryPagesMap = {}; // { [query]: [{ page, clicks, impressions, ctr, position }] }
    (queryPageRes.data?.rows || []).forEach((row) => {
      const query = row.keys[0];
      const page = row.keys[1];
      if (!queryPagesMap[query]) queryPagesMap[query] = [];
      queryPagesMap[query].push({
        page,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      });
    });
    Object.keys(queryPagesMap).forEach((q) => {
      queryPagesMap[q].sort((a, b) => b.clicks - a.clicks);
      queryPagesMap[q] = queryPagesMap[q].slice(0, 5);
    });

    const allKeywords = (topQueriesRes.data?.rows || [])
      .filter((row) => row?.keys?.[0])
      .map((row) => ({
        query: row.keys[0],
        clicks: Number(row.clicks) || 0,
        impressions: Number(row.impressions) || 0,
        ctr: Number(row.ctr) || 0,
        position: Number(row.position) || 0,
      }))
      .sort((a, b) => b.impressions - a.impressions);

    // 比較期間 KW（query → metrics 引き当て用）
    const compKeywordMap = {};
    (compQueriesRes?.data?.rows || []).forEach((row) => {
      compKeywordMap[row.keys[0]] = {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      };
    });

    // 6. AI 分類のキャッシュ確認 + 必要なら生成（月次キー）
    const yyyymm = startDate.slice(0, 7).replace('-', ''); // 例: '202604'
    const classifyCacheRef = db.collection(CLASSIFY_CACHE_COLLECTION).doc(`${siteId}_${yyyymm}`);
    let layerByQuery = {}; // { [query]: layer }
    let clusterData = null; // { clusters, kwClusterMap (1-indexed query indices) }
    let classifyFromCache = false;

    if (!forceReclassify) {
      const classifyCacheDoc = await classifyCacheRef.get();
      if (classifyCacheDoc.exists) {
        const cached = classifyCacheDoc.data();
        const cachedVersion = cached.version || 0;
        const cachedTotal = cached.targetCount || Object.keys(cached.layerByQuery || {}).length || 0;
        const cachedClassified = cached.classifiedCount || 0;
        // 信頼性チェック:
        // (1) version が古い → ロジック更新があったので破棄
        // (2) classifiedCount が targetCount の 50% 未満 → 部分失敗で破棄
        // (3) noise > 90% → AI が機能していなかった可能性で破棄
        // (4) layerByQuery のサイズが少なすぎる（< 100）→ 古い 1500 件制限版の可能性で破棄
        let trustworthy = true;
        let reason = '';
        if (cachedVersion < CLASSIFY_CACHE_VERSION) {
          trustworthy = false;
          reason = `version mismatch (cached=${cachedVersion} < current=${CLASSIFY_CACHE_VERSION})`;
        } else if (cachedTotal > 0 && cachedClassified > 0 && cachedClassified < Math.floor(cachedTotal * 0.5)) {
          trustworthy = false;
          reason = `low quality (${cachedClassified}/${cachedTotal})`;
        } else if (Object.keys(cached.layerByQuery || {}).length < 100 && allKeywords.length > 200) {
          // 全 KW が 200+ あるのに分類済みが 100 未満 → 古い不完全キャッシュ
          trustworthy = false;
          reason = `cached size too small (${Object.keys(cached.layerByQuery || {}).length}) vs total ${allKeywords.length}`;
        } else if (cached.layerByQuery) {
          const dist = { branded: 0, pureIntent: 0, intent: 0, latent: 0, noise: 0 };
          Object.values(cached.layerByQuery).forEach((l) => { if (dist[l] != null) dist[l]++; });
          const total = Object.values(dist).reduce((a, b) => a + b, 0);
          if (total >= 10 && dist.noise / total > 0.9) {
            trustworthy = false;
            reason = `noise-heavy (${Math.round(dist.noise / total * 100)}%)`;
          }
        }
        if (!trustworthy) {
          console.warn(`[fetchGSCKeywordsV2Data] cached classify discarded: ${reason}`);
        }
        if (trustworthy && cached.layerByQuery) {
          layerByQuery = cached.layerByQuery;
          if (cached.clusterData) clusterData = cached.clusterData;
          classifyFromCache = true;
          console.log(`[fetchGSCKeywordsV2Data] AI classify cache hit: ${siteId}_${yyyymm} (v${cachedVersion}, ${cachedClassified}/${cachedTotal})`);
        }
      }
    }

    if (!classifyFromCache || forceReclassify) {
      // 大文字小文字 + スペース有無を吸収して正規化（重複も除去）
      const brandKeywordsNorm = Array.from(
        new Set(
          (siteData.brandKeywords || []).map(normalizeForMatch).filter(Boolean)
        )
      );
      const excludeKeywordsNorm = Array.from(
        new Set(
          (siteData.excludeKeywords || []).map(normalizeForMatch).filter(Boolean)
        )
      );
      console.log(
        `[fetchGSCKeywordsV2Data] brand keywords (normalized): ${brandKeywordsNorm.length} entries: ` +
        JSON.stringify(brandKeywordsNorm.slice(0, 10))
      );
      console.log(
        `[fetchGSCKeywordsV2Data] exclude keywords (normalized): ${excludeKeywordsNorm.length} entries: ` +
        JSON.stringify(excludeKeywordsNorm.slice(0, 10))
      );
      const siteContext = {
        siteName: siteData.name || siteData.siteName,
        industry: siteData.industry,
        siteType: siteData.siteType,
        sitePurpose: siteData.sitePurpose,
        brandKeywords: siteData.brandKeywords || [],
        excludeKeywords: siteData.excludeKeywords || [],
      };

      // 除外語を含む KW は AI 呼び出し前に強制的に noise に振り分け（コスト削減 + ユーザー意図反映）
      // クエリ側も正規化して比較（大文字小文字・スペース有無を無視）
      const isExcluded = (q) => {
        if (!excludeKeywordsNorm.length) return false;
        const ql = normalizeForMatch(q);
        return excludeKeywordsNorm.some((ex) => ql.includes(ex));
      };
      // ブランド語を含む KW は AI 呼び出し前に強制的に branded に振り分け（誤分類防止）
      const isBranded = (q) => {
        if (!brandKeywordsNorm.length) return false;
        const ql = normalizeForMatch(q);
        return brandKeywordsNorm.some((bk) => ql.includes(bk));
      };

      // 5 層分類対象: 全 KW を完全カバレッジで AI 分類（並列バッチ処理）
      // - 1 表示 / 0 クリックの超長尾も含めて全件処理（B 案: 完全対応）
      // - cap 8000 件で安全マージン（Gemini レート制限 + Cloud Function timeout 対策）
      const HARD_CAP = 8000;
      const targetForClassify = [];
      let preClassifiedNoise = 0;
      let preClassifiedBranded = 0;
      for (const kw of allKeywords) {
        // 除外語/ブランド語は AI に渡さず先行振り分け（コスト削減 + 確実性）
        if (isExcluded(kw.query)) {
          layerByQuery[kw.query] = 'noise';
          preClassifiedNoise++;
          continue;
        }
        if (isBranded(kw.query)) {
          layerByQuery[kw.query] = 'branded';
          preClassifiedBranded++;
          continue;
        }
        targetForClassify.push(kw);
        if (targetForClassify.length >= HARD_CAP) break;
      }
      console.log(
        `[fetchGSCKeywordsV2Data] classify target: ${targetForClassify.length} KW for AI ` +
        `(preClassified: ${preClassifiedBranded} branded + ${preClassifiedNoise} noise) ` +
        `out of ${allKeywords.length} total`
      );

      // 5 層分類
      const layers = await classifyKeywordsByLayer(targetForClassify, siteContext);
      const successfulCount = Array.isArray(layers) ? layers.filter((l) => l && l !== 'unknown').length : 0;
      console.log(`[fetchGSCKeywordsV2Data] classify result: ${successfulCount}/${targetForClassify.length} classified`);

      if (Array.isArray(layers) && successfulCount > 0) {
        targetForClassify.forEach((kw, i) => {
          const layer = layers[i];
          if (layer && layer !== 'unknown') {
            layerByQuery[kw.query] = layer;
          }
          // unknown / null はマップに入れず、後段で 'noise' フォールバック（per-KW 単位で次回再試行を期待）
        });
      } else {
        console.warn('[fetchGSCKeywordsV2Data] classify failed completely, NOT caching to allow retry next time');
      }

      // クラスタリング（上位 200 KW）
      clusterData = await clusterKeywords(allKeywords, siteContext, { topN: 200, targetClusters: 6 });

      // キャッシュ保存（成功した分類数が targetForClassify の 50% 以上のときのみ保存。失敗時は再試行可能に）
      const shouldSaveCache = successfulCount >= Math.floor(targetForClassify.length * 0.5);
      if (shouldSaveCache) {
        try {
          await classifyCacheRef.set({
            siteId,
            yyyymm,
            version: CLASSIFY_CACHE_VERSION,
            layerByQuery,
            clusterData,
            classifiedCount: successfulCount,
            targetCount: targetForClassify.length,
            classifiedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[fetchGSCKeywordsV2Data] AI classify cache saved (v${CLASSIFY_CACHE_VERSION}): ${siteId}_${yyyymm} (${successfulCount} KW)`);
        } catch (e) {
          console.warn('[fetchGSCKeywordsV2Data] classify cache save failed:', e.message);
        }
      } else {
        console.warn(`[fetchGSCKeywordsV2Data] classify success rate too low (${successfulCount}/${targetForClassify.length}) — skipping cache save`);
      }
    }

    // 7. KW ごとの Enrichment（CV 貢献・CTR 損失・layer・clusterId）
    // CTR 損失の閾値計算: 順位帯ごとの平均 CTR
    const positionBuckets = {}; // { '1-3': { sumCtr, count }, '4-10': {...}, ... }
    const bucketOf = (pos) => {
      if (pos <= 3) return '1-3';
      if (pos <= 10) return '4-10';
      if (pos <= 20) return '11-20';
      if (pos <= 30) return '21-30';
      return '31+';
    };
    allKeywords.forEach((k) => {
      const b = bucketOf(k.position);
      if (!positionBuckets[b]) positionBuckets[b] = { sumCtr: 0, count: 0 };
      positionBuckets[b].sumCtr += k.ctr;
      positionBuckets[b].count += 1;
    });
    const avgCtrByBucket = {};
    Object.entries(positionBuckets).forEach(([b, v]) => {
      avgCtrByBucket[b] = v.count > 0 ? v.sumCtr / v.count : 0;
    });

    const kwClusterIdByOriginalIdx = {};
    if (clusterData?.clusters) {
      clusterData.clusters.forEach((cluster) => {
        cluster.keywordIndices?.forEach((idx) => {
          kwClusterIdByOriginalIdx[idx] = cluster.id;
        });
      });
    }

    const enrichedKeywords = allKeywords.map((kw, idx) => {
      const layer = layerByQuery[kw.query] || 'noise';
      const clusterId = kwClusterIdByOriginalIdx[idx] || null;
      const topPage = queryPagesMap[kw.query]?.[0]?.page || null;
      const topPageKey = toPagePathKey(topPage);

      // CV 貢献: KW のクリック ÷ 該当 LP のセッション × LP の CV 数
      let estimatedCV = 0;
      if (topPageKey && ga4LpCvMap[topPageKey] && ga4LpSessionsMap[topPageKey]) {
        const lpCv = ga4LpCvMap[topPageKey];
        const lpSessions = ga4LpSessionsMap[topPageKey];
        if (lpSessions > 0) {
          estimatedCV = Math.round((kw.clicks / lpSessions) * lpCv);
        }
      }

      // CTR 損失検出
      const bucket = bucketOf(kw.position);
      const avgCtr = avgCtrByBucket[bucket] || 0;
      const ctrLossDelta = (kw.ctr - avgCtr) * 100; // pt
      const ctrLossFlag = avgCtr > 0 && ctrLossDelta < -1.0 && kw.impressions >= 100;
      const potentialClicks = ctrLossFlag ? Math.round(kw.impressions * (avgCtr - kw.ctr)) : 0;

      // 前期比
      const prev = compKeywordMap[kw.query];
      const change = prev && prev.clicks > 0
        ? (kw.clicks - prev.clicks) / prev.clicks
        : null;

      return {
        query: kw.query,
        clicks: kw.clicks,
        impressions: kw.impressions,
        ctr: kw.ctr,
        position: kw.position,
        topPage,
        layer,
        clusterId,
        estimatedCV,
        ctrLossFlag,
        ctrLossDelta: Number(ctrLossDelta.toFixed(2)),
        potentialClicks,
        change,
      };
    });

    // 8. ファネル構造化（5 層集計）
    const funnel = {};
    FUNNEL_LAYERS.forEach((layer) => {
      const items = enrichedKeywords.filter((k) => k.layer === layer);
      const totalClicks = items.reduce((s, k) => s + k.clicks, 0);
      const totalImpressions = items.reduce((s, k) => s + k.impressions, 0);
      const totalCV = items.reduce((s, k) => s + k.estimatedCV, 0);
      const avgPosition = items.length
        ? items.reduce((s, k) => s + k.position * k.impressions, 0) / Math.max(totalImpressions, 1)
        : 0;
      const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const cvRate = totalClicks > 0 ? (totalCV / totalClicks) * 100 : 0;

      // 前期比
      const prevTotalClicks = items.reduce((s, k) => {
        const prev = compKeywordMap[k.query];
        return s + (prev?.clicks || 0);
      }, 0);
      const change = prevTotalClicks > 0 ? (totalClicks - prevTotalClicks) / prevTotalClicks : null;

      funnel[layer] = {
        layerKey: layer,
        labelJa: LAYER_LABELS_JA[layer],
        count: items.length,
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: Number((avgCTR * 100).toFixed(2)),
        avgPosition: Number(avgPosition.toFixed(1)),
        estimatedCV: totalCV,
        cvRate: Number(cvRate.toFixed(2)),
        topKeywords: [...items].sort((a, b) => b.clicks - a.clicks).slice(0, 3).map((k) => k.query),
        change,
      };
    });

    // 9. クラスタ enrich（実 KW を引き当て、合計クリック等を付与）
    let enrichedClusters = [];
    if (clusterData?.clusters) {
      enrichedClusters = clusterData.clusters.map((c) => {
        const memberKws = c.keywordIndices.map((idx) => allKeywords[idx]).filter(Boolean);
        const totalClicks = memberKws.reduce((s, k) => s + k.clicks, 0);
        const totalImpressions = memberKws.reduce((s, k) => s + k.impressions, 0);
        return {
          id: c.id,
          name: c.name,
          centerKeyword: allKeywords[c.centerIndex]?.query || memberKws[0]?.query,
          keywordCount: memberKws.length,
          clicks: totalClicks,
          impressions: totalImpressions,
        };
      });
    }

    // 10. KPI サマリー
    const totalClicks = enrichedKeywords.reduce((s, k) => s + k.clicks, 0);
    const totalImpressions = enrichedKeywords.reduce((s, k) => s + k.impressions, 0);
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = totalImpressions > 0
      ? enrichedKeywords.reduce((s, k) => s + k.position * k.impressions, 0) / totalImpressions
      : 0;
    const totalEstimatedCV = enrichedKeywords.reduce((s, k) => s + k.estimatedCV, 0);

    // 比較期間サマリー
    let compMetrics = null;
    if (isComparing) {
      const compTotal = Object.values(compKeywordMap).reduce(
        (acc, v) => {
          acc.clicks += v.clicks;
          acc.impressions += v.impressions;
          return acc;
        },
        { clicks: 0, impressions: 0 }
      );
      compMetrics = {
        totalClicks: compTotal.clicks,
        totalImpressions: compTotal.impressions,
        keywordCount: Object.keys(compKeywordMap).length,
      };
    }

    // Firestore 単一ドキュメント 1MB 制限 + フロント描画上限を考慮し
    // 上位 3000 件を返却。各 KW のサイズ ≈ 200B → 約 600KB に収まる
    // queryPagesMap はフロントで未使用かつサイズ大（5547 × 5 page = 1.5MB）なので返却しない
    const KEYWORDS_LIMIT = 3000;
    const sortedEnriched = [...enrichedKeywords].sort((a, b) => b.impressions - a.impressions);
    const limitedKeywords = sortedEnriched.slice(0, KEYWORDS_LIMIT);

    // AI 分類で実際に層判定された KW 数（全 enrichedKeywords ベース）
    const aiClassifiedCount = enrichedKeywords.filter((k) =>
      ['branded', 'pureIntent', 'intent', 'latent', 'noise'].includes(k.layer) && layerByQuery[k.query]
    ).length;

    const result = {
      metrics: {
        totalClicks,
        totalImpressions,
        avgCTR: Number((avgCTR * 100).toFixed(2)),
        avgPosition: Number(avgPosition.toFixed(1)),
        keywordCount: enrichedKeywords.length, // 全件カウント
        keywordCountReturned: limitedKeywords.length,
        aiClassifiedCount, // AI / 事前ルールで層判定された KW 数
        estimatedCV: totalEstimatedCV,
      },
      funnel,
      clusters: enrichedClusters,
      keywords: limitedKeywords, // 上位 3000 件のみ
      comparisonMetrics: compMetrics,
      gscEnabled: true,
      ga4Enabled,
      classifyFromCache,
      classifiedYearMonth: yyyymm,
      period: { startDate, endDate },
      comparisonPeriod: isComparing ? { startDate: compStart, endDate: compEnd } : null,
      fetchedAt: new Date().toISOString(),
      source: 'api',
    };

    await setCache(cacheKey, result, siteId, userId);
    console.log(
      `[fetchGSCKeywordsV2Data] Success: ${enrichedKeywords.length} KW, ${enrichedClusters.length} clusters`
    );
    return result;
  } catch (error) {
    console.error('[fetchGSCKeywordsV2Data] Error:', error);
    try {
      await db.collection('error_logs').add({
        type: 'gsc_keywords_v2_error',
        siteId,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch { /* noop */ }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'KW V2 データ取得に失敗しました: ' + error.message);
  }
}
