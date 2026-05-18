/**
 * lively-aggregating-bobcat: 業界平均ベンチマーク集計バッチ
 *
 * 毎月1日 02:00 JST に実行。
 * 1. 全 active な serviceTokens を取得
 * 2. 各トークンで GA4/GSC API を巡回 → benchmarkSourceSites を upsert
 * 3. 業種未判定ドメインに inferTaxonomyFromUrl 実行
 * 4. 全アクティブドメインの直近30日メトリクスを取得
 * 5. 異常値フィルタ
 * 6. 業種×役割×BMで集計
 * 7. industryBenchmarks に書き込み
 * 8. 24ヶ月超の古いドキュメント削除
 * 9. benchmarkBatchLogs に統計記録
 *
 * 設計: lively-aggregating-bobcat.md v1.5 セクション「scheduled function」
 */

import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { createOAuth2Client } from '../utils/benchmarkOAuthHelpers.js';
import { applyAnomalyFilter } from '../utils/anomalyFilter.js';
import { aggregateByIndustryRoleBM } from '../utils/benchmarkAggregationHelper.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

const CONCURRENCY = 5;
const RECENT_DAYS = 30;

/**
 * メイン実行ハンドラ
 * @param {object} event - scheduled trigger event
 * @returns {Promise<{ period, ... }>}
 */
