import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useSiteMetrics } from '../../hooks/useSiteMetrics';
import { useGA4MonthlyData } from '../../hooks/useGA4MonthlyData';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import Sidebar from '../../components/Layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import AISummarySheet from '../../components/Analysis/AISummarySheet';
import Tooltip from '../../components/common/Tooltip';
import { format, sub, startOfMonth } from 'date-fns';
import { Info, Sparkles } from 'lucide-react';
import { getTooltip } from '../../constants/tooltips';
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
 * 分析画面 - 全体サマリー
 * GA4データの主要指標と13ヶ月推移を表示
 */
export default function AnalysisSummary() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const [timelineTab, setTimelineTab] = useState('table');
  const [hiddenLines, setHiddenLines] = useState({});
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('全体サマリー');
  }, []);

  // Search Console連携の有無をチェック（確実にブール値にする）
  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // 現在の期間のデータ取得
  const { data, isLoading, isError } = useSiteMetrics(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    hasGSCConnection
  );

  // 13ヶ月分の月次データを取得（選択された期間の終了月を基準に12ヶ月前まで）
  const monthlyStartDate = useMemo(() => {
    if (!dateRange.to) return format(startOfMonth(sub(new Date(), { months: 12 })), 'yyyy-MM-dd');
    const endDate = new Date(dateRange.to);
    const endMonth = startOfMonth(endDate);
    return format(startOfMonth(sub(endMonth, { months: 12 })), 'yyyy-MM-dd');
  }, [dateRange.to]);
  
  const monthlyEndDate = useMemo(() => {
    if (!dateRange.to) return format(new Date(), 'yyyy-MM-dd');
    const endDate = new Date(dateRange.to);
    return format(endDate, 'yyyy-MM-dd');
  }, [dateRange.to]);
  
  const {
    data: monthlyDataResponse,
    isLoading: isMonthlyLoading,
  } = useGA4MonthlyData(selectedSiteId, monthlyStartDate, monthlyEndDate);

  const monthlyData = monthlyDataResponse?.monthlyData || [];

  // 現在の月、前月、前年同月の年月を計算
  const currentMonth = useMemo(() => {
    if (!dateRange.to) return format(new Date(), 'yyyy-MM');
    return format(new Date(dateRange.to), 'yyyy-MM');
  }, [dateRange.to]);

  const previousMonth = useMemo(() => {
    if (!dateRange.to) return format(sub(new Date(), { months: 1 }), 'yyyy-MM');
    return format(sub(new Date(dateRange.to), { months: 1 }), 'yyyy-MM');
  }, [dateRange.to]);

  const yearAgoMonth = useMemo(() => {
    if (!dateRange.to) return format(sub(new Date(), { years: 1 }), 'yyyy-MM');
    return format(sub(new Date(dateRange.to), { years: 1 }), 'yyyy-MM');
  }, [dateRange.to]);

  // 月次データから該当月のデータを取得
  const currentMonthData = useMemo(() => {
    return monthlyData.find(d => d.month === currentMonth);
  }, [monthlyData, currentMonth]);

  const previousMonthData = useMemo(() => {
    return monthlyData.find(d => d.month === previousMonth);
  }, [monthlyData, previousMonth]);

  const yearAgoData = useMemo(() => {
    return monthlyData.find(d => d.month === yearAgoMonth);
  }, [monthlyData, yearAgoMonth]);

  // 変化率計算
  const calculateChangePercent = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // メトリックカード
  const MetricCard = ({ title, currentValue, previousValue, yearAgoValue, format: formatType = 'number', tooltip }) => {
    const formatValue = (value) => {
      if (value === null || value === undefined) return '-';
      if (formatType === 'percent') return `${(value * 100).toFixed(2)}%`;
      if (formatType === 'decimal') return value.toFixed(2);
      return Math.round(value).toLocaleString();
    };

    const prevChange = calculateChangePercent(currentValue, previousValue);
    const yearChange = calculateChangePercent(currentValue, yearAgoValue);

    return (
      <div className="rounded-lg border border-stroke bg-white p-6 transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-body-color">{title}</h4>
            {tooltip && <Tooltip content={tooltip} />}
          </div>
        </div>
        <div className="mb-4 text-4xl font-bold text-dark dark:text-white">
          {formatValue(currentValue)}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-color">前月</span>
            <div className="flex items-center gap-2">
              <span className="text-dark dark:text-white">{formatValue(previousValue)}</span>
              {prevChange !== null && (
                <span className={`font-medium ${prevChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {prevChange >= 0 ? '+' : ''}{prevChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-color">前年同月</span>
            <div className="flex items-center gap-2">
              <span className="text-dark dark:text-white">{formatValue(yearAgoValue)}</span>
              {yearChange !== null && (
                <span className={`font-medium ${yearChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {yearChange >= 0 ? '+' : ''}{yearChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // グラフ用のツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">{label}</p>
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

  // グラフ用の凡例
  const CustomLegend = ({ payload }) => {
    return (
      <div className="mt-4 flex flex-wrap justify-center gap-6">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
            onClick={() => setHiddenLines((prev) => ({ ...prev, [entry.dataKey]: !prev[entry.dataKey] }))}
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

  // ローディング中
  if (isLoading && !data) {
    return (
      <>
        <Sidebar />
        <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
          <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="データを読み込んでいます..." />
          </div>
        </main>
      </>
    );
  }

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
            {/* ページタイトル */}
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">分析する - 全体サマリー</h2>
              <p className="text-sm text-body-color">
                GA4データの全般指標を詳細に分析します
              </p>
            </div>

            {isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-red-800 dark:text-red-300">
                      データの取得に失敗しました。
                      <Link to={`/sites/${selectedSiteId}/edit?step=2`} className="ml-2 font-semibold underline">
                        GA4/GSC設定を確認 →
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 主要指標サマリ */}
                <div className="mb-8">
                  <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                    主要指標サマリ
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <MetricCard
                      title="セッション"
                      currentValue={data?.metrics?.sessions || 0}
                      previousValue={previousMonthData?.sessions || 0}
                      yearAgoValue={yearAgoData?.sessions || 0}
                      tooltip={getTooltip('sessions')}
                    />
                    <MetricCard
                      title="ユーザー"
                      currentValue={data?.metrics?.totalUsers || 0}
                      previousValue={previousMonthData?.users || 0}
                      yearAgoValue={yearAgoData?.users || 0}
                      tooltip={getTooltip('users')}
                    />
                    <MetricCard
                      title="新規ユーザー"
                      currentValue={data?.metrics?.newUsers || 0}
                      previousValue={previousMonthData?.newUsers || 0}
                      yearAgoValue={yearAgoData?.newUsers || 0}
                      tooltip={getTooltip('newUsers')}
                    />
                    <MetricCard
                      title="表示回数"
                      currentValue={data?.metrics?.pageViews || 0}
                      previousValue={previousMonthData?.pageViews || 0}
                      yearAgoValue={yearAgoData?.pageViews || 0}
                      tooltip={getTooltip('pageViews')}
                    />
                    <MetricCard
                      title="平均PV"
                      currentValue={(data?.metrics?.pageViews || 0) / (data?.metrics?.sessions || 1)}
                      previousValue={(previousMonthData?.pageViews || 0) / (previousMonthData?.sessions || 1)}
                      yearAgoValue={(yearAgoData?.pageViews || 0) / (yearAgoData?.sessions || 1)}
                      format="decimal"
                      tooltip={getTooltip('avgPageviews')}
                    />
                    <MetricCard
                      title="ENG率"
                      currentValue={data?.metrics?.engagementRate || 0}
                      previousValue={previousMonthData?.engagementRate || 0}
                      yearAgoValue={yearAgoData?.engagementRate || 0}
                      format="percent"
                      tooltip={getTooltip('engagementRate')}
                    />
                    <MetricCard
                      title="CV数"
                      currentValue={data?.metrics?.conversions || 0}
                      previousValue={previousMonthData?.conversions || 0}
                      yearAgoValue={yearAgoData?.conversions || 0}
                      tooltip={getTooltip('conversions')}
                    />
                    <MetricCard
                      title="CVR"
                      currentValue={(data?.metrics?.conversions || 0) / (data?.metrics?.sessions || 1)}
                      previousValue={(previousMonthData?.conversions || 0) / (previousMonthData?.sessions || 1)}
                      yearAgoValue={(yearAgoData?.conversions || 0) / (yearAgoData?.sessions || 1)}
                      format="percent"
                      tooltip={getTooltip('conversionRate')}
                    />
                  </div>
                </div>

                {/* 13ヶ月推移 */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                    13ヶ月の推移
                  </h3>

                  {isMonthlyLoading ? (
                    <div className="flex min-h-[400px] items-center justify-center">
                      <LoadingSpinner message="月次データを読み込んでいます..." />
                    </div>
                  ) : monthlyData.length === 0 ? (
                    <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                      <p className="text-body-color">データがありません。GA4連携を確認してください。</p>
                    </div>
                  ) : (
                    <>
                      {/* タブ（表形式/グラフ形式） */}
                      <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                        <button
                          onClick={() => setTimelineTab('table')}
                          className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                            timelineTab === 'table'
                              ? 'bg-primary text-white'
                              : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                          }`}
                        >
                          表形式
                        </button>
                        <button
                          onClick={() => setTimelineTab('chart')}
                          className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                            timelineTab === 'chart'
                              ? 'bg-primary text-white'
                              : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                          }`}
                        >
                          グラフ形式
                        </button>
                      </div>

                      {/* 表形式 */}
                      {timelineTab === 'table' ? (
                        <DataTable
                          columns={[
                            { key: 'label', label: '年月', sortable: true },
                            {
                              key: 'users',
                              label: 'ユーザー数',
                              format: 'number',
                              align: 'right',
                              tooltip: 'users',
                            },
                            {
                              key: 'sessions',
                              label: 'セッション',
                              format: 'number',
                              align: 'right',
                              tooltip: 'sessions',
                            },
                            {
                              key: 'avgPageviews',
                              label: '平均PV',
                              format: 'decimal',
                              align: 'right',
                              tooltip: 'avgPageviews',
                            },
                            {
                              key: 'pageViews',
                              label: '表示回数',
                              format: 'number',
                              align: 'right',
                              tooltip: 'pageViews',
                            },
                            {
                              key: 'engagementRate',
                              label: 'ENG率',
                              format: 'percent',
                              align: 'right',
                              tooltip: 'engagementRate',
                            },
                            {
                              key: 'conversions',
                              label: 'CV数',
                              format: 'number',
                              align: 'right',
                              tooltip: 'conversions',
                            },
                            {
                              key: 'conversionRate',
                              label: 'CVR',
                              format: 'percent',
                              align: 'right',
                              tooltip: 'conversionRate',
                            },
                          ]}
                          data={monthlyData}
                          pageSize={13}
                          showPagination={false}
                          emptyMessage="データがありません。GA4連携を確認してください。"
                        />
                      ) : (
                        /* グラフ形式 */
                        <ChartContainer title="月別推移グラフ" height={400}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
                              <YAxis />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Legend content={<CustomLegend />} />
                              <Line
                                type="monotone"
                                dataKey="users"
                                name="ユーザー数"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                hide={hiddenLines.users}
                              />
                              <Line
                                type="monotone"
                                dataKey="sessions"
                                name="セッション"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                hide={hiddenLines.sessions}
                              />
                              <Line
                                type="monotone"
                                dataKey="pageViews"
                                name="PV数"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                hide={hiddenLines.pageViews}
                              />
                              <Line
                                type="monotone"
                                dataKey="conversions"
                                name="CV数"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                hide={hiddenLines.conversions}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      )}
                </>
              )}
            </div>
          </>
        )}
        </div>

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          siteId={selectedSiteId}
          pageType="summary"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            // 現在期間のデータ
            users: data?.metrics?.totalUsers,
            sessions: data?.metrics?.sessions,
            pageViews: data?.metrics?.pageViews,
            engagementRate: data?.metrics?.engagementRate,
            conversions: data?.totalConversions,
            // 13ヶ月推移データ
            monthlyData: monthlyData,
          }}
        />

        {/* 新しいAI分析フローティングボタン */}
        {selectedSiteId && (
          <AIFloatingButton
            pageType={PAGE_TYPES.SUMMARY}
            metrics={{
              users: data?.metrics?.totalUsers || 0,
              sessions: data?.metrics?.sessions || 0,
              pageViews: data?.metrics?.pageViews || 0,
              engagementRate: data?.metrics?.engagementRate || 0,
              conversions: data?.totalConversions || 0,
              monthlyData: monthlyData || [],
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
