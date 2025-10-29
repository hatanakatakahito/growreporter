import React, { useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { useGSCData } from '../hooks/useGSCData';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import DataTable from '../components/Analysis/DataTable';
import ChartContainer from '../components/Analysis/ChartContainer';
import AISummarySheet from '../components/Analysis/AISummarySheet';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

/**
 * 流入キーワード分析画面
 * Search Console の検索クエリデータを表示
 */
export default function Keywords() {
  const { selectedSiteId, dateRange, updateDateRange } = useSite();
  const [activeTab, setActiveTab] = useState('table');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState({});

  // Search Console データ取得
  const { data: gscData, isLoading, isError, error } = useGSCData(
    selectedSiteId,
    dateRange.from,
    dateRange.to
  );

  // データ整形
  const keywordData = gscData?.topQueries || [];

  // 合計値の計算
  const totalClicks = keywordData.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = keywordData.reduce((sum, row) => sum + row.impressions, 0);
  const avgCTR =
    keywordData.length > 0
      ? (keywordData.reduce((sum, row) => sum + row.ctr, 0) / keywordData.length) * 100
      : 0;
  const avgPosition =
    keywordData.length > 0
      ? keywordData.reduce((sum, row) => sum + row.position, 0) / keywordData.length
      : 0;

  // テーブル用のデータ整形
  const tableData = keywordData.map((row) => ({
    keyword: row.query,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: (row.ctr * 100).toFixed(2),
    position: row.position.toFixed(1),
  }));

  // グラフ用のデータ整形（クリック数上位10件）
  const chartData = [...keywordData].slice(0, 10);

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
            {payload[0].payload.query}
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

  // 散布図用のカスタムツールチップ
  const ScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">{data.query}</p>
          <p className="text-sm text-body-color">クリック数: {data.clicks}</p>
          <p className="text-sm text-body-color">順位: {data.position.toFixed(1)}</p>
          <p className="text-sm text-body-color">
            CTR: {(data.ctr * 100).toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 順位によるアイコン
  const getPositionIcon = (position) => {
    if (position <= 3) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (position <= 10) {
      return <Minus className="h-4 w-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-[#F3F4FE] dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              集客 - 流入キーワード元
            </h2>
            <p className="text-body-color">
              Search Console の検索クエリデータを確認できます
            </p>
          </div>

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert
              message={error?.message || 'データの読み込みに失敗しました。'}
            />
          ) : !keywordData || keywordData.length === 0 ? (
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
                  {/* 棒グラフ：クリック数とインプレッション数 */}
                  <ChartContainer title="キーワード別クリック数（上位10件）" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="query"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          interval={0}
                        />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar
                          dataKey="clicks"
                          name="クリック数"
                          fill="#3b82f6"
                          hide={hiddenSeries.clicks}
                        />
                        <Bar
                          dataKey="impressions"
                          name="インプレッション数"
                          fill="#10b981"
                          hide={hiddenSeries.impressions}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  {/* 散布図：クリック数 vs 順位 */}
                  <ChartContainer
                    title="クリック数 vs 掲載順位（バブルサイズ：CTR）"
                    height={400}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{
                          top: 20,
                          right: 20,
                          bottom: 20,
                          left: 20,
                        }}
                      >
                        <CartesianGrid />
                        <XAxis
                          type="number"
                          dataKey="position"
                          name="掲載順位"
                          reversed
                          label={{
                            value: '掲載順位（数値が小さいほど上位）',
                            position: 'bottom',
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="clicks"
                          name="クリック数"
                          label={{
                            value: 'クリック数',
                            angle: -90,
                            position: 'insideLeft',
                          }}
                        />
                        <ZAxis
                          type="number"
                          dataKey="ctr"
                          range={[50, 400]}
                          name="CTR"
                        />
                        <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter
                          name="キーワード"
                          data={chartData}
                          fill="#8b5cf6"
                          fillOpacity={0.6}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: 'keyword',
                      label: 'キーワード',
                      sortable: true,
                    },
                    {
                      key: 'clicks',
                      label: 'クリック数',
                      format: 'number',
                      align: 'right',
                    },
                    {
                      key: 'impressions',
                      label: '表示回数',
                      format: 'number',
                      align: 'right',
                    },
                    {
                      key: 'ctr',
                      label: 'CTR',
                      align: 'right',
                      render: (value) => `${value}%`,
                    },
                    {
                      key: 'position',
                      label: '平均掲載順位',
                      align: 'right',
                      render: (value, row) => (
                        <div className="flex items-center justify-end gap-2">
                          {getPositionIcon(parseFloat(value))}
                          <span>{value}</span>
                        </div>
                      ),
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
          pageType="keywords"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            totalClicks,
            totalImpressions,
            avgCTR,
            avgPosition,
            keywordData: tableData,
          }}
        />
      </main>
    </>
  );
}