export async function benchmarkAggregatorHandler(event) {
  const startTime = Date.now();
  const period = formatPeriod(yesterday()); // 'YYYY-MM' (前月)
  const db = getFirestore();

  logger.info('[benchmarkAggregator] 開始', { period });

  // Feature flag チェック（緊急停止用）
  const aggregationEnabled = await isFeatureEnabled('benchmarkAggregation');
  if (!aggregationEnabled) {
    logger.warn('[benchmarkAggregator] Feature flag OFF, skipping');
    return { period, status: 'skipped' };
  }

  const stats = {
    period,
    startedAt: new Date().toISOString(),
    sourceTokensActive: 0,
    sourceTokensFailed: 0,
    totalDomainsBefore: 0,
    newDomainsThisMonth: 0,
    classifiedThisRun: 0,
    classificationFailures: 0,
    metricsActive: 0,
    metricsExcluded: 0,
    exclusionBreakdown: {},
    benchmarksWritten: 0,
    benchmarksDeleted: 0,
    durationSeconds: 0,
    errors: [],
  };

  try {
    // ── Step 1: active な全 serviceTokens を取得
    const tokensSnap = await db.collection('serviceTokens')
      .where('status', '==', 'active').get();

    if (tokensSnap.empty) {
      logger.warn('[benchmarkAggregator] active なトークンが0件、終了');
      stats.errors.push('no_active_tokens');
      stats.durationSeconds = (Date.now() - startTime) / 1000;
      await writeBatchLog(db, period, stats);
      return stats;
    }

    const tokens = tokensSnap.docs
      .map((d) => ({
        email: d.id,
        refreshToken: d.data().refresh_token,
        ref: d.ref,
      }))
      .filter((t) => t.email && t.refreshToken); // 不完全なトークンは除外
    stats.sourceTokensActive = tokens.length;

    if (tokens.length === 0) {
      logger.warn('[benchmarkAggregator] 有効なトークンがありません（refresh_token 欠落？）', {
        rawCount: tokensSnap.size,
      });
      stats.errors.push('no_valid_tokens');
      stats.durationSeconds = (Date.now() - startTime) / 1000;
      await writeBatchLog(db, period, stats);
      return stats;
    }

    // ── Step 2: 各トークンから property/site 一覧取得 → benchmarkSourceSites 上書き
    const enumeratedRows = [];
    for (const token of tokens) {
      try {
        const result = await enumerateAccountSites(token);
        enumeratedRows.push(...result.rows);
        // トークン側の lastUsedAt 更新と統計記録
        await token.ref.update({
          lastUsedAt: FieldValue.serverTimestamp(),
          consecutiveFailures: 0,
          lastFailedAt: null,
          failureReason: null,
          lastBatchStats: {
            period,
            ga4PropertiesFound: result.ga4Count,
            gscSitesFound: result.gscCount,
            durationSeconds: Math.round(result.durationMs / 1000),
          },
        });
      } catch (err) {
        logger.error('[benchmarkAggregator] アカウント列挙失敗', {
          email: token.email,
          error: err.message,
        });
        stats.sourceTokensFailed++;
        stats.errors.push(`enum_failed: ${token.email}`);
        await token.ref.update({
          lastFailedAt: FieldValue.serverTimestamp(),
          failureReason: err.message?.slice(0, 500),
          consecutiveFailures: FieldValue.increment(1),
        });
      }
    }

    // ドメイン別にマージ（複数アカウントから見えるドメインは accessibleVia を統合）
    const merged = mergeDomainRows(enumeratedRows);
    stats.totalDomainsBefore = merged.length;

    // ── Step 3: benchmarkSourceSites に upsert（既存業種判定は維持、新規ドメインは optedOut: false で投入）
    const newDomains = await upsertBenchmarkSourceSites(db, merged, period);
    stats.newDomainsThisMonth = newDomains.length;

    // ── Step 4: 業種未判定ドメインに inferTaxonomyFromUrl 実行
    const classifyResult = await classifyUnclassifiedDomains(db, newDomains);
    stats.classifiedThisRun = classifyResult.success;
    stats.classificationFailures = classifyResult.failed;

    // ── Step 5: 全 active ドメインの直近30日メトリクスを取得
    // optedOut=false かつ excludedFromBenchmark=false かつ taxonomy.confidence !== 'failed' のもの
    const targetsSnap = await db.collection('benchmarkSourceSites')
      .where('optedOut', '==', false)
      .where('excludedFromBenchmark', '==', false)
      .get();
    const targets = targetsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((t) => t.taxonomy && t.taxonomy.confidence !== 'failed');

    const tokenByEmail = new Map(tokens.map((t) => [t.email, t]));
    const metricsRows = await fetchAllMetrics(targets, tokenByEmail);

    // ── Step 6: 異常値フィルタ
    const filterResult = applyAnomalyFilter(metricsRows.map((r) => ({
      domain: r.domain,
      taxonomy: r.taxonomy,
      metrics: r.metrics,
    })));
    stats.metricsActive = filterResult.kept.length;
    stats.metricsExcluded = filterResult.excluded.length;
    stats.exclusionBreakdown = filterResult.breakdown;

    // ── Step 7: 業種×役割×BMで集計
    const benchmarkDocs = aggregateByIndustryRoleBM(filterResult.kept, period);

    // ── Step 8: industryBenchmarks に書き込み
    let writeBatch = db.batch();
    let batchOps = 0;
    for (const doc of benchmarkDocs) {
      writeBatch.set(db.collection('industryBenchmarks').doc(doc.docId), {
        ...doc,
        computedAt: FieldValue.serverTimestamp(),
      });
      batchOps++;
      if (batchOps >= 400) {
        await writeBatch.commit();
        writeBatch = db.batch();
        batchOps = 0;
      }
    }
    if (batchOps > 0) await writeBatch.commit();
    stats.benchmarksWritten = benchmarkDocs.length;

    // ── Step 9: 24ヶ月超の古いドキュメントを削除
    const cutoffPeriod = subtractMonths(period, 24);
    const oldDocsSnap = await db.collection('industryBenchmarks')
      .where('period', '<', cutoffPeriod).get();
    if (!oldDocsSnap.empty) {
      let deleteBatch = db.batch();
      let deleteOps = 0;
      for (const oldDoc of oldDocsSnap.docs) {
        deleteBatch.delete(oldDoc.ref);
        deleteOps++;
        if (deleteOps >= 400) {
          await deleteBatch.commit();
          deleteBatch = db.batch();
          deleteOps = 0;
        }
      }
      if (deleteOps > 0) await deleteBatch.commit();
      stats.benchmarksDeleted = oldDocsSnap.size;
    }
  } catch (err) {
    logger.error('[benchmarkAggregator] 致命的エラー', { error: err.message, stack: err.stack });
    stats.errors.push(`fatal: ${err.message}`);
  }

  stats.durationSeconds = (Date.now() - startTime) / 1000;
  await writeBatchLog(db, period, stats);
  logger.info('[benchmarkAggregator] 完了', stats);
  return stats;
}

