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

  // 日付範囲を計算する関数（当月）
  const calculateCurrentMonthRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const start = new Date(year, month, 1);
    const end = today;
    
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

        // 当月の日付範囲を設定
        const range = calculateCurrentMonthRange();
        setStartDate(range.startDate);
        setEndDate(range.endDate);

        // 当月のGA4メトリクスを取得
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
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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

        {/* 気づきセクション */}
        {detectedIssues.length > 0 && (
          <InsightsAlert issues={detectedIssues} />
        )}

        {/* 主要指標サマリカード */}
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 訪問数 */}
            <div className="analysis-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">訪問</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${sessionsChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sessionsChange.isPositive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {Math.abs(sessionsChange.value).toFixed(1)}%
                </div>
              </div>
              <div className="text-3xl font-bold text-dark dark:text-white">
                {stats.sessions.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-body-color dark:text-dark-6">
                前月: {lastMonth?.sessions.toLocaleString() || '-'}
              </div>
            </div>

            {/* PV数 */}
            <div className="analysis-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">PV数</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${pvChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {pvChange.isPositive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {Math.abs(pvChange.value).toFixed(1)}%
                </div>
              </div>
              <div className="text-3xl font-bold text-dark dark:text-white">
                {stats.screenPageViews.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-body-color dark:text-dark-6">
                前月: {lastMonth?.screenPageViews.toLocaleString() || '-'}
              </div>
            </div>

            {/* CVR */}
            <div className="analysis-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">CVR</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${cvrChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {cvrChange.isPositive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {Math.abs(cvrChange.value).toFixed(1)}%
                </div>
              </div>
              <div className="text-3xl font-bold text-dark dark:text-white">
                {stats.conversionRate.toFixed(2)}%
              </div>
              <div className="mt-2 text-xs text-body-color dark:text-dark-6">
                前月: {lastMonth?.conversionRate.toFixed(2)}% || '-'
              </div>
            </div>

            {/* コンバージョン */}
            <div className="analysis-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">CV</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${cvChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {cvChange.isPositive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {Math.abs(cvChange.value).toFixed(1)}%
                </div>
              </div>
              <div className="text-3xl font-bold text-dark dark:text-white">
                {stats.conversions.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-body-color dark:text-dark-6">
                前月: {lastMonth?.conversions.toLocaleString() || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 今月の進捗状況 & トレンドグラフ */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 今月の進捗状況 */}
          {currentMonth && kpiSettings.length > 0 && (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const currentDay = today.getDate();
            const remainingDays = daysInMonth - currentDay;
            const progress = (currentDay / daysInMonth) * 100;

            // 最初のKPIで計算（代表として）
            const primaryKpi = kpiSettings[0];
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

            const currentValue = getMetricValue(primaryKpi.metric);
            const targetValue = parseFloat(primaryKpi.targetValue);
            const achievementRate = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
            const remaining = Math.max(0, targetValue - currentValue);
            const dailyRequired = remainingDays > 0 ? remaining / remainingDays : 0;

            return (
              <div className="analysis-card p-6">
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">今月の進捗</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-body-color dark:text-dark-6">月の経過</span>
                      <span className="text-sm font-medium text-dark dark:text-white">{currentDay}日 / {daysInMonth}日</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-3">
                      <div 
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-stroke dark:border-dark-3 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-body-color dark:text-dark-6">目標達成率</span>
                      <span className={`text-sm font-medium ${achievementRate >= 100 ? 'text-green-600' : 'text-dark dark:text-white'}`}>
                        {achievementRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-3">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(achievementRate, 100)}%`,
                          backgroundColor: achievementRate >= 100 ? 'rgb(22 163 74)' : 'rgb(220 38 38)'
                        }}
                      />
                    </div>
                  </div>

                  {achievementRate < 100 && remainingDays > 0 && (
                    <div className="rounded-lg bg-gray-2 dark:bg-dark-3 p-3">
                      <p className="text-xs text-body-color dark:text-dark-6 mb-1">目標達成には</p>
                      <p className="text-sm font-medium text-dark dark:text-white">
                        1日あたり <span className="text-lg font-bold text-primary">{dailyRequired.toFixed(0)}</span> 件必要
                      </p>
                      <p className="text-xs text-body-color dark:text-dark-6 mt-1">
                        （残り{remainingDays}日で{remaining.toLocaleString()}件）
                      </p>
                    </div>
                  )}

                  {achievementRate >= 100 && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-green-600">
                          今月の目標達成！
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* トレンドグラフ */}
          <div className="analysis-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">過去30日のトレンド</h3>
            {timeSeriesData.length > 0 ? (
              <>
                <ReactApexChart
                  options={chartOptions}
                  series={chartSeries}
                  type="line"
                  height={200}
                />
                <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#3C50E0' }}></div>
                    <span className="text-sm text-body-color dark:text-dark-6">セッション</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#EF5350' }}></div>
                    <span className="text-sm text-body-color dark:text-dark-6">コンバージョン</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-body-color dark:text-dark-6">
                データを読み込み中...
              </div>
            )}
          </div>
        </div>

        {/* クイックアクション */}
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">クイックアクション</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link 
              href="/improvements"
              className="analysis-card p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/10">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/10">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/10">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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

        {/* KPI予実セクション */}
        {monthlyData.length > 0 && kpiSettings.length > 0 && currentMonth && (() => {
          // KPIメトリクスマッピング
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
              'sessions': 'セッション',
              'pageviews': 'ページビュー',
              'users': 'ユーザー数',
              'conversions': 'コンバージョン',
              'engagementRate': 'エンゲージメント率',
            };
            
            if (metric.startsWith('conversion_')) {
              const eventName = metric.replace('conversion_', '');
              const conversion = conversions.find(c => c.eventName === eventName);
              return conversion?.displayName || conversion?.eventName || eventName;
            }
            
            return displayNames[metric] || conversions.find(c => c.eventName === metric)?.displayName || metric;
          };

          return (
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-dark dark:text-white">KPI予実</h3>
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
