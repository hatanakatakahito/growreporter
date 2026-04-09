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

/**
 * 興味度スコア計算
 * scrollデータあり: 4指標均等配分（各25%）
 * scrollデータなし: 3指標均等配分（各33.3%）
 */
function calcInterestScore(engagementRate, scrollCount, pageViews, avgDuration, bounceRate) {
  const hasScrollData = scrollCount !== undefined && scrollCount !== null;
  const engScore = engagementRate * 100;
  const durationScore = Math.min(avgDuration / 180, 1) * 100;
  const nonBounceScore = (1 - bounceRate) * 100;
  if (hasScrollData) {
    const scrollRate = pageViews > 0 ? Math.min(scrollCount / pageViews, 1) : 0;
    return parseFloat((engScore * 0.25 + scrollRate * 100 * 0.25 + durationScore * 0.25 + nonBounceScore * 0.25).toFixed(1));
  }
  return parseFloat((engScore / 3 + durationScore / 3 + nonBounceScore / 3).toFixed(1));
}

/**
 * コンテンツ分析画面
 * ページごとの興味度スコアを中心に分析
 */
export default function ContentAnalysis() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
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
        const interestScore = calcInterestScore(engRate, hasScroll ? scrollCount : undefined, pageViews, avgDur, bRate);

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
          scrollRate: scrollRate !== null ? (scrollRate * 100).toFixed(1) : null,
          interestScore,
        };
      })
      .sort((a, b) => b.pageViews - a.pageViews);
  }, [pageData, scrollData]);

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
              <h2 className="text-lg font-bold text-dark dark:text-white">
                コンテンツ分析
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                ページごとの興味度スコアを分析し、改善すべきコンテンツを特定します
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
              <DimensionFilters
                siteId={selectedSiteId}
                startDate={dateRange.from}
                endDate={dateRange.to}
                filters={dimensionFilters}
                onFiltersChange={setDimensionFilters}
              />
            </div>
          </div>

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
                      return <span className={`font-semibold ${color}`}>{value}</span>;
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
                    label: 'ページビュー',
                    format: 'number',
                    align: 'right',
                    tooltip: 'screenPageViews',
                    sortable: true,
                    comparison: true,
                  },
                  {
                    key: 'engagementRate',
                    label: 'ENG率',
                    align: 'right',
                    tooltip: 'engagementRate',
                    sortable: true,
                    comparison: true,
                    render: (value) => `${value}%`,
                  },
                  {
                    key: 'bounceRate',
                    label: '直帰率',
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
                    label: '平均滞在時間',
                    align: 'right',
                    tooltip: 'avgSessionDuration',
                    sortable: true,
                    comparison: true,
                    render: (value) => formatDuration(value),
                  },
                  {
                    key: 'sessions',
                    label: '訪問者',
                    format: 'number',
                    align: 'right',
                    tooltip: 'sessions',
                    sortable: true,
                    defaultVisible: false,
                    comparison: true,
                  },
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
                      rawData={{ ...pageData, scrollData: scrollData || {} }}
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
      </main>
    </div>
  );
}
