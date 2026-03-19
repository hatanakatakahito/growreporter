import React, { useState, useEffect, useMemo } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import { format, sub } from 'date-fns';
import { ja } from 'date-fns/locale';
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
import { mergeComparisonByIndex } from '../../utils/comparisonHelpers';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

/**
 * 日別分析画面
 * 日別の訪問者とコンバージョンの推移を表示
 */
export default function Day() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const [hiddenLines, setHiddenLines] = useState({});
  const [activeTab, setActiveTab] = useState('chart');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  // AI分析タブへスクロールする関数
  const scrollToAIAnalysis = () => {
    // AI分析タブに切り替え
    window.dispatchEvent(new Event('switchToAITab'));
    
    // スクロール
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('日別分析');
  }, []);

  // ✅ GA4日別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
  const {
    data: dailyData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-daily-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      console.log('[Day] Fetching daily conversion data...');
      const fetchDailyConversionData = httpsCallable(functions, 'fetchGA4DailyConversionData');
      const result = await fetchDailyConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        dimensionFilter: ga4DimensionFilter,
      });
      console.log('[Day] Daily conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // 比較期間データ取得
  const { data: compDailyData } = useQuery({
    queryKey: ['ga4-daily-conversions-comp', selectedSiteId, comparisonDateRange?.from, comparisonDateRange?.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchDailyConversionData = httpsCallable(functions, 'fetchGA4DailyConversionData');
      const result = await fetchDailyConversionData({
        siteId: selectedSiteId,
        startDate: comparisonDateRange.from,
        endDate: comparisonDateRange.to,
        dimensionFilter: ga4DimensionFilter,
      });
      return result.data;
    },
    enabled: !!selectedSiteId && !!comparisonDateRange?.from && !!comparisonDateRange?.to,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compDailyData;

  // 日付フォーマット関数
  const parseYYYYMMDD = (dateStr) => {
    if (!dateStr) return new Date();
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  };

  const formatDateLabel = (dateStr) => {
    const date = parseYYYYMMDD(dateStr);
    return format(date, 'MM/dd');
  };

  const formatDateFull = (dateStr) => {
    const date = parseYYYYMMDD(dateStr);
    return format(date, 'yyyy年MM月dd日（E）', { locale: ja });
  };

  // 凡例クリックでグラフの表示/非表示を切り替え
  const handleLegendClick = (dataKey) => {
    setHiddenLines((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = parseYYYYMMDD(label);
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">
            {format(date, 'yyyy年MM月dd日')}
          </p>
          {payload
            .filter((entry) => !hiddenLines[entry.dataKey])
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

  // カスタム凡例
  const CustomLegend = ({ payload }) => {
    return (
      <div className="mt-4 flex justify-center gap-6">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <div
              className="h-0.5 w-8"
              style={{
                backgroundColor: hiddenLines[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenLines[entry.dataKey] ? 0.3 : 1,
              }}
            />
            <span
              className="text-sm"
              style={{
                color: hiddenLines[entry.dataKey] ? '#ccc' : entry.color,
                textDecoration: hiddenLines[entry.dataKey] ? 'line-through' : 'none',
              }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // テーブル用のデータ整形
  const COMP_VALUE_FIELDS = ['sessions', 'users', 'newUsers', 'pageViews', 'conversions', 'engagementRate', 'bounceRate', 'avgSessionDuration'];
  const rawRows = dailyData?.rows || [];
  const tableData = useMemo(() => {
    if (!isComparing) return rawRows;
    return mergeComparisonByIndex(rawRows, compDailyData?.rows || [], COMP_VALUE_FIELDS);
  }, [rawRows, isComparing, compDailyData]);

  // グラフ用のデータ整形
  const chartData = useMemo(() => {
    if (!isComparing) return rawRows;
    return rawRows.map((row, i) => {
      const comp = compDailyData?.rows?.[i];
      return {
        ...row,
        sessions_prev: comp?.sessions ?? null,
        conversions_prev: comp?.conversions ?? null,
      };
    });
  }, [rawRows, isComparing, compDailyData]);

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
      />

      {/* コンテンツ */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark dark:text-white">分析する - 日別分析</h2>
              <p className="mt-0.5 text-sm text-body-color">
                日別の訪問者とコンバージョンの推移を確認できます
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
            <ErrorAlert message={error?.message || 'データの読み込みに失敗しました。'} />
          ) : !chartData || chartData.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center">
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
                <ChartContainer title="日別推移グラフ" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} />
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
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="sessions"
                        name="訪問者"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        hide={hiddenLines.sessions}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="conversions"
                        name="コンバージョン"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        hide={hiddenLines.conversions}
                      />
                      {isComparing && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sessions_prev"
                          name="訪問者（比較）"
                          stroke="#3b82f6"
                          strokeWidth={1.5}
                          strokeDasharray="5 5"
                          dot={false}
                          hide={hiddenLines.sessions_prev}
                        />
                      )}
                      {isComparing && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="conversions_prev"
                          name="CV（比較）"
                          stroke="#ef4444"
                          strokeWidth={1.5}
                          strokeDasharray="5 5"
                          dot={false}
                          hide={hiddenLines.conversions_prev}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  tableKey="analysis-day"
                  isComparing={isComparing}
                  columns={[
                    {
                      key: 'date',
                      label: '日付',
                      sortable: true,
                      required: true,
                      render: (value) => formatDateFull(value),
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
                  data={tableData}
                  pageSize={31}
                  showPagination={true}
                  emptyMessage="表示するデータがありません。"
                />
              )}
            </>
          )}

        {/* メモ & AI分析タブ */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <TabbedNoteAndAI
              pageType="analysis/day"
              noteContent={
                <PageNoteSection
                  userId={currentUser.uid}
                  siteId={selectedSiteId}
                  pageType="analysis/day"
                  dateRange={dateRange}
                />
              }
              aiContent={
                !isLoading && dailyData ? (
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.DAY}
                    rawData={dailyData}
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
        {selectedSiteId && !isLoading && dailyData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.DAY}
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
