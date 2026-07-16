import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useSiteMetrics } from './useSiteMetrics';
import { calculateChangePercent, mergeComparisonRows } from '../utils/comparisonHelpers';
import { bucketTimeseries } from '../utils/closeMeetingPeriod';

/**
 * クローズミーティング画面の数値データ（サマリーKPI / 時系列 / ブレイクダウン）を取得
 *
 * @param {Object} args
 * @param {string} args.siteId
 * @param {{from:string,to:string}} args.observationRange   公開後の集計期間
 * @param {{from:string,to:string,mode:string}} args.comparisonRange  比較期間（旧サイト側）
 * @param {{from:string,to:string}} args.timelineRange       時系列グラフの実線レンジ（公開前後）
 * @param {'day'|'week'|'month'} args.granularity
 * @param {boolean} args.hasGSCConnection
 */
const KPI_NUMERIC_FIELDS = [
  'sessions',
  'users',
  'newUsers',
  'pageViews',
  'avgPageViews',
  'engagementRate',
  'conversions',
  'conversionRate',
  'impressions',
  'clicks',
  'ctr',
  'position',
];

// キーワード流入（GSC query）の比較対象フィールド
const KEYWORD_VALUE_FIELDS = ['clicks', 'impressions', 'ctr', 'position'];

// ブレイクダウン各表で取得する GA4 指標（dimensioned runReport で確実に使える標準指標のみ）。
// CV（conversions）は GA4 Data API では dimension 付きで直接取れない（eventCount + eventName フィルタが必要）ため、
// ここでは含めない。将来 CV 別内訳が必要になったら専用クエリを足す。
const BREAKDOWN_GA4_METRICS = [
  'sessions',
  'totalUsers',
  'newUsers',
  'screenPageViews',
  'engagementRate',
  'bounceRate',
  'averageSessionDuration',
];

// ブレイクダウンの定義（GA4 dimensioned query）
const BREAKDOWN_DEFS = {
  channels: {
    keyField: 'sessionDefaultChannelGroup',
    keyLabel: 'チャネル',
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: BREAKDOWN_GA4_METRICS,
    valueFields: BREAKDOWN_GA4_METRICS,
    defaultSortKey: 'sessions',
  },
  pages: {
    keyField: 'pagePath',
    keyLabel: 'ページ',
    dimensions: ['pagePath'],
    metrics: BREAKDOWN_GA4_METRICS,
    valueFields: BREAKDOWN_GA4_METRICS,
    defaultSortKey: 'screenPageViews',
  },
  devices: {
    keyField: 'deviceCategory',
    keyLabel: 'デバイス',
    dimensions: ['deviceCategory'],
    metrics: BREAKDOWN_GA4_METRICS,
    valueFields: BREAKDOWN_GA4_METRICS,
    defaultSortKey: 'sessions',
  },
};

function toKpi(metrics) {
  const m = metrics?.data?.metrics;
  if (!m) return null;
  const sessions = Number(m.sessions) || 0;
  const conversions = Number(m.conversions) || 0;
  const pageViews = Number(m.pageViews) || 0;
  return {
    sessions,
    users: Number(m.totalUsers) || 0,
    newUsers: Number(m.newUsers) || 0,
    engagementRate: Number(m.engagementRate) || 0,
    conversions,
    conversionRate: sessions > 0 ? conversions / sessions : 0,
    pageViews,
    // 平均PV（1セッションあたりPV）。サマリーカードの「平均PV」と同義
    avgPageViews: sessions > 0 ? pageViews / sessions : 0,
    impressions: Number(m.impressions) || 0,
    clicks: Number(m.clicks) || 0,
    ctr: Number(m.ctr) || 0,
    position: Number(m.position) || 0,
    // CV イベント別内訳（eventName -> count）。KPI予実のCVイベント目標の実績照合に使う。
    // useSiteMetrics 経由で取得（パス限定フィルタも適用済み）
    conversionEvents: metrics?.data?.conversions || {},
  };
}

/** GA4 dimensioned query（rows を返す）。range が無ければ無効。dimensionFilter で特定パス配下に限定可 */
function useGa4DimensionRows(siteId, range, dimensions, metrics, dimensionFilter = null) {
  const from = range?.from || null;
  const to = range?.to || null;
  const filterKey = dimensionFilter ? JSON.stringify(dimensionFilter) : '';
  return useQuery({
    queryKey: ['cm-ga4-dim', siteId, from, to, dimensions.join(','), metrics.join(','), filterKey],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4Data');
      const result = await fn({ siteId, startDate: from, endDate: to, metrics, dimensions, dimensionFilter });
      return result.data?.rows || [];
    },
    enabled: !!siteId && !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}

// deviceCategory（GA4 の生値）→ 日本語表示。未知の値はそのまま表示する。
const DEVICE_CATEGORY_LABELS = {
  desktop: 'デスクトップ',
  mobile: 'モバイル',
  tablet: 'タブレット',
  'smart tv': 'スマートTV',
  smarttv: 'スマートTV',
  wearable: 'ウェアラブル',
  console: 'ゲーム機',
};

/**
 * deviceCategory を日本語化（マージ前に適用。after/comp 両方を同じ表記に統一するので
 * keyField でのマージは引き続き一致する）。
 */
function localizeDeviceRows(rows) {
  return (rows || []).map((r) => {
    const raw = r.deviceCategory;
    const key = typeof raw === 'string' ? raw.toLowerCase() : raw;
    return { ...r, deviceCategory: DEVICE_CATEGORY_LABELS[key] || raw };
  });
}

/** パス前方一致の GA4 pagePath フィルタを生成（pathPrefix 未指定なら null＝全体） */
function buildPagePathFilter(pathPrefix) {
  if (!pathPrefix) return null;
  return { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: pathPrefix } } };
}

