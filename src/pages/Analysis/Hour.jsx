import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useGA4Data } from '../../hooks/useGA4Data';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import Sidebar from '../../components/Layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import { format, sub } from 'date-fns';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import { formatForAI } from '../../utils/aiDataFormatter';
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
 * 時間帯別のセッションとコンバージョンを棒グラフで表示
 */
export default function Hour() {
  const { selectedSite, selectedSiteId, selectSite, sites, dateRange, updateDateRange } = useSite();
  const [searchParams] = useSearchParams();
  const [hiddenBars, setHiddenBars] = useState({});
  const [activeTab, setActiveTab] = useState('chart');
  const [isAnimating, setIsAnimating] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('時間別分析');
  }, []);

  // AI分析ボタンのアニメーションは削除（パフォーマンス改善のため）
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIsAnimating(true);
  //     setTimeout(() => setIsAnimating(false), 1500);
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, []);

  // URLパラメータのsiteIdがあれば選択
  useEffect(() => {
    const siteIdParam = searchParams.get('siteId');
    if (siteIdParam && siteIdParam !== selectedSiteId && sites.some(site => site.id === siteIdParam)) {
      selectSite(siteIdParam);
    }
  }, [searchParams, selectedSiteId, sites, selectSite]);

  // GA4データ取得（時間帯別）
  const {
    data: hourData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['sessions', 'conversions'],
    ['hour']
  );

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
      conversions: row.conversions || 0,
    })).sort((a, b) => a.hour - b.hour) || [];

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
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 時間帯別分析</h2>
            <p className="text-body-color">
              時間帯別のセッションとコンバージョンの推移を確認できます
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
              <ChartContainer title="時間帯別グラフ" height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(value) => `${value}時`} />
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
                    <Bar
                      yAxisId="left"
                      dataKey="sessions"
                      name="セッション"
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
                columns={[
                  {
                    key: 'hour',
                    label: '時間帯',
                    sortable: true,
                    render: (value) => `${value}時`,
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
                pageSize={24}
                showPagination={false}
                emptyMessage="表示するデータがありません。"
              />
              )}
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && (
          <AIFloatingButton
            pageType={PAGE_TYPES.HOUR}
            metrics={(() => {
              // 時間帯別データを準備
              const hourlyData = chartData || [];
              
              // 集計値を計算
              const aggregates = {
                sessions: hourlyData.reduce((sum, row) => sum + (row.sessions || 0), 0),
                conversions: hourlyData.reduce((sum, row) => sum + (row.conversions || 0), 0),
                dataPoints: hourlyData.length,
              };
              
              // コンバージョンイベント名のリスト
              const conversionEventNames = selectedSite?.conversionEvents?.map(e => e.displayName || e.eventName) || [];
              
              // formatForAI関数を使用してデータをフォーマット
              return formatForAI('hour', hourlyData, aggregates, conversionEventNames);
            })()}
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
