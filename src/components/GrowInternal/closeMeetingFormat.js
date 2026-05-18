import { format, parseISO, isValid } from 'date-fns';

/** 記録の表示ラベル（label が空なら「YYYY/M/D 公開のリニューアル」） */
export function recordDisplayLabel(rec) {
  if (!rec) return '';
  if (rec.label && rec.label.trim()) return rec.label.trim();
  const d = rec.launchDate ? parseISO(rec.launchDate) : null;
  if (d && isValid(d)) return `${format(d, 'yyyy/M/d')} 公開のリニューアル`;
  return rec.launchDate || 'リニューアル記録';
}

/**
 * MTG セッションの短ラベル（クローズMTG / アフターMTG #N）
 * - meetingType === 'after' → 「アフターMTG #N」（N = meetingSeq）
 * - それ以外（既存ドキュメント含む） → 「クローズMTG」
 */
export function meetingSessionLabel(rec) {
  if (!rec) return '';
  if (rec.meetingType === 'after') {
    const seq = Number.isFinite(rec.meetingSeq) && rec.meetingSeq > 1 ? rec.meetingSeq : 2;
    return `アフターMTG #${seq}`;
  }
  return 'クローズMTG';
}

/** YYYY-MM-DD を「YYYY/M/D」に */
export function fmtDate(s) {
  if (!s) return '—';
  const d = parseISO(s);
  return isValid(d) ? format(d, 'yyyy/M/d') : s;
}

/** 数値フォーマット（カンマ区切り、小数なし） */
export function fmtNumber(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Math.round(Number(v)).toLocaleString('ja-JP');
}

/** 割合（0-1）を % 表記に */
export function fmtPercent(v, digits = 1) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

/** 平均掲載順位（小数1桁） */
export function fmtPosition(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(1);
}

/** 平均エンゲージ時間（秒）→ m分s秒 */
export function fmtDuration(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return '—';
  const s = Math.round(Number(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}分${r}秒` : `${r}秒`;
}

/**
 * 標準10指標の定義（2行: GA4 6 / GSC 4）
 *   key: KPI オブジェクトのフィールド名
 *   format: 'number' | 'percent' | 'position' | 'duration'
 *   invert: 下がると良い指標（色反転）
 *   spark: 時系列スパークラインに使う bucket フィールド名（無ければ null）
 */
export const KPI_GROUPS = [
  {
    title: 'アクセス（GA4）',
    metrics: [
      { key: 'sessions', label: 'セッション', format: 'number', spark: 'sessions' },
      { key: 'users', label: 'ユーザー', format: 'number', spark: 'users' },
      { key: 'newUsers', label: '新規ユーザー', format: 'number', spark: 'newUsers' },
      { key: 'engagementRate', label: 'エンゲージ率', format: 'percent', spark: 'engagementRate' },
      { key: 'conversions', label: 'CV数', format: 'number', spark: 'conversions' },
      { key: 'conversionRate', label: 'CV率', format: 'percent', spark: 'conversionRate' },
    ],
  },
  {
    title: '検索流入（Search Console）',
    metrics: [
      { key: 'impressions', label: '表示回数', format: 'number', spark: null },
      { key: 'clicks', label: 'クリック', format: 'number', spark: null },
      { key: 'ctr', label: 'CTR', format: 'percent', spark: null },
      { key: 'position', label: '平均掲載順位', format: 'position', invert: true, spark: null },
    ],
  },
];

export function formatMetricValue(value, fmt) {
  switch (fmt) {
    case 'percent':
      return fmtPercent(value);
    case 'position':
      return fmtPosition(value);
    case 'duration':
      return fmtDuration(value);
    case 'number':
    default:
      return fmtNumber(value);
  }
}

/**
 * ブレイクダウンテーブルに表示する指標列の定義（社内画面・共有ページ共通）。
 * 分析画面のテーブルと同等の標準 GA4 指標セット。「表示項目」ピッカーで全項目から選べる。
 * 並び順 ＝ ピッカーの並び順。defaultColumns（呼び出し側）が初期表示列。
 * ※ CV（conversions/CV率）は GA4 Data API の dimensioned runReport で直接取れないため未収録。
 */
const BREAKDOWN_METRIC_COLUMNS = [
  { key: 'sessions', label: 'セッション', format: 'number' },
  { key: 'totalUsers', label: 'ユーザー', format: 'number' },
  { key: 'newUsers', label: '新規ユーザー', format: 'number' },
  { key: 'screenPageViews', label: 'PV', format: 'number' },
  { key: 'engagementRate', label: 'エンゲージ率', format: 'percent' },
  { key: 'bounceRate', label: '直帰率', format: 'percent', invert: true },
  { key: 'averageSessionDuration', label: '平均セッション時間', format: 'duration' },
];

export const BREAKDOWN_COLUMNS = {
  channels: BREAKDOWN_METRIC_COLUMNS,
  pages: BREAKDOWN_METRIC_COLUMNS,
  devices: BREAKDOWN_METRIC_COLUMNS,
};
