/**
 * クローズミーティング各セクションの AI 考察生成に渡す dataLines（人間可読の数値行）を組み立てる。
 * CloseMeetingReport から呼び出し、SectionInsight 経由でバックエンドのプロンプトに渡す。
 */
import { KPI_GROUPS, formatMetricValue, fmtNumber, fmtPercent } from '../components/GrowInternal/closeMeetingFormat';
import { computeKpiTargetRows } from './kpiTargetResolve';
import { formatChangePercent } from './comparisonHelpers';

const labels = (meetingType) =>
  meetingType === 'after' ? { before: '前期間', after: '当期間' } : { before: '公開前', after: '公開後' };

/** サマリー指標（標準指標の前後比較） */
export function summaryLines(kpi, meetingType) {
  const after = kpi?.after;
  if (!after) return [];
  const comp = kpi?.comparison;
  const changes = kpi?.changes || {};
  const has = !!kpi?.hasComparison;
  const L = labels(meetingType);
  return KPI_GROUPS.flatMap((g) => g.metrics).map((m) => {
    const a = formatMetricValue(after[m.key], m.format);
    const b = has && comp ? ` / ${L.before} ${formatMetricValue(comp[m.key], m.format)}` : '';
    const c = has ? `（${formatChangePercent(changes[m.key])}）` : '';
    return `${m.label}: ${L.after} ${a}${b}${c}`;
  });
}

/** 指標の推移（時系列の開始/終了/ピーク） */
export function timelineLines(timeseries, granularity) {
  if (!Array.isArray(timeseries) || timeseries.length === 0) return [];
  const gran = granularity === 'day' ? '日次' : granularity === 'week' ? '週次' : '月次';
  const out = [`粒度: ${gran}・${timeseries.length} 期間分`];
  const metrics = [
    ['sessions', 'セッション'],
    ['users', 'ユーザー'],
    ['conversions', 'CV数'],
    ['pageViews', 'PV'],
  ];
  metrics.forEach(([k, label]) => {
    const vals = timeseries.map((r) => Number(r[k]) || 0);
    if (!vals.some((v) => v > 0)) return;
    const start = vals[0];
    const end = vals[vals.length - 1];
    const peak = Math.max(...vals);
    out.push(`${label}: 開始 ${fmtNumber(start)} → 終了 ${fmtNumber(end)}（ピーク ${fmtNumber(peak)}）`);
  });
  return out;
}

/** ブレイクダウン共通（上位 topN を metricKey の多い順で） */
function breakdownLines(bd, metricKey, fmt, hasComparison, topN = 8) {
  if (!bd?.rows?.length) return [];
  const sorted = [...bd.rows]
    .sort((a, b) => (Number(b[metricKey]) || 0) - (Number(a[metricKey]) || 0))
    .slice(0, topN);
  return sorted.map((r) => {
    const name = r[bd.keyField] || '(なし)';
    const v = formatMetricValue(r[metricKey], fmt);
    const ch = hasComparison && r[`${metricKey}_change`] != null ? `（${formatChangePercent(r[`${metricKey}_change`])}）` : '';
    return `${name}: ${v}${ch}`;
  });
}

export function channelsLines(bd, hasComparison) {
  return breakdownLines(bd, 'sessions', 'number', hasComparison);
}
export function devicesLines(bd, hasComparison) {
  return breakdownLines(bd, 'sessions', 'number', hasComparison);
}
/** コンバージョン項目別 — CV数の多い順。CV率も併記する */
export function conversionItemsLines(bd, hasComparison) {
  if (!bd?.rows?.length) return [];
  const sorted = [...bd.rows].sort((a, b) => (Number(b.conversions) || 0) - (Number(a.conversions) || 0));
  return sorted.map((r) => {
    const name = r[bd.keyField] || '(なし)';
    const cv = formatMetricValue(r.conversions, 'number');
    const ch = hasComparison && r.conversions_change != null ? `（${formatChangePercent(r.conversions_change)}）` : '';
    const rate = formatMetricValue(r.conversionRate, 'percent');
    return `${name}: CV ${cv}${ch} / CV率 ${rate}`;
  });
}
export function pagesLines(bd, hasComparison) {
  return breakdownLines(bd, 'screenPageViews', 'number', hasComparison, 10);
}
export function keywordsLines(bd, hasComparison) {
  return breakdownLines(bd, 'clicks', 'number', hasComparison, 12);
}

/** KPI 予実（目標 / 実績 / 達成率） */
export function kpiTargetLines(kpiList, actuals, observationDays) {
  const rows = computeKpiTargetRows(kpiList, actuals);
  if (!rows.length) return [];
  const fmt = (v, isRate) => (v == null ? '—' : isRate ? fmtPercent(v > 1 ? v / 100 : v) : fmtNumber(v));
  const head = observationDays ? [`観測期間: 約 ${observationDays} 日間`] : [];
  return head.concat(
    rows.map((r) => {
      const ach = r.achievement == null ? '—' : `${r.achievement.toFixed(1)}%`;
      return `${r.name}: 月次目標 ${fmt(r.target, r.isRate)} / 実績 ${fmt(r.actual, r.isRate)} / 達成率 ${ach}`;
    })
  );
}
