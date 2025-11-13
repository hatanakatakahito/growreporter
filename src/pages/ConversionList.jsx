import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import { Link } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import DataTable from '../components/Analysis/DataTable';
import ChartContainer from '../components/Analysis/ChartContainer';
import AIFloatingButton from '../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../constants/plans';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Info, Settings } from 'lucide-react';
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
 * コンバージョン一覧画面
 * 登録されているコンバージョンイベントの一覧を表示
 */
export default function ConversionList() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const [activeTab, setActiveTab] = useState('table');
  const [hiddenLines, setHiddenLines] = useState({});

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('コンバージョン一覧');
  }, []);

  // コンバージョンイベントの取得
  const conversionEvents = useMemo(() => {
    return selectedSite?.conversionEvents || [];
  }, [selectedSite]);

  // 13ヶ月分の期間を計算（12ヶ月前の月初から現在まで）
  const monthlyDateRange = useMemo(() => {
    if (!dateRange.to) return { start: null, end: null };
    
    const endDate = new Date(dateRange.to);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 12);
    startDate.setDate(1); // 月初
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
    };
  }, [dateRange.to]);

  // 月次コンバージョンデータ取得
  const {
    data: conversionData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-monthly-conversions', selectedSiteId, monthlyDateRange],
    queryFn: async () => {
      if (!selectedSiteId || !monthlyDateRange.start || !conversionEvents.length) {
        return null;
      }
      
      const fetchMonthlyConversionData = httpsCallable(functions, 'fetchGA4MonthlyConversionData');
      const result = await fetchMonthlyConversionData({
        siteId: selectedSiteId,
        startDate: monthlyDateRange.start,
        endDate: monthlyDateRange.end,
      });
      
      return result.data.data;
    },
    enabled: !!selectedSiteId && !!monthlyDateRange.start && conversionEvents.length > 0,
    retry: false,
  });

  // グラフ用のカラー
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  // 凡例クリックハンドラー
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
          <p className="mb-2 font-semibold text-dark dark:text-white">{label}</p>
          {payload
            .filter((entry) => !hiddenLines[entry.dataKey])
            .map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value.toLocaleString()}
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
          showDateRange={false}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              コンバージョン
            </h2>
            <p className="text-body-color">
              コンバージョンに貢献したイベントの分析
            </p>
          </div>

          {!conversionEvents || conversionEvents.length === 0 ? (
            <div className="mt-8 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/20 dark:border-red-600">
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
          ) : isLoading ? (
            <LoadingSpinner message="コンバージョンデータを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert
              message={error?.message || 'データの読み込みに失敗しました。'}
            />
          ) : !conversionData || conversionData.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* タブ */}
              <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
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
              </div>

              {/* タブコンテンツ */}
              {activeTab === 'table' ? (
                <div className="relative rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                  {/* 横スクロールヒント */}
                  <div className="border-b border-stroke px-4 py-2 dark:border-dark-3">
                    <div className="flex items-center gap-2 text-xs text-body-color">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>左右にスクロールできます</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="border-b border-stroke dark:border-dark-3">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                            年月
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
                            合計
                          </th>
                          {conversionEvents.map((event) => (
                            <th
                              key={event.eventName}
                              className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white"
                            >
                              {event.displayName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...conversionData].reverse().map((row) => {
                          // 各行の合計を計算
                          const rowTotal = conversionEvents.reduce(
                            (sum, event) => sum + (row[event.eventName] || 0),
                            0
                          );
                          
                          return (
                            <tr
                              key={row.yearMonth}
                              className="border-b border-stroke last:border-0 dark:border-dark-3"
                            >
                              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-dark dark:text-white">
                                {`${row.yearMonth.slice(0, 4)}年${row.yearMonth.slice(4)}月`}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-dark dark:text-white">
                                {rowTotal.toLocaleString()}
                              </td>
                              {conversionEvents.map((event) => (
                                <td
                                  key={event.eventName}
                                  className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark dark:text-white"
                                >
                                  {(row[event.eventName] || 0).toLocaleString()}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <ChartContainer title="コンバージョン月次推移" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="yearMonth" 
                        tickFormatter={(val) => `${val.slice(0, 4)}/${val.slice(4)}`}
                      />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                      {conversionEvents.map((event, index) => (
                        <Line
                          key={event.eventName}
                          type="monotone"
                          dataKey={event.eventName}
                          name={event.displayName}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          hide={hiddenLines[event.eventName]}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && (() => {
          const metrics = {
            conversionData: conversionData || [],
            conversionEvents: conversionEvents || [],
            hasConversionDefinitions: conversionEvents && conversionEvents.length > 0,
            conversionEventNames: conversionEvents?.map(e => e.eventName) || [],
          };
          
          console.log('[ConversionList] AI分析に送信するデータ:', {
            conversionDataCount: metrics.conversionData.length,
            conversionEventsCount: metrics.conversionEvents.length,
            sampleData: metrics.conversionData.slice(0, 3),
          });
          
          return (
            <AIFloatingButton
              pageType={PAGE_TYPES.CONVERSIONS}
              metrics={metrics}
              period={{
                startDate: monthlyDateRange.start,
                endDate: monthlyDateRange.end,
              }}
            />
          );
        })()}
      </main>
    </>
  );
}
