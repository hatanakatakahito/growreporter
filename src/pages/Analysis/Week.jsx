import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link, useSearchParams } from 'react-router-dom';
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
 * 曜日ごとのセッションとコンバージョンの推移を表示
 */
export default function Week() {
  const { selectedSite, selectedSiteId, selectSite, sites, dateRange, updateDateRange } = useSite();
  const [searchParams] = useSearchParams();
  const [hiddenBars, setHiddenBars] = useState({});
  const [activeTab, setActiveTab] = useState('chart');

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

  // ✅ GA4曜日×時間帯別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
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
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // 曜日別にデータを集計
  const generateDayData = () => {
    if (!weekData?.rows) return [];

    // 曜日ごとに集計
    const dayMap = {};
    
    weekData.rows.forEach((row) => {
      const dayOfWeek = parseInt(row.dayOfWeek); // 0=日曜, 1=月曜, ..., 6=土曜
      const sessions = row.sessions || 0;
      const conversions = row.conversions || 0;

      // GA4の曜日は0=日曜から始まるので、1=月曜から始まるように変換
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      if (!dayMap[adjustedDay]) {
        dayMap[adjustedDay] = { sessions: 0, conversions: 0 };
      }
      
      dayMap[adjustedDay].sessions += sessions;
      dayMap[adjustedDay].conversions += conversions;
    });

    // 配列に変換（月曜日から日曜日の順）
    const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
    return dayNames.map((name, index) => ({
      dayName: name,
      dayIndex: index,
      sessions: dayMap[index]?.sessions || 0,
      conversions: dayMap[index]?.conversions || 0,
    }));
  };

  const chartData = generateDayData();
  const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];

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
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 曜日別分析</h2>
            <p className="text-body-color">
              曜日ごとのセッションとコンバージョンの推移を確認できます
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
                        label={{ value: 'セッション', angle: -90, position: 'insideLeft' }}
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
                        name="セッション"
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
        {selectedSiteId && !isLoading && weekData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.WEEK}
            rawData={weekData}
            period={{
              startDate: dateRange.from,
              endDate: dateRange.to,
            }}
          />
        )}
      </main>
    </div>
  );
}