// ============================================================================
// Helpers
// ============================================================================

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

function formatPeriod(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function subtractMonths(periodStr, months) {
  const [y, m] = periodStr.split('-').map(Number);
  const d = new Date(y, m - 1 - months, 1);
  return formatPeriod(d);
}

function getDateRange(days) {
  const end = new Date();
  const start = new Date(Date.now() - days * 86400000);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

function extractDomain(url) {
  if (!url) return '';
  let s = String(url).trim();
  if (s.startsWith('sc-domain:')) {
    return s.replace('sc-domain:', '').toLowerCase().replace(/^www\./, '');
  }
  if (!s.startsWith('http')) s = `https://${s}`;
  try {
    return new URL(s).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return s.toLowerCase();
  }
}

/**
 * 1 アカウント分の GA4 properties + GSC sites を列挙
 */
async function enumerateAccountSites(token) {
  const startedAt = Date.now();
  const oauth = createOAuth2Client('');
  oauth.setCredentials({ refresh_token: token.refreshToken });

  const rows = [];
  let ga4Count = 0;
  let gscCount = 0;

  // GA4 Admin: account summaries → properties → web stream URLs
  try {
    const admin = google.analyticsadmin({ version: 'v1beta', auth: oauth });
    const accSummariesRes = await admin.accountSummaries.list({ pageSize: 200 });
    const props = [];
    for (const acc of accSummariesRes.data.accountSummaries || []) {
      for (const prop of acc.propertySummaries || []) {
        const propertyId = (prop.property || '').replace('properties/', '');
        if (!propertyId) continue;
        props.push({
          propertyId,
          propertyName: prop.displayName || '',
          accountName: acc.displayName || '',
        });
      }
    }
    ga4Count = props.length;

    // 各プロパティの web stream を取得（並列）
    const enriched = await Promise.allSettled(props.map(async (p) => {
      const streamsRes = await admin.properties.dataStreams.list({
        parent: `properties/${p.propertyId}`, pageSize: 50,
      });
      const webStream = (streamsRes.data.dataStreams || []).find((s) => s.type === 'WEB_DATA_STREAM');
      const siteUrl = webStream?.webStreamData?.defaultUri || '';
      return { ...p, siteUrl };
    }));
    for (const r of enriched) {
      if (r.status !== 'fulfilled') continue;
      const p = r.value;
      const domain = extractDomain(p.siteUrl);
      if (!domain) continue;
      rows.push({
        domain,
        ga4PropertyId: p.propertyId,
        siteUrl: p.siteUrl,
        accessibleVia: token.email,
        source: 'ga4',
      });
    }
  } catch (err) {
    logger.warn('[enumerateAccountSites] GA4 失敗', { email: token.email, error: err.message });
  }

  // GSC sites
  try {
    const sc = google.searchconsole({ version: 'v1', auth: oauth });
    const sitesRes = await sc.sites.list();
    const sites = sitesRes.data.siteEntry || [];
    gscCount = sites.length;
    for (const s of sites) {
      const domain = extractDomain(s.siteUrl);
      if (!domain) continue;
      rows.push({
        domain,
        gscSiteUrl: s.siteUrl,
        accessibleVia: token.email,
        source: 'gsc',
        gscPermissionLevel: s.permissionLevel,
      });
    }
  } catch (err) {
    logger.warn('[enumerateAccountSites] GSC 失敗', { email: token.email, error: err.message });
  }

  return { rows, ga4Count, gscCount, durationMs: Date.now() - startedAt };
}

/**
 * 同一ドメインの行をマージ
 */
function mergeDomainRows(rows) {
  const map = new Map();
  for (const row of rows) {
    // domain が空文字 or undefined のものは除外（extractDomain 失敗）
    if (!row.domain || typeof row.domain !== 'string') continue;
    if (!map.has(row.domain)) {
      map.set(row.domain, {
        domain: row.domain,
        ga4PropertyIds: [],
        gscSiteUrls: [],
        accessibleVia: new Set(),
      });
    }
    const m = map.get(row.domain);
    if (row.ga4PropertyId) m.ga4PropertyIds.push(row.ga4PropertyId);
    if (row.gscSiteUrl) m.gscSiteUrls.push(row.gscSiteUrl);
    if (row.accessibleVia) m.accessibleVia.add(row.accessibleVia);
  }
  return [...map.values()].map((m) => ({
    ...m,
    ga4PropertyIds: [...new Set(m.ga4PropertyIds)],
    gscSiteUrls: [...new Set(m.gscSiteUrls)],
    accessibleVia: [...m.accessibleVia],
  }));
}

/**
 * benchmarkSourceSites に upsert、新規ドメインを返却
 */
async function upsertBenchmarkSourceSites(db, mergedDomains, period) {
  const newDomains = [];
  let batch = db.batch();
  let ops = 0;

  for (const d of mergedDomains) {
    const ref = db.collection('benchmarkSourceSites').doc(d.domain);
    const existing = await ref.get();
    if (existing.exists) {
      // 既存ドキュメント: アクセス可能アカウント等を更新、taxonomy は維持
      batch.update(ref, {
        ga4PropertyIds: d.ga4PropertyIds,
        gscSiteUrls: d.gscSiteUrls,
        accessibleVia: d.accessibleVia,
        lastSeenAt: FieldValue.serverTimestamp(),
      });
    } else {
      // 新規
      batch.set(ref, {
        domain: d.domain,
        ga4PropertyIds: d.ga4PropertyIds,
        gscSiteUrls: d.gscSiteUrls,
        accessibleVia: d.accessibleVia,
        taxonomy: null,
        firstSeenAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
        excludedFromBenchmark: false,
        excludeReason: null,
        optedOut: false,
        optedOutAt: null,
        optedOutReason: null,
        optedOutBy: null,
        classificationFailureCount: 0,
        metricsFailureCount: 0,
      });
      newDomains.push(d.domain);
    }
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  return newDomains;
}

/**
 * 業種未判定ドメインに inferTaxonomyFromUrl 実行
 * 各ドメインの HTML をまず fetch し、metadata 抽出してから AI 判定にかける
 * （並列度 3、Pro fallback は inferTaxonomyFromUrl 内でハンドル）
 */
async function classifyUnclassifiedDomains(db, newDomainNames) {
  let success = 0;
  let failed = 0;

  if (newDomainNames.length === 0) return { success, failed };

  const { inferTaxonomyFromUrl } = await import('../utils/taxonomyInferenceHelper.js');

  // 並列度 3 で順次処理
  const queue = [...newDomainNames];
  const workers = [];
  const workerCount = Math.min(3, queue.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const domain = queue.shift();
        if (!domain) break;
        try {
          const ref = db.collection('benchmarkSourceSites').doc(domain);
          const doc = await ref.get();
          if (!doc.exists) continue;
          const url = `https://${domain}`;

          // HTML pre-fetch（メタデータ抽出のため）
          let html = '';
          let metadata = {};
          try {
            const fetched = await fetchUrlMetadataAndHtml(url);
            html = fetched.html;
            metadata = fetched.metadata;
          } catch (fetchErr) {
            // fetch 失敗時も AI 判定は試行（URL のみで判定）
            logger.warn('[classifyUnclassifiedDomains] HTML fetch 失敗、URL のみで判定', {
              domain,
              error: fetchErr.message,
            });
          }

          const inference = await inferTaxonomyFromUrl({ siteUrl: url, siteName: '', metadata, html });
          await ref.update({
            taxonomy: { ...inference, inferredAt: FieldValue.serverTimestamp() },
            classificationFailureCount: 0,
          });
          success++;
        } catch (err) {
          logger.warn('[classifyUnclassifiedDomains] 失敗', { domain, error: err.message });
          try {
            await db.collection('benchmarkSourceSites').doc(domain).update({
              classificationFailureCount: FieldValue.increment(1),
            });
          } catch (updateErr) {
            logger.warn('[classifyUnclassifiedDomains] failure count 更新失敗', {
              domain,
              error: updateErr.message,
            });
          }
          failed++;
        }
      }
    })());
  }
  await Promise.all(workers);
  return { success, failed };
}

