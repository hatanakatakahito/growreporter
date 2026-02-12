import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';
import { useSiteMetrics } from '../hooks/useSiteMetrics';
import { useGA4MonthlyData } from '../hooks/useGA4MonthlyData';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format, sub } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BarChart3, Info, Globe } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
import { getTooltip } from '../constants/tooltips';
import AIFloatingButton from '../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../constants/plans';

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

  // Search Console連携の有無をチェック（確実にブール値にする）
  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // 現在の期間のデータ取得
  const { data, isLoading, isError, error, refetch } = useSiteMetrics(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    hasGSCConnection
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
    previousMonthRange.to,
    hasGSCConnection
  );

  // 前年同月のデータを取得
  const yearAgoRange = getYearAgoRange(dateRange.from, dateRange.to);
  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId,
    yearAgoRange.from,
    yearAgoRange.to,
    hasGSCConnection
  );

  // 13ヶ月推移データを取得（AI分析用）
  const get13MonthsRange = () => {
    const toDate = new Date(dateRange.to);
    const fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - 12); // 13ヶ月分（現在月含む12ヶ月前まで）
    
    return {
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(toDate, 'yyyy-MM-dd'),
    };
  };
  
  const thirteenMonthsRange = get13MonthsRange();
  const { data: monthlyTrendData } = useGA4MonthlyData(
    selectedSiteId,
    thirteenMonthsRange.from,
    thirteenMonthsRange.to
  );

  // ローディング中
  if (isLoading && !data) {
    return (
      <div className="flex flex-col h-full">
        <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
        <main className="flex-1 overflow-y-auto p-6">
          <LoadingSpinner skeleton="dashboard" />
        </main>
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
  const MetricCard = ({ title, currentValue, previousValue, yearAgoValue, format: formatType = 'number', tooltip }) => {
    const formatValue = (value) => {
      if (value === null || value === undefined) return '-';
      if (formatType === 'percent') return `${(value * 100).toFixed(2)}%`;
      if (formatType === 'decimal') return value.toFixed(2);
      return Math.round(value).toLocaleString();
    };

    const calculateChangePercent = (current, previous) => {
      if (!previous || previous === 0) return null;
      return ((current - previous) / previous) * 100;
    };

    const prevChange = calculateChangePercent(currentValue, previousValue);
    const yearChange = calculateChangePercent(currentValue, yearAgoValue);

    return (
      <div className="rounded-lg border border-stroke bg-white p-6 transition-shadow hover:shadow-md dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-body-color">{title}</h4>
            {tooltip && (
              <div className="group relative">
                <Info className="h-4 w-4 text-body-color cursor-help" />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-dark p-2 text-xs text-white shadow-lg group-hover:block">
                  {tooltip}
                </div>
              </div>
            )}
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

  // サイトが選択されていない場合
  if (!selectedSiteId && sites.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
        <main className="flex-1 overflow-y-auto">
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
    );
  }

  // サイトが登録されていない場合（読み込み完了後）
  if (!isSitesLoading && sites.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
        <main className="flex-1 overflow-y-auto">
          {/* モーダル背景 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            {/* モーダルコンテンツ */}
            <div className="max-w-lg rounded-2xl bg-white p-10 text-center shadow-2xl dark:bg-dark-2">
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
                className="h-12 w-full rounded-md bg-primary px-8 text-lg font-medium text-white transition hover:bg-opacity-90 sm:w-auto"
              >
                サイト管理へ
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader 
        dateRange={dateRange} 
        setDateRange={updateDateRange} 
        showDateRange={true} 
        showSiteInfo={false}
        title="ダッシュボード"
        subtitle="定期に指標と改善点を一目で確認"
      />
      
      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto">
        {/* カバーセクション（スクロール可能） */}
        {selectedSite && (
          <div
            style={{
              background: 'linear-gradient(to right, #E0E7FF, #F3E8FF)',
            }}
          >
            <div className="mx-auto max-w-7xl px-6 py-10">
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <h1 className="text-3xl font-bold text-gray-900">
                      {selectedSite.siteName || 'サイト名'}
                    </h1>
                  </div>
                  <p className="mb-6 text-xs text-gray-500">{selectedSite.siteUrl || ''}</p>

                  <div className="mb-3">
                    <p className="text-base font-semibold text-gray-900">
                      {selectedSite.metaTitle || 'メタタイトルが設定されていません'}
                    </p>
                  </div>

                  <div>
                    <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                      {selectedSite.metaDescription || 'メタディスクリプションが設定されていません'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  {selectedSite.pcScreenshotUrl ? (
                    <div className="overflow-hidden rounded-lg bg-white shadow-md">
                      <img
                        src={selectedSite.pcScreenshotUrl}
                        alt="PCキャプチャ"
                        className="h-48 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-48 w-64 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md">
                      <p className="text-sm text-gray-400">PCスクリーンショット未設定</p>
                    </div>
                  )}
                  {selectedSite.mobileScreenshotUrl ? (
                    <div className="overflow-hidden rounded-lg bg-white shadow-md">
                      <img
                        src={selectedSite.mobileScreenshotUrl}
                        alt="スマホキャプチャ"
                        className="h-48 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-48 w-32 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md">
                      <p className="text-center text-sm text-gray-400">スマホ<br />スクリーン<br />ショット<br />未設定</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mx-auto max-w-7xl px-6 py-10">

        {/* タブナビゲーション */}
        <div className="space-y-6">
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
              onClick={() => setActiveTab('conversion')}
              className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'conversion'
                  ? 'bg-primary text-white transition hover:bg-opacity-90'
                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
              }`}
            >
              コンバージョン内訳
            </button>
            <button
              onClick={() => setActiveTab('kpi')}
              className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'kpi'
                  ? 'bg-primary text-white transition hover:bg-opacity-90'
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <MetricCard
                    title="セッション"
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

        {/* 🔴 コンバージョン定義未設定の警告バナー（下部） */}
        {selectedSite && (!selectedSite.conversionEvents || selectedSite.conversionEvents.length === 0) && (
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
        )}
        </div>
        </div>
      </main>

      {/* AI分析フローティングボタン */}
    {selectedSiteId && data && monthlyTrendData && (() => {
      // AI分析用のメトリクスを構築
      // 総コンバージョン数を計算
      const totalConversions = data.conversions 
        ? Object.values(data.conversions).reduce((sum, val) => sum + (val || 0), 0)
        : 0;
      
      const previousMonthTotalConversions = previousMonthData?.conversions
        ? Object.values(previousMonthData.conversions).reduce((sum, val) => sum + (val || 0), 0)
        : 0;
        
      const yearAgoTotalConversions = yearAgoData?.conversions
        ? Object.values(yearAgoData.conversions).reduce((sum, val) => sum + (val || 0), 0)
        : 0;
      
      // コンバージョン内訳データの整形
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

      // KPI予実データの整形
      const kpiData = [];
      if (selectedSite?.kpiSettings?.kpiList && data?.metrics) {
        selectedSite.kpiSettings.kpiList.forEach(kpi => {
          const metricValue = kpi.metric;
          const metricLabel = kpi.label;
          const targetValue = kpi.target;
          
          // KPIのmetricから実績値を取得（フロント表示と同じロジック）
          let actualValue = 0;
          
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
              actualValue = (data.metrics.engagementRate || 0) * 100;
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
          
          const achievement = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
          
          // レートタイプの判定
          const isRateMetric = metricValue?.includes('rate');
          
          kpiData.push({
            name: metricLabel,
            actual: actualValue,
            target: targetValue,
            achievement: achievement,
            unit: isRateMetric ? '%' : '',
          });
        });
      }

      // rawData方式：既に取得したデータをそのまま渡す
      const dashboardRawData = {
        // 現在期間のデータ
        current: {
          metrics: data.metrics,
          conversions: data.conversions,
          totalConversions,
          conversionBreakdown,
        },
        // 前月期間のデータ
        previousMonth: previousMonthData ? {
          metrics: previousMonthData.metrics,
          conversions: previousMonthData.conversions,
          totalConversions: previousMonthTotalConversions,
        } : null,
        // 前年同月期間のデータ
        yearAgo: yearAgoData ? {
          metrics: yearAgoData.metrics,
          conversions: yearAgoData.conversions,
          totalConversions: yearAgoTotalConversions,
        } : null,
        // 13ヶ月推移データ
        monthlyTrend: monthlyTrendData?.monthlyData || [],
        // KPI設定
        kpiData,
        hasKpiSettings: kpiData.length > 0,
        // コンバージョン定義
        hasConversionEvents: selectedSite?.conversionEvents && selectedSite.conversionEvents.length > 0,
        conversionEventNames: selectedSite?.conversionEvents?.map(e => e.eventName) || [],
      };
      
      return (
        <AIFloatingButton
          pageType={PAGE_TYPES.DASHBOARD}
          rawData={dashboardRawData}
          period={{
            startDate: dateRange.from,
            endDate: dateRange.to,
          }}
        />
      );
    })()}
    </div>
  );
}
