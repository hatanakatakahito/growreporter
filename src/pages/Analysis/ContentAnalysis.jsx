import React, { useState, useEffect, useMemo } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useGA4Data } from '../../hooks/useGA4Data';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import { ExternalLink } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { mergeComparisonRows } from '../../utils/comparisonHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteDetail } from '../../hooks/useSiteDetail';
import TourHelpButton from '../../components/Onboarding/TourHelpButton';
import { getShortLabel, formatComparisonLabel } from '../../constants/metrics';
import { Button } from '../../components/ui/button';

/**
 * 興味度スコア計算
 * GTMデータあり (V2): 5指標（エンゲージメント率20% + スクロール深度25% + 滞在時間20% + 非直帰率15% + CTAクリック率20%）
 * scrollデータあり (V1): 4指標均等配分（各25%）
 * scrollデータなし: 3指標均等配分（各33.3%）
 */
function calcInterestScore(engagementRate, scrollCount, pageViews, avgDuration, bounceRate, gtmScrollDepth, ctaClicks) {
  const engScore = engagementRate * 100;
  const durationScore = Math.min(avgDuration / 180, 1) * 100;
  const nonBounceScore = (1 - bounceRate) * 100;

  // V2: GTMスクロール深度データがある場合
  if (gtmScrollDepth && Object.keys(gtmScrollDepth).length > 0) {
    const total = (gtmScrollDepth['25'] || 0) + (gtmScrollDepth['50'] || 0) + (gtmScrollDepth['75'] || 0) + (gtmScrollDepth['100'] || 0);
    const maxPossible = pageViews * 4;
    const scrollDepthScore = maxPossible > 0 ? (total / maxPossible) * 100 : 0;
    const ctaRate = pageViews > 0 ? Math.min((ctaClicks || 0) / pageViews, 1) * 100 : 0;
    return parseFloat((engScore * 0.20 + scrollDepthScore * 0.25 + durationScore * 0.20 + nonBounceScore * 0.15 + ctaRate * 0.20).toFixed(1));
  }

  // V1: GA4デフォルトscrollデータあり
  const hasScrollData = scrollCount !== undefined && scrollCount !== null;
  if (hasScrollData) {
    const scrollRate = pageViews > 0 ? Math.min(scrollCount / pageViews, 1) : 0;
    return parseFloat((engScore * 0.25 + scrollRate * 100 * 0.25 + durationScore * 0.25 + nonBounceScore * 0.25).toFixed(1));
  }

  // scrollデータなし
  return parseFloat((engScore / 3 + durationScore / 3 + nonBounceScore / 3).toFixed(1));
}

/**
 * コンテンツ分析画面
 * ページごとの興味度スコアを中心に分析
 */
