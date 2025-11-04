import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useGA4Data } from '../../hooks/useGA4Data';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import Sidebar from '../../components/Layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import AISummarySheet from '../../components/Analysis/AISummarySheet';
import { format, sub } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Sparkles } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
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
 * 日別のセッションとコンバージョンの推移を表示
 */
export default function Day() {
  const { selectedSiteId, dateRange, updateDateRange } = useSite();
  const [hiddenLines, setHiddenLines] = useState({});
  const [activeTab, setActiveTab] = useState('chart');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('曜日別分析');
  }, []);

  // AI分析ボタンのアニメーションは削除（パフォーマンス改善のため）
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIsAnimating(true);
  //     setTimeout(() => setIsAnimating(false), 1500);
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, []);

  // GA4データ取得（日別）
  const {
    data: dailyData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['sessions', 'conversions'],
    ['date'],
    null
  );

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

  // テーブル用のデータ整形（昇順ソート：1日から末日へ）
  const tableData =
    dailyData?.rows?.map((row) => ({
      date: row.date,
      sessions: row.sessions || 0,
      conversions: row.conversions || 0,
    })).sort((a, b) => a.date.localeCompare(b.date)) || [];

  // グラフ用のデータ整形（tableDataと同じ昇順）
  const chartData = tableData;

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
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 日別分析</h2>
            <p className="text-body-color">
              日別のセッションとコンバージョンの推移を確認できます
            </p>
          </div>

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert message={error?.message || 'データの読み込みに失敗しました。'} />
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
                <ChartContainer title="日別推移グラフ" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                      <YAxis
                        yAxisId="left"
                        label={{ value: 'セッション', angle: -90, position: 'insideLeft' }}
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
                        name="セッション"
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
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: 'date',
                      label: '日付',
                      sortable: true,
                      render: (value) => formatDateFull(value),
                    },
                    {
                      key: 'sessions',
                      label: 'セッション',
                      format: 'number',
                      align: 'right',
                      tooltip: 'sessions',
                    },
                    {
                      key: 'conversions',
                      label: 'コンバージョン',
                      format: 'number',
                      align: 'right',
                      tooltip: 'conversions',
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
        </div>

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          siteId={selectedSiteId}
          pageType="day"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            sessions: chartData.reduce((sum, row) => sum + row.sessions, 0),
            conversions: chartData.reduce((sum, row) => sum + row.conversions, 0),
            dailyData: chartData,
          }}
        />

        {/* 新しいAI分析フローティングボタン */}
        {selectedSiteId && chartData && chartData.length > 0 && (
          <AIFloatingButton
            pageType={PAGE_TYPES.DAY}
            metrics={{
              sessions: chartData.reduce((sum, row) => sum + row.sessions, 0),
              conversions: chartData.reduce((sum, row) => sum + row.conversions, 0),
              dailyData: chartData,
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