export function useCloseMeetingData({
  siteId,
  observationRange,
  comparisonRange,
  timelineRange,
  granularity = 'day',
  hasGSCConnection = true,
  pathPrefix = null,
  conversionEventDefs = [],
}) {
  const obsFrom = observationRange?.from || null;
  const obsTo = observationRange?.to || null;
  const compFrom = comparisonRange?.from || null;
  const compTo = comparisonRange?.to || null;
  const tlFrom = timelineRange?.from || null;
  const tlTo = timelineRange?.to || null;

  // 特定パス配下に限定するフィルタ（pathPrefix 未指定なら null＝サイト全体）
  const ga4PathFilter = buildPagePathFilter(pathPrefix);
  const tlFilterKey = ga4PathFilter ? JSON.stringify(ga4PathFilter) : '';

  // 公開後（観測期間）/ 比較期間（旧サイト側）のサマリー指標
  const afterMetrics = useSiteMetrics(siteId, obsFrom, obsTo, hasGSCConnection, ga4PathFilter, pathPrefix);
  const compMetrics = useSiteMetrics(siteId, compFrom, compTo, hasGSCConnection, ga4PathFilter, pathPrefix);

  // 時系列（日次）— 公開前後を1本のグラフにするためのレンジで取得
  const timelineQuery = useQuery({
    queryKey: ['cm-timeline', siteId, tlFrom, tlTo, tlFilterKey],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4DailyConversionData');
      const result = await fn({ siteId, startDate: tlFrom, endDate: tlTo, dimensionFilter: ga4PathFilter });
      return result.data;
    },
    enabled: !!siteId && !!tlFrom && !!tlTo,
    staleTime: 5 * 60 * 1000,
  });

  // ブレイクダウン（チャネル / ページ / デバイス × 観測期間 / 比較期間）
  const channelsAfterQ = useGa4DimensionRows(siteId, observationRange, BREAKDOWN_DEFS.channels.dimensions, BREAKDOWN_DEFS.channels.metrics, ga4PathFilter);
  const channelsCompQ = useGa4DimensionRows(siteId, comparisonRange, BREAKDOWN_DEFS.channels.dimensions, BREAKDOWN_DEFS.channels.metrics, ga4PathFilter);
  const pagesAfterQ = useGa4DimensionRows(siteId, observationRange, BREAKDOWN_DEFS.pages.dimensions, BREAKDOWN_DEFS.pages.metrics, ga4PathFilter);
  const pagesCompQ = useGa4DimensionRows(siteId, comparisonRange, BREAKDOWN_DEFS.pages.dimensions, BREAKDOWN_DEFS.pages.metrics, ga4PathFilter);
  const devicesAfterQ = useGa4DimensionRows(siteId, observationRange, BREAKDOWN_DEFS.devices.dimensions, BREAKDOWN_DEFS.devices.metrics, ga4PathFilter);
  const devicesCompQ = useGa4DimensionRows(siteId, comparisonRange, BREAKDOWN_DEFS.devices.dimensions, BREAKDOWN_DEFS.devices.metrics, ga4PathFilter);

  const after = toKpi(afterMetrics);
  const comparison = toKpi(compMetrics);
  // 比較データが実質欠損（前年同期で 0 など）の場合は比較を出さない
  const hasComparison =
    !!comparison &&
    !!compFrom &&
    (Number(comparison.sessions) > 0 || Number(comparison.impressions) > 0);

  const changes = {};
  if (after && hasComparison) {
    for (const f of KPI_NUMERIC_FIELDS) {
      changes[f] = calculateChangePercent(after[f], comparison[f]);
    }
  }

  const timelineRows = timelineQuery.data?.rows || [];
  const timeseries = bucketTimeseries(timelineRows, granularity);
  // 比較期間を取りに行ったがデータが実質ゼロ（前年同期に旧サイトのデータが無い等）
  const comparisonLikelyEmpty = !!compFrom && !!comparison && Number(comparison.sessions) === 0;

  // ブレイクダウンの merge（hasComparison 時のみ比較値を付与）
  const buildBreakdown = (def, afterRows, compRows) => {
    const rows = mergeComparisonRows(afterRows || [], hasComparison ? compRows || [] : [], def.keyField, def.valueFields);
    return {
      keyField: def.keyField,
      keyLabel: def.keyLabel,
      valueFields: def.valueFields,
      defaultSortKey: def.defaultSortKey,
      rows,
    };
  };

  // キーワード流入（GSC query）— afterMetrics / compMetrics が取得済みの topQueries を再利用（パス限定フィルタ適用済み）。
  // topQueries は最大25,000件になり得るため、after 側はクリック上位50件にキャップしてからマージ（表示は上位20件）。
  const afterQueries = (afterMetrics.gsc?.topQueries || [])
    .slice()
    .sort((a, b) => (Number(b.clicks) || 0) - (Number(a.clicks) || 0))
    .slice(0, 50);
  const keywords = {
    keyField: 'query',
    keyLabel: 'キーワード',
    valueFields: KEYWORD_VALUE_FIELDS,
    defaultSortKey: 'clicks',
    rows: mergeComparisonRows(
      afterQueries,
      hasComparison ? (compMetrics.gsc?.topQueries || []) : [],
      'query',
      KEYWORD_VALUE_FIELDS
    ),
  };

  // コンバージョン項目別（サイト設定の各CVイベントの件数を前後比較）。
  // CV件数は KPI（useSiteMetrics 経由）で取得済みの conversionEvents マップ（eventName→件数・パス限定済み）を再利用。
  // CV率＝そのイベント件数 / 総セッション。追加の GA4 コールは不要。
  const CV_ITEM_VALUE_FIELDS = ['conversions', 'conversionRate'];
  const buildConversionItemRow = (def, evMap, sessions) => {
    const cv = Number(evMap?.[def.eventName]) || 0;
    return {
      label: def.displayName || def.eventName,
      eventName: def.eventName,
      conversions: cv,
      conversionRate: sessions > 0 ? cv / sessions : 0,
    };
  };
  const cvDefs = Array.isArray(conversionEventDefs) ? conversionEventDefs.filter((d) => d?.eventName) : [];
  const afterEvMap = after?.conversionEvents || {};
  const compEvMap = comparison?.conversionEvents || {};
  const afterSessions = Number(after?.sessions) || 0;
  const compSessions = Number(comparison?.sessions) || 0;
  const conversionItems = {
    keyField: 'label',
    keyLabel: 'コンバージョン項目',
    valueFields: CV_ITEM_VALUE_FIELDS,
    defaultSortKey: 'conversions',
    rows: mergeComparisonRows(
      cvDefs.map((d) => buildConversionItemRow(d, afterEvMap, afterSessions)),
      hasComparison ? cvDefs.map((d) => buildConversionItemRow(d, compEvMap, compSessions)) : [],
      'label',
      CV_ITEM_VALUE_FIELDS
    ),
  };

  const breakdowns = {
    channels: buildBreakdown(BREAKDOWN_DEFS.channels, channelsAfterQ.data, channelsCompQ.data),
    pages: buildBreakdown(BREAKDOWN_DEFS.pages, pagesAfterQ.data, pagesCompQ.data),
    devices: buildBreakdown(BREAKDOWN_DEFS.devices, localizeDeviceRows(devicesAfterQ.data), localizeDeviceRows(devicesCompQ.data)),
    conversionItems,
    keywords,
  };

  const isLoadingBreakdowns =
    channelsAfterQ.isLoading || pagesAfterQ.isLoading || devicesAfterQ.isLoading ||
    (hasComparison && (channelsCompQ.isLoading || pagesCompQ.isLoading || devicesCompQ.isLoading));

  // キーワード流入は GSC のロードに依存（GA4 ブレイクダウンとは独立）
  const isLoadingKeywords =
    !!hasGSCConnection &&
    (afterMetrics.isGSCLoading || (hasComparison && compMetrics.isGSCLoading));

  return {
    kpi: { after, comparison: hasComparison ? comparison : null, changes, hasComparison },
    timeseries,
    breakdowns,
    comparisonLikelyEmpty,
    // ローディング / エラー（GA4 が致命的、GSC は任意）
    isLoadingKpi: afterMetrics.isGA4Loading || (!!compFrom && compMetrics.isGA4Loading),
    isLoadingTimeline: timelineQuery.isLoading,
    isLoadingBreakdowns,
    isLoadingKeywords,
    // GSC 連携の有無（キーワード流入セクションの表示判定に使う）
    hasGSC: !!hasGSCConnection,
    isErrorKpi: afterMetrics.isGA4Error,
    isErrorTimeline: timelineQuery.isError,
    errorKpi: afterMetrics.ga4Error || compMetrics.ga4Error,
    errorTimeline: timelineQuery.error,
    gscError: afterMetrics.gscError,
    refetch: () => {
      afterMetrics.refetch();
      compMetrics.refetch();
      timelineQuery.refetch();
    },
  };
}
