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
  const [showInsights, setShowInsights] = useState(true);

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

        {/* KPI予実セクション */}
        {monthlyData.length > 0 && kpiSettings.length > 0 && (() => {
          const currentMonth = monthlyData[0];
          
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

        {/* 主要指標サマリー */}
        {monthlyData.length > 0 && (() => {
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

          // CV数の差分
          const cvDiff = calcDiff(currentMonth.conversions || 0, lastMonth?.conversions || null);
          const cvYearDiff = calcDiff(currentMonth.conversions || 0, lastYearMonth?.conversions || null);

          // CVR（セッションCV率）の差分
          const calcPercentDiff = (current: number, previous: number | null) => {
            if (!previous || previous === 0) return { value: 0, isPositive: true };
            const diff = ((current - previous) / previous) * 100;
            return { value: diff, isPositive: diff >= 0 };
          };
          const cvrDiff = calcPercentDiff(currentMonth.conversionRate, lastMonth?.conversionRate || null);
          const cvrYearDiff = calcPercentDiff(currentMonth.conversionRate, lastYearMonth?.conversionRate || null);

          return (
            <>
              <div className="mb-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-dark dark:text-white">主要指標サマリ</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* 訪問（セッション） */}
                  <div className="analysis-card p-6">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-body-color dark:text-dark-6">訪問</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-4xl font-bold text-dark dark:text-white">
                        {currentMonth.sessions.toLocaleString()}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{lastMonth.sessions.toLocaleString()}</span>
                            <span className={`w-16 text-right font-medium ${sessionsDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {sessionsDiff.isPositive && sessionsDiff.value > 0 ? '+' : ''}{sessionsDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{lastYearMonth.sessions.toLocaleString()}</span>
                            <span className={`w-16 text-right font-medium ${sessionsYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {sessionsYearDiff.isPositive && sessionsYearDiff.value > 0 ? '+' : ''}{sessionsYearDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PV数 */}
                  <div className="analysis-card p-6">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-body-color dark:text-dark-6">PV数</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-4xl font-bold text-dark dark:text-white">
                        {currentMonth.screenPageViews.toLocaleString()}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{lastMonth.screenPageViews.toLocaleString()}</span>
                            <span className={`w-16 text-right font-medium ${pvDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {pvDiff.isPositive && pvDiff.value > 0 ? '+' : ''}{pvDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{lastYearMonth.screenPageViews.toLocaleString()}</span>
                            <span className={`w-16 text-right font-medium ${pvYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {pvYearDiff.isPositive && pvYearDiff.value > 0 ? '+' : ''}{pvYearDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CVR（セッションCV率） */}
                  <div className="analysis-card p-6">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-body-color dark:text-dark-6">CVR</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-4xl font-bold text-dark dark:text-white">
                        {currentMonth.conversionRate.toFixed(2)}%
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{lastMonth.conversionRate.toFixed(2)}%</span>
                            <span className={`w-16 text-right font-medium ${cvrDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvrDiff.isPositive && cvrDiff.value > 0 ? '+' : ''}{cvrDiff.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{lastYearMonth.conversionRate.toFixed(2)}%</span>
                            <span className={`w-16 text-right font-medium ${cvrYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvrYearDiff.isPositive && cvrYearDiff.value > 0 ? '+' : ''}{cvrYearDiff.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* コンバージョン */}
                  <div className="analysis-card p-6">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-body-color dark:text-dark-6">コンバージョン</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-4xl font-bold text-dark dark:text-white">
                        {(currentMonth.conversions || 0).toLocaleString()}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {lastMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{(lastMonth.conversions || 0).toLocaleString()}</span>
                            <span className={`w-16 text-right font-medium ${cvDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvDiff.isPositive && cvDiff.value > 0 ? '+' : ''}{cvDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {lastYearMonth && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                          <div className="flex items-center gap-2 min-w-[140px] justify-end">
                            <span className="text-dark dark:text-white w-16 text-right">{(lastYearMonth.conversions || 0).toLocaleString()}</span>
                            <span className={`w-16 text-right font-medium ${cvYearDiff.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {cvYearDiff.isPositive && cvYearDiff.value > 0 ? '+' : ''}{cvYearDiff.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* コンバージョン内訳 */}
                {currentMonth.conversionBreakdown && Object.keys(currentMonth.conversionBreakdown).length > 0 && (
                  <div className="mt-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-dark dark:text-white">
                        コンバージョン内訳
                      </h2>
                      <a
                        href="/site-settings?step=4"
                        className="text-xs text-primary hover:underline"
                      >
                        CV設定
                      </a>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {conversions.map((conversion) => {
                        const currentCount = currentMonth.conversionBreakdown[conversion.eventName] || 0;
                        const lastMonthCount = lastMonth?.conversionBreakdown?.[conversion.eventName] || 0;
                        const lastYearCount = lastYearMonth?.conversionBreakdown?.[conversion.eventName] || 0;
                        
                        const lastMonthDiff = calcDiff(currentCount, lastMonthCount > 0 ? lastMonthCount : null);
                        const lastYearDiff = calcDiff(currentCount, lastYearCount > 0 ? lastYearCount : null);
                        
                        return (
                          <div
                            key={conversion.eventName}
                            className="analysis-card p-6"
                          >
                            <div className="mb-4">
                              <p className="text-sm font-medium text-body-color dark:text-dark-6">
                                {conversion.displayName || conversion.eventName}
                              </p>
                            </div>
                            <div className="mb-6">
                              <h3 className="text-4xl font-bold text-dark dark:text-white">
                                {currentCount.toLocaleString()}
                              </h3>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-body-color dark:text-dark-6 w-16">前月</span>
                                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                                  <span className="text-dark dark:text-white w-16 text-right">{lastMonthCount.toLocaleString()}</span>
                                  <span className={`w-16 text-right font-medium ${
                                    lastMonthDiff.isPositive ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {lastMonthDiff.isPositive && lastMonthDiff.value > 0 ? '+' : ''}{lastMonthDiff.value.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-body-color dark:text-dark-6 w-20">前年同月</span>
                                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                                  <span className="text-dark dark:text-white w-16 text-right">{lastYearCount.toLocaleString()}</span>
                                  <span className={`w-16 text-right font-medium ${
                                    lastYearDiff.isPositive ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {lastYearDiff.isPositive && lastYearDiff.value > 0 ? '+' : ''}{lastYearDiff.value.toLocaleString()}
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

        {/* KPI予実セクション + 今月の進捗状況 & トレンドグラフ */}
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
