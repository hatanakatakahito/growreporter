import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import { mergeComparisonRows } from '../../utils/comparisonHelpers';
import ChartContainer from '../../components/Analysis/ChartContainer';
import { ExternalLink } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
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
 * ランディングページ分析画面
 * ユーザーが最初に訪問したページを表示
 */
export default function LandingPages() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('table');
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [isConversionAlertOpen, setIsConversionAlertOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ランディングページ');
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

  // ✅ GA4ランディングページ別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
  const {
    data: landingPageData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-landing-page-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      console.log('[LandingPages] Fetching landing page conversion data...');
      const fetchLandingPageConversionData = httpsCallable(functions, 'fetchGA4LandingPageConversionData');
      const result = await fetchLandingPageConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        dimensionFilter: ga4DimensionFilter,
      });
      console.log('[LandingPages] Landing page conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  const { data: compLandingPageData } = useQuery({
    queryKey: ['ga4-landing-page-conversions-comp', selectedSiteId, comparisonDateRange?.from, comparisonDateRange?.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchLandingPageConversionData = httpsCallable(functions, 'fetchGA4LandingPageConversionData');
      const result = await fetchLandingPageConversionData({
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

  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compLandingPageData;

  // URLを短縮表示
  const shortenUrl = (url) => {
    if (!url) return '/';
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  };

  // テーブル用のデータ整形（訪問者数降順）
  const tableData =
    landingPageData?.rows
      ?.map((row) => ({
        path: row.landingPage || '/',
        shortUrl: shortenUrl(row.landingPage),
        sessions: row.sessions || 0,
        users: row.activeUsers || 0,
        newUsers: row.newUsers || 0,
        pageViews: row.screenPageViews || 0,
        engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
        bounceRate: ((row.bounceRate || 0) * 100).toFixed(1),
        avgSessionDuration: row.averageSessionDuration || 0,
        conversions: row.conversions || 0,
        conversionRate:
          row.sessions > 0
            ? ((row.conversions / row.sessions) * 100).toFixed(2)
            : '0.00',
      }))
      .sort((a, b) => b.sessions - a.sessions) || [];

  const mergedTableData = useMemo(() => {
    if (!isComparing || !compLandingPageData?.rows) return tableData;
    const compTable = compLandingPageData.rows.map((row) => ({
      path: row.landingPage || '/',
      sessions: row.sessions || 0,
      users: row.activeUsers || 0,
      newUsers: row.newUsers || 0,
      pageViews: row.screenPageViews || 0,
      engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
      bounceRate: ((row.bounceRate || 0) * 100).toFixed(1),
      avgSessionDuration: row.averageSessionDuration || 0,
      conversions: row.conversions || 0,
      conversionRate:
        row.sessions > 0
          ? ((row.conversions / row.sessions) * 100).toFixed(2)
          : '0.00',
    }));
    return mergeComparisonRows(tableData, compTable, 'path', ['sessions', 'users', 'newUsers', 'pageViews', 'conversions', 'engagementRate', 'bounceRate', 'avgSessionDuration', 'conversionRate']);
  }, [tableData, isComparing, compLandingPageData]);

  // グラフ用のデータ（上位10件）
  const chartData = [...tableData].slice(0, 10);

  // 合計値の計算
  const totalSessions = tableData.reduce((sum, row) => sum + row.sessions, 0);
  const totalConversions = tableData.reduce((sum, row) => sum + row.conversions, 0);

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
      <div className="mt-4 flex justify-center gap-6">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <div
              className="h-3 w-3 rounded"
              style={{
                backgroundColor: hiddenSeries[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenSeries[entry.dataKey] ? 0.3 : 1,
              }}
            />
            <span
              className="text-sm"
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
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              エンゲージメント - ランディングページ
            </h2>
            <p className="text-body-color">
              ユーザーが最初に訪問したページ（ランディングページ）を確認できます
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
                <ChartContainer title="ランディングページ別訪問者数（上位10件）" height={400}>
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
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                      <Bar
                        dataKey="sessions"
                        name="訪問者"
                        fill="#3b82f6"
                        hide={hiddenSeries.sessions}
                      />
                      <Bar
                        dataKey="conversions"
                        name="コンバージョン"
                        fill="#ef4444"
                        hide={hiddenSeries.conversions}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  tableKey="analysis-landing-pages"
                  isComparing={isComparing}
                  columns={[
                    {
                      key: 'path',
                      label: 'ランディングページ',
                      sortable: true,
                      required: true,
                      render: (value) => {
                        const fullUrl = selectedSite?.siteUrl
                          ? `${selectedSite.siteUrl.replace(/\/$/, '')}${value}`
                          : value;
                        return (
                        <a
                            href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="truncate max-w-md">{value}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        );
                      },
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
                      label: 'ユーザー数',
                      format: 'number',
                      align: 'right',
                      tooltip: 'activeUsers',
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
                      label: '表示回数',
                      format: 'number',
                      align: 'right',
                      tooltip: 'screenPageViews',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'engagementRate',
                      label: 'ENG率',
                      align: 'right',
                      render: (value) => `${value}%`,
                      tooltip: 'engagementRate',
                      comparison: true,
                    },
                    {
                      key: 'bounceRate',
                      label: '直帰率',
                      align: 'right',
                      render: (value) => `${value}%`,
                      tooltip: 'bounceRate',
                      defaultVisible: false,
                      comparison: true,
                      invertColor: true,
                    },
                    {
                      key: 'avgSessionDuration',
                      label: '平均滞在時間',
                      align: 'right',
                      render: (value) => {
                        const minutes = Math.floor(value / 60);
                        const seconds = Math.floor(value % 60);
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      },
                      tooltip: 'avgSessionDuration',
                      comparison: true,
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
                      render: (value) => `${value}%`,
                      tooltip: 'conversionRate',
                      comparison: true,
                    },
                  ]}
                  data={mergedTableData}
                  pageSize={25}
                  showPagination={true}
                  emptyMessage="表示するデータがありません。"
                />
              )}
            </>
          )}


        {/* メモセクション */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <PageNoteSection
              userId={currentUser.uid}
              siteId={selectedSiteId}
              pageType="landing-pages"
              dateRange={dateRange}
            />
          </div>
        )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && !isLoading && landingPageData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.LANDING_PAGES}
            rawData={landingPageData}
            period={{
              startDate: dateRange.from,
              endDate: dateRange.to,
            }}
          />
        )}
      </main>

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
    </div>
  );
}

