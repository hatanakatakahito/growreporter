import React, { useState, useEffect, useMemo } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import { format, sub } from 'date-fns';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import { useAuth } from '../../contexts/AuthContext';
import { mergeComparisonRows } from '../../utils/comparisonHelpers';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LabelList,
} from 'recharts';

/**
 * 時間帯別分析画面
 * 時間帯別の訪問者とコンバージョンを棒グラフで表示
 */
export default function Hour() {
  const { selectedSite, selectedSiteId, selectSite, sites, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [hiddenBars, setHiddenBars] = useState({});
  const [activeTab, setActiveTab] = useState('chart');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('時間別分析');
  }, []);

  // URLパラメータのsiteIdがあれば選択
  useEffect(() => {
    const siteIdParam = searchParams.get('siteId');
    if (siteIdParam && siteIdParam !== selectedSiteId && sites.some(site => site.id === siteIdParam)) {
      selectSite(siteIdParam);
    }
  }, [searchParams, selectedSiteId, sites, selectSite]);

  // ✅ GA4時間帯別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
  const {
    data: hourData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-hourly-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      console.log('[Hour] Fetching hourly conversion data...');
      const fetchHourlyConversionData = httpsCallable(functions, 'fetchGA4HourlyConversionData');
      const result = await fetchHourlyConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        dimensionFilter: ga4DimensionFilter,
      });
      console.log('[Hour] Hourly conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // 比較期間データ取得
  const { data: compHourlyData } = useQuery({
    queryKey: ['ga4-hourly-conversions-comp', selectedSiteId, comparisonDateRange?.from, comparisonDateRange?.to, ga4DimensionFilter],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4HourlyConversionData');
      const result = await fn({ siteId: selectedSiteId, startDate: comparisonDateRange.from, endDate: comparisonDateRange.to, dimensionFilter: ga4DimensionFilter });
      return result.data;
    },
    enabled: !!selectedSiteId && !!comparisonDateRange?.from && !!comparisonDateRange?.to,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compHourlyData;

  // 凡例クリックでグラフの表示/非表示を切り替え
  const handleLegendClick = (dataKey) => {
    setHiddenBars((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">{label}時</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // カスタム凡例
  const CustomLegend = ({ payload }) => {
    return (
      <div className="mt-4 flex flex-wrap justify-center gap-6">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <div
              className="h-4 w-4 rounded"
              style={{
                backgroundColor: hiddenBars[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenBars[entry.dataKey] ? 0.6 : 1,
              }}
            />
            <span
              className="text-sm"
              style={{
                color: hiddenBars[entry.dataKey] ? '#ccc' : '#374151',
                textDecoration: hiddenBars[entry.dataKey] ? 'line-through' : 'none',
              }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // テーブル用のデータ整形（0時から23時の昇順）
  const tableData =
    hourData?.rows?.map((row) => ({
      hour: parseInt(row.hour),
      sessions: row.sessions || 0,
      users: row.users || 0,
      newUsers: row.newUsers || 0,
      pageViews: row.pageViews || 0,
      engagementRate: row.engagementRate || 0,
      avgSessionDuration: row.avgSessionDuration || 0,
      bounceRate: row.bounceRate || 0,
      conversions: row.conversions || 0,
    })).sort((a, b) => a.hour - b.hour) || [];

  const mergedTableData = useMemo(() => {
    if (!isComparing || !compHourlyData?.rows) return tableData;
    return mergeComparisonRows(tableData, compHourlyData.rows, 'hour', ['sessions', 'users', 'newUsers', 'pageViews', 'conversions', 'engagementRate', 'bounceRate', 'avgSessionDuration']);
  }, [tableData, isComparing, compHourlyData]);

  // グラフ用のデータ整形（0-23時まで全て表示）
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const data = tableData.find((d) => d.hour === hour);
    return {
      hour,
      sessions: data?.sessions || 0,
      conversions: data?.conversions || 0,
    };
  });

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
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 時間帯別分析</h2>
            <p className="text-body-color">
              時間帯別の訪問者とコンバージョンの推移を確認できます
            </p>
          </div>

          {/* ディメンションフィルタ */}
          <DimensionFilters
            siteId={selectedSiteId}
            startDate={dateRange.from}
            endDate={dateRange.to}
            filters={dimensionFilters}
            onFiltersChange={setDimensionFilters}
          />

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert message={error?.message || 'データの読み込みに失敗しました。'} />
          ) : !chartData || chartData.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* タブ */}
              <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
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
              <ChartContainer title="時間帯別グラフ" height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(value) => `${value}時`} />
                    <YAxis
                      yAxisId="left"
                      label={{ value: '訪問者', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'コンバージョン', angle: 90, position: 'insideRight' }}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar
                      yAxisId="left"
                      dataKey="sessions"
                      name="訪問者"
                      fill="#3b82f6"
                      hide={hiddenBars.sessions}
                    >
                      <LabelList dataKey="sessions" position="top" />
                    </Bar>
                    <Bar
                      yAxisId="right"
                      dataKey="conversions"
                      name="コンバージョン"
                      fill="#ef4444"
                      hide={hiddenBars.conversions}
                    >
                      <LabelList dataKey="conversions" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <DataTable
                tableKey="analysis-hour"
                isComparing={isComparing}
                columns={[
                  {
                    key: 'hour',
                    label: '時間帯',
                    sortable: true,
                    required: true,
                    render: (value) => `${value}時`,
                  },
                  {
                    key: 'sessions',
                    label: '訪問者',
                    format: 'number',
                    align: 'right',
                    tooltip: 'sessions',
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
                    key: 'pageViews',
                    label: 'PV数',
                    format: 'number',
                    align: 'right',
                    tooltip: 'pageViews',
                    defaultVisible: false,
                    comparison: true,
                  },
                  {
                    key: 'engagementRate',
                    label: 'ENG率',
                    align: 'right',
                    tooltip: 'engagementRate',
                    defaultVisible: false,
                    comparison: true,
                    render: (value) => `${((value || 0) * 100).toFixed(1)}%`,
                  },
                  {
                    key: 'bounceRate',
                    label: '直帰率',
                    align: 'right',
                    tooltip: 'bounceRate',
                    defaultVisible: false,
                    comparison: true,
                    invertColor: true,
                    render: (value) => `${((value || 0) * 100).toFixed(1)}%`,
                  },
                  {
                    key: 'avgSessionDuration',
                    label: '平均滞在',
                    align: 'right',
                    tooltip: 'avgSessionDuration',
                    defaultVisible: false,
                    comparison: true,
                    render: (value) => {
                      const v = value || 0;
                      const m = Math.floor(v / 60);
                      const s = Math.floor(v % 60);
                      return `${m}:${s.toString().padStart(2, '0')}`;
                    },
                  },
                  {
                    key: 'conversions',
                    label: 'コンバージョン',
                    format: 'number',
                    align: 'right',
                    tooltip: 'conversions',
                    comparison: true,
                  },
                  {
                    key: 'conversionRate',
                    label: 'CVR',
                    align: 'right',
                    tooltip: 'conversionRate',
                    defaultVisible: false,
                    render: (value, row) => {
                      const rate = row.sessions > 0 ? ((row.conversions / row.sessions) * 100).toFixed(2) : '0.00';
                      return `${rate}%`;
                    },
                  },
                ]}
                data={mergedTableData}
                pageSize={24}
                showPagination={false}
                emptyMessage="表示するデータがありません。"
              />
              )}
            </>
          )}

        {/* メモ & AI分析タブ */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <TabbedNoteAndAI
              pageType="analysis/hour"
              noteContent={
                <PageNoteSection
                  userId={currentUser.uid}
                  siteId={selectedSiteId}
                  pageType="analysis/hour"
                  dateRange={dateRange}
                />
              }
              aiContent={
                !isLoading && hourData ? (
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.HOUR}
                    rawData={hourData}
                    period={{
                      startDate: dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                      endDate: dateRange?.to || new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                    }}
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
        {selectedSiteId && !isLoading && hourData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.HOUR}
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
