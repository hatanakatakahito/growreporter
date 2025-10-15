'use client';

/**
 * ダッシュボードページ
 * サイトプレビュー、改善の気づき、KPI予実、主要指標、トレンド、クイックアクションを表示
 */

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GA4DataService, GA4Metrics, GA4TimeSeriesData } from '@/lib/api/ga4DataService';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';
import { KPIService, KPISetting } from '@/lib/kpi/kpiService';
import InsightsAlert from '@/components/insights/InsightsAlert';
import { DetectedIssue } from '@/lib/improvements/types';
import Loading from '@/components/common/Loading';
import MetricTooltip from '@/components/charts/MetricTooltip';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // データ
  const [stats, setStats] = useState<GA4Metrics>({
    newUsers: 0,
    sessions: 0,
    totalUsers: 0,
    activeUsers: 0,
    conversions: 0,
    engagementRate: 0,
    screenPageViews: 0,
    averageSessionDuration: 0,
    conversionRate: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState<GA4TimeSeriesData[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [conversions, setConversions] = useState<ConversionEvent[]>([]);
  const [kpiSettings, setKpiSettings] = useState<KPISetting[]>([]);
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  const [showInsights, setShowInsights] = useState(true);
  const [activeTab, setActiveTab] = useState<'kpi' | 'metrics' | 'conversion'>('metrics');

  // 日付範囲を計算する関数（前月）
  const calculateDateRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 現在の月（0-11）
    
    // 前月の1日
    const start = new Date(year, month - 1, 1);
    // 前月の末日（今月の0日 = 前月の最終日）
    const end = new Date(year, month, 0);
    
    // ローカル日付を YYYY-MM-DD 形式に変換
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  // 問題検出関数
  const detectIssues = async (monthlyDataArr: any[]) => {
    if (!user || monthlyDataArr.length < 2) return;
    
    try {
      const currentMonth = monthlyDataArr[0];
      const lastMonth = monthlyDataArr[1];
      
      const response = await fetch('/api/improvements/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          analyticsData: {
            currentMonth: {
              cvr: currentMonth.cvr || 0,
              conversions: currentMonth.conversions || 0,
              sessions: currentMonth.sessions || 0,
              screenPageViews: currentMonth.screenPageViews || 0,
              bounceRate: currentMonth.bounceRate || 0
            },
            lastMonth: {
              cvr: lastMonth?.cvr || 0,
              conversions: lastMonth?.conversions || 0,
              sessions: lastMonth?.sessions || 0
            },
            mobileCVR: 0,
            desktopCVR: 0,
            funnelData: null
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedIssues(data.issues || []);
      }
    } catch (error) {
      console.error('❌ 問題検出エラー:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (!user) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // コンバージョン定義を取得
        const conversionData = await ConversionService.getActiveConversions(user.uid);
        setConversions(conversionData);

        // KPI設定を取得
        const kpiData = await KPIService.getKPISettings(user.uid);
        setKpiSettings(kpiData);

        // 選択されたGA4プロパティを取得
        const response = await fetch('/api/datasources/list', {
          headers: {
            'x-user-id': user.uid
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch datasources');
        }

        const data = await response.json();
        let propertyId = data.selectedGA4PropertyId;

        if (!propertyId) {
          setError('GA4プロパティが選択されていません。サイト設定から接続してください。');
          setIsLoading(false);
          return;
        }

        // Property IDから数値部分のみを抽出
        if (typeof propertyId === 'string') {
          if (propertyId.startsWith('properties/')) {
            propertyId = propertyId.replace('properties/', '');
          }
          propertyId = propertyId.replace(/\D/g, '');
        }

        if (!propertyId || propertyId.length === 0) {
          setError('有効なGA4プロパティIDが見つかりません。サイト設定を確認してください。');
          setIsLoading(false);
          return;
        }

        setSelectedPropertyId(propertyId);

        // 前月の日付範囲を設定
        const range = calculateDateRange();
        setStartDate(range.startDate);
        setEndDate(range.endDate);

        // 前月のGA4メトリクスを取得
        const metrics = await GA4DataService.getMetrics(user.uid, propertyId, range.startDate, range.endDate);
        setStats(metrics);

        // 過去30日の時系列データを取得
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const formatDate = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        const timeSeries = await GA4DataService.getTimeSeriesData(
          user.uid, 
          propertyId, 
          formatDate(thirtyDaysAgo), 
          formatDate(today)
        );
        setTimeSeriesData(timeSeries);

        // 月別データを取得（過去13ヶ月分）
        const monthlyResponse = await fetch('/api/ga4/monthly-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid
          },
          body: JSON.stringify({ 
            propertyId,
            endDate: range.endDate
          })
        });

        if (monthlyResponse.ok) {
          const monthlyResult = await monthlyResponse.json();
          setMonthlyData(monthlyResult.monthlyData || []);
          
          // 問題検出
          await detectIssues(monthlyResult.monthlyData);
        }
      } catch (err: any) {
        console.error('データ取得エラー:', err);
        
        let errorMessage = 'データの取得に失敗しました。';
        if (err.message?.includes('Please reconnect your Google account')) {
          errorMessage = 'OAuth認証の有効期限が切れています。サイト設定からGoogleアカウントを再接続してください。';
        } else if (err.message?.includes('UNAUTHENTICATED')) {
          errorMessage = 'OAuth認証エラーが発生しました。サイト設定からGoogleアカウントを再接続してください。';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, router]);

  // トレンドグラフの設定
  const chartSeries = useMemo(() => [
    {
      name: 'セッション',
      data: timeSeriesData.map(d => d.sessions)
    },
    {
      name: 'コンバージョン',
      data: timeSeriesData.map(d => d.conversions || 0)
    }
  ], [timeSeriesData]);

  const chartOptions: any = useMemo(() => ({
    chart: {
      type: 'line',
      height: 200,
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    colors: ['#3C50E0', '#EF5350'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: timeSeriesData.map(d => {
        const dateStr = d.date;
        return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
      }),
      labels: {
        show: false
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      show: false
    },
    legend: {
      show: false
    },
    grid: {
      show: false
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        show: true
      }
    }
  }), [timeSeriesData]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Loading size={60} />
          </div>
          <p className="text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // 前月比計算
  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: change, isPositive: change >= 0 };
  };

  const currentMonth = monthlyData[0];
  const lastMonth = monthlyData[1];

  const sessionsChange = lastMonth ? calculateChange(stats.sessions, lastMonth.sessions) : { value: 0, isPositive: true };
  const pvChange = lastMonth ? calculateChange(stats.screenPageViews, lastMonth.screenPageViews) : { value: 0, isPositive: true };
  const cvrChange = lastMonth ? calculateChange(stats.conversionRate, lastMonth.conversionRate) : { value: 0, isPositive: true };
  const cvChange = lastMonth ? calculateChange(stats.conversions, lastMonth.conversions) : { value: 0, isPositive: true };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            ダッシュボード
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            重要な指標と改善点を一目で確認
          </p>
        </div>

        {/* クイックアクション */}
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link 
              href="/improvements"
              className="analysis-card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-3">
                  <svg className="h-6 w-6 text-body-color dark:text-dark-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-dark dark:text-white">改善する</h4>
                  <p className="text-xs text-body-color dark:text-dark-6">施策を確認</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/site-settings?step=5"
              className="analysis-card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-3">
                  <svg className="h-6 w-6 text-body-color dark:text-dark-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-dark dark:text-white">KPI設定</h4>
                  <p className="text-xs text-body-color dark:text-dark-6">目標を管理</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/summary"
              className="analysis-card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-3">
                  <svg className="h-6 w-6 text-body-color dark:text-dark-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-dark dark:text-white">詳細分析</h4>
                  <p className="text-xs text-body-color dark:text-dark-6">全体サマリー</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/evaluation"
              className="analysis-card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-3">
                  <svg className="h-6 w-6 text-body-color dark:text-dark-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-dark dark:text-white">評価する</h4>
                  <p className="text-xs text-body-color dark:text-dark-6">施策の効果</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 気づきセクション */}
        {showInsights && detectedIssues.length > 0 && (
          <InsightsAlert issues={detectedIssues} onClose={() => setShowInsights(false)} />
        )}

        {/* タブナビゲーション */}
        {monthlyData.length > 0 && (
          <div className="mb-6">
            <nav className="relative" aria-label="Tabs">
              <ul className="m-0 p-0 list-none flex rounded-[48px] p-1.5 relative bg-gray-200">
                {/* スライドインジケーター */}
                <div 
                  className="absolute top-1.5 left-1.5 rounded-[48px] transition-transform duration-300 ease-in-out z-[1] bg-primary"
                  style={{
                    width: 'calc(33.333% - 4px)',
                    height: 'calc(100% - 12px)',
                    transform: activeTab === 'metrics' ? 'translateX(0%)' : activeTab === 'conversion' ? 'translateX(100%)' : 'translateX(200%)'
                  }}
                />
                
                <li className="flex-1 p-0 mx-0.5">
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={`w-full py-3.5 px-4 text-center cursor-pointer transition-all duration-300 ease-in-out relative z-[2] font-medium text-sm rounded-lg bg-transparent ${
                      activeTab === 'metrics'
                        ? 'text-white font-semibold'
                        : 'text-[#333333] hover:text-[#aaaaaa] hover:bg-white/10 hover:-translate-y-0.5'
                    }`}
                    style={activeTab === 'metrics' ? { textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
                  >
                    主要指標サマリ
                  </button>
                </li>
                
                <li className="flex-1 p-0 mx-0.5">
                  <button
                    onClick={() => setActiveTab('conversion')}
                    className={`w-full py-3.5 px-4 text-center cursor-pointer transition-all duration-300 ease-in-out relative z-[2] font-medium text-sm rounded-lg bg-transparent ${
                      activeTab === 'conversion'
                        ? 'text-white font-semibold'
                        : 'text-[#333333] hover:text-[#aaaaaa] hover:bg-white/10 hover:-translate-y-0.5'
                    }`}
                    style={activeTab === 'conversion' ? { textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
                  >
                    コンバージョン内訳
                  </button>
                </li>
                
                <li className="flex-1 p-0 mx-0.5">
                  <button
                    onClick={() => setActiveTab('kpi')}
                    className={`w-full py-3.5 px-4 text-center cursor-pointer transition-all duration-300 ease-in-out relative z-[2] font-medium text-sm rounded-lg bg-transparent ${
                      activeTab === 'kpi'
                        ? 'text-white font-semibold'
                        : 'text-[#333333] hover:text-[#aaaaaa] hover:bg-white/10 hover:-translate-y-0.5'
                    }`}
                    style={activeTab === 'kpi' ? { textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
                  >
                    KPI予実
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* 主要指標サマリー */}
        {monthlyData.length > 0 && activeTab === 'metrics' && (() => {
          // 当月（最新月） - monthlyDataは降順（新しい月が先頭）なので[0]が最新
          const currentMonth = monthlyData[0];
          // 前月
          const lastMonth = monthlyData.length > 1 ? monthlyData[1] : null;
          // 前年同月（12ヶ月前）
          const lastYearMonth = monthlyData.length >= 13 ? monthlyData[12] : null;

          // 各種計算
          const calcDiff = (current: number, previous: number | null) => {
            if (!previous) return { value: 0, isPositive: true };
            const diff = current - previous;
            return { value: diff, isPositive: diff >= 0 };
          };

          // 訪問（セッション）の差分
          const sessionsDiff = calcDiff(currentMonth.sessions, lastMonth?.sessions || null);
          const sessionsYearDiff = calcDiff(currentMonth.sessions, lastYearMonth?.sessions || null);

          // PV数の差分
          const pvDiff = calcDiff(currentMonth.screenPageViews, lastMonth?.screenPageViews || null);
          const pvYearDiff = calcDiff(currentMonth.screenPageViews, lastYearMonth?.screenPageViews || null);

          // 平均PVの差分
          const avgPV = currentMonth.sessions > 0 ? currentMonth.screenPageViews / currentMonth.sessions : 0;
          const lastMonthAvgPV = lastMonth && lastMonth.sessions > 0 ? lastMonth.screenPageViews / lastMonth.sessions : null;
          const lastYearAvgPV = lastYearMonth && lastYearMonth.sessions > 0 ? lastYearMonth.screenPageViews / lastYearMonth.sessions : null;
          const avgPVDiff = calcDiff(avgPV, lastMonthAvgPV);
          const avgPVYearDiff = calcDiff(avgPV, lastYearAvgPV);

          // エンゲージメント率の差分
          const engagementRate = currentMonth.engagedSessions && currentMonth.sessions > 0 
            ? (currentMonth.engagedSessions / currentMonth.sessions) * 100 
            : 0;
          const lastMonthEngRate = lastMonth && lastMonth.engagedSessions && lastMonth.sessions > 0
            ? (lastMonth.engagedSessions / lastMonth.sessions) * 100
            : null;
          const lastYearEngRate = lastYearMonth && lastYearMonth.engagedSessions && lastYearMonth.sessions > 0
            ? (lastYearMonth.engagedSessions / lastYearMonth.sessions) * 100
            : null;

          // パーセンテージの差分計算
          const calcPercentDiff = (current: number, previous: number | null) => {
            if (previous === null) return { value: 0, isPositive: true };
            const diff = current - previous;
            return { value: diff, isPositive: diff >= 0 };
          };
          const engRateDiff = calcPercentDiff(engagementRate, lastMonthEngRate);
          const engRateYearDiff = calcPercentDiff(engagementRate, lastYearEngRate);

          // CV数の差分
          const cvDiff = calcDiff(currentMonth.conversions || 0, lastMonth?.conversions || null);
          const cvYearDiff = calcDiff(currentMonth.conversions || 0, lastYearMonth?.conversions || null);

          // CVRの差分
          const cvrDiff = calcPercentDiff(currentMonth.conversionRate, lastMonth?.conversionRate || null);
          const cvrYearDiff = calcPercentDiff(currentMonth.conversionRate, lastYearMonth?.conversionRate || null);

          return (
            <>
              <div className="mb-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-2">主要指標サマリ</h3>
                  <Link href="/summary" className="text-sm text-primary hover:underline">
                    詳細を見る →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3" style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 3px 6px 0 rgba(14, 30, 62, 0.08)',
                  padding: '20px'
                }}>
                  {/* 一段目：訪問 */}
                  <div className="metrics-item p-6">
                    <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                      訪問
                      <MetricTooltip description="サイトへのセッション数（訪問回数）" />
                    </p>
                    <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                      {currentMonth.sessions.toLocaleString()}
                    </h3>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastMonth.sessions.toLocaleString()}</span>
                            <span className={`w-12 text-right font-medium ${sessionsDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {sessionsDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastYearMonth.sessions.toLocaleString()}</span>
                            <span className={`w-12 text-right font-medium ${sessionsYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {sessionsYearDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 一段目：PV数 */}
                  <div className="metrics-item p-6">
                    <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                      PV数
                      <MetricTooltip description="ページビュー数（閲覧されたページ数）" />
                    </p>
                    <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                      {currentMonth.screenPageViews.toLocaleString()}
                    </h3>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastMonth.screenPageViews.toLocaleString()}</span>
                            <span className={`w-12 text-right font-medium ${pvDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {pvDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastYearMonth.screenPageViews.toLocaleString()}</span>
                            <span className={`w-12 text-right font-medium ${pvYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {pvYearDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 一段目：平均PV */}
                  <div className="metrics-item p-6">
                    <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                      平均PV
                      <MetricTooltip description="1訪問あたりの平均ページビュー数" />
                    </p>
                    <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                      {avgPV.toFixed(2)}
                    </h3>
                    <div className="space-y-2">
                      {lastMonthAvgPV !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastMonthAvgPV.toFixed(2)}</span>
                            <span className={`w-12 text-right font-medium ${avgPVDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {avgPVDiff.value.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearAvgPV !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastYearAvgPV.toFixed(2)}</span>
                            <span className={`w-12 text-right font-medium ${avgPVYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {avgPVYearDiff.value.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 二段目：ENG率 */}
                  <div className="metrics-item p-6">
                    <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                      ENG率
                      <MetricTooltip description="エンゲージメント率（10秒以上の滞在があった訪問の割合）" />
                    </p>
                    <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                      {engagementRate.toFixed(2)}%
                    </h3>
                    <div className="space-y-2">
                      {lastMonthEngRate !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastMonthEngRate.toFixed(2)}%</span>
                            <span className={`w-12 text-right font-medium ${engRateDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {engRateDiff.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearEngRate !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastYearEngRate.toFixed(2)}%</span>
                            <span className={`w-12 text-right font-medium ${engRateYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {engRateYearDiff.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 二段目：CV数 */}
                  <div className="metrics-item p-6">
                    <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                      CV数
                      <MetricTooltip description="コンバージョン数（目標達成した回数）" />
                    </p>
                    <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                      {(currentMonth.conversions || 0).toLocaleString()}
                    </h3>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{(lastMonth.conversions || 0).toLocaleString()}</span>
                            <span className={`w-12 text-right font-medium ${cvDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{(lastYearMonth.conversions || 0).toLocaleString()}</span>
                            <span className={`w-12 text-right font-medium ${cvYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvYearDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 二段目：CVR */}
                  <div className="metrics-item p-6">
                    <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                      CVR
                      <MetricTooltip description="コンバージョン率（訪問数に対するコンバージョンの割合）" />
                    </p>
                    <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                      {currentMonth.conversionRate.toFixed(2)}%
                    </h3>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastMonth.conversionRate.toFixed(2)}%</span>
                            <span className={`w-12 text-right font-medium ${cvrDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvrDiff.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-12 text-right">{lastYearMonth.conversionRate.toFixed(2)}%</span>
                            <span className={`w-12 text-right font-medium ${cvrYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvrYearDiff.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* コンバージョン内訳 */}
        {monthlyData.length > 0 && activeTab === 'conversion' && (() => {
          const currentMonth = monthlyData[0];
          const lastMonth = monthlyData.length > 1 ? monthlyData[1] : null;
          const lastYearMonth = monthlyData.length >= 13 ? monthlyData[12] : null;

          const calcDiff = (current: number, previous: number | null) => {
            if (!previous) return { value: 0, isPositive: true };
            const diff = current - previous;
            return { value: diff, isPositive: diff >= 0 };
          };

          return (
            <>
              <div className="mb-6">
                {currentMonth.conversionBreakdown && Object.keys(currentMonth.conversionBreakdown).length > 0 && (
                  <div className="mt-6 mb-6">
                    <div className="mb-4">
                      <div className="mb-2">
                        <h2 className="text-xl font-semibold text-dark dark:text-white inline-block">
                          コンバージョン内訳
                        </h2>
                        <a
                          href="/site-settings?step=4"
                          className="ml-3 text-xs text-primary hover:underline"
                        >
                          CV設定
                        </a>
                      </div>
                      <Link href="/conversion" className="text-sm text-primary hover:underline">
                        詳細を見る →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3" style={{
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 3px 6px 0 rgba(14, 30, 62, 0.08)',
                      padding: '20px'
                    }}>
                      {conversions.map((conversion) => {
                        const currentCount = currentMonth.conversionBreakdown[conversion.eventName] || 0;
                        const lastMonthCount = lastMonth?.conversionBreakdown?.[conversion.eventName] || 0;
                        const lastYearCount = lastYearMonth?.conversionBreakdown?.[conversion.eventName] || 0;
                        
                        const lastMonthDiff = calcDiff(currentCount, lastMonthCount > 0 ? lastMonthCount : null);
                        const lastYearDiff = calcDiff(currentCount, lastYearCount > 0 ? lastYearCount : null);
                        
                        return (
                          <div
                            key={conversion.eventName}
                            className="conversion-item p-6"
                          >
                            <p className="mb-3 text-sm font-medium text-body-color dark:text-dark-6 flex items-center">
                              {conversion.displayName || conversion.eventName}
                              <MetricTooltip description="月別推移（過去13ヶ月）" />
                            </p>
                            <h3 className="mb-4 text-4xl font-bold text-dark dark:text-white">
                              {currentCount.toLocaleString()}
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                                  <span className="text-dark dark:text-white w-12 text-right">{lastMonthCount.toLocaleString()}</span>
                                  <span className={`w-12 text-right font-medium ${
                                    lastMonthDiff.isPositive ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {lastMonthDiff.value.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                                  <span className="text-dark dark:text-white w-12 text-right">{lastYearCount.toLocaleString()}</span>
                                  <span className={`w-12 text-right font-medium ${
                                    lastYearDiff.isPositive ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {lastYearDiff.value.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* KPI予実 */}
        {monthlyData.length > 0 && activeTab === 'kpi' && (() => {
          const currentMonth = monthlyData[0];
          
          // KPI予実用の関数
          const getMetricValue = (metricName: string) => {
            const metricMap: Record<string, number> = {
              'sessions': currentMonth.sessions || 0,
              'pageviews': currentMonth.screenPageViews || 0,
              'users': currentMonth.totalUsers || 0,
              'conversions': currentMonth.conversions || 0,
              'engagementRate': currentMonth.engagementRate || 0,
            };
            
            if (metricName.startsWith('conversion_')) {
              const eventName = metricName.replace('conversion_', '');
              if (currentMonth.conversionBreakdown && currentMonth.conversionBreakdown[eventName]) {
                return currentMonth.conversionBreakdown[eventName];
              }
              return 0;
            }
            
            if (currentMonth.conversionBreakdown && currentMonth.conversionBreakdown[metricName]) {
              return currentMonth.conversionBreakdown[metricName];
            }
            
            return metricMap[metricName] || 0;
          };

          const calculateAchievementRate = (current: number, target: number) => {
            if (target === 0) return 0;
            return (current / target) * 100;
          };

          const getMetricDisplayName = (metric: string) => {
            const displayNames: Record<string, string> = {
              'sessions': '訪問数',
              'pageviews': 'PV数',
              'users': 'ユーザー数',
              'conversions': 'コンバージョン数',
              'engagementRate': 'エンゲージメント率'
            };
            
            if (metric.startsWith('conversion_')) {
              const eventName = metric.replace('conversion_', '');
              const conversion = conversions.find(c => c.eventName === eventName);
              return conversion?.displayName || conversion?.eventName || eventName;
            }
            
            return displayNames[metric] || conversions.find(c => c.eventName === metric)?.displayName || metric;
          };
          
          return (
            <>
              <div className="mb-6">
                {kpiSettings.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-dark dark:text-white mb-2">KPI予実</h3>
                      <Link href="/site-settings?step=5" className="text-sm text-primary hover:underline">
                        詳細を見る →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {kpiSettings.map((kpi) => {
                        const currentValue = getMetricValue(kpi.metric);
                        const targetValue = parseFloat(kpi.targetValue);
                        const achievementRate = calculateAchievementRate(currentValue, targetValue);
                        const remaining = Math.max(0, targetValue - currentValue);

                        return (
                          <div key={kpi.id} className="analysis-card p-6">
                            <div className="mb-3">
                              <p className="text-sm font-medium text-body-color dark:text-dark-6">
                                {getMetricDisplayName(kpi.metric)}
                              </p>
                            </div>
                            <div className="mb-4">
                              <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-dark dark:text-white">
                                  {currentValue.toLocaleString()}
                                </h3>
                                <span className="text-sm text-body-color dark:text-dark-6">
                                  / {targetValue.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-body-color dark:text-dark-6">達成率</span>
                                <span 
                                  className="font-semibold"
                                  style={{ 
                                    color: achievementRate >= 100 
                                      ? 'rgb(22 163 74 / var(--tw-text-opacity, 1))' 
                                      : 'rgb(220 38 38 / var(--tw-text-opacity, 1))' 
                                  }}
                                >
                                  {achievementRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-3">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(achievementRate, 100)}%`,
                                    backgroundColor: achievementRate >= 100 
                                      ? 'rgb(22 163 74 / var(--tw-bg-opacity, 1))' 
                                      : 'rgb(220 38 38 / var(--tw-bg-opacity, 1))'
                                  }}
                                />
                              </div>
                              {achievementRate < 100 && (
                                <div className="text-xs text-body-color dark:text-dark-6">
                                  残り: {remaining.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