export default function ContentAnalysis() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const { siteDetail } = useSiteDetail(selectedSiteId);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isGTMBannerDismissed, setIsGTMBannerDismissed] = useState(() => {
    try { return localStorage.getItem('gr_gtm_banner_dismissed') === 'true'; } catch { return false; }
  });
  const [isGTMModalOpen, setIsGTMModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  useEffect(() => {
    setPageTitle('コンテンツ分析');
  }, []);

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // GA4ページデータ取得
  const {
    data: pageData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['screenPageViews', 'sessions', 'activeUsers', 'newUsers', 'averageSessionDuration', 'engagementRate', 'bounceRate'],
    ['pagePath', 'pageTitle'],
    ga4DimensionFilter
  );

  // scrollイベント取得
  const { data: scrollData } = useQuery({
    queryKey: ['ga4-page-scroll', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: ['eventCount'],
        dimensions: ['pagePath'],
        dimensionFilter: ga4DimensionFilter
          ? { andGroup: { expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'scroll' } } },
              ga4DimensionFilter,
            ] } }
          : { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'scroll' } } },
      });
      const map = {};
      (result.data?.rows || []).forEach(row => {
        map[row.pagePath] = (map[row.pagePath] || 0) + (row.eventCount || 0);
      });
      return map;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    staleTime: 5 * 60 * 1000,
  });

  // GTMカスタムイベント: gr_scroll_depth（25/50/75/100%の詳細スクロール深度）
  const { data: gtmScrollData } = useQuery({
    queryKey: ['ga4-gtm-scroll-depth', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: ['eventCount'],
        dimensions: ['pagePath', 'customEvent:scroll_percentage'],
        dimensionFilter: ga4DimensionFilter
          ? { andGroup: { expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'gr_scroll_depth' } } },
              ga4DimensionFilter,
            ] } }
          : { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'gr_scroll_depth' } } },
      });
      // { [pagePath]: { 25: count, 50: count, 75: count, 100: count } }
      const map = {};
      (result.data?.rows || []).forEach(row => {
        const path = row.pagePath;
        const pct = row['customEvent:scroll_percentage'];
        if (!map[path]) map[path] = {};
        map[path][pct] = (map[path][pct] || 0) + (row.eventCount || 0);
      });
      return map;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // GTMカスタムイベント: gr_cta_click（CTAクリック）
  const { data: gtmCtaData } = useQuery({
    queryKey: ['ga4-gtm-cta-click', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: ['eventCount'],
        dimensions: ['pagePath'],
        dimensionFilter: ga4DimensionFilter
          ? { andGroup: { expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'gr_cta_click' } } },
              ga4DimensionFilter,
            ] } }
          : { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'gr_cta_click' } } },
      });
      const map = {};
      (result.data?.rows || []).forEach(row => {
        map[row.pagePath] = (map[row.pagePath] || 0) + (row.eventCount || 0);
      });
      return map;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // GTMデータの存在チェック
  const hasGTMData = useMemo(() => {
    return gtmScrollData && Object.keys(gtmScrollData).length > 0;
  }, [gtmScrollData]);

  // 比較期間データ
  const { data: compPageData } = useGA4Data(
    comparisonDateRange ? selectedSiteId : null,
    comparisonDateRange?.from,
    comparisonDateRange?.to,
    ['screenPageViews', 'sessions', 'activeUsers', 'newUsers', 'averageSessionDuration', 'engagementRate', 'bounceRate'],
    ['pagePath'],
    ga4DimensionFilter
  );

  const { data: compScrollData } = useQuery({
    queryKey: ['ga4-page-scroll', selectedSiteId, comparisonDateRange?.from, comparisonDateRange?.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId: selectedSiteId,
        startDate: comparisonDateRange.from,
        endDate: comparisonDateRange.to,
        metrics: ['eventCount'],
        dimensions: ['pagePath'],
        dimensionFilter: ga4DimensionFilter
          ? { andGroup: { expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'scroll' } } },
              ga4DimensionFilter,
            ] } }
          : { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'scroll' } } },
      });
      const map = {};
      (result.data?.rows || []).forEach(row => {
        map[row.pagePath] = (map[row.pagePath] || 0) + (row.eventCount || 0);
      });
      return map;
    },
    enabled: !!selectedSiteId && !!comparisonDateRange?.from && !!comparisonDateRange?.to && comparisonMode !== 'none',
    staleTime: 5 * 60 * 1000,
  });

  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compPageData;

  const shortenUrl = (url) => {
    if (!url) return '/';
    return url.length > 50 ? url.substring(0, 47) + '...' : url;
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // scrollデータの信頼性チェック: GTM未設定の場合scrollDataは空or極端に少ない
  const isScrollDataReliable = useMemo(() => {
    if (!scrollData || Object.keys(scrollData).length === 0) return false;
    // scrollイベントが記録されたページが全体の5%未満なら信頼できない
    const totalPages = pageData?.rows?.length || 0;
    const scrollPages = Object.keys(scrollData).length;
    return totalPages > 0 && scrollPages / totalPages >= 0.05;
  }, [scrollData, pageData]);

  // テーブルデータ（PV降順）
  const tableData = useMemo(() => {
    if (!pageData?.rows) return [];
    return pageData.rows
      .map((row) => {
        const path = row.pagePath || '/';
        const pageViews = row.screenPageViews || 0;
        const sessions = row.sessions || 0;
        const engRate = row.engagementRate || 0;
        const bRate = row.bounceRate || 0;
        const avgDur = row.averageSessionDuration || 0;
        const scrollCount = isScrollDataReliable ? scrollData?.[path] : undefined;
        const hasScroll = scrollCount !== undefined && scrollCount !== null;
        const scrollRate = hasScroll && pageViews > 0 ? Math.min(scrollCount / pageViews, 1) : null;
        const gtmDepth = hasGTMData ? (gtmScrollData?.[path] || {}) : undefined;
        const ctaClicks = hasGTMData ? (gtmCtaData?.[path] || 0) : undefined;
        const interestScore = calcInterestScore(engRate, hasScroll ? scrollCount : undefined, pageViews, avgDur, bRate, gtmDepth, ctaClicks);

        // CTAクリック率
        const ctaRate = hasGTMData && pageViews > 0 ? ((ctaClicks || 0) / pageViews * 100) : null;

        return {
          path,
          title: row.pageTitle || '(タイトルなし)',
          shortUrl: shortenUrl(path),
          pageViews,
          sessions,
          users: row.activeUsers || 0,
          engagementRate: (engRate * 100).toFixed(1),
          bounceRate: (bRate * 100).toFixed(1),
          avgDuration: avgDur,
          ctaRate: ctaRate !== null ? ctaRate.toFixed(1) : null,
          // GTMスクロール深度（25/50/75/100%到達率）
          scrollDepth25: gtmDepth?.['25'] !== undefined && pageViews > 0 ? ((gtmDepth['25'] / pageViews) * 100).toFixed(1) : null,
          scrollDepth50: gtmDepth?.['50'] !== undefined && pageViews > 0 ? ((gtmDepth['50'] / pageViews) * 100).toFixed(1) : null,
          scrollDepth75: gtmDepth?.['75'] !== undefined && pageViews > 0 ? ((gtmDepth['75'] / pageViews) * 100).toFixed(1) : null,
          scrollDepth100: gtmDepth?.['100'] !== undefined && pageViews > 0 ? ((gtmDepth['100'] / pageViews) * 100).toFixed(1) : null,
          scrollRate: scrollRate !== null ? (scrollRate * 100).toFixed(1) : null,
          interestScore,
        };
      })
      .sort((a, b) => b.pageViews - a.pageViews);
  }, [pageData, scrollData, isScrollDataReliable, hasGTMData, gtmScrollData, gtmCtaData]);

  // 比較データマージ
  const mergedTableData = useMemo(() => {
    if (!isComparing || !compPageData?.rows) return tableData;
    const compTable = compPageData.rows.map((row) => {
      const path = row.pagePath || '/';
      const pageViews = row.screenPageViews || 0;
      const engRate = row.engagementRate || 0;
      const bRate = row.bounceRate || 0;
      const avgDur = row.averageSessionDuration || 0;
      const scrollCount = isScrollDataReliable ? compScrollData?.[path] : undefined;
      const hasScroll = scrollCount !== undefined && scrollCount !== null;
      const scrollRate = hasScroll && pageViews > 0 ? Math.min(scrollCount / pageViews, 1) : null;
      return {
        path,
        pageViews,
        sessions: row.sessions || 0,
        users: row.activeUsers || 0,
        engagementRate: (engRate * 100).toFixed(1),
        bounceRate: (bRate * 100).toFixed(1),
        avgDuration: avgDur,
        scrollRate: scrollRate !== null ? (scrollRate * 100).toFixed(1) : null,
        interestScore: calcInterestScore(engRate, hasScroll ? scrollCount : undefined, pageViews, avgDur, bRate),
      };
    });
    return mergeComparisonRows(tableData, compTable, 'path', ['pageViews', 'sessions', 'users', 'engagementRate', 'bounceRate', 'avgDuration', 'scrollRate', 'interestScore']);
  }, [tableData, isComparing, compPageData, compScrollData]);

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-dark dark:text-white">
                  コンテンツ分析
                </h2>
                <TourHelpButton tourId="analysisContent" />
              </div>
              <p className="mt-0.5 text-sm text-body-color">
                ページごとの興味度スコアを分析し、改善すべきコンテンツを特定します
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 pt-0.5" data-tour="analysis-dimension-filters">
              <DimensionFilters
                siteId={selectedSiteId}
                startDate={dateRange.from}
                endDate={dateRange.to}
                filters={dimensionFilters}
                onFiltersChange={setDimensionFilters}
              />
            </div>
          </div>

          {/* GTM未設定バナー */}
          {!hasGTMData && !isGTMBannerDismissed && !isLoading && tableData.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 relative dark:border-indigo-900/30 dark:from-indigo-900/10 dark:to-purple-900/10">
              <div className="flex-1">
                <div className="text-sm font-bold text-dark dark:text-white mb-1">より詳細なコンテンツ分析が可能です</div>
                <div className="text-xs text-body-color dark:text-dark-6 leading-relaxed">
                  GTMテンプレートを導入すると、スクロール深度（25/50/75/100%）とCTAクリック率の詳細データが取得でき、興味度スコアの精度が向上します。
                </div>
                <div className="mt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsGTMModalOpen(true)}
                  >
                    サイト設定で導入する →
                  </Button>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsGTMBannerDismissed(true);
                  try { localStorage.setItem('gr_gtm_banner_dismissed', 'true'); } catch {}
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert
              message={error?.message || 'データの読み込みに失敗しました。'}
            />
          ) : !tableData || tableData.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* スコアモード表示 */}
              {hasGTMData && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    拡張スコア (GTM)
                  </span>
                  <span className="text-xs text-body-color">GTMのスクロール深度+CTAクリックデータを含む5指標で算出</span>
                </div>
              )}

              {/* データテーブル */}
              <DataTable
                columns={[
                  {
                    key: 'path',
                    label: 'ページパス',
                    required: true,
                    render: (value, row) => (
                      <div>
                        <div className="flex items-center gap-1">
                          {selectedSite?.siteUrl ? (
                            <a
                              href={`${selectedSite.siteUrl}${value}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <span className="truncate max-w-md font-medium">{value}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate max-w-md font-medium">{value}</span>
                          )}
                        </div>
                        {row.title !== '(タイトルなし)' && (
                          <span className="text-xs text-body-color truncate max-w-md">{row.title}</span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'interestScore',
                    label: '興味スコア',
                    align: 'right',
                    tooltip: 'interestScore',
                    sortable: true,
                    comparison: true,
                    render: (value) => {
                      const v = parseFloat(value);
                      const color = v >= 70 ? 'text-primary' : v >= 40 ? 'text-dark dark:text-white' : 'text-body-color';
                      return <span className={`font-semibold ${color}`}>{v.toFixed(1)}</span>;
                    },
                  },
                  {
                    key: 'scrollRate',
                    label: '完読率',
                    align: 'right',
                    tooltip: 'scrollRate',
                    sortable: true,
                    comparison: true,
                    render: (value) => value !== null ? `${value}%` : <span className="text-body-color">-</span>,
                  },
                  {
                    key: 'pageViews',
                    label: getShortLabel('pageViews'),
                    format: 'number',
                    align: 'right',
                    tooltip: 'screenPageViews',
                    sortable: true,
                    comparison: true,
                  },
                  {
                    key: 'engagementRate',
                    label: getShortLabel('engagementRate'),
                    align: 'right',
                    tooltip: 'engagementRate',
                    sortable: true,
                    comparison: true,
                    render: (value) => `${value}%`,
                  },
                  {
                    key: 'bounceRate',
                    label: getShortLabel('bounceRate'),
                    align: 'right',
                    tooltip: 'bounceRate',
                    sortable: true,
                    comparison: true,
                    invertColor: true,
                    defaultVisible: false,
                    render: (value) => `${value}%`,
                  },
                  {
                    key: 'avgDuration',
                    label: getShortLabel('avgDuration'),
                    align: 'right',
                    tooltip: 'avgSessionDuration',
                    sortable: true,
                    comparison: true,
                    render: (value) => formatDuration(value),
                  },
                  {
                    key: 'sessions',
                    label: getShortLabel('sessions'),
                    format: 'number',
                    align: 'right',
                    tooltip: 'sessions',
                    sortable: true,
                    defaultVisible: false,
                    comparison: true,
                  },
                  ...(hasGTMData ? [
                    {
                      key: 'ctaRate',
                      label: 'CTAクリック率',
                      align: 'right',
                      sortable: true,
                      render: (value) => value !== null ? `${value}%` : <span className="text-body-color">-</span>,
                    },
                    {
                      key: 'scrollDepth25',
                      label: '25%到達率',
                      align: 'right',
                      sortable: true,
                      defaultVisible: false,
                      render: (value) => value !== null ? `${value}%` : <span className="text-body-color">-</span>,
                    },
                    {
                      key: 'scrollDepth50',
                      label: '50%到達率',
                      align: 'right',
                      sortable: true,
                      defaultVisible: false,
                      render: (value) => value !== null ? `${value}%` : <span className="text-body-color">-</span>,
                    },
                    {
                      key: 'scrollDepth75',
                      label: '75%到達率',
                      align: 'right',
                      sortable: true,
                      defaultVisible: false,
                      render: (value) => value !== null ? `${value}%` : <span className="text-body-color">-</span>,
                    },
                    {
                      key: 'scrollDepth100',
                      label: '100%到達率',
                      align: 'right',
                      sortable: true,
                      defaultVisible: false,
                      render: (value) => value !== null ? `${value}%` : <span className="text-body-color">-</span>,
                    },
                  ] : []),
                ]}
                tableKey="analysis-content"
                data={mergedTableData}
                pageSize={25}
                showPagination={true}
                emptyMessage="表示するデータがありません。"
                showTotals
              />

            </>
          )}

          {/* メモ & AI分析タブ */}
          {selectedSiteId && currentUser && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="contentAnalysis"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="contentAnalysis"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  !isLoading && pageData ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.CONTENT_ANALYSIS}
                      rawData={{ ...pageData, scrollData: scrollData || {}, gtmScrollData: gtmScrollData || {}, gtmCtaData: gtmCtaData || {} }}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
                      comparisonRawData={isComparing ? { ...compPageData, scrollData: compScrollData || {} } : null}
                      comparisonPeriod={isComparing ? { startDate: comparisonDateRange?.from, endDate: comparisonDateRange?.to } : null}
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      データを読み込み中...
                    </div>
                  )
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && !isLoading && pageData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.CONTENT_ANALYSIS}
            onScrollToAI={scrollToAIAnalysis}
          />
        )}

        {/* 制限超過モーダル */}
        {isLimitModalOpen && (
          <PlanLimitModal
            onClose={() => setIsLimitModalOpen(false)}
            type="summary"
          />
        )}

        {/* GTMセットアップモーダル */}
        {isGTMModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsGTMModalOpen(false)}>
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-dark dark:text-white">GTM連携（詳細行動分析）</h3>
                <button onClick={() => setIsGTMModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="mb-4 text-xs text-body-color dark:text-dark-6">
                Googleタグマネージャーにテンプレートをインポートすると、スクロール深度（25/50/75/100%）とCTAクリックの詳細データが取得でき、コンテンツ分析の精度が向上します。
              </p>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
                <div className="mb-3 text-sm font-semibold text-dark dark:text-white">セットアップ手順</div>
                <ol className="space-y-3 text-sm text-body-color dark:text-dark-6">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
                    <div>
                      <span className="font-medium text-dark dark:text-white">テンプレートをダウンロード＆インポート</span>
                      <div className="mt-1 mb-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/gtm/growreporter-gtm-template.json');
                              const template = await res.json();
                              const mid = siteDetail?.ga4MeasurementId || 'G-XXXXXXXXXX';
                              const json = JSON.stringify(template, null, 4).replace(/G-XXXXXXXXXX/g, mid);
                              const blob = new Blob([json], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `growreporter-gtm-${mid}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error('GTMテンプレートDLエラー:', err);
                            }
                          }}
                        >
                          <svg data-slot="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          GTMテンプレートをダウンロード
                        </Button>
                      </div>
                      <div className="text-xs">GTM管理画面 → 管理 → コンテナをインポート → <strong className="text-dark dark:text-white">必ず「統合」を選択</strong>して送信</div>
                    </div>
                  </li>
                  {!siteDetail?.ga4MeasurementId && (
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span>
                    <div>
                      <span className="font-medium text-dark dark:text-white">GA4測定IDを変更</span>
                      <div className="mt-0.5 text-xs">
                        インポート後、タグ「GR - スクロール深度イベント」と「GR - CTAクリックイベント」を開き、測定IDの「G-XXXXXXXXXX」をサイトのGA4測定IDに変更してください。
                        <span className="text-body-color"><br />※ 測定IDはGA4管理画面 → 管理 → データストリーム → ウェブ で確認できます</span>
                      </div>
                    </div>
                  </li>
                  )}
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{siteDetail?.ga4MeasurementId ? '2' : '3'}</span>
                    <div>
                      <span className="font-medium text-dark dark:text-white">プレビュー＆公開</span>
                      <div className="mt-0.5 text-xs">GTMのプレビューモードで動作確認し、問題なければ公開してください。データは翌日からコンテンツ分析画面に反映されます。</div>
                    </div>
                  </li>
                </ol>
              </div>
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-2.5 dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex gap-2">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div className="text-xs text-body-color dark:text-dark-6">
                    <span className="font-medium text-dark dark:text-white">GTM未設定でも利用可能です。</span>
                    GA4のデフォルトのスクロールイベント（90%到達）でコンテンツ分析は動作します。
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
