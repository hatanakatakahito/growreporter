/**
 * 分析ページの DataTable 列定義（Excel エクスポート共用）
 *
 * 各 tableKey ごとに画面で表示している完全な列リストを保持する。
 * Excel 生成時に localStorage の `gr:table-columns:<tableKey>` と
 * `gr:table-order:<tableKey>` を読み取り、ユーザーの表示状態をそのまま
 * Excel に反映するために使用する。
 *
 * フィールド:
 *  - key:            データ行のプロパティ名（localStorage 互換のため不変）
 *  - label:          ヘッダ表示名（指標列は shared/metrics.json の shortLabel を参照）
 *  - tooltip:        指標辞書のキー。DataTable がヘルプアイコン表示に使用
 *  - format:         'number' | 'decimal' | 'percent' | 'duration' | 'string'（省略=string）
 *  - required:       true の場合はユーザーが非表示にできず常に出力
 *  - defaultVisible: false の場合はデフォルト非表示（ユーザーが表示に切替可）
 *  - comparison:     true の場合、比較モード時に前期値・変化率の列を追加
 */

import { getShortLabel } from './metrics';

// 指標列のショートハンド：column.key は行プロパティ名（API/adapter 由来）のまま保持し、
// label / tooltip は辞書（shared/metrics.json）から解決する
function metricCol(rowKey, format, opts = {}) {
  return {
    key: rowKey,
    label: getShortLabel(rowKey),
    tooltip: rowKey, // resolveAlias 経由で canonicalKey に解決される
    format,
    comparison: true,
    ...opts,
  };
}

// 共通の「期間×メトリクス」列セット（日/曜日/時間帯で共通）
const PERIOD_METRIC_COLUMNS = [
  metricCol('sessions', 'number'),
  metricCol('users', 'number', { defaultVisible: false }),
  metricCol('newUsers', 'number', { defaultVisible: false }),
  metricCol('pageViews', 'number', { defaultVisible: false }),
  metricCol('engagementRate', 'percent', { defaultVisible: false }),
  metricCol('bounceRate', 'percent', { defaultVisible: false }),
  metricCol('avgSessionDuration', 'duration', { defaultVisible: false }),
  metricCol('conversions', 'number'),
  metricCol('conversionRate', 'percent', { defaultVisible: false, comparison: false }),
];

