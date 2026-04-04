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
import ChartContainer from '../../components/Analysis/ChartContainer';
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

/**
 * ページ別分析画面
 * GA4のページ別データを表示
 */
export default function Pages() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('table');
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  // AI分析タブへスクロールする関数
  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ページ別');
  }, []);

  // GA4データ取得（ページ別）
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

  // ページ別コンバージョンデータ取得
  const conversionEvents = selectedSite?.conversionEvents || [];
  const { data: conversionData } = useQuery({
    queryKey: ['ga4-page-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      if (conversionEvents.length === 0) return {};
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: ['eventCount'],
        dimensions: ['pagePath', 'eventName'],
        dimensionFilter: ga4DimensionFilter
          ? {
              andGroup: {
                expressions: [
                  { filter: { fieldName: 'eventName', inListFilter: { values: conversionEvents.map(e => e.eventName) } } },
                  ga4DimensionFilter,
                ],
              },
            }
          : { filter: { fieldName: 'eventName', inListFilter: { values: conversionEvents.map(e => e.eventName) } } },
      });
      const map = {};
      (result.data?.rows || []).forEach(row => {
        const path = row.pagePath;
        map[path] = (map[path] || 0) + (row.eventCount || 0);
      });
      return map;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && conversionEvents.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // 比較期間データ（pageTitleを含めるとパス重複で比較値が壊れるためpagePathのみ）
  const { data: compPageData } = useGA4Data(
    comparisonDateRange ? selectedSiteId : null,
    comparisonDateRange?.from,
    comparisonDateRange?.to,
    ['screenPageViews', 'sessions', 'activeUsers', 'newUsers', 'averageSessionDuration', 'engagementRate', 'bounceRate'],
    ['pagePath'],
    ga4DimensionFilter
  );

  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compPageData;

  // URLを短縮表示
  const shortenUrl = (url) => {
    if (!url) return '/';
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  };

  // テーブル用のデータ整形（ページビュー数降順）
  const tableData = useMemo(() => {
    if (!pageData?.rows) return [];
    return pageData.rows
      .map((row) => {
        const path = row.pagePath || '/';
        const sessions = row.sessions || 0;
        const conversions = conversionData?.[path] || 0;
        return {
          path,
          title: row.pageTitle || '(タイトルなし)',
          shortUrl: shortenUrl(path),
          pageViews: row.screenPageViews || 0,
          sessions,
          users: row.activeUsers || 0,
          newUsers: row.newUsers || 0,
          engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
          bounceRate: ((row.bounceRate || 0) * 100).toFixed(1),
          avgDuration: row.averageSessionDuration || 0,
          conversions,
          conversionRate: sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : '0.00',
        };
      })
      .sort((a, b) => b.pageViews - a.pageViews);
  }, [pageData, conversionData]);

  const mergedTableData = useMemo(() => {
    if (!isComparing || !compPageData?.rows) return tableData;
    const compTable = compPageData.rows.map((row) => ({
      path: row.pagePath || '/',
      pageViews: row.screenPageViews || 0,
      sessions: row.sessions || 0,
      users: row.activeUsers || 0,
      newUsers: row.newUsers || 0,
      engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
      bounceRate: ((row.bounceRate || 0) * 100).toFixed(1),
      avgDuration: row.averageSessionDuration || 0,
    }));
    return mergeComparisonRows(tableData, compTable, 'path', ['pageViews', 'sessions', 'users', 'newUsers', 'engagementRate', 'bounceRate', 'avgDuration']);
  }, [tableData, isComparing, compPageData]);

  // グラフ用のデータ（上位10件）
  const chartData = [...tableData].slice(0, 10);

  // 合計値の計算
  const totalPageViews = tableData.reduce((sum, row) => sum + row.pageViews, 0);

  // 時間のフォーマット
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 凡例クリックハンドラー
  const handleLegendClick = (dataKey) => {
    setHiddenSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // カスタム凡例
  const CustomLegend = ({ payload }) => {
    return (
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-1.5 transition-opacity hover:opacity-70"
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <div
              className="h-2.5 w-2.5 rounded"
              style={{
                backgroundColor: hiddenSeries[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenSeries[entry.dataKey] ? 0.3 : 1,
              }}
            />
            <span
              className="text-xs"
              style={{
                color: hiddenSeries[entry.dataKey] ? '#ccc' : entry.color,
                textDecoration: hiddenSeries[entry.dataKey] ? 'line-through' : 'none',
              }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="max-w-md rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 truncate text-xs font-semibold text-dark dark:text-white">
            {payload[0].payload.path}
          </p>
          {payload
            .filter((entry) => !hiddenSeries[entry.dataKey])
            .map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value?.toLocaleString()}
              </p>
            ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={false}
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark dark:text-white">
                エンゲージメント - ページ別
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                ページ別のページビュー数、エンゲージメント率、平均滞在時間を確認できます
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
              {/* タブ */}
              <div className="mb-6 mt-4 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'chart'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  グラフ形式
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'table'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  表形式
                </button>
              </div>

              {/* タブコンテンツ */}
              {activeTab === 'chart' ? (
                <ChartContainer title="ページ別ページビュー数（上位10件）" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="shortUrl"
                        angle={-45}
                        textAnchor="end"
                        height={120}
                        interval={0}
                      />
                      <YAxis tickFormatter={(v) => v.toLocaleString()} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                      <Bar
                        dataKey="pageViews"
                        name="ページビュー"
                        fill="#3b82f6"
                        hide={hiddenSeries.pageViews}
                      />
                      <Bar
                        dataKey="sessions"
                        name="訪問者"
                        fill="#10b981"
                        hide={hiddenSeries.sessions}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  tableKey="analysis-pages"
                  isComparing={isComparing}
                  columns={[
                    {
                      key: 'path',
                      label: 'ページパス',
                      sortable: true,
                      required: true,
                      render: (value, row) => (
                        <div className="flex flex-col gap-1">
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="truncate max-w-md font-medium">{value}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          <span className="text-xs text-body-color truncate max-w-md">
                            {row.title}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'pageViews',
                      label: 'ページビュー',
                      format: 'number',
                      align: 'right',
                      tooltip: 'screenPageViews',
                      comparison: true,
                    },
                    {
                      key: 'sessions',
                      label: '訪問者',
                      format: 'number',
                      align: 'right',
                      tooltip: 'sessions',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'users',
                      label: 'ユーザー',
                      format: 'number',
                      align: 'right',
                      tooltip: 'users',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'newUsers',
                      label: '新規ユーザー',
                      format: 'number',
                      align: 'right',
                      tooltip: 'newUsers',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'engagementRate',
                      label: 'ENG率',
                      align: 'right',
                      tooltip: 'engagementRate',
                      render: (value) => `${value}%`,
                      comparison: true,
                    },
                    {
                      key: 'bounceRate',
                      label: '直帰率',
                      align: 'right',
                      tooltip: 'bounceRate',
                      render: (value) => `${value}%`,
                      defaultVisible: false,
                      comparison: true,
                      invertColor: true,
                    },
                    {
                      key: 'avgDuration',
                      label: '平均滞在時間',
                      align: 'right',
                      tooltip: 'avgSessionDuration',
                      render: (value) => formatDuration(value),
                      comparison: true,
                    },
                    {
                      key: 'conversions',
                      label: 'コンバージョン',
                      format: 'number',
                      align: 'right',
                      tooltip: 'conversions',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'conversionRate',
                      label: 'CVR',
                      align: 'right',
                      tooltip: 'conversionRate',
                      render: (value) => `${value}%`,
                      defaultVisible: false,
                      comparison: true,
                    },
                  ]}
                  data={mergedTableData}
                  pageSize={25}
                  showPagination={true}
                  emptyMessage="表示するデータがありません。"
                  showTotals
                />
              )}
            </>
          )}

        {/* メモ & AI分析タブ */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <TabbedNoteAndAI
              pageType="pages"
              noteContent={
                <PageNoteSection
                  userId={currentUser.uid}
                  siteId={selectedSiteId}
                  pageType="pages"
                  dateRange={dateRange}
                />
              }
              aiContent={
                !isLoading && pageData ? (
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.PAGES}
                    rawData={pageData}
                    period={{
                      startDate: dateRange?.from,
                      endDate: dateRange?.to,
                    }}
                    comparisonRawData={isComparing ? compPageData : null}
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
            pageType={PAGE_TYPES.PAGES}
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