/**
 * URL から HTML + metadata を取得（タイムアウト 20秒）
 * inferSiteTaxonomy.js の fetchMetadataAndHtml と同等の最小実装
 */
async function fetchUrlMetadataAndHtml(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return { html, metadata: extractMetadataFromHtml(html) };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function extractMetadataFromHtml(html) {
  const m = { title: '', description: '', ogTitle: '', ogDescription: '' };
  if (!html) return m;
  const decode = (s) => (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) m.title = decode(titleMatch[1].trim());
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch) m.description = decode(descMatch[1].trim());
  return m;
}

/**
 * 全アクティブドメインの直近30日 GA4/GSC メトリクスを取得
 */
async function fetchAllMetrics(targets, tokenByEmail) {
  const { startDate, endDate } = getDateRange(RECENT_DAYS);
  const results = [];

  // ドメインを並列度CONCURRENCYで処理
  const queue = [...targets];
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) break;

        // accessibleVia[0] のトークンを使用
        const email = (target.accessibleVia || [])[0];
        const token = email ? tokenByEmail.get(email) : null;
        if (!token) continue;

        const oauth = createOAuth2Client('');
        oauth.setCredentials({ refresh_token: token.refreshToken });

        const metrics = {};

        // GA4
        const propertyId = (target.ga4PropertyIds || [])[0];
        if (propertyId) {
          try {
            const data = google.analyticsdata({ version: 'v1beta', auth: oauth });
            const res = await data.properties.runReport({
              property: `properties/${propertyId}`,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalUsers' },
                  { name: 'screenPageViews' },
                  { name: 'engagementRate' },
                  { name: 'bounceRate' },
                  { name: 'averageSessionDuration' },
                ],
              },
            });
            const row = res.data.rows?.[0];
            if (row) {
              const v = row.metricValues || [];
              metrics.sessions = Number(v[0]?.value || 0);
              metrics.totalUsers = Number(v[1]?.value || 0);
              metrics.screenPageViews = Number(v[2]?.value || 0);
              metrics.engagementRate = Number(v[3]?.value || 0);
              metrics.bounceRate = Number(v[4]?.value || 0);
              metrics.averageSessionDuration = Number(v[5]?.value || 0);
            }
          } catch (err) {
            // 個別失敗は無視（除外フィルタで弾かれる）
          }
        }

        // GSC
        const siteUrl = (target.gscSiteUrls || [])[0];
        if (siteUrl) {
          try {
            const sc = google.searchconsole({ version: 'v1', auth: oauth });
            const res = await sc.searchanalytics.query({
              siteUrl,
              requestBody: { startDate, endDate, dimensions: [], rowLimit: 1 },
            });
            const row = res.data.rows?.[0];
            if (row) {
              metrics.gscClicks = Number(row.clicks || 0);
              metrics.gscImpressions = Number(row.impressions || 0);
              metrics.gscCtr = Number(row.ctr || 0);
              metrics.gscPosition = Number(row.position || 0);
            }
          } catch (err) {
            // skip
          }
        }

        results.push({
          domain: target.id,
          taxonomy: target.taxonomy || {},
          metrics,
        });
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

/**
 * バッチログ書き込み
 */
async function writeBatchLog(db, period, stats) {
  try {
    await db.collection('benchmarkBatchLogs').doc(period).set({
      ...stats,
      completedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    logger.error('[writeBatchLog] 失敗', { error: err.message });
  }
}
