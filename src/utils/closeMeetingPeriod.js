/**
 * クローズミーティング: 観測期間 / 比較期間 / 時系列粒度の算出ヘルパー
 *
 * - 観測期間（公開後）: 既定は 公開日 〜 公開日+1ヶ月-1日。公開日+1ヶ月がまだ未来なら
 *   「公開日 〜 今日」に短縮し partial=true を返す（画面に「計測中（残りN日）」を出す）
 * - 比較期間（旧サイト側）: モード yoy / prevPeriod / custom
 * - 時系列グラフの実線レンジ: [公開日 - 観測長, 観測終了]（公開前後を1本）
 * - 粒度: 観測長ベースで day / week / month を自動選択
 */
import {
  addMonths,
  subYears,
  subDays,
  format,
  parseISO,
  differenceInCalendarDays,
  startOfWeek,
  startOfMonth,
  isAfter,
  isValid,
} from 'date-fns';

const FMT = 'yyyy-MM-dd';

const SUM_FIELDS = ['sessions', 'users', 'newUsers', 'pageViews', 'conversions'];
const AVG_FIELDS = ['engagementRate', 'bounceRate', 'avgSessionDuration', 'conversionRate'];

function fmt(d) {
  return format(d, FMT);
}

function safeParse(s) {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

/** "YYYYMMDD" / "YYYY-MM-DD" → Date */
function parseGa4Date(s) {
  if (!s) return null;
  if (/^\d{8}$/.test(s)) return safeParse(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
  return safeParse(s);
}

/**
 * 公開日から既定の観測期間（公開後）を算出
 * @returns {{from:string,to:string,partial:boolean,remainingDays:number}}
 */
export function getDefaultObservationRange(launchDate) {
  const launch = safeParse(launchDate) || new Date();
  let end = subDays(addMonths(launch, 1), 1);
  const today = new Date();
  let partial = false;
  let remainingDays = 0;
  if (isAfter(end, today)) {
    remainingDays = differenceInCalendarDays(end, today);
    end = today;
    partial = true;
  }
  if (isAfter(launch, end)) end = launch;
  return { from: fmt(launch), to: fmt(end), partial, remainingDays };
}

/**
 * 保存済み / 任意指定の観測期間を正規化（未来終端は今日に短縮し partial を立てる）
 */
export function normalizeObservationRange(range, launchDate) {
  if (!range || !range.from || !range.to) return getDefaultObservationRange(launchDate);
  const from = safeParse(range.from);
  let to = safeParse(range.to);
  if (!from || !to) return getDefaultObservationRange(launchDate);
  const today = new Date();
  let partial = false;
  let remainingDays = 0;
  if (isAfter(to, today)) {
    remainingDays = differenceInCalendarDays(to, today);
    to = today;
    partial = true;
  }
  if (isAfter(from, to)) to = from;
  return { from: fmt(from), to: fmt(to), partial, remainingDays };
}

function prevPeriodRange(obsFrom, obsTo) {
  const days = Math.max(0, differenceInCalendarDays(obsTo, obsFrom));
  const to = subDays(obsFrom, 1);
  const from = subDays(to, days);
  return { from: fmt(from), to: fmt(to) };
}

/**
 * 比較期間（旧サイト側）を算出
 * @param {{from:string,to:string}} observationRange
 * @param {{mode:'yoy'|'prevPeriod'|'custom', range?:{from,to}}} comparison
 * @returns {{from:string,to:string,mode:string}}
 */
export function getComparisonRange(observationRange, comparison) {
  const mode = comparison?.mode || 'yoy';
  const obsFrom = safeParse(observationRange.from);
  const obsTo = safeParse(observationRange.to);
  if (!obsFrom || !obsTo) return { from: null, to: null, mode };
  if (mode === 'custom') {
    const r = comparison?.range;
    if (r && r.from && r.to) return { from: r.from, to: r.to, mode };
    return { ...prevPeriodRange(obsFrom, obsTo), mode: 'prevPeriod' };
  }
  if (mode === 'prevPeriod') {
    return { ...prevPeriodRange(obsFrom, obsTo), mode };
  }
  // yoy
  return { from: fmt(subYears(obsFrom, 1)), to: fmt(subYears(obsTo, 1)), mode };
}

/** 比較モードの日本語ラベル（KPIカードのサブラベル等） */
export function comparisonModeLabel(mode) {
  switch (mode) {
    case 'yoy':
      return '前年同期';
    case 'prevPeriod':
      return '公開前同期間';
    case 'custom':
      return '比較期間（カスタム）';
    default:
      return '公開前';
  }
}

/** 時系列グラフの実線レンジ: [公開日 - 観測長, 観測終了] */
export function getTimelineRange(launchDate, observationRange) {
  const launch = safeParse(launchDate);
  const obsFrom = safeParse(observationRange.from);
  const obsTo = safeParse(observationRange.to);
  if (!launch || !obsFrom || !obsTo) return { from: null, to: null };
  const obsDays = Math.max(0, differenceInCalendarDays(obsTo, obsFrom));
  return { from: fmt(subDays(launch, obsDays)), to: fmt(obsTo) };
}

/** 粒度（観測長ベース）: 'day' | 'week' | 'month' */
export function pickGranularity(observationRange) {
  const obsFrom = safeParse(observationRange.from);
  const obsTo = safeParse(observationRange.to);
  if (!obsFrom || !obsTo) return 'day';
  const days = differenceInCalendarDays(obsTo, obsFrom);
  if (days <= 45) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

function emptySums() {
  const out = {};
  for (const f of SUM_FIELDS) out[f] = 0;
  for (const f of AVG_FIELDS) out[`__${f}_sum`] = 0;
  out.__count = 0;
  return out;
}

/**
 * 日次 rows を粒度に応じてバケット集計
 * @param {Array<{date:string, sessions, users, conversions, ...}>} rows
 * @param {'day'|'week'|'month'} granularity
 * @returns {Array<{bucket:string, label:string, ...metrics}>}
 */
export function bucketTimeseries(rows, granularity) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const parsed = rows
    .map((r) => ({ d: parseGa4Date(r.date), r }))
    .filter((x) => x.d && isValid(x.d))
    .sort((a, b) => a.d - b.d);
  if (parsed.length === 0) return [];

  if (granularity === 'day') {
    return parsed.map(({ d, r }) => {
      const row = { bucket: fmt(d), label: format(d, 'M/d') };
      for (const f of [...SUM_FIELDS, ...AVG_FIELDS]) row[f] = Number(r[f]) || 0;
      return row;
    });
  }

  const keyFn =
    granularity === 'week'
      ? (d) => fmt(startOfWeek(d, { weekStartsOn: 1 }))
      : (d) => fmt(startOfMonth(d));
  const map = new Map();
  for (const { d, r } of parsed) {
    const k = keyFn(d);
    if (!map.has(k)) map.set(k, { bucket: k, ...emptySums() });
    const acc = map.get(k);
    acc.__count += 1;
    for (const f of SUM_FIELDS) acc[f] += Number(r[f]) || 0;
    for (const f of AVG_FIELDS) acc[`__${f}_sum`] += Number(r[f]) || 0;
  }
  return [...map.values()]
    .sort((a, b) => safeParse(a.bucket) - safeParse(b.bucket))
    .map((acc) => {
      const d = safeParse(acc.bucket);
      const row = {
        bucket: acc.bucket,
        label: granularity === 'week' ? `${format(d, 'M/d')}〜` : format(d, 'yyyy/M'),
      };
      for (const f of SUM_FIELDS) row[f] = acc[f];
      for (const f of AVG_FIELDS) row[f] = acc.__count ? acc[`__${f}_sum`] / acc.__count : 0;
      return row;
    });
}

/** 比較データが実質欠損か（前年同期で GA4 がほぼ0 → 公開前同期間にフォールバックする判定） */
export function isComparisonDataMissing(comparisonDailyRows) {
  if (!Array.isArray(comparisonDailyRows) || comparisonDailyRows.length === 0) return true;
  const total = comparisonDailyRows.reduce((s, r) => s + (Number(r.sessions) || 0), 0);
  return total === 0;
}
