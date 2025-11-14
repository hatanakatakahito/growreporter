import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import Sidebar from '../../components/Layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import ChartContainer from '../../components/Analysis/ChartContainer';
import DataTable from '../../components/Analysis/DataTable';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * 曜日別分析画面
 * 曜日ごとのセッションとコンバージョンの傾向を表示
 */
export default function Week() {
  const { selectedSite, selectedSiteId, selectSite, sites, dateRange, updateDateRange } = useSite();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('chart');
  const [hiddenLines, setHiddenLines] = useState({});

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('曜日別分析');
  }, []);

  // URLパラメータのsiteIdがあれば選択
  useEffect(() => {
    const siteIdParam = searchParams.get('siteId');
    if (siteIdParam && siteIdParam !== selectedSiteId && sites.some(site => site.id === siteIdParam)) {
      selectSite(siteIdParam);
    }
  }, [searchParams, selectedSiteId, sites, selectSite]);

  // ✅ GA4曜日別コンバージョンデータ取得
  const {
    data: weekData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-weekly-conversions', selectedSiteId, dateRange.from, dateRange.to],
    queryFn: async () => {
      console.log('[Week] Fetching weekly conversion data...');
      const fetchWeeklyConversionData = httpsCallable(functions, 'fetchGA4WeeklyConversionData');
      const result = await fetchWeeklyConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
      });
      console.log('[Week] Weekly conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // 曜日データを整形
  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const dayNamesShort = ['日', '月', '火', '水', '木', '金', '土'];

  const chartData = React.useMemo(() => {
    if (!weekData?.rows) return [];

    // dayOfWeek (0=日曜, 1=月曜, ..., 6=土曜) でソート
    const sorted = [...weekData.rows].sort((a, b) => {
      return parseInt(a.dayOfWeek) - parseInt(b.dayOfWeek);
    });

    return sorted.map((row) => ({
      dayOfWeek: parseInt(row.dayOfWeek),
      dayName: dayNames[parseInt(row.dayOfWeek)],
      dayNameShort: dayNamesShort[parseInt(row.dayOfWeek)],
      sessions: row.sessions || 0,
      conversions: row.conversions || 0,
      cvr: row.sessions > 0 ? ((row.conversions / row.sessions) * 100).toFixed(2) : 0,
    }));
  }, [weekData]);

  // 合計値を計算
  const totals = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { sessions: 0, conversions: 0, cvr: 0 };
    }

    const totalSessions = chartData.reduce((sum, d) => sum + d.sessions, 0);
    const totalConversions = chartData.reduce((sum, d) => sum + d.conversions, 0);
    const avgCvr = totalSessions > 0 ? ((totalConversions / totalSessions) * 100).toFixed(2) : 0;

    return {
      sessions: totalSessions,
      conversions: totalConversions,
      cvr: avgCvr,
    };
  }, [chartData]);

  // 最大・最小を計算
  const extremes = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { maxDay: null, minDay: null };
    }

    const maxSessionsDay = chartData.reduce((max, d) => (d.sessions > max.sessions ? d : max), chartData[0]);
    const minSessionsDay = chartData.reduce((min, d) => (d.sessions < min.sessions ? d : min), chartData[0]);

    return {
      maxDay: maxSessionsDay,
      minDay: minSessionsDay,
    };
  }, [chartData]);

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
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">
            {label}
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
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 曜日別分析</h2>
            <p className="text-body-color">
              曜日ごとのセッションとコンバージョンの傾向を確認できます
            </p>
          </div>

          {/* コンバージョン未設定の警告 */}
          {(!selectedSite?.conversionEvents || selectedSite.conversionEvents.length === 0) && (
            <div className="mb-8 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/20 dark:border-red-600">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                    コンバージョン定義が未設定です
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    正確なコンバージョン分析を行うには、サイト設定でコンバージョンイベントを定義してください。
                  </p>
                  <Link
                    to={`/sites/${selectedSiteId}/edit?step=4`}
                    className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    サイト設定（STEP4）でコンバージョンを設定する
                  </Link>
                </div>
              </div>
            </div>
          )}

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
                <ChartContainer title="曜日別推移グラフ" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dayName" />
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
                      key: 'dayName',
                      label: '曜日',
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
                      key: 'conversions',
                      label: 'コンバージョン',
                      format: 'number',
                      align: 'right',
                      tooltip: 'conversions',
                    },
                  ]}
                  data={chartData}
                  pageSize={7}
                  showPagination={false}
                  emptyMessage="表示するデータがありません。"
                />
              )}
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && chartData && chartData.length > 0 && (() => {
          const metrics = {
            weeklyData: chartData || [],  // ← 画面表示データをそのまま使用
            hasConversionDefinitions: selectedSite?.conversionEvents && selectedSite.conversionEvents.length > 0,
            conversionEventNames: selectedSite?.conversionEvents?.map(e => e.eventName) || [],
          };
          
          console.log('[Week] AI分析に送信するデータ:', {
            weeklyDataCount: metrics.weeklyData.length,
            hasConversions: metrics.hasConversionDefinitions,
            sampleData: metrics.weeklyData.slice(0, 3),
          });
          
          return (
            <AIFloatingButton
              pageType={PAGE_TYPES.WEEK}
              metrics={metrics}
              period={{
                startDate: dateRange.from,
                endDate: dateRange.to,
              }}
            />
          );
        })()}
      </main>
    </>
  );
}