export const ANALYSIS_COLUMNS = {
  'analysis-month': [
    { key: 'label', label: '年月', required: true },
    metricCol('users', 'number'),
    metricCol('newUsers', 'number', { defaultVisible: false }),
    metricCol('sessions', 'number'),
    metricCol('avgPageviews', 'decimal'),
    metricCol('pageViews', 'number'),
    metricCol('engagementRate', 'percent'),
    metricCol('bounceRate', 'percent', { defaultVisible: false }),
    metricCol('averageSessionDuration', 'duration', { defaultVisible: false }),
    metricCol('conversions', 'number'),
    metricCol('conversionRate', 'percent'),
  ],
  'analysis-day': [
    { key: 'date', label: '日付', required: true },
    ...PERIOD_METRIC_COLUMNS,
  ],
  'analysis-week': [
    { key: 'dayName', label: '曜日', required: true },
    ...PERIOD_METRIC_COLUMNS,
  ],
  'analysis-hour': [
    { key: 'hour', label: '時間帯', required: true },
    ...PERIOD_METRIC_COLUMNS,
  ],
  'analysis-channels': [
    { key: 'channelName', label: 'チャネル', required: true },
    metricCol('sessions', 'number'),
    { key: 'sessionRate', label: '割合', format: 'percent' },
    metricCol('users', 'number'),
    metricCol('conversions', 'number'),
    metricCol('conversionRate', 'percent'),
    metricCol('newUsers', 'number', { defaultVisible: false }),
    metricCol('pageViews', 'number', { defaultVisible: false }),
    metricCol('engagementRate', 'percent', { defaultVisible: false }),
    metricCol('bounceRate', 'percent', { defaultVisible: false }),
    metricCol('avgSessionDuration', 'duration', { defaultVisible: false }),
  ],
  'analysis-keywords': [
    { key: 'keyword', label: 'キーワード', required: true },
    metricCol('clicks', 'number'),
    metricCol('impressions', 'number'),
    metricCol('ctr', 'percent'),
    metricCol('position', 'decimal'),
  ],
  'analysis-referrals': [
    { key: 'source', label: '参照元', required: true },
    metricCol('sessions', 'number'),
    metricCol('users', 'number'),
    metricCol('newUsers', 'number', { defaultVisible: false }),
    metricCol('pageViews', 'number', { defaultVisible: false }),
    metricCol('engagementRate', 'percent'),
    metricCol('bounceRate', 'percent', { defaultVisible: false }),
    metricCol('avgSessionDuration', 'duration'),
    metricCol('conversions', 'number'),
    metricCol('conversionRate', 'percent'),
  ],
  'analysis-pages': [
    { key: 'path', label: 'ページパス', required: true },
    metricCol('pageViews', 'number'),
    metricCol('sessions', 'number', { defaultVisible: false }),
    metricCol('users', 'number', { defaultVisible: false }),
    metricCol('newUsers', 'number', { defaultVisible: false }),
    metricCol('engagementRate', 'percent'),
    metricCol('bounceRate', 'percent', { defaultVisible: false }),
    metricCol('avgDuration', 'duration'),
    metricCol('conversions', 'number', { defaultVisible: false }),
    metricCol('conversionRate', 'percent', { defaultVisible: false }),
    { key: 'interestScore', label: '興味スコア', tooltip: 'interestScore', format: 'decimal', comparison: true },
    { key: 'scrollRate', label: '完読率', tooltip: 'scrollRate', format: 'percent', defaultVisible: false, comparison: true },
  ],
  'analysis-page-categories': [
    { key: 'category', label: 'カテゴリ', required: true },
    { key: 'pages', label: '配下のページ数', format: 'number' },
    metricCol('pageViews', 'number'),
    metricCol('sessions', 'number', { defaultVisible: false }),
    metricCol('users', 'number', { defaultVisible: false }),
    metricCol('newUsers', 'number', { defaultVisible: false }),
    metricCol('engagementRate', 'percent', { defaultVisible: false }),
    metricCol('bounceRate', 'percent', { defaultVisible: false }),
    metricCol('avgDuration', 'duration', { defaultVisible: false }),
    metricCol('conversions', 'number', { defaultVisible: false }),
    metricCol('conversionRate', 'percent', { defaultVisible: false }),
  ],
  'analysis-landing-pages': [
    { key: 'path', label: 'ランディングページ', required: true },
    metricCol('sessions', 'number'),
    metricCol('users', 'number', { defaultVisible: false }),
    metricCol('newUsers', 'number', { defaultVisible: false }),
    metricCol('pageViews', 'number', { defaultVisible: false }),
    metricCol('engagementRate', 'percent'),
    metricCol('bounceRate', 'percent', { defaultVisible: false }),
    metricCol('avgSessionDuration', 'duration'),
    metricCol('conversions', 'number'),
    metricCol('conversionRate', 'percent'),
  ],
  'analysis-file-downloads': [
    { key: 'fileName', label: 'ファイル名', required: true },
    { key: 'downloads', label: 'ダウンロード数', format: 'number', comparison: true },
    metricCol('users', 'number'),
  ],
  'analysis-external-links': [
    { key: 'linkUrl', label: 'URL', required: true },
    // 外部リンクのクリックは GA4 イベント数であり、GSC の clicks とは別指標のため辞書参照しない
    { key: 'clicks', label: 'クリック数', format: 'number', comparison: true },
    metricCol('users', 'number'),
  ],
};

