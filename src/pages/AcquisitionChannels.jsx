import React, { useState, useEffect } from 'react';
import { useSite } from '../contexts/SiteContext';
import { useGA4Data } from '../hooks/useGA4Data';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import DataTable from '../components/Analysis/DataTable';
import ChartContainer from '../components/Analysis/ChartContainer';
import AISummarySheet from '../components/Analysis/AISummarySheet';
import { Sparkles } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
import AIFloatingButton from '../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../constants/plans';
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
 * 流入チャネル別のセッションとコンバージョンを表示
 */
export default function AcquisitionChannels() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const [activeTab, setActiveTab] = useState('chart');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState({});

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('集客チャネル');
  }, []);

  // GA4データ取得（チャネル別）
  const {
    data: channelData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['sessions', 'conversions', 'activeUsers'],
    ['sessionDefaultChannelGroup'],
    null
  );

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

  // 合計セッション数の計算（テーブルデータ作成前）
  const totalSessions = channelData?.rows?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;

  // テーブル用のデータ整形（セッション数降順）
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
        conversions: row.conversions || 0,
        conversionRate:
          row.sessions > 0
            ? ((row.conversions / row.sessions) * 100).toFixed(2)
            : '0.00',
      }))
      .sort((a, b) => b.sessions - a.sessions) || [];

  // チャート用のデータ
  const chartData = tableData;

  // 合計値の計算（セッション以外）
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

  // カスタムラベル（円グラフ用）
  const renderLabel = (entry) => {
    const percent = ((entry.value / totalSessions) * 100).toFixed(1);
    return `${entry.name} (${percent}%)`;
  };

  return (
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              集客 - 集客チャネル
            </h2>
            <p className="text-body-color">
              流入チャネル別のセッション数、ユーザー数、コンバージョンを確認できます
            </p>
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
              <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                    activeTab === 'chart'
                      ? 'bg-primary text-white'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  グラフ形式
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                    activeTab === 'table'
                      ? 'bg-primary text-white'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  表形式
                </button>
              </div>

              {/* タブコンテンツ */}
              {activeTab === 'chart' ? (
                <div className="space-y-6">
                  {/* 円グラフ */}
                  <ChartContainer title="チャネル別セッション構成比" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderLabel}
                          outerRadius={120}
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
                  <ChartContainer title="チャネル別セッション数" height={400}>
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
                          name="セッション"
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
                  columns={[
                    {
                      key: 'channelName',
                      label: 'チャネル',
                      sortable: true,
                    },
                    {
                      key: 'sessions',
                      label: 'セッション',
                      format: 'number',
                      align: 'right',
                      tooltip: 'sessions',
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
                    },
                    {
                      key: 'conversions',
                      label: 'コンバージョン',
                      format: 'number',
                      align: 'right',
                      tooltip: 'conversions',
                    },
                    {
                      key: 'conversionRate',
                      label: 'CVR',
                      align: 'right',
                      render: (value) => `${value}%`,
                    },
                  ]}
                  data={tableData}
                  pageSize={25}
                  showPagination={true}
                  emptyMessage="表示するデータがありません。"
                />
              )}
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {!isError && (
          <button
            onClick={() => setIsAISheetOpen(true)}
            disabled={isLoading}
            className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="AI分析を見る"
          >
            <div className="flex flex-col items-center">
              <Sparkles className="h-6 w-6" />
              <span className="mt-0.5 text-[10px] font-medium">AI分析</span>
            </div>
          </button>
        )}

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="acquisitionChannels"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            totalSessions,
            totalUsers,
            totalConversions,
            channelData: chartData,
          }}
        />

        {/* 新しいAI分析フローティングボタン */}
        {selectedSiteId && (
          <AIFloatingButton
            pageType={PAGE_TYPES.CHANNELS}
            metrics={{
              totalSessions: totalSessions || 0,
              totalUsers: totalUsers || 0,
              totalConversions: totalConversions || 0,
              channelData: chartData || [],
              conversionEvents: selectedSite?.conversionEvents || [],
            }}
            period={{
              startDate: dateRange.from,
              endDate: dateRange.to,
            }}
          />
        )}
      </main>
    </>
  );
}

