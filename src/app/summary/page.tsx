'use client';

/**
 * 全体サマリーページ
 * GA4データを表示
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GA4DataService, GA4Metrics, GA4TimeSeriesData } from '@/lib/api/ga4DataService';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';
import AISummarySection from '@/components/ai/AISummarySection';
import AISummarySheet from '@/components/ai/AISummarySheet';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';
import { KPIService, KPISetting } from '@/lib/kpi/kpiService';
import InsightsAlert from '@/components/insights/InsightsAlert';
import { DetectedIssue } from '@/lib/improvements/types';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function SummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // GA4データ
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
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (!stats || !timeSeriesData || timeSeriesData.length === 0) {
      console.log('📊 AI要約データ: データなし', { 
        hasStats: !!stats, 
        timeSeriesLength: timeSeriesData?.length || 0 
      });
      return null;
    }
    
    // AIにはstatsを直接渡す（metricsとしてAPIが期待している形式）
    console.log('📊 AI要約データ:', stats);
    return stats;
  }, [stats, timeSeriesData]);

  // 日付範囲を計算する関数
  const calculateDateRange = (type: string) => {
    const today = new Date();
    console.log('📅 今日の日付 (ISO):', today.toISOString());
    console.log('📅 今日の日付 (ローカル):', today.toString());
    console.log('📅 現在の年:', today.getFullYear());
    console.log('📅 現在の月 (0-indexed):', today.getMonth());
    console.log('📅 現在の月 (1-indexed):', today.getMonth() + 1);
    
    let start: Date;
    let end: Date;

    if (type === 'last_month') {
      // 前月の1日から末日（ローカルタイムゾーンで計算）
      const year = today.getFullYear();
      const month = today.getMonth(); // 現在の月（0-11）
      
      console.log('📅 計算に使用する year:', year);
      console.log('📅 計算に使用する month:', month);
      console.log('📅 前月は month - 1 =', month - 1);
      
      // 前月の1日
      start = new Date(year, month - 1, 1);
      // 前月の末日（今月の0日 = 前月の最終日）
      end = new Date(year, month, 0);
      
      console.log('📅 前月の開始日 (Date object):', start);
      console.log('📅 前月の開始日 (ISO):', start.toISOString());
      console.log('📅 前月の終了日 (Date object):', end);
      console.log('📅 前月の終了日 (ISO):', end.toISOString());
    } else {
      // デフォルトは前月
      const year = today.getFullYear();
      const month = today.getMonth();
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    }

    // ローカル日付を YYYY-MM-DD 形式に変換
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      console.log(`📅 formatDate: ${year}-${month}-${day} (from Date: ${date})`);
      return `${year}-${month}-${day}`;
    };

    const result = {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
    
    console.log('📅 最終計算結果:', result);
    return result;
  };

  // 日付範囲が変更されたらデータを再取得
  const handleDateRangeChange = useCallback(async (newStartDate: string, newEndDate: string, type: string) => {
    if (!user || !selectedPropertyId) return;

    try {
      // GA4メトリクスを取得
      const metrics = await GA4DataService.getMetrics(user!.uid, selectedPropertyId, newStartDate, newEndDate);
      setStats(metrics);

      // GA4時系列データを取得
      const timeSeries = await GA4DataService.getTimeSeriesData(user!.uid, selectedPropertyId, newStartDate, newEndDate);
      setTimeSeriesData(timeSeries);

      // 選択された期間の終了月から遡って13ヶ月分の月別データを取得
      console.log('📊 月別データ取得開始（期間変更）:', { propertyId: selectedPropertyId, endDate: newEndDate });
      const monthlyResponse = await fetch('/api/ga4/monthly-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({ 
          propertyId: selectedPropertyId,
          endDate: newEndDate
        })
      });

      console.log('📊 月別データレスポンス（期間変更）:', { ok: monthlyResponse.ok, status: monthlyResponse.status });
      if (monthlyResponse.ok) {
        const monthlyResult = await monthlyResponse.json();
        console.log('📊 月別データ取得成功（期間変更）:', monthlyResult.monthlyData?.length, 'ヶ月分');
        setMonthlyData(monthlyResult.monthlyData || []);
        
        // 問題検出
        await detectIssues(metrics, monthlyResult.monthlyData);
      } else {
        const errorText = await monthlyResponse.text();
        console.error('❌ 月別データ取得エラー（期間変更）:', errorText);
      }
    } catch (err: any) {
      console.error('日付範囲変更エラー:', err);
    }
  }, [user, selectedPropertyId]);
  
  // 問題検出関数
  const detectIssues = async (currentMetrics: GA4Metrics, monthlyDataArr: any[]) => {
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
            mobileCVR: 0, // TODO: 実際のデータを取得
            desktopCVR: 0, // TODO: 実際のデータを取得
            funnelData: null
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedIssues(data.issues || []);
        console.log('✅ 問題検出完了:', data.issues?.length || 0, '件');
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
        console.log('📊 取得したコンバージョン定義:', conversionData);
        setConversions(conversionData);

        // KPI設定を取得
        const kpiData = await KPIService.getKPISettings(user.uid);
        console.log('📊 取得したKPI設定:', kpiData);
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

        console.log('📊 取得したデータソース情報:', data);
        console.log('📊 選択されたProperty ID (元):', propertyId);

        // Property IDの検証と抽出
        if (!propertyId) {
          setError('GA4プロパティが選択されていません。サイト設定から接続してください。');
          setIsLoading(false);
          return;
        }

        // Property IDから数値部分のみを抽出（"properties/123456789" または "123456789"）
        if (typeof propertyId === 'string') {
          if (propertyId.startsWith('properties/')) {
            propertyId = propertyId.replace('properties/', '');
          }
          // 数値以外の文字を削除
          propertyId = propertyId.replace(/\D/g, '');
        }

        console.log('📊 処理後のProperty ID:', propertyId);

        if (!propertyId || propertyId.length === 0) {
          setError('有効なGA4プロパティIDが見つかりません。サイト設定を確認してください。');
          setIsLoading(false);
          return;
        }

        setSelectedPropertyId(propertyId);

        // デフォルトの日付範囲を設定（前月）
        const range = calculateDateRange('last_month');
        setStartDate(range.startDate);
        setEndDate(range.endDate);

        console.log('📊 GA4メトリクス取得開始 - Property ID:', propertyId);
        console.log('📅 日付範囲:', { startDate: range.startDate, endDate: range.endDate });

        // データを取得
        const metrics = await GA4DataService.getMetrics(user.uid, propertyId, range.startDate, range.endDate);
        setStats(metrics);

        const timeSeries = await GA4DataService.getTimeSeriesData(user.uid, propertyId, range.startDate, range.endDate);
        console.log('📊 時系列データ取得結果:', { length: timeSeries?.length, data: timeSeries });
        setTimeSeriesData(timeSeries);

        // 月別データを取得（選択期間の終了月から遡って13ヶ月分）
        console.log('📊 月別データ取得開始:', { propertyId, endDate: range.endDate });
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

        console.log('📊 月別データレスポンス:', { ok: monthlyResponse.ok, status: monthlyResponse.status });
        if (monthlyResponse.ok) {
          const monthlyResult = await monthlyResponse.json();
          console.log('📊 月別データ取得成功:', monthlyResult.monthlyData?.length, 'ヶ月分');
          console.log('📊 月別データ詳細（最新3ヶ月）:', monthlyResult.monthlyData?.slice(0, 3));
          setMonthlyData(monthlyResult.monthlyData || []);
          
          // 問題検出
          await detectIssues(metrics, monthlyResult.monthlyData);
        } else {
          const errorText = await monthlyResponse.text();
          console.error('❌ 月別データ取得エラー:', errorText);
        }
      } catch (err: any) {
        console.error('データ取得エラー:', err);
        
        // エラーメッセージを日本語化
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

  // グラフデータを生成
  const chartSeries = [
    {
      name: '総ユーザー数',
      data: timeSeriesData.map(d => d.totalUsers)
    },
    {
      name: 'アクティブユーザー数',
      data: timeSeriesData.map(d => d.activeUsers)
    },
    {
      name: '新規ユーザー数',
      data: timeSeriesData.map(d => d.newUsers)
    },
    {
      name: 'セッション',
      data: timeSeriesData.map(d => d.sessions)
    },
    {
      name: 'コンバージョン',
      data: timeSeriesData.map(d => d.conversions || 0)
    }
  ];

  // X軸のカテゴリ（日付）を生成
  const chartCategories = timeSeriesData.map((d, index) => {
    const dateStr = d.date; // YYYYMMDD形式
    const day = dateStr.slice(6, 8); // DD部分を抽出
    // 偶数日のみラベルを表示
    return index % 2 === 0 ? day : '';
  });

  const chartOptions: any = {
    chart: {
      type: 'line',
      height: 350,
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    colors: ['#E0E0E0', '#B0B0B0', '#808080', '#EF5350', '#909090'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: chartCategories,
      labels: {
        style: {
          colors: '#64748B',
          fontSize: '12px'
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'ユーザー・セッション',
          style: {
            color: '#64748B',
            fontSize: '12px'
          }
        },
        labels: {
          formatter: function (val: number) {
            return val.toLocaleString();
          },
          style: {
            colors: '#64748B'
          }
        }
      },
      {
        opposite: true,
        title: {
          text: 'コンバージョン',
          style: {
            color: '#64748B',
            fontSize: '12px'
          }
        },
        labels: {
          formatter: function (val: number) {
            return val.toFixed(0);
          },
          style: {
            colors: '#64748B'
          }
        }
      }
    ],
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '12px',
      markers: {
        width: 10,
        height: 10,
        radius: 50
      }
    },
    grid: {
      borderColor: '#E2E8F0'
    },
    tooltip: {
      shared: true,
      intersect: false
    }
  };

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

  return (
    <DashboardLayout onDateRangeChange={handleDateRangeChange}>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
              全体サマリー
            </h2>
            <p className="text-sm font-medium text-body-color dark:text-dark-6">
              GA4データの全体像を確認できます
            </p>
          </div>
          <button
            onClick={() => setIsAISheetOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-opacity-90"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            AI分析
          </button>
        </div>
        
        {/* 気づきセクション */}
        {detectedIssues.length > 0 && (
          <InsightsAlert issues={detectedIssues} />
        )}

        {/* 主要指標サマリー */}
        {monthlyData.length > 0 && (() => {
          // 当月（最新月） - monthlyDataは降順（新しい月が先頭）なので[0]が最新
          const currentMonth = monthlyData[0];
          // 前月
          const lastMonth = monthlyData.length > 1 ? monthlyData[1] : null;
          // 前年同月（12ヶ月前）
          const lastYearMonth = monthlyData.length >= 13 ? monthlyData[12] : null;
          
          console.log('📊 主要指標サマリーデータ:', {
            currentMonth: {
              displayName: currentMonth.displayName,
              conversions: currentMonth.conversions,
              sessions: currentMonth.sessions
            },
            lastMonth: lastMonth ? {
              displayName: lastMonth.displayName,
              conversions: lastMonth.conversions
            } : null,
            monthlyDataLength: monthlyData.length
          });

          // 各種計算
          const calcDiff = (current: number, previous: number | null) => {
            if (!previous) return { value: 0, isPositive: true };
            const diff = current - previous;
            return { value: diff, isPositive: diff >= 0 };
          };

          const calcPercentDiff = (current: number, previous: number | null) => {
            if (!previous || previous === 0) return { value: 0, isPositive: true };
            const diff = ((current - previous) / previous) * 100;
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
          const cvrDiff = calcPercentDiff(currentMonth.conversionRate, lastMonth?.conversionRate || null);
          const cvrYearDiff = calcPercentDiff(currentMonth.conversionRate, lastYearMonth?.conversionRate || null);

          // CVカード表示用のデバッグログ
          console.log('📊 CVカード表示データ:', {
            conversionsLength: conversions.length,
            conversionsData: conversions,
            displayNames: conversions.map(c => c.displayName || c.eventName)
          });

          // KPIメトリクスマッピング
          const getMetricValue = (metricName: string) => {
            const metricMap: Record<string, number> = {
              'sessions': currentMonth.sessions || 0,
              'pageviews': currentMonth.screenPageViews || 0,
              'users': currentMonth.totalUsers || 0,
              'conversions': currentMonth.conversions || 0,
              'engagementRate': currentMonth.engagementRate || 0,
            };
            
            // conversion_プレフィックスがある場合は除去
            if (metricName.startsWith('conversion_')) {
              const eventName = metricName.replace('conversion_', '');
              if (currentMonth.conversionBreakdown && currentMonth.conversionBreakdown[eventName]) {
                return currentMonth.conversionBreakdown[eventName];
              }
              return 0;
            }
            
            // コンバージョンイベント名の場合（プレフィックスなし）
            if (currentMonth.conversionBreakdown && currentMonth.conversionBreakdown[metricName]) {
              return currentMonth.conversionBreakdown[metricName];
            }
            
            return metricMap[metricName] || 0;
          };

          // 達成率計算
          const calculateAchievementRate = (current: number, target: number) => {
            if (target === 0) return 0;
            return (current / target) * 100;
          };

          return (
            <div className="mb-6">
              {/* KPI予実セクション */}
              {kpiSettings.length > 0 && (
                <div className="mb-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-dark dark:text-white">KPI予実</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {kpiSettings.map((kpi) => {
                      const currentValue = getMetricValue(kpi.metric);
                      const targetValue = parseFloat(kpi.targetValue);
                      const achievementRate = calculateAchievementRate(currentValue, targetValue);
                      const remaining = Math.max(0, targetValue - currentValue);
                      
                      console.log('📊 KPI計算:', {
                        metric: kpi.metric,
                        currentValue,
                        targetValue,
                        achievementRate,
                        conversionBreakdown: currentMonth.conversionBreakdown
                      });
                      
                      // メトリクス名を表示用に変換
                      const getMetricDisplayName = (metric: string) => {
                        const displayNames: Record<string, string> = {
                          'sessions': 'セッション',
                          'pageviews': 'ページビュー',
                          'users': 'ユーザー数',
                          'conversions': 'コンバージョン',
                          'engagementRate': 'エンゲージメント率',
                        };
                        
                        // conversion_プレフィックスがある場合は除去して検索
                        if (metric.startsWith('conversion_')) {
                          const eventName = metric.replace('conversion_', '');
                          const conversion = conversions.find(c => c.eventName === eventName);
                          return conversion?.displayName || conversion?.eventName || eventName;
                        }
                        
                        return displayNames[metric] || conversions.find(c => c.eventName === metric)?.displayName || metric;
                      };

                      return (
                        <div key={kpi.id} className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-dark dark:text-white">主要指標サマリ</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 訪問（セッション） */}
                <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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
                <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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
                <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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
                <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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
                          className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2"
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

        {/* Monthly Stats Table */}
        <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              月別推移（過去13ヶ月）
            </h3>
          </div>
          <div className="overflow-x-auto">
            {monthlyData.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-body-color dark:text-dark-6">
                  月別データを読み込み中...
                </p>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                      <th className="px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2">年月</th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>ユーザー数</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            サイトを訪問したユニークユーザーの総数
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>新規ユーザー</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            初めてサイトを訪問したユーザー数
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>セッション</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            ユーザーがサイトを訪問した回数（30分以上の間隔で区切られる）
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>平均PV</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            1セッションあたりの平均ページビュー数
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>表示回数</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            ページが閲覧された総回数（同じページの再表示も含む）
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>ENG率</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            エンゲージメント率：10秒以上滞在または2ページ以上閲覧したセッションの割合
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>コンバージョン</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            サイト設定で定義したコンバージョンの合計数
                          </div>
                        </div>
                      </th>
                      <th className="relative px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2" style={{ overflow: 'visible' }}>
                        <div className="tooltip-container inline-flex items-center gap-1 justify-center">
                          <span>セッションCV率</span>
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-1/2 z-[99999] hidden -translate-x-1/2 whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '8px' }}>
                            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            コンバージョンが発生したセッションの割合
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row, index) => (
                      <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.displayName}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.totalUsers.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.newUsers.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.sessions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.sessionsPerUser.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.screenPageViews.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.engagementRate.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.conversions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap">
                          {row.conversionRate.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* AI分析シート */}
      {user && startDate && endDate && aiContextData && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="summary"
          contextData={aiContextData}
          startDate={startDate}
          endDate={endDate}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}