const STORAGE_PREFIX = 'gr:table-columns:';
const ORDER_PREFIX = 'gr:table-order:';

function readStorage(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * ユーザーの localStorage 設定を反映した表示列を返す
 * （useTableColumns と同じマージロジック）
 */
export function resolveVisibleColumns(tableKey) {
  const columns = ANALYSIS_COLUMNS[tableKey];
  if (!columns) return [];

  const storedVisible = readStorage(STORAGE_PREFIX + tableKey);
  const storedOrder = readStorage(ORDER_PREFIX + tableKey);

  const requiredKeys = columns.filter((c) => c.required).map((c) => c.key);
  const defaultVisibleKeys = columns
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);

  // 表示キー集合
  let visibleKeys;
  if (storedVisible) {
    const storedSet = new Set(storedVisible);
    // ストアに未登録の新しいデフォルト表示列を追加（useTableColumns と同じ挙動）
    const newDefaults = columns
      .filter((c) => c.defaultVisible !== false && !storedSet.has(c.key))
      .map((c) => c.key);
    visibleKeys = Array.from(
      new Set([
        ...requiredKeys,
        ...storedVisible.filter((k) => columns.some((c) => c.key === k)),
        ...newDefaults,
      ])
    );
  } else {
    visibleKeys = Array.from(new Set([...requiredKeys, ...defaultVisibleKeys]));
  }

  // 並び順
  const allKeys = columns.map((c) => c.key);
  let orderKeys;
  if (storedOrder) {
    const valid = storedOrder.filter((k) => allKeys.includes(k));
    const missing = allKeys.filter((k) => !valid.includes(k));
    orderKeys = [...valid, ...missing];
  } else {
    orderKeys = allKeys;
  }

  // visible × order
  const visibleSet = new Set(visibleKeys);
  const orderedVisibleKeys = orderKeys.filter((k) => visibleSet.has(k));

  return orderedVisibleKeys
    .map((k) => columns.find((c) => c.key === k))
    .filter(Boolean);
}

/**
 * セル値に変換（Excel 用）
 */
export function formatCellValue(col, value) {
  if (value == null) return '';
  switch (col.format) {
    case 'number':
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'decimal':
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'percent':
      // 入力は 0-1 の小数（画面側 render で *100 している）
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'duration':
      // 秒数を m:ss 文字列に変換
      {
        const v = Number(value) || 0;
        const m = Math.floor(v / 60);
        const s = Math.floor(v % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      }
    default:
      return String(value);
  }
}

// ─── 画面と同じキーに変換する Row Adapter (Cloud Function へ送信前に実行) ───

// 日本語曜日名
const DAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

// チャネル名の日本語マップ
const CHANNEL_NAME_MAP = {
  'Organic Search': 'オーガニック検索',
  Direct: 'ダイレクト',
  Referral: '参照元サイト',
  'Organic Social': 'オーガニックSNS',
  'Paid Search': 'リスティング広告',
  'Paid Social': 'SNS広告',
  Email: 'メール',
  Display: 'ディスプレイ広告',
  Affiliates: 'アフィリエイト',
  Unassigned: '未分類',
  '(other)': 'その他',
};

function fmtYearMonthLocal(ym) {
  if (!ym) return '';
  const s = String(ym);
  if (s.length === 6) return `${s.slice(0, 4)}年${s.slice(4)}月`;
  if (s.includes('-')) return s.replace(/^(\d{4})-(\d{2})$/, '$1年$2月');
  return s;
}

function fmtDateLocal(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr);
  if (s.length === 8) return `${s.slice(0, 4)}/${s.slice(4, 6)}/${s.slice(6, 8)}`;
  return s;
}

