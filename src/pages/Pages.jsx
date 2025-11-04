import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import { useSite } from '../contexts/SiteContext';
import { useGA4Data } from '../hooks/useGA4Data';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import DataTable from '../components/Analysis/DataTable';
import ChartContainer from '../components/Analysis/ChartContainer';
import AISummarySheet from '../components/Analysis/AISummarySheet';
import { Sparkles, ExternalLink } from 'lucide-react';
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
} from 'recharts';

/**
 * ページ別分析画面
 * GA4のページ別データを表示
 */
export default function Pages() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const [activeTab, setActiveTab] = useState('table');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState({});

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
    ['screenPageViews', 'sessions', 'activeUsers', 'averageSessionDuration'],
    ['pagePath', 'pageTitle'],
    null
  );

  // URLを短縮表示
  const shortenUrl = (url) => {
    if (!url) return '/';
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  };

  // テーブル用のデータ整形（ページビュー数降順）
  const tableData =
    pageData?.rows
      ?.map((row) => ({
        path: row.pagePath || '/',
        title: row.pageTitle || '(タイトルなし)',
        shortUrl: shortenUrl(row.pagePath),
        pageViews: row.screenPageViews || 0,
        sessions: row.sessions || 0,
        users: row.activeUsers || 0,
        avgDuration: row.averageSessionDuration || 0,
      }))
      .sort((a, b) => b.pageViews - a.pageViews) || [];

  // グラフ用のデータ（上位10件）
  const chartData = [...tableData].slice(0, 10);

  // 合計値の計算
  const totalPageViews = tableData.reduce((sum, row) => sum + row.pageViews, 0);
  const totalSessions = tableData.reduce((sum, row) => sum + row.sessions, 0);
  const totalUsers = tableData.reduce((sum, row) => sum + row.users, 0);

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

  // 平均セッション時間のフォーマット（秒 → 分:秒）
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              エンゲージメント - ページ別
            </h2>
            <p className="text-body-color">
              ページ別のページビュー数、セッション数、ユーザー数を確認できます
            </p>
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
                      <YAxis />
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
                        name="セッション"
                        fill="#10b981"
                        hide={hiddenSeries.sessions}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: 'path',
                      label: 'ページパス',
                      sortable: true,
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
                    },
                    {
                      key: 'sessions',
                      label: 'セッション',
                      format: 'number',
                      align: 'right',
                    },
                    {
                      key: 'users',
                      label: 'ユーザー',
                      format: 'number',
                      align: 'right',
                    },
                    {
                      key: 'avgDuration',
                      label: '平均滞在時間',
                      align: 'right',
                      render: (value) => formatDuration(value),
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
          pageType="pages"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            totalPageViews,
            totalSessions,
            totalUsers,
            pageData: tableData,
          }}
        />

        {/* 新しいAI分析フローティングボタン */}
        {selectedSiteId && tableData && tableData.length > 0 && (
          <AIFloatingButton
            pageType={PAGE_TYPES.PAGES}
            metrics={{
              totalPageViews,
              totalSessions,
              totalUsers,
              pageData: tableData,
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

