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
  'engagementRate',
  'conversions',
  'conversionRate',
  'pageViews',
  'impressions',
  'clicks',
  'ctr',
  'position',
];

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
  return {
    sessions,
    users: Number(m.totalUsers) || 0,
    newUsers: Number(m.newUsers) || 0,
    engagementRate: Number(m.engagementRate) || 0,
    conversions,
    conversionRate: sessions > 0 ? conversions / sessions : 0,
    pageViews: Number(m.pageViews) || 0,
    impressions: Number(m.impressions) || 0,
    clicks: Number(m.clicks) || 0,
    ctr: Number(m.ctr) || 0,
    position: Number(m.position) || 0,
  };
}

/** GA4 dimensioned query（rows を返す）。range が無ければ無効 */
function useGa4DimensionRows(siteId, range, dimensions, metrics) {
  const from = range?.from || null;
  const to = range?.to || null;
  return useQuery({
    queryKey: ['cm-ga4-dim', siteId, from, to, dimensions.join(','), metrics.join(',')],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4Data');
      const result = await fn({ siteId, startDate: from, endDate: to, metrics, dimensions });
      return result.data?.rows || [];
    },
    enabled: !!siteId && !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCloseMeetingData({
  siteId,
  observationRange,
  comparisonRange,
  timelineRange,
  granularity = 'day',
  hasGSCConnection = true,
}) {
  const obsFrom = observationRange?.from || null;
  const obsTo = observationRange?.to || null;
  const compFrom = comparisonRange?.from || null;
  const compTo = comparisonRange?.to || null;
  const tlFrom = timelineRange?.from || null;
  const tlTo = timelineRange?.to || null;

  // 公開後（観測期間）/ 比較期間（旧サイト側）のサマリー指標
  const afterMetrics = useSiteMetrics(siteId, obsFrom, obsTo, hasGSCConnection);
  const compMetrics = useSiteMetrics(siteId, compFrom, compTo, hasGSCConnection);

  // 時系列（日次）— 公開前後を1本のグラフにするためのレンジで取得
  const timelineQuery = useQuery({
    queryKey: ['cm-timeline', siteId, tlFrom, tlTo],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4DailyConversionData');
      const result = await fn({ siteId, startDate: tlFrom, endDate: tlTo });
      return result.data;
    },
    enabled: !!siteId && !!tlFrom && !!tlTo,
    staleTime: 5 * 60 * 1000,
  });

  // ブレイクダウン（チャネル / ページ / デバイス × 観測期間 / 比較期間）
  const channelsAfterQ = useGa4DimensionRows(siteId, observationRange, BREAKDOWN_DEFS.channels.dimensions, BREAKDOWN_DEFS.channels.metrics);
  const channelsCompQ = useGa4DimensionRows(siteId, comparisonRange, BREAKDOWN_DEFS.channels.dimensions, BREAKDOWN_DEFS.channels.metrics);
  const pagesAfterQ = useGa4DimensionRows(siteId, observationRange, BREAKDOWN_DEFS.pages.dimensions, BREAKDOWN_DEFS.pages.metrics);
  const pagesCompQ = useGa4DimensionRows(siteId, comparisonRange, BREAKDOWN_DEFS.pages.dimensions, BREAKDOWN_DEFS.pages.metrics);
  const devicesAfterQ = useGa4DimensionRows(siteId, observationRange, BREAKDOWN_DEFS.devices.dimensions, BREAKDOWN_DEFS.devices.metrics);
  const devicesCompQ = useGa4DimensionRows(siteId, comparisonRange, BREAKDOWN_DEFS.devices.dimensions, BREAKDOWN_DEFS.devices.metrics);

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

  const breakdowns = {
    channels: buildBreakdown(BREAKDOWN_DEFS.channels, channelsAfterQ.data, channelsCompQ.data),
    pages: buildBreakdown(BREAKDOWN_DEFS.pages, pagesAfterQ.data, pagesCompQ.data),
    devices: buildBreakdown(BREAKDOWN_DEFS.devices, devicesAfterQ.data, devicesCompQ.data),
  };

  const isLoadingBreakdowns =
    channelsAfterQ.isLoading || pagesAfterQ.isLoading || devicesAfterQ.isLoading ||
    (hasComparison && (channelsCompQ.isLoading || pagesCompQ.isLoading || devicesCompQ.isLoading));

  return {
    kpi: { after, comparison: hasComparison ? comparison : null, changes, hasComparison },
    timeseries,
    breakdowns,
    comparisonLikelyEmpty,
    // ローディング / エラー（GA4 が致命的、GSC は任意）
    isLoadingKpi: afterMetrics.isGA4Loading || (!!compFrom && compMetrics.isGA4Loading),
    isLoadingTimeline: timelineQuery.isLoading,
    isLoadingBreakdowns,
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
