import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import { setPageTitle } from '../../utils/pageTitle';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/**
 * 集客チャネル分析画面
 * 流入チャネル別の訪問者とコンバージョンを表示
 */
export default function AcquisitionChannels() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chart');
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [isConversionAlertOpen, setIsConversionAlertOpen] = useState(false);
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
    setPageTitle('集客チャネル');
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

  // ✅ GA4チャネル別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
  const {
    data: channelData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-channel-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      console.log('[AcquisitionChannels] Fetching channel conversion data...');
      const fetchChannelConversionData = httpsCallable(functions, 'fetchGA4ChannelConversionData');
      const result = await fetchChannelConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        dimensionFilter: ga4DimensionFilter,
      });
      console.log('[AcquisitionChannels] Channel conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  const { data: compChannelData } = useQuery({
    queryKey: ['ga4-channel-conversions-comp', selectedSiteId, comparisonDateRange?.from, comparisonDateRange?.to, ga4DimensionFilter],
    queryFn: async () => {
      const fetchChannelConversionData = httpsCallable(functions, 'fetchGA4ChannelConversionData');
      const result = await fetchChannelConversionData({
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

  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compChannelData;

  // チャネル名の日本語化
  const channelNameMap = {
    'Organic Search': 'オーガニック検索',
    'Direct': 'ダイレクト',
    'Referral': '参照元サイト',
    'Paid Search': '有料検索',
    'Organic Social': 'オーガニックソーシャル',
    'Paid Social': '有料ソーシャル',
    'Display': 'ディスプレイ広告',
    'Email': 'メール',
    'Organic Shopping': 'オーガニックショッピング',
    'Paid Shopping': '有料ショッピング',
    'Affiliates': 'アフィリエイト',
    'Organic Video': 'オーガニック動画',
    'Paid Video': '有料動画',
    '(Other)': 'その他',
  };

  const getChannelName = (channel) => {
    return channelNameMap[channel] || channel;
  };

  // チャートの色
  const COLORS = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
  ];

  // 合計訪問者数の計算（テーブルデータ作成前）
  const totalSessions = channelData?.rows?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;

  // テーブル用のデータ整形（訪問者数降順）
  const tableData =
    channelData?.rows
      ?.map((row) => ({
        channel: row.sessionDefaultChannelGroup,
        channelName: getChannelName(row.sessionDefaultChannelGroup),
        sessions: row.sessions || 0,
        sessionRate:
          totalSessions > 0
            ? ((row.sessions / totalSessions) * 100).toFixed(1)
            : '0.0',
        users: row.activeUsers || 0,
        newUsers: row.newUsers || 0,
        pageViews: row.screenPageViews || 0,
        engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
        avgSessionDuration: row.averageSessionDuration || 0,
        bounceRate: ((row.bounceRate || 0) * 100).toFixed(1),
        conversions: row.conversions || 0,
        conversionRate:
          row.sessions > 0
            ? ((row.conversions / row.sessions) * 100).toFixed(2)
            : '0.00',
      }))
      .sort((a, b) => b.sessions - a.sessions) || [];

  const mergedTableData = useMemo(() => {
    if (!isComparing || !compChannelData?.rows) return tableData;
    const compTotalSessions = compChannelData.rows.reduce((sum, r) => sum + (r.sessions || 0), 0);
    const compTable = compChannelData.rows.map((row) => ({
      channelName: getChannelName(row.sessionDefaultChannelGroup),
      sessions: row.sessions || 0,
      users: row.activeUsers || 0,
      newUsers: row.newUsers || 0,
      pageViews: row.screenPageViews || 0,
      conversions: row.conversions || 0,
      engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
      bounceRate: ((row.bounceRate || 0) * 100).toFixed(1),
      avgSessionDuration: row.averageSessionDuration || 0,
      conversionRate: row.sessions > 0 ? ((row.conversions / row.sessions) * 100).toFixed(2) : '0.00',
    }));
    return mergeComparisonRows(tableData, compTable, 'channelName', ['sessions', 'users', 'newUsers', 'pageViews', 'conversions', 'engagementRate', 'bounceRate', 'avgSessionDuration', 'conversionRate']);
  }, [tableData, isComparing, compChannelData]);

  // チャート用のデータ
  const chartData = tableData;

  // 合計値の計算（訪問者以外）
  const totalUsers = tableData.reduce((sum, row) => sum + row.users, 0);
  const totalConversions = tableData.reduce((sum, row) => sum + row.conversions, 0);

  // 円グラフ用のデータ（上位8件 + その他）
  const pieData = chartData.slice(0, 7).map((item, index) => ({
    name: item.channelName,
    value: item.sessions,
    color: COLORS[index % COLORS.length],
  }));

  if (chartData.length > 7) {
    const othersSum = chartData
      .slice(7)
      .reduce((sum, item) => sum + item.sessions, 0);
    if (othersSum > 0) {
      pieData.push({
        name: 'その他',
        value: othersSum,
        color: '#9ca3af',
      });
    }
  }

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

  // カスタムツールチップ（棒グラフ用）
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">
            {payload[0].payload.channelName}
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

  // カスタムラベル（円グラフ用 - 外側配置で重なり防止）
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value }) => {
    const percent = ((value / totalSessions) * 100).toFixed(1);
    // 小さすぎるセクターはラベル非表示
    if (parseFloat(percent) < 2) return null;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fill="#374151"
        fontSize={12}
        fontWeight={500}
      >
        {name} ({percent}%)
      </text>
    );
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
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark dark:text-white">
                集客 - 集客チャネル
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                流入チャネル別の訪問者数、ユーザー数、コンバージョンを確認できます
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
          ) : !chartData || chartData.length === 0 ? (
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
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* 円グラフ */}
                  <ChartContainer title="チャネル別訪問者構成比" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                          label={renderLabel}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  {/* 棒グラフ */}
                  <ChartContainer title="チャネル別訪問者数" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="channelName"
                          angle={-45}
                          textAnchor="end"
                          height={100}
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
                </div>
              ) : (
                <DataTable
                  tableKey="analysis-channels"
                  isComparing={isComparing}
                  columns={[
                    {
                      key: 'channelName',
                      label: 'チャネル',
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
                      key: 'sessionRate',
                      label: '割合',
                      align: 'right',
                      render: (value) => `${value}%`,
                    },
                    {
                      key: 'users',
                      label: 'ユーザー',
                      format: 'number',
                      align: 'right',
                      tooltip: 'users',
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
                      render: (value) => `${value}%`,
                      defaultVisible: false,
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
                      key: 'avgSessionDuration',
                      label: '平均滞在',
                      align: 'right',
                      tooltip: 'avgSessionDuration',
                      defaultVisible: false,
                      comparison: true,
                      render: (value) => {
                        const m = Math.floor(value / 60);
                        const s = Math.floor(value % 60);
                        return `${m}:${s.toString().padStart(2, '0')}`;
                      },
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


        {/* メモ & AI分析タブ */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <TabbedNoteAndAI
              pageType="channels"
              noteContent={
                <PageNoteSection
                  userId={currentUser.uid}
                  siteId={selectedSiteId}
                  pageType="channels"
                  dateRange={dateRange}
                />
              }
              aiContent={
                !isLoading && channelData ? (
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.CHANNELS}
                    rawData={channelData}
                    period={{
                      startDate: dateRange?.from,
                      endDate: dateRange?.to,
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
        {selectedSiteId && !isLoading && channelData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.CHANNELS}
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

