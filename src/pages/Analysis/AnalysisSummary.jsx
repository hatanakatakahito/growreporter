import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useSiteMetrics } from '../../hooks/useSiteMetrics';
import { useGA4MonthlyData } from '../../hooks/useGA4MonthlyData';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Tooltip from '../../components/common/Tooltip';
import { format, sub, startOfMonth } from 'date-fns';
import { Info } from 'lucide-react';
import { getTooltip } from '../../constants/tooltips';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { useAuth } from '../../contexts/AuthContext';

// 数値のカンマ区切り表示
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString();
};

/**
 * 分析画面 - 全体サマリー
 * 主要指標サマリ / コンバージョン内訳 / KPI予実の3タブ構成
 */
export default function AnalysisSummary() {
  const navigate = useNavigate();
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser, userProfile } = useAuth();

  const memberRole = userProfile?.memberRole || 'owner';
  const isViewer = memberRole === 'viewer';
  const [activeTab, setActiveTab] = useState('summary');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isConversionAlertOpen, setIsConversionAlertOpen] = useState(false);
  const [isKpiAlertOpen, setIsKpiAlertOpen] = useState(false);

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    setPageTitle('全体サマリー');
  }, []);

  // 初回のみコンバージョン未設定アラートを表示
  useEffect(() => {
    if (!selectedSite || !selectedSiteId) return;
    const conversionEvents = selectedSite.conversionEvents || [];
    if (conversionEvents.length === 0) {
      const hasSeenAlert = sessionStorage.getItem('conversionAlertSeen');
      if (!hasSeenAlert) {
        setIsConversionAlertOpen(true);
        sessionStorage.setItem('conversionAlertSeen', 'true');
      }
    }
  }, [selectedSite, selectedSiteId]);

  // Search Console連携の有無
  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // コンバージョン/KPI設定の有無
  const hasConversionSettings = selectedSite?.conversionEvents && selectedSite.conversionEvents.length > 0;
  const hasKpiSettings = selectedSite?.kpiSettings?.kpiList && selectedSite.kpiSettings.kpiList.length > 0;

  // 現在の期間のデータ取得
  const { data, isLoading, isError } = useSiteMetrics(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    hasGSCConnection
  );

  // 前月の日付範囲計算（コンバージョン内訳/KPI予実用）
  const previousMonthRange = useMemo(() => {
    const from = dateRange.from ? new Date(dateRange.from) : new Date();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();
    const diff = to - from;
    const prevTo = new Date(from.getTime() - 86400000); // 1日前
    const prevFrom = new Date(prevTo.getTime() - diff);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [dateRange]);

  // 前年同月の日付範囲計算
  const yearAgoRange = useMemo(() => {
    const from = dateRange.from ? sub(new Date(dateRange.from), { years: 1 }) : sub(new Date(), { years: 1 });
    const to = dateRange.to ? sub(new Date(dateRange.to), { years: 1 }) : sub(new Date(), { years: 1 });
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
  }, [dateRange]);

  const { data: previousMonthData } = useSiteMetrics(
    selectedSiteId, previousMonthRange.from, previousMonthRange.to, hasGSCConnection
  );
  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId, yearAgoRange.from, yearAgoRange.to, hasGSCConnection
  );

  // 13ヶ月分の月次データ（AI分析用に残す）
  const monthlyStartDate = useMemo(() => {
    if (!dateRange.to) return format(startOfMonth(sub(new Date(), { months: 12 })), 'yyyy-MM-dd');
    const endDate = new Date(dateRange.to);
    const endMonth = startOfMonth(endDate);
    return format(startOfMonth(sub(endMonth, { months: 12 })), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const monthlyEndDate = useMemo(() => {
    if (!dateRange.to) return format(new Date(), 'yyyy-MM-dd');
    return format(new Date(dateRange.to), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const { data: monthlyDataResponse } = useGA4MonthlyData(selectedSiteId, monthlyStartDate, monthlyEndDate);
  const monthlyData = monthlyDataResponse?.monthlyData || [];

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
                <span className={`inline-block w-20 text-right font-medium ${prevChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                <span className={`inline-block w-20 text-right font-medium ${yearChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {yearChange >= 0 ? '+' : ''}{yearChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ローディング中
  if (isLoading && !data) {
    return (
      <div className="flex h-full flex-col">
        <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="データを読み込んでいます..." />
          </div>
        </main>
      </div>
    );
  }

  // AI分析用のデータ構築
  const buildAIRawData = () => {
    if (!data) return null;

    const totalConversions = data.conversions
      ? Object.values(data.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const previousMonthTotalConversions = previousMonthData?.conversions
      ? Object.values(previousMonthData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const yearAgoTotalConversions = yearAgoData?.conversions
      ? Object.values(yearAgoData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const conversionBreakdown = {};
    if (selectedSite?.conversionEvents && data?.conversions) {
      selectedSite.conversionEvents.forEach(event => {
        const currentCount = data.conversions[event.eventName] || 0;
        const previousCount = previousMonthData?.conversions?.[event.eventName] || 0;
        const yearAgoCount = yearAgoData?.conversions?.[event.eventName] || 0;
        conversionBreakdown[event.displayName] = {
          current: currentCount,
          previous: previousCount,
          yearAgo: yearAgoCount,
          monthChange: previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : (currentCount > 0 ? 100 : 0),
          yearChange: yearAgoCount > 0 ? ((currentCount - yearAgoCount) / yearAgoCount) * 100 : (currentCount > 0 ? 100 : 0),
        };
      });
    }

    const kpiData = [];
    if (selectedSite?.kpiSettings?.kpiList && data?.metrics) {
      selectedSite.kpiSettings.kpiList.forEach(kpi => {
        let actualValue = 0;
        switch (kpi.metric) {
          case 'target_sessions': actualValue = data.metrics.sessions || 0; break;
          case 'target_users': actualValue = data.metrics.users || 0; break;
          case 'target_conversions': actualValue = data.metrics.conversions || 0; break;
          case 'target_conversion_rate':
            actualValue = data.metrics.sessions > 0
              ? ((data.metrics.conversions || 0) / data.metrics.sessions) * 100
              : 0;
            break;
          default:
            if (kpi.metric?.startsWith('conversion_') && kpi.eventName) {
              actualValue = data.conversions?.[kpi.eventName] || 0;
            }
        }
        const achievement = kpi.target > 0 ? (actualValue / kpi.target) * 100 : 0;
        const isRateMetric = kpi.metric?.includes('rate');
        kpiData.push({
          name: kpi.label,
          actual: actualValue,
          target: kpi.target,
          achievement,
          unit: isRateMetric ? '%' : '',
        });
      });
    }

    return {
      current: {
        metrics: data.metrics,
        conversions: data.conversions,
        totalConversions,
        conversionBreakdown,
      },
      previousMonth: previousMonthData ? {
        metrics: previousMonthData.metrics,
        conversions: previousMonthData.conversions,
        totalConversions: previousMonthTotalConversions,
      } : null,
      yearAgo: yearAgoData ? {
        metrics: yearAgoData.metrics,
        conversions: yearAgoData.conversions,
        totalConversions: yearAgoTotalConversions,
      } : null,
      monthlyTrend: monthlyData || [],
      kpiData,
      hasKpiSettings: kpiData.length > 0,
      hasConversionEvents: selectedSite?.conversionEvents?.length > 0,
      conversionEventNames: selectedSite?.conversionEvents?.map(e => e.eventName) || [],
    };
  };

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
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
            <div className="space-y-6">
              {/* タブナビゲーション */}
              <div className="flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'summary'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  主要指標サマリ
                </button>
                <button
                  onClick={() => {
                    if (!hasConversionSettings) {
                      setIsConversionAlertOpen(true);
                    } else {
                      setActiveTab('conversion');
                    }
                  }}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'conversion'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  } flex items-center justify-center gap-2`}
                >
                  コンバージョン内訳
                  {!hasConversionSettings && (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!hasKpiSettings) {
                      setIsKpiAlertOpen(true);
                    } else {
                      setActiveTab('kpi');
                    }
                  }}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'kpi'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  } flex items-center justify-center gap-2`}
                >
                  KPI予実
                  {!hasKpiSettings && (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>

              {/* 主要指標サマリタブ */}
              {activeTab === 'summary' && (
                <div>
                  {isLoading ? (
                    <LoadingSpinner message="データを読み込んでいます..." />
                  ) : data ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <MetricCard
                        title="訪問者"
                        currentValue={data?.metrics?.sessions || 0}
                        previousValue={previousMonthData?.metrics?.sessions || 0}
                        yearAgoValue={yearAgoData?.metrics?.sessions || 0}
                        tooltip={getTooltip('sessions')}
                      />
                      <MetricCard
                        title="ユーザー"
                        currentValue={data?.metrics?.totalUsers || 0}
                        previousValue={previousMonthData?.metrics?.totalUsers || 0}
                        yearAgoValue={yearAgoData?.metrics?.totalUsers || 0}
                        tooltip={getTooltip('users')}
                      />
                      <MetricCard
                        title="新規ユーザー"
                        currentValue={data?.metrics?.newUsers || 0}
                        previousValue={previousMonthData?.metrics?.newUsers || 0}
                        yearAgoValue={yearAgoData?.metrics?.newUsers || 0}
                        tooltip={getTooltip('newUsers')}
                      />
                      <MetricCard
                        title="表示回数"
                        currentValue={data?.metrics?.pageViews || 0}
                        previousValue={previousMonthData?.metrics?.pageViews || 0}
                        yearAgoValue={yearAgoData?.metrics?.pageViews || 0}
                        tooltip={getTooltip('pageViews')}
                      />
                      <MetricCard
                        title="平均PV"
                        currentValue={(data?.metrics?.pageViews || 0) / (data?.metrics?.sessions || 1)}
                        previousValue={(previousMonthData?.metrics?.pageViews || 0) / (previousMonthData?.metrics?.sessions || 1)}
                        yearAgoValue={(yearAgoData?.metrics?.pageViews || 0) / (yearAgoData?.metrics?.sessions || 1)}
                        format="decimal"
                        tooltip={getTooltip('avgPageviews')}
                      />
                      <MetricCard
                        title="ENG率"
                        currentValue={data?.metrics?.engagementRate || 0}
                        previousValue={previousMonthData?.metrics?.engagementRate || 0}
                        yearAgoValue={yearAgoData?.metrics?.engagementRate || 0}
                        format="percent"
                        tooltip={getTooltip('engagementRate')}
                      />
                      <MetricCard
                        title="CV数"
                        currentValue={data?.metrics?.conversions || 0}
                        previousValue={previousMonthData?.metrics?.conversions || 0}
                        yearAgoValue={yearAgoData?.metrics?.conversions || 0}
                        tooltip={getTooltip('conversions')}
                      />
                      <MetricCard
                        title="CVR"
                        currentValue={(data?.metrics?.conversions || 0) / (data?.metrics?.sessions || 1)}
                        previousValue={(previousMonthData?.metrics?.conversions || 0) / (previousMonthData?.metrics?.sessions || 1)}
                        yearAgoValue={(yearAgoData?.metrics?.conversions || 0) / (yearAgoData?.metrics?.sessions || 1)}
                        format="percent"
                        tooltip={getTooltip('conversionRate')}
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {/* コンバージョン内訳タブ */}
              {activeTab === 'conversion' && (
                <div className="space-y-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-dark dark:text-white">コンバージョン内訳</h3>
                    <Link to={`/sites/${selectedSiteId}/edit?step=4`} className="text-sm text-primary hover:underline">
                      設定を編集 →
                    </Link>
                  </div>

                  {!selectedSite?.conversionEvents || selectedSite.conversionEvents.length === 0 ? (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-900/30 dark:bg-orange-900/20">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                        <div>
                          <p className="text-orange-800 dark:text-orange-300">
                            コンバージョンイベントが設定されていません。
                            <Link to={`/sites/${selectedSiteId}/edit?step=4`} className="ml-2 font-semibold underline">
                              設定する →
                            </Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isLoading ? (
                    <LoadingSpinner message="データを読み込んでいます..." />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {selectedSite.conversionEvents.map((event, index) => {
                          const conversionCount = data?.conversions?.[event.eventName] || 0;
                          const previousMonthCount = previousMonthData?.conversions?.[event.eventName] || 0;
                          const monthChange = previousMonthCount > 0
                            ? ((conversionCount - previousMonthCount) / previousMonthCount) * 100
                            : conversionCount > 0 ? 100 : 0;
                          const yearAgoCount = yearAgoData?.conversions?.[event.eventName] || 0;
                          const yearChange = yearAgoCount > 0
                            ? ((conversionCount - yearAgoCount) / yearAgoCount) * 100
                            : conversionCount > 0 ? 100 : 0;

                          return (
                            <div
                              key={index}
                              className="rounded-lg border border-stroke bg-white p-6 transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-medium text-body-color">{event.displayName}</h4>
                                <div className="group relative">
                                  <Info className="h-4 w-4 text-body-color" />
                                  <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-64 rounded-lg bg-dark p-2 text-xs text-white shadow-lg group-hover:block">
                                    イベント名: {event.eventName}
                                    {event.category && <><br />カテゴリ: {event.category}</>}
                                  </div>
                                </div>
                              </div>
                              <div className="mb-4 text-4xl font-bold text-dark dark:text-white">
                                {formatNumber(conversionCount)}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-body-color">前月</span>
                                  <span className={`font-medium ${
                                    monthChange > 0 ? 'text-green-600 dark:text-green-400'
                                      : monthChange < 0 ? 'text-red-600 dark:text-red-400'
                                      : 'text-body-color'
                                  }`}>
                                    {monthChange > 0 ? '+' : ''}{monthChange.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-body-color">前年同月</span>
                                  <span className={`font-medium ${
                                    yearChange > 0 ? 'text-green-600 dark:text-green-400'
                                      : yearChange < 0 ? 'text-red-600 dark:text-red-400'
                                      : 'text-body-color'
                                  }`}>
                                    {yearChange > 0 ? '+' : ''}{yearChange.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(!data?.conversions || Object.keys(data.conversions).length === 0) && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            選択した期間にコンバージョンデータがありません
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* KPI予実タブ */}
              {activeTab === 'kpi' && (
                <div className="space-y-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-dark dark:text-white">KPI予実</h3>
                    <Link to={`/sites/${selectedSiteId}/edit?step=5`} className="text-sm text-primary hover:underline">
                      設定を編集 →
                    </Link>
                  </div>

                  {!selectedSite?.kpiSettings?.kpiList || selectedSite.kpiSettings.kpiList.length === 0 ? (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-900/30 dark:bg-orange-900/20">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                        <div>
                          <p className="text-orange-800 dark:text-orange-300">
                            KPIが設定されていません。
                            <Link to={`/sites/${selectedSiteId}/edit?step=5`} className="ml-2 font-semibold underline">
                              設定する →
                            </Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isLoading ? (
                    <LoadingSpinner message="データを読み込んでいます..." />
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {selectedSite.kpiSettings.kpiList.map((kpi, index) => {
                        const metricValue = kpi.metric;
                        const metricLabel = kpi.label;
                        const targetValue = kpi.target;

                        let actualValue = 0;
                        if (data?.metrics) {
                          switch (metricValue) {
                            case 'users': actualValue = data.metrics.users || 0; break;
                            case 'sessions': actualValue = data.metrics.sessions || 0; break;
                            case 'pageviews': actualValue = data.metrics.pageViews || 0; break;
                            case 'engagement_rate': actualValue = (data.metrics.engagementRate || 0) * 100; break;
                            case 'target_sessions': actualValue = data.metrics.sessions || 0; break;
                            case 'target_users': actualValue = data.metrics.users || 0; break;
                            case 'target_conversions': actualValue = data.metrics.conversions || 0; break;
                            case 'target_conversion_rate':
                              actualValue = data.metrics.sessions > 0
                                ? ((data.metrics.conversions || 0) / data.metrics.sessions) * 100
                                : 0;
                              break;
                            default:
                              if (metricValue?.startsWith('conversion_') && kpi.eventName) {
                                actualValue = data.conversions?.[kpi.eventName] || 0;
                              }
                          }
                        }

                        const achievementRate = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
                        const progressPercent = Math.min(achievementRate, 100);
                        const isRateMetric = metricValue?.includes('rate');

                        return (
                          <div
                            key={kpi.id || index}
                            className="rounded-lg border border-stroke bg-white p-6 transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-medium text-body-color">{metricLabel}</h4>
                              <div className="group relative">
                                <Info className="h-4 w-4 text-body-color" />
                                <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-64 rounded-lg bg-dark p-2 text-xs text-white shadow-lg group-hover:block">
                                  指標: {metricLabel}
                                  <br />
                                  目標値: {isRateMetric ? `${targetValue}%` : targetValue?.toLocaleString()}
                                  <br />
                                  実績値: {isRateMetric ? `${actualValue.toFixed(2)}%` : Math.round(actualValue).toLocaleString()}
                                  <br />
                                  達成率: {achievementRate.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            <div className="mb-4 text-4xl font-bold text-dark dark:text-white">
                              {isRateMetric
                                ? `${actualValue.toFixed(2)}%`
                                : formatNumber(Math.round(actualValue))
                              }
                            </div>

                            <div className="mb-3">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs text-body-color">進捗</span>
                                <span className="text-xs font-medium text-body-color">
                                  {achievementRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-dark-3">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    achievementRate >= 100 ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="text-sm text-body-color">
                              目標: <span className="font-medium text-dark dark:text-white">
                                {isRateMetric
                                  ? `${targetValue}%`
                                  : targetValue?.toLocaleString() || '-'
                                }
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* メモ & AI分析タブ */}
          {selectedSiteId && currentUser && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="analysis/summary"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="analysis/summary"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  (() => {
                    const rawData = buildAIRawData();
                    return rawData ? (
                      <AIAnalysisSection
                        pageType={PAGE_TYPES.SUMMARY}
                        rawData={rawData}
                        period={{
                          startDate: dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                          endDate: dateRange?.to || new Date(),
                        }}
                        onLimitExceeded={() => setIsLimitModalOpen(true)}
                      />
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        データを読み込み中...
                      </div>
                    );
                  })()
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && data && !isViewer && (
          <AIFloatingButton
            pageType={PAGE_TYPES.SUMMARY}
            onScrollToAI={scrollToAIAnalysis}
          />
        )}

        {/* 制限超過モーダル */}
        {isLimitModalOpen && (
          <PlanLimitModal
            onClose={() => setIsLimitModalOpen(false)}
            type="summary"
          />
        )}

        {/* コンバージョン未設定アラートモーダル */}
        {isConversionAlertOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsConversionAlertOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stroke p-4 dark:border-dark-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    コンバージョン定義が未設定です
                  </h3>
                </div>
                <button
                  onClick={() => setIsConversionAlertOpen(false)}
                  className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm leading-relaxed text-body-color">
                  正確なコンバージョン分析を行うには、サイト設定でコンバージョンイベントを定義してください。
                </p>
              </div>
              <div className="border-t border-stroke p-4 dark:border-dark-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConversionAlertOpen(false)}
                    className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => navigate(`/sites/${selectedSiteId}/edit?step=4`)}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                  >
                    設定する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI未設定アラートモーダル */}
        {isKpiAlertOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsKpiAlertOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stroke p-4 dark:border-dark-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    KPI目標が未設定です
                  </h3>
                </div>
                <button
                  onClick={() => setIsKpiAlertOpen(false)}
                  className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm leading-relaxed text-body-color">
                  正確なKPI予実分析を行うには、サイト設定でKPI目標を定義してください。
                </p>
              </div>
              <div className="border-t border-stroke p-4 dark:border-dark-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsKpiAlertOpen(false)}
                    className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => navigate(`/sites/${selectedSiteId}/edit?step=5`)}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                  >
                    設定する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
