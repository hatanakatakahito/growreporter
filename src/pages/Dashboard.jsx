import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';
import { useSiteMetrics } from '../hooks/useSiteMetrics';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format, sub } from 'date-fns';
import { BarChart3, Info } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
import { getTooltip } from '../constants/tooltips';

/**
 * ダッシュボード画面
 * サイトの主要指標、コンバージョン内訳、KPI予実を表示
 */
export default function Dashboard() {
  const { sites, selectedSite, selectedSiteId, selectSite, dateRange, updateDateRange, isLoading: isSitesLoading } = useSite();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('summary');

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ダッシュボード');
  }, []);

  // URLパラメータのsiteIdがあれば選択
  useEffect(() => {
    const siteIdParam = searchParams.get('siteId');
    if (siteIdParam && siteIdParam !== selectedSiteId && sites.some(site => site.id === siteIdParam)) {
      selectSite(siteIdParam);
    }
  }, [searchParams, selectedSiteId, sites, selectSite]);

  // 現在の期間のデータ取得
  const { data, isLoading, isError, error, refetch } = useSiteMetrics(
    selectedSiteId,
    dateRange.from,
    dateRange.to
  );

  // 前月比較用の期間を計算
  const getPreviousMonthRange = (from, to) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));
    
    const prevTo = new Date(fromDate);
    prevTo.setDate(prevTo.getDate() - 1);
    
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - daysDiff);
    
    return {
      from: format(prevFrom, 'yyyy-MM-dd'),
      to: format(prevTo, 'yyyy-MM-dd'),
    };
  };

  // 前年同月比較用の期間を計算
  const getYearAgoRange = (from, to) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    const yearAgoFrom = new Date(fromDate);
    yearAgoFrom.setFullYear(yearAgoFrom.getFullYear() - 1);
    
    const yearAgoTo = new Date(toDate);
    yearAgoTo.setFullYear(yearAgoTo.getFullYear() - 1);
    
    return {
      from: format(yearAgoFrom, 'yyyy-MM-dd'),
      to: format(yearAgoTo, 'yyyy-MM-dd'),
    };
  };

  // 前月のデータを取得
  const previousMonthRange = getPreviousMonthRange(dateRange.from, dateRange.to);
  const { data: previousMonthData } = useSiteMetrics(
    selectedSiteId,
    previousMonthRange.from,
    previousMonthRange.to
  );

  // 前年同月のデータを取得
  const yearAgoRange = getYearAgoRange(dateRange.from, dateRange.to);
  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId,
    yearAgoRange.from,
    yearAgoRange.to
  );

  // ローディング中
  if (isLoading && !data) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
        <Sidebar />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ml-64">
          <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
          <main className="flex-1">
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="データを読み込んでいます..." />
          </div>
          </main>
        </div>
      </div>
    );
  }

  // 変化率を計算
  const calculateChange = (current, previous) => {
    if (typeof current !== 'number' || typeof previous !== 'number' || isNaN(current) || isNaN(previous)) return 0;
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }
    return ((current - previous) / previous) * 100;
  };

  // 数値フォーマット
  const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString();
  };

  // パーセンテージフォーマット
  const formatPercentage = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0.00%';
    return `${(num * 100).toFixed(2)}%`;
  };

  // メトリックカードコンポーネント
  const MetricCard = ({ title, value, monthChange, yearChange, tooltip }) => (
    <div className="rounded-lg border border-stroke bg-white p-6 transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-body-color">{title}</h4>
        <div className="group relative">
          <Info className="h-4 w-4 text-body-color" />
          <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-64 rounded-lg bg-dark p-2 text-xs text-white shadow-lg group-hover:block">
            {tooltip}
          </div>
        </div>
      </div>
      <div className="mb-4 text-4xl font-bold text-dark dark:text-white">{value}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-body-color">前月</span>
          <span className={`font-medium ${monthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {monthChange >= 0 ? '+' : ''}{Math.abs(monthChange).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-body-color">前年同月</span>
          <span className={`font-medium ${yearChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {yearChange >= 0 ? '+' : ''}{Math.abs(yearChange).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );

  // サイトが選択されていない場合
  if (!selectedSiteId && sites.length > 0) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
        <Sidebar />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ml-64">
          <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
          <main className="flex-1">
          <div className="flex min-h-[60vh] items-center justify-center p-12">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-dark dark:text-white">
                サイトを選択してください
              </h2>
              <p className="mb-8 text-body-color">
                ヘッダーのサイト選択ドロップダウンから<br />
                分析したいサイトを選択してください。
              </p>
            </div>
          </div>
          </main>
        </div>
      </div>
    );
  }

  // サイトが登録されていない場合（読み込み完了後）
  if (!isSitesLoading && sites.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
        <Sidebar />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ml-64">
          <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
          <main className="flex-1">
          <div className="flex min-h-[60vh] items-center justify-center p-12">
            <div className="max-w-lg rounded-xl border border-stroke bg-white p-8 text-center shadow-lg dark:border-dark-3 dark:bg-dark-2">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-4 text-2xl font-bold text-dark dark:text-white">
                GROW REPORTERへようこそ！
              </h2>
              <p className="mb-8 leading-relaxed text-body-color">
                分析を始めるには、まずサイトを登録する必要があります。<br />
                下のボタンからサイト管理ページに進んでください。
              </p>
              <button
                onClick={() => navigate('/sites/list')}
                className="h-12 w-full rounded-md bg-primary px-8 text-lg font-medium text-white hover:bg-opacity-90 sm:w-auto"
              >
                サイト管理へ
              </button>
            </div>
          </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ml-64">
        <AnalysisHeader 
          dateRange={dateRange} 
          setDateRange={updateDateRange} 
          showDateRange={true} 
          showSiteInfo={true}
          title="ダッシュボード"
          subtitle="定期に指標と改善点を一目で確認"
        />

        {/* メインコンテンツ */}
        <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-10">

        {/* タブナビゲーション */}
        <div className="space-y-6">
          <div className="flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                activeTab === 'summary'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
              }`}
            >
              主要指標サマリ
            </button>
            <button
              onClick={() => setActiveTab('conversion')}
              className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                activeTab === 'conversion'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
              }`}
            >
              コンバージョン内訳
            </button>
            <button
              onClick={() => setActiveTab('kpi')}
              className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                activeTab === 'kpi'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
              }`}
            >
              KPI予実
            </button>
          </div>

          {/* 主要指標サマリタブ */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark dark:text-white">主要指標サマリ</h3>
                <Link to="/analysis/summary" className="text-sm text-primary hover:underline">
                  詳細を見る →
                </Link>
              </div>

              {isLoading ? (
                <LoadingSpinner message="データを読み込んでいます..." />
              ) : isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <h4 className="mb-2 text-base font-semibold text-red-800 dark:text-red-300">
                        GA4に接続してデータを取得してください
                      </h4>
                      <Link
                        to={`/sites/${selectedSite}/edit?step=2`}
                        className="font-semibold text-red-800 underline dark:text-red-300"
                      >
                        設定画面へ →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : data ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <MetricCard
                    title="セッション"
                    value={formatNumber(data.metrics.sessions)}
                    monthChange={calculateChange(data.metrics.sessions, previousMonthData?.metrics?.sessions || 0)}
                    yearChange={calculateChange(data.metrics.sessions, yearAgoData?.metrics?.sessions || 0)}
                    tooltip="ユーザーがサイトを訪問した回数（30分以上の間隔で区切られる）"
                  />
                  <MetricCard
                    title="表示回数"
                    value={formatNumber(data.metrics.pageViews)}
                    monthChange={calculateChange(data.metrics.pageViews, previousMonthData?.metrics?.pageViews || 0)}
                    yearChange={calculateChange(data.metrics.pageViews, yearAgoData?.metrics?.pageViews || 0)}
                    tooltip="ページが閲覧された総回数（同じページの再表示も含む）"
                  />
                  <MetricCard
                    title="平均PV"
                    value={(data.metrics.pageViews / (data.metrics.sessions || 1)).toFixed(2)}
                    monthChange={calculateChange(
                      data.metrics.pageViews / (data.metrics.sessions || 1),
                      (previousMonthData?.metrics?.pageViews || 0) / (previousMonthData?.metrics?.sessions || 1)
                    )}
                    yearChange={calculateChange(
                      data.metrics.pageViews / (data.metrics.sessions || 1),
                      (yearAgoData?.metrics?.pageViews || 0) / (yearAgoData?.metrics?.sessions || 1)
                    )}
                    tooltip="1セッションあたりの平均ページビュー数"
                  />
                  <MetricCard
                    title="ENG率"
                    value={formatPercentage(data.metrics.engagementRate)}
                    monthChange={calculateChange(data.metrics.engagementRate, previousMonthData?.metrics?.engagementRate || 0)}
                    yearChange={calculateChange(data.metrics.engagementRate, yearAgoData?.metrics?.engagementRate || 0)}
                    tooltip="10秒以上滞在または2ページ以上閲覧したセッションの割合"
                  />
                  <MetricCard
                    title="CV数"
                    value={formatNumber(data.metrics.conversions)}
                    monthChange={calculateChange(data.metrics.conversions, previousMonthData?.metrics?.conversions || 0)}
                    yearChange={calculateChange(data.metrics.conversions, yearAgoData?.metrics?.conversions || 0)}
                    tooltip="サイト設定で定義したコンバージョンの合計数"
                  />
                  <MetricCard
                    title="CVR"
                    value={formatPercentage(data.metrics.conversions / (data.metrics.sessions || 1))}
                    monthChange={calculateChange(
                      data.metrics.conversions / (data.metrics.sessions || 1),
                      (previousMonthData?.metrics?.conversions || 0) / (previousMonthData?.metrics?.sessions || 1)
                    )}
                    yearChange={calculateChange(
                      data.metrics.conversions / (data.metrics.sessions || 1),
                      (yearAgoData?.metrics?.conversions || 0) / (yearAgoData?.metrics?.sessions || 1)
                    )}
                    tooltip="コンバージョンが発生したセッションの割合"
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
                        <Link
                          to={`/sites/${selectedSiteId}/edit?step=4`}
                          className="ml-2 font-semibold underline"
                        >
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
                      // GA4データからコンバージョン数を取得
                      const conversionCount = data?.conversions?.[event.eventName] || 0;
                      
                      // 前月のコンバージョン数
                      const previousMonthCount = previousMonthData?.conversions?.[event.eventName] || 0;
                      const monthChange = previousMonthCount > 0 
                        ? ((conversionCount - previousMonthCount) / previousMonthCount) * 100 
                        : conversionCount > 0 ? 100 : 0;
                      
                      // 前年同月のコンバージョン数
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
                                monthChange > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : monthChange < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-body-color'
                              }`}>
                                {monthChange > 0 ? '+' : ''}{monthChange.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-body-color">前年同月</span>
                              <span className={`font-medium ${
                                yearChange > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : yearChange < 0 
                                  ? 'text-red-600 dark:text-red-400' 
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
                        💡 選択した期間にコンバージョンデータがありません
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
                        <Link
                          to={`/sites/${selectedSiteId}/edit?step=5`}
                          className="ml-2 font-semibold underline"
                        >
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
                    {selectedSite.kpiSettings.kpiList.map((kpi, index) => {
                      // STEP5で保存されたデータ構造に対応
                      const metricValue = kpi.metric;           // metric
                      const metricLabel = kpi.label;            // label
                      const targetValue = kpi.target;           // target
                      
                      // KPIのmetricから実績値を取得
                      let actualValue = 0;
                      
                      if (data?.metrics) {
                        // 指標の種類によって取得元を変える
                        switch (metricValue) {
                          case 'users':
                            actualValue = data.metrics.users || 0;
                            break;
                          case 'sessions':
                            actualValue = data.metrics.sessions || 0;
                            break;
                          case 'pageviews':
                            actualValue = data.metrics.pageViews || 0;
                            break;
                          case 'engagement_rate':
                            actualValue = (data.metrics.engagementRate || 0) * 100; // パーセンテージに変換
                            break;
                          case 'target_sessions':
                            actualValue = data.metrics.sessions || 0;
                            break;
                          case 'target_users':
                            actualValue = data.metrics.users || 0;
                            break;
                          case 'target_conversions':
                            actualValue = data.metrics.conversions || 0;
                            break;
                          case 'target_conversion_rate':
                            actualValue = data.metrics.sessions > 0 
                              ? ((data.metrics.conversions || 0) / data.metrics.sessions) * 100 
                              : 0;
                            break;
                          default:
                            // コンバージョンイベントの場合
                            if (metricValue?.startsWith('conversion_') && kpi.eventName) {
                              actualValue = data.conversions?.[kpi.eventName] || 0;
                            }
                        }
                      }
                      
                      // 達成率を計算
                      const achievementRate = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
                      const progressPercent = Math.min(achievementRate, 100); // 100%を上限に
                      
                      // レートタイプの判定
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
                          
                          {/* 実績値 */}
                          <div className="mb-4 text-4xl font-bold text-dark dark:text-white">
                            {isRateMetric 
                              ? `${actualValue.toFixed(2)}%`
                              : formatNumber(Math.round(actualValue))
                            }
                          </div>
                          
                          {/* 進捗バー */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-body-color">進捗</span>
                              <span className="text-xs font-medium text-body-color">
                                {achievementRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-dark-3">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  achievementRate >= 100
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                </div>
              </div>

                          {/* 目標値 */}
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
                </>
              )}
            </div>
          )}
        </div>
        </div>
        </main>
      </div>
    </div>
  );
}

