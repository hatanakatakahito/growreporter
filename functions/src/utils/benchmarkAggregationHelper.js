/**
 * lively-aggregating-bobcat: ベンチマーク集計ヘルパー
 *
 * 異常値フィルタ後の rows を、業種大分類 × サイト役割（× BM）で集計し、
 * `industryBenchmarks/{period_industry_role}` に書き込む形に変換する。
 */

const N_MEDIAN_THRESHOLD = 10;
const N_QUARTILE_THRESHOLD = 30;

/**
 * 数値配列から min/p25/median/p75/max/avg/count を計算
 */
export function describeNumbers(values) {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return { count: 0 };
  const sorted = [...filtered].sort((a, b) => a - b);
  const q = (p) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  };
  return {
    count: filtered.length,
    min: sorted[0],
    p25: q(0.25),
    median: q(0.5),
    p75: q(0.75),
    max: sorted[sorted.length - 1],
    avg: filtered.reduce((s, v) => s + v, 0) / filtered.length,
  };
}

/**
 * N閾値ラベル
 */
function nThresholdLabel(N) {
  if (N >= N_QUARTILE_THRESHOLD) return 'N≥30';
  if (N >= N_MEDIAN_THRESHOLD) return 'N≥10';
  return 'data_insufficient';
}

/**
 * 業種×役割×BMで集計
 *
 * @param {Array} rows - filtered rows: [{domain, taxonomy: {industryMajor, siteRole, businessModel}, metrics: {...}}, ...]
 * @param {string} period - 'YYYY-MM'
 * @returns {Array<BenchmarkDoc>} industryBenchmarks に書き込む文書配列
 */
export function aggregateByIndustryRoleBM(rows, period) {
  // (industryMajor, siteRole) で primary バケット
  // 各バケット内に BM 別 sub-bucket
  const buckets = new Map();

  const getBucket = (industryMajor, siteRole) => {
    const key = `${industryMajor}__${siteRole}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        industryMajor,
        siteRole,
        rows: [],
        byBM: {
          b2b: [],
          b2c: [],
          b2b2c: [],
          other: [],
        },
      });
    }
    return buckets.get(key);
  };

  for (const row of rows) {
    const tax = row.taxonomy || {};
    const industryMajor = tax.industryMajor || 'unknown';
    const siteRole = tax.siteRole || 'unknown';
    const bm = tax.businessModel || 'other';
    const bucket = getBucket(industryMajor, siteRole);
    bucket.rows.push(row);
    if (bucket.byBM[bm]) bucket.byBM[bm].push(row);
  }

  // 「全体（役割問わず）」バケットも生成
  const allRoleBuckets = new Map();
  for (const row of rows) {
    const tax = row.taxonomy || {};
    const industryMajor = tax.industryMajor || 'unknown';
    if (!allRoleBuckets.has(industryMajor)) {
      allRoleBuckets.set(industryMajor, {
        industryMajor,
        siteRole: 'all',
        rows: [],
        byBM: { b2b: [], b2c: [], b2b2c: [], other: [] },
      });
    }
    const b = allRoleBuckets.get(industryMajor);
    b.rows.push(row);
    const bm = tax.businessModel || 'other';
    if (b.byBM[bm]) b.byBM[bm].push(row);
  }

  // すべてのバケットを集計
  const docs = [];
  const allBuckets = [...buckets.values(), ...allRoleBuckets.values()];
  for (const bucket of allBuckets) {
    const N = bucket.rows.length;
    if (N < N_MEDIAN_THRESHOLD) continue; // N<10 は出力しない

    const docId = `${period}_${bucket.industryMajor}_${bucket.siteRole}`;

    docs.push({
      docId,
      period,
      industryMajor: bucket.industryMajor,
      siteRole: bucket.siteRole,
      N,
      Nthreshold: nThresholdLabel(N),
      metrics: aggregateMetrics(bucket.rows, [
        'sessions',
        'bounceRate',
        'engagementRate',
        'averageSessionDuration',
        'screenPageViews',
      ]),
      gsc: aggregateMetrics(bucket.rows, [
        'gscImpressions',
        'gscClicks',
        'gscCtr',
        'gscPosition',
      ], 'gsc'),
      byBusinessModel: aggregateBM(bucket.byBM),
      inputSampleVersion: 'v1.0',
    });
  }

  return docs;
}

function aggregateMetrics(rows, metricKeys, prefix = '') {
  const result = {};
  for (const key of metricKeys) {
    // sourceKey = rows[].metrics 内のキー名（例: 'gscImpressions'）
    // cleanKey = 出力先キー名（gsc 系は 'gsc' プレフィックスを剥がす）
    //   gscImpressions -> impressions, gscCtr -> ctr 等
    const cleanKey = prefix === 'gsc'
      ? key.replace(/^gsc/, '').replace(/^./, (c) => c.toLowerCase())
      : key;
    const values = rows.map((r) => Number(r.metrics?.[key])).filter(Number.isFinite);
    result[cleanKey] = describeNumbers(values);
  }
  return result;
}

function aggregateBM(byBM) {
  const result = {};
  for (const [bm, rows] of Object.entries(byBM)) {
    if (rows.length < N_MEDIAN_THRESHOLD) continue; // BM 別も N≥10 のみ
    result[bm] = {
      N: rows.length,
      metrics: aggregateMetrics(rows, [
        'sessions',
        'bounceRate',
        'engagementRate',
        'averageSessionDuration',
      ]),
      gsc: aggregateMetrics(rows, ['gscImpressions', 'gscClicks', 'gscCtr', 'gscPosition'], 'gsc'),
    };
  }
  return result;
}
