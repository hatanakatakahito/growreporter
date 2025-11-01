import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';
import { useSiteMetrics } from '../hooks/useSiteMetrics';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format, sub } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BarChart3, Info, Sparkles, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
import { getTooltip } from '../constants/tooltips';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import ReactMarkdown from 'react-markdown';
import ImprovementDialog from '../components/Improve/ImprovementDialog';

/**
 * ダッシュボード画面
 * サイトの主要指標、コンバージョン内訳、KPI予実を表示
 */
export default function Dashboard() {
  const { sites, selectedSite, selectedSiteId, selectSite, dateRange, updateDateRange, isLoading: isSitesLoading } = useSite();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('summary');
  
  // AI分析用のstate
  const [isAIExpanded, setIsAIExpanded] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiGeneratedAt, setAiGeneratedAt] = useState('');
  
  // タスク追加ダイアログ用のstate
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

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
    dateRange.to,
    selectedSite?.searchConsoleConnected
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
    selectedSite?.searchConsoleConnected
  );

  // 前年同月のデータを取得
  const yearAgoRange = getYearAgoRange(dateRange.from, dateRange.to);
  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId,
    yearAgoRange.from,
    yearAgoRange.to,
    selectedSite?.searchConsoleConnected
  );

  // AI分析を生成
  const generateAISummary = async () => {
    if (!data || isLoading) {
      setAiError('データが読み込まれていません。');
      return;
    }

    setIsAILoading(true);
    setAiError('');
    setAiSummary('');

    try {
      const generateAI = httpsCallable(functions, 'generateAISummary');
      
      // コンバージョン定義の確認
      const hasConversionDefinitions = data.conversions && Object.keys(data.conversions).length > 0;
      
      // 総コンバージョン数の計算
      const currentConversions = data.metrics.conversions || 0;
      const previousConversions = previousMonthData?.metrics?.conversions || 0;
      
      // 前月比データの計算
      const monthOverMonth = previousMonthData ? {
        users: {
          current: data.metrics.totalUsers,
          previous: previousMonthData.metrics.totalUsers,
          change: calculateChange(data.metrics.totalUsers, previousMonthData.metrics.totalUsers),
        },
        sessions: {
          current: data.metrics.sessions,
          previous: previousMonthData.metrics.sessions,
          change: calculateChange(data.metrics.sessions, previousMonthData.metrics.sessions),
        },
        pageViews: {
          current: data.metrics.pageViews,
          previous: previousMonthData.metrics.pageViews,
          change: calculateChange(data.metrics.pageViews, previousMonthData.metrics.pageViews),
        },
        conversions: {
          current: currentConversions,
          previous: previousConversions,
          change: calculateChange(currentConversions, previousConversions),
        },
        engagementRate: {
          current: data.metrics.engagementRate,
          previous: previousMonthData.metrics.engagementRate,
          change: calculateChange(data.metrics.engagementRate, previousMonthData.metrics.engagementRate),
        },
      } : null;

      const result = await generateAI({
        siteId: selectedSiteId,
        pageType: 'dashboard',
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: {
          // 現在期間のデータ
          users: data.metrics.totalUsers,
          newUsers: data.metrics.newUsers,
          sessions: data.metrics.sessions,
          pageViews: data.metrics.pageViews,
          engagementRate: data.metrics.engagementRate,
          bounceRate: data.metrics.bounceRate,
          avgSessionDuration: data.metrics.avgSessionDuration,
          conversions: currentConversions,
          conversionRate: currentConversions && data.metrics.sessions 
            ? (currentConversions / data.metrics.sessions) * 100 
            : 0,
          // コンバージョン定義の有無
          hasConversionDefinitions,
          // コンバージョン内訳
          conversionBreakdown: hasConversionDefinitions ? data.conversions : null,
          // 前月比データ
          monthOverMonth,
        },
      });

      setAiSummary(result.data.summary);
      setAiRecommendations(result.data.recommendations || []);
      setAiGeneratedAt(result.data.generatedAt);
    } catch (err) {
      console.error('AI分析エラー:', err);
      
      // レート制限エラーの特別な処理
      if (err.code === 'functions/resource-exhausted' || err.message?.includes('リクエスト上限')) {
        setAiError('AI分析のリクエスト上限に達しました。しばらく時間をおいてから再度お試しください。（通常1〜5分で回復します）');
      } else {
        setAiError(err.message || 'AI分析の生成に失敗しました。');
      }
    } finally {
      setIsAILoading(false);
    }
  };

  // サイトIDが変更されたらAI分析の状態をクリア
  useEffect(() => {
    setAiSummary('');
    setAiRecommendations([]);
    setAiError('');
    setAiGeneratedAt('');
  }, [selectedSiteId]);

  // データが読み込まれたら自動的にAI分析を生成
  useEffect(() => {
    if (data && !isLoading && !aiSummary && !isAILoading) {
      generateAISummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading, selectedSiteId]);

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
    <>
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

              {/* AI分析カード（インライン型） */}
              {!isError && data && (
                <div className="mt-10">
                  <div className="bg-gradient-to-br from-blue-50 to-pink-50 dark:from-blue-900/20 dark:to-pink-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI分析レポート</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(dateRange.from), 'yyyy年M月d日', { locale: ja })} - {format(new Date(dateRange.to), 'yyyy年M月d日', { locale: ja })} のデータを分析
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAIExpanded(!isAIExpanded)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {isAIExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {isAIExpanded && (
                      <>
                        {isAILoading ? (
                          <div className="bg-white dark:bg-dark rounded-lg p-8 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-gray-600 dark:text-gray-400">AI分析を生成中...</p>
                            </div>
                          </div>
                        ) : aiError ? (
                          <div className="bg-white dark:bg-dark rounded-lg p-4 border-l-4 border-red-500">
                            <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
                          </div>
                        ) : aiSummary ? (
                          <>
                            <div className="bg-white dark:bg-dark rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-4" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-3" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-2" {...props} />,
                                  h4: ({node, ...props}) => <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 mt-2" {...props} />,
                                  p: ({node, ...props}) => <p className="mb-3 text-sm leading-relaxed" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                                  li: ({node, ...props}) => <li className="text-sm ml-2" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                                  em: ({node, ...props}) => <em className="italic text-gray-700 dark:text-gray-300" {...props} />,
                                  code: ({node, ...props}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                                }}
                              >
                                {aiSummary}
                              </ReactMarkdown>
                            </div>
                            
                            {/* 推奨アクション */}
                            {aiRecommendations && aiRecommendations.length > 0 && (
                              <div className="mt-4 bg-white dark:bg-dark rounded-lg p-4 border-t border-blue-200 dark:border-blue-800">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <span>💡</span>
                                  <span>おすすめの改善タスク</span>
                                </h4>
                                <div className="space-y-3">
                                  {aiRecommendations.map((rec, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors">
                                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{index + 1}.</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{rec.title}</p>
                                        {rec.description && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{rec.description}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          setSelectedTask({
                                            title: rec.title,
                                            description: rec.description,
                                            category: rec.category,
                                            priority: rec.priority,
                                            expectedImpact: '',
                                          });
                                          setIsTaskDialogOpen(true);
                                        }}
                                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded hover:bg-opacity-90 transition-colors"
                                      >
                                        タスク追加
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                生成日時: {aiGeneratedAt ? format(new Date(aiGeneratedAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}
                              </span>
                              <button
                                onClick={generateAISummary}
                                disabled={isAILoading}
                                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                再生成
                              </button>
                            </div>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              )}
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

    {/* タスク追加ダイアログ */}
    <ImprovementDialog
      isOpen={isTaskDialogOpen}
      onClose={() => {
        setIsTaskDialogOpen(false);
        setSelectedTask(null);
      }}
      siteId={selectedSiteId}
      editingItem={selectedTask}
    />
    </>
  );
}