export function adaptMonthlyRows(monthlyData) {
  const sorted = [...(monthlyData || [])].sort((a, b) =>
    (b.label || '').localeCompare(a.label || '')
  );
  return sorted.map((d) => ({
    label: d.label || fmtYearMonthLocal(d.month),
    users: d.users,
    newUsers: d.newUsers,
    sessions: d.sessions,
    avgPageviews: d.avgPageviews ?? (d.sessions > 0 ? d.pageViews / d.sessions : 0),
    pageViews: d.pageViews,
    engagementRate: d.engagementRate,
    bounceRate: d.bounceRate,
    averageSessionDuration: d.averageSessionDuration ?? d.avgSessionDuration,
    conversions: d.conversions,
    conversionRate: d.conversionRate ?? (d.sessions > 0 ? d.conversions / d.sessions : 0),
  }));
}

export function adaptDailyRows(data) {
  const rows = (data?.rows || []).slice().sort((a, b) => (a.date > b.date ? -1 : 1));
  return rows.map((r) => ({
    date: fmtDateLocal(r.date),
    sessions: r.sessions,
    users: r.users,
    newUsers: r.newUsers,
    pageViews: r.pageViews,
    engagementRate: r.engagementRate,
    bounceRate: r.bounceRate,
    avgSessionDuration: r.avgSessionDuration ?? r.averageSessionDuration,
    conversions: r.conversions,
    conversionRate: r.sessions > 0 ? r.conversions / r.sessions : 0,
  }));
}

export function adaptWeeklyRows(data) {
  return (data?.rows || []).map((r) => ({
    dayName: DAY_NAMES[Number(r.dayOfWeek)] || r.dayOfWeek,
    sessions: r.sessions,
    users: r.users,
    newUsers: r.newUsers,
    pageViews: r.pageViews,
    engagementRate: r.engagementRate,
    bounceRate: r.bounceRate,
    avgSessionDuration: r.avgSessionDuration ?? r.averageSessionDuration,
    conversions: r.conversions,
    conversionRate: r.sessions > 0 ? r.conversions / r.sessions : 0,
  }));
}

export function adaptHourlyRows(data) {
  return (data?.rows || []).map((r) => ({
    hour: `${r.hour}時`,
    sessions: r.sessions,
    users: r.users,
    newUsers: r.newUsers,
    pageViews: r.pageViews,
    engagementRate: r.engagementRate,
    bounceRate: r.bounceRate,
    avgSessionDuration: r.avgSessionDuration ?? r.averageSessionDuration,
    conversions: r.conversions,
    conversionRate: r.sessions > 0 ? r.conversions / r.sessions : 0,
  }));
}

