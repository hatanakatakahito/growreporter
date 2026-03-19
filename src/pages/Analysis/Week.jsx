import React, { useState, useEffect, useMemo } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
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
} from 'recharts';

/**
 * 曜日別分析画面
 * 曜日ごとの訪問者とコンバージョンの推移を表示
 */
export default function Week() {
  const { selectedSite, selectedSiteId, selectSite, sites, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hiddenBars, setHiddenBars] = useState({});
  const [activeTab, setActiveTab] = useState('chart');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isConversionAlertOpen, setIsConversionAlertOpen] = useState(false);
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
    setPageTitle('曜日別分析');
  }, []);

  // 初回のみコンバージョン未設定アラートを表示（サイトデータ読込完了後に判定）
  useEffect(() => {
    if (!selectedSite || !selectedSiteId) return;
    const conversionEvents = selectedSite.conversionEvents || [];
    if (conversionEvents.length === 0) {
      const hasSeenAlert = sessionStorage.getItem('conversionAlertSeen');
      if (!hasSeenAlert) {
        setIsConversionAlertOpen(true);
        sessionStorage.setItem('conversionAlertSeen', 'true');
      }
    }
  }, [selectedSite, selectedSiteId]);

  // URLパラメータのsiteIdがあれば選択
  useEffect(() => {
    const siteIdParam = searchParams.get('siteId');
    if (siteIdParam && siteIdParam !== selectedSiteId && sites.some(site => site.id === siteIdParam)) {
      selectSite(siteIdParam);
    }
  }, [searchParams, selectedSiteId, sites, selectSite]);

  // ✅ GA4曜日×時間帯別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
  const {
    data: weekData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-weekly-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      console.log('[Week] Fetching weekly conversion data...');
      const fetchWeeklyConversionData = httpsCallable(functions, 'fetchGA4WeeklyConversionData');
      const result = await fetchWeeklyConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        dimensionFilter: ga4DimensionFilter,
      });
      console.log('[Week] Weekly conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // 比較期間データ取得
  const { data: compWeeklyData } = useQuery({
    queryKey: ['ga4-weekly-conversions-comp', selectedSiteId, comparisonDateRange?.from, comparisonDateRange?.to, ga4DimensionFilter],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4WeeklyConversionData');
      const result = await fn({ siteId: selectedSiteId, startDate: comparisonDateRange.from, endDate: comparisonDateRange.to, dimensionFilter: ga4DimensionFilter });
      return result.data;
    },
    enabled: !!selectedSiteId && !!comparisonDateRange?.from && !!comparisonDateRange?.to,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compWeeklyData;

  // 曜日別にデータを集計
  const generateDayData = () => {
    if (!weekData?.rows) return [];

    // 曜日ごとに集計
    const dayMap = {};

    weekData.rows.forEach((row) => {
      const dayOfWeek = parseInt(row.dayOfWeek); // 0=日曜, 1=月曜, ..., 6=土曜

      // GA4の曜日は0=日曜から始まるので、1=月曜から始まるように変換
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      if (!dayMap[adjustedDay]) {
        dayMap[adjustedDay] = { sessions: 0, users: 0, newUsers: 0, pageViews: 0, engagementRateSum: 0, avgDurationSum: 0, bounceRateSum: 0, conversions: 0, count: 0 };
      }

      const d = dayMap[adjustedDay];
      d.sessions += row.sessions || 0;
      d.users += row.users || 0;
      d.newUsers += row.newUsers || 0;
      d.pageViews += row.pageViews || 0;
      d.engagementRateSum += (row.engagementRate || 0) * (row.sessions || 0);
      d.avgDurationSum += (row.avgSessionDuration || 0) * (row.sessions || 0);
      d.bounceRateSum += (row.bounceRate || 0) * (row.sessions || 0);
      d.conversions += row.conversions || 0;
      d.count += 1;
    });

    // 配列に変換（月曜日から日曜日の順）
    const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
    return dayNames.map((name, index) => {
      const d = dayMap[index];
      return {
        dayName: name,
        dayIndex: index,
        sessions: d?.sessions || 0,
        users: d?.users || 0,
        newUsers: d?.newUsers || 0,
        pageViews: d?.pageViews || 0,
        engagementRate: d && d.sessions > 0 ? d.engagementRateSum / d.sessions : 0,
        avgSessionDuration: d && d.sessions > 0 ? d.avgDurationSum / d.sessions : 0,
        bounceRate: d && d.sessions > 0 ? d.bounceRateSum / d.sessions : 0,
        conversions: d?.conversions || 0,
      };
    });
  };

  const chartData = generateDayData();
  const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];

  // 比較期間の曜日データを集計してマージ
  const mergedTableData = useMemo(() => {
    if (!isComparing || !compWeeklyData?.rows) return chartData;
    // 比較データも同じ集計ロジックで曜日別に変換
    const compDayMap = {};
    compWeeklyData.rows.forEach((row) => {
      const dayOfWeek = parseInt(row.dayOfWeek);
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      if (!compDayMap[adjustedDay]) {
        compDayMap[adjustedDay] = { sessions: 0, users: 0, newUsers: 0, pageViews: 0, engagementRateSum: 0, avgDurationSum: 0, bounceRateSum: 0, conversions: 0, count: 0 };
      }
      compDayMap[adjustedDay].sessions += row.sessions || 0;
      compDayMap[adjustedDay].users += row.users || 0;
      compDayMap[adjustedDay].newUsers += row.newUsers || 0;
      compDayMap[adjustedDay].pageViews += row.pageViews || 0;
      compDayMap[adjustedDay].engagementRateSum += (row.engagementRate || 0) * (row.sessions || 0);
      compDayMap[adjustedDay].avgDurationSum += (row.avgSessionDuration || 0) * (row.sessions || 0);
      compDayMap[adjustedDay].bounceRateSum += (row.bounceRate || 0) * (row.sessions || 0);
      compDayMap[adjustedDay].conversions += row.conversions || 0;
      compDayMap[adjustedDay].count += 1;
    });
    const compRows = dayNames.map((name, index) => {
      const d = compDayMap[index];
      return {
        dayName: name,
        sessions: d?.sessions || 0,
        users: d?.users || 0,
        newUsers: d?.newUsers || 0,
        pageViews: d?.pageViews || 0,
        engagementRate: d && d.sessions > 0 ? d.engagementRateSum / d.sessions : 0,
        avgSessionDuration: d && d.sessions > 0 ? d.avgDurationSum / d.sessions : 0,
        bounceRate: d && d.sessions > 0 ? d.bounceRateSum / d.sessions : 0,
        conversions: d?.conversions || 0,
      };
    });
    return mergeComparisonRows(chartData, compRows, 'dayName', ['sessions', 'users', 'newUsers', 'pageViews', 'conversions', 'engagementRate', 'bounceRate', 'avgSessionDuration']);
  }, [chartData, isComparing, compWeeklyData]);

  // 凡例クリックでグラフの表示/非表示を切り替え
  const handleLegendClick = (dataKey) => {
    setHiddenBars((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

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
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 曜日別分析</h2>
            <p className="text-body-color">
              曜日ごとの訪問者とコンバージョンの推移を確認できます
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
                <ChartContainer title="曜日別推移グラフ" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dayName" />
                      <YAxis
                        yAxisId="left"
                        label={{ value: '訪問者', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'コンバージョン', angle: 90, position: 'insideRight' }}
                      />
                      <RechartsTooltip />
                      <Legend 
                        onClick={(e) => handleLegendClick(e.dataKey)}
                        wrapperStyle={{ cursor: 'pointer' }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="sessions"
                        name="訪問者"
                        fill="#3b82f6"
                        hide={hiddenBars.sessions}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="conversions"
                        name="コンバージョン"
                        fill="#ef4444"
                        hide={hiddenBars.conversions}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  tableKey="analysis-week"
                  isComparing={isComparing}
                  columns={[
                    {
                      key: 'dayName',
                      label: '曜日',
                      sortable: true,
                      required: true,
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
                  pageSize={7}
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
              pageType="analysis/week"
              noteContent={
                <PageNoteSection
                  userId={currentUser.uid}
                  siteId={selectedSiteId}
                  pageType="analysis/week"
                  dateRange={dateRange}
                />
              }
              aiContent={
                !isLoading && weekData ? (
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.WEEK}
                    rawData={weekData}
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
        {selectedSiteId && !isLoading && weekData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.WEEK}
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

        {/* コンバージョン未設定アラートモーダル */}
        {isConversionAlertOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsConversionAlertOpen(false)}
          >
            <div 
              className="w-full max-w-md rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b border-stroke p-4 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  コンバージョン定義が未設定です
                </h3>
                <button
                  onClick={() => setIsConversionAlertOpen(false)}
                  className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* コンテンツ */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-body-color">
                      正確なコンバージョン分析を行うには、サイト設定でコンバージョンイベントを定義してください。
                    </p>
                  </div>
                </div>
              </div>

              {/* フッター */}
              <div className="border-t border-stroke p-4 dark:border-dark-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConversionAlertOpen(false)}
                    className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => navigate(`/sites/${selectedSiteId}/edit?step=4`)}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                  >
                    設定する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
