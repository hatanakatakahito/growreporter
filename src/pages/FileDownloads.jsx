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
import { Sparkles, Download } from 'lucide-react';
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
 * ファイルダウンロード分析画面
 * file_downloadイベントを追跡
 */
export default function FileDownloads() {
  const { selectedSiteId, dateRange, updateDateRange } = useSite();
  const [activeTab, setActiveTab] = useState('table');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState({});

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ファイルダウンロード');
  }, []);

  // GA4データ取得（ファイルダウンロード別）
  const {
    data: downloadData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['eventCount', 'activeUsers'],
    ['eventName', 'linkUrl', 'fileName'],
    null
  );

  // テーブル用のデータ整形（イベント数降順）
  // file_downloadイベントのみフィルタリング
  const tableData =
    downloadData?.rows
      ?.filter((row) => row.eventName === 'file_download')
      ?.map((row) => ({
        fileName: row.fileName || '(不明)',
        linkUrl: row.linkUrl || '',
        downloads: row.eventCount || 0,
        users: row.activeUsers || 0,
      }))
      .sort((a, b) => b.downloads - a.downloads) || [];

  // グラフ用のデータ（上位10件）
  const chartData = [...tableData].slice(0, 10);

  // 合計値の計算
  const totalDownloads = tableData.reduce((sum, row) => sum + row.downloads, 0);
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
          <p className="mb-2 truncate font-semibold text-dark dark:text-white">
            {payload[0].payload.fileName}
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
              エンゲージメント - ファイルダウンロード
            </h2>
            <p className="text-body-color">
              file_downloadイベントを追跡してファイルダウンロード数を確認できます
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
              <p className="text-body-color">
                表示するデータがありません。
                <br />
                file_downloadイベントが設定されていない可能性があります。
              </p>
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
                <ChartContainer title="ファイル別ダウンロード数（上位10件）" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="fileName"
                        angle={-45}
                        textAnchor="end"
                        height={120}
                        interval={0}
                      />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                      <Bar
                        dataKey="downloads"
                        name="ダウンロード数"
                        fill="#3b82f6"
                        hide={hiddenSeries.downloads}
                      />
                      <Bar
                        dataKey="users"
                        name="ユーザー数"
                        fill="#10b981"
                        hide={hiddenSeries.users}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: 'fileName',
                      label: 'ファイル名',
                      sortable: true,
                    },
                    {
                      key: 'linkUrl',
                      label: 'URL',
                      sortable: true,
                      render: (value) =>
                        value ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="truncate max-w-md">{value}</span>
                            <Download className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          '(不明)'
                        ),
                    },
                    {
                      key: 'downloads',
                      label: 'ダウンロード数',
                      format: 'number',
                      align: 'right',
                    },
                    {
                      key: 'users',
                      label: 'ユーザー数',
                      format: 'number',
                      align: 'right',
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
          pageType="fileDownloads"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            totalDownloads,
            totalUsers,
            downloadData: tableData,
          }}
        />
      </main>
    </>
  );
}

