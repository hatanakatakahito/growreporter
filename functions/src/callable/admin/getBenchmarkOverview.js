import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { assertAdmin } from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: 業界ベンチマーク管理ダッシュボード用 概況取得
 *
 * 1回の呼び出しで以下を返す:
 *   - tokens 状況（active/revoked/failed の件数）
 *   - benchmarkSourceSites サマリ（total / 業種判定済 / opt-out 数）
 *   - industryBenchmarks の最新月の N≥10 業種数 / N≥30 業種数
 *   - benchmarkBatchLogs の直近12件
 *
 * /admin/industry-benchmarks のランディングページで一覧表示するため、
 * フロント側で複数の callable を呼ばなくて済むようサーバ側で集約。
 */
export async function getBenchmarkOverviewCallable(request) {
  await assertAdmin(request.auth?.uid);
  const db = getFirestore();

  // 並列取得
  const [tokensSnap, sourcesSnap, latestBenchmarkSnap, batchLogsSnap] = await Promise.all([
    db.collection('serviceTokens').get(),
    db.collection('benchmarkSourceSites').get(),
    db.collection('industryBenchmarks').orderBy('period', 'desc').limit(50).get(),
    db.collection('benchmarkBatchLogs').orderBy('period', 'desc').limit(12).get(),
  ]);

  // tokens
  const tokensSummary = { total: tokensSnap.size, active: 0, revoked: 0, failed: 0 };
  for (const doc of tokensSnap.docs) {
    const status = doc.data().status || 'active';
    if (status === 'active') tokensSummary.active++;
    else if (status === 'revoked') tokensSummary.revoked++;
    else tokensSummary.failed++;
  }

  // sources
  const sourcesSummary = {
    total: sourcesSnap.size,
    classified: 0,
    unclassified: 0,
    optedOut: 0,
    excluded: 0,
  };
  for (const doc of sourcesSnap.docs) {
    const data = doc.data();
    if (data.optedOut) sourcesSummary.optedOut++;
    if (data.excludedFromBenchmark) sourcesSummary.excluded++;
    if (data.taxonomy && data.taxonomy.industryMajor) sourcesSummary.classified++;
    else sourcesSummary.unclassified++;
  }

  // latest benchmark (最新 period の業種別件数)
  let latestPeriod = null;
  const benchmarkByPeriod = new Map(); // period -> { totalCells, n10Industries, n30Industries }
  for (const doc of latestBenchmarkSnap.docs) {
    const data = doc.data();
    const p = data.period;
    if (!latestPeriod || p > latestPeriod) latestPeriod = p;
    if (!benchmarkByPeriod.has(p)) {
      benchmarkByPeriod.set(p, {
        period: p,
        totalCells: 0,
        n10Industries: new Set(),
        n30Industries: new Set(),
      });
    }
    const b = benchmarkByPeriod.get(p);
    b.totalCells++;
    if (data.N >= 10) b.n10Industries.add(data.industryMajor);
    if (data.N >= 30) b.n30Industries.add(data.industryMajor);
  }
  const latestBenchmarkSummary = latestPeriod && benchmarkByPeriod.has(latestPeriod) ? {
    period: latestPeriod,
    totalCells: benchmarkByPeriod.get(latestPeriod).totalCells,
    n10IndustriesCount: benchmarkByPeriod.get(latestPeriod).n10Industries.size,
    n30IndustriesCount: benchmarkByPeriod.get(latestPeriod).n30Industries.size,
  } : null;

  // batch logs
  const batchLogs = batchLogsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      period: data.period || doc.id,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      durationSeconds: data.durationSeconds || 0,
      sourceTokensActive: data.sourceTokensActive || 0,
      sourceTokensFailed: data.sourceTokensFailed || 0,
      totalDomainsBefore: data.totalDomainsBefore || 0,
      newDomainsThisMonth: data.newDomainsThisMonth || 0,
      classifiedThisRun: data.classifiedThisRun || 0,
      classificationFailures: data.classificationFailures || 0,
      metricsActive: data.metricsActive || 0,
      metricsExcluded: data.metricsExcluded || 0,
      benchmarksWritten: data.benchmarksWritten || 0,
      benchmarksDeleted: data.benchmarksDeleted || 0,
      errors: data.errors || [],
      exclusionBreakdown: data.exclusionBreakdown || {},
    };
  });

  logger.info('[getBenchmarkOverview] 取得完了', {
    adminId: request.auth.uid,
    tokens: tokensSummary.total,
    sources: sourcesSummary.total,
    latestPeriod,
  });

  return {
    success: true,
    tokens: tokensSummary,
    sources: sourcesSummary,
    latestBenchmark: latestBenchmarkSummary,
    batchLogs,
  };
}