export function adaptChannelRows(data) {
  const rows = data?.rows || [];
  const total = rows.reduce((sum, r) => sum + (r.sessions || 0), 0);
  return rows
    .map((r) => ({
      channelName: CHANNEL_NAME_MAP[r.sessionDefaultChannelGroup] || r.sessionDefaultChannelGroup || '',
      sessions: r.sessions || 0,
      sessionRate: total > 0 ? (r.sessions || 0) / total : 0,
      users: r.activeUsers || r.users || 0,
      conversions: r.conversions || 0,
      conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
      newUsers: r.newUsers || 0,
      pageViews: r.screenPageViews ?? r.pageViews ?? 0,
      engagementRate: r.engagementRate || 0,
      bounceRate: r.bounceRate || 0,
      avgSessionDuration: r.averageSessionDuration || 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function adaptReferralRows(data) {
  return (data?.rows || []).map((r) => ({
    source: r.source || '',
    sessions: r.sessions || 0,
    users: r.users ?? r.activeUsers ?? 0,
    newUsers: r.newUsers || 0,
    pageViews: r.screenPageViews ?? r.pageViews ?? 0,
    engagementRate: r.engagementRate || 0,
    bounceRate: r.bounceRate || 0,
    avgSessionDuration: r.averageSessionDuration || 0,
    conversions: r.conversions || 0,
    conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
  }));
}

export function adaptPageRows(data) {
  return (data?.rows || []).map((r) => ({
    path: r.pagePath || r.path || '',
    pageViews: r.screenPageViews ?? r.pageViews ?? 0,
    sessions: r.sessions || 0,
    users: r.activeUsers ?? r.users ?? 0,
    newUsers: r.newUsers || 0,
    engagementRate: r.engagementRate || 0,
    bounceRate: r.bounceRate || 0,
    avgDuration: r.averageSessionDuration ?? r.avgDuration ?? 0,
    conversions: r.conversions || 0,
    conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
    interestScore: r.interestScore ?? null,
    scrollRate: r.scrollRate ?? null,
  }));
}

export function adaptLandingPageRows(data) {
  return (data?.rows || []).map((r) => ({
    path: r.landingPagePlusQueryString || r.landingPage || r.pagePath || r.path || '',
    sessions: r.sessions || 0,
    users: r.users ?? r.activeUsers ?? 0,
    newUsers: r.newUsers || 0,
    pageViews: r.screenPageViews ?? r.pageViews ?? 0,
    engagementRate: r.engagementRate || 0,
    bounceRate: r.bounceRate || 0,
    avgSessionDuration: r.averageSessionDuration || 0,
    conversions: r.conversions || 0,
    conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
  }));
}

export function adaptFileDownloadRows(data) {
  return (data?.rows || []).map((r) => ({
    fileName: r.linkUrl || r.fileName || '',
    downloads: r.eventCount ?? r.downloads ?? 0,
    users: r.activeUsers ?? r.users ?? 0,
  }));
}

export function adaptExternalLinkRows(data) {
  return (data?.rows || []).map((r) => ({
    linkUrl: r.linkUrl || '',
    clicks: r.eventCount ?? r.clicks ?? 0,
    users: r.activeUsers ?? r.users ?? 0,
  }));
}

export function adaptKeywordRows(gscData) {
  return (gscData?.topQueries || []).map((q) => ({
    keyword: q.query || '',
    clicks: q.clicks || 0,
    impressions: q.impressions || 0,
    ctr: q.ctr || 0,
    position: q.position || 0,
  }));
}

export function adaptPageCategoryRows(data) {
  const rows = data?.rows || [];
  const categories = {};
  for (const row of rows) {
    const path = row.pagePath || '/';
    const parts = path.split('/').filter(Boolean);
    const category = parts.length > 0 ? `/${parts[0]}` : '/';
    if (!categories[category]) {
      categories[category] = {
        category,
        pageViews: 0,
        sessions: 0,
        users: 0,
        newUsers: 0,
        engagementRateSum: 0,
        bounceRateSum: 0,
        avgDurationSum: 0,
        conversions: 0,
        pages: 0,
      };
    }
    categories[category].pageViews += row.screenPageViews || 0;
    categories[category].sessions += row.sessions || 0;
    categories[category].users += row.activeUsers || 0;
    categories[category].newUsers += row.newUsers || 0;
    categories[category].engagementRateSum += (row.engagementRate || 0) * (row.sessions || 0);
    categories[category].bounceRateSum += (row.bounceRate || 0) * (row.sessions || 0);
    categories[category].avgDurationSum += (row.averageSessionDuration || 0) * (row.sessions || 0);
    categories[category].conversions += row.conversions || 0;
    categories[category].pages += 1;
  }
  return Object.values(categories)
    .map((c) => ({
      category: c.category,
      pages: c.pages,
      pageViews: c.pageViews,
      sessions: c.sessions,
      users: c.users,
      newUsers: c.newUsers,
      engagementRate: c.sessions > 0 ? c.engagementRateSum / c.sessions : 0,
      bounceRate: c.sessions > 0 ? c.bounceRateSum / c.sessions : 0,
      avgDuration: c.sessions > 0 ? c.avgDurationSum / c.sessions : 0,
      conversions: c.conversions,
      conversionRate: c.sessions > 0 ? c.conversions / c.sessions : 0,
    }))
    .sort((a, b) => b.pageViews - a.pageViews);
}
