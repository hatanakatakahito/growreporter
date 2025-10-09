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

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (!stats || !timeSeriesData || timeSeriesData.length === 0) return null;
    
    return {
      metrics: stats,
      timeSeriesData: timeSeriesData.slice(0, 7) // 最近7日分
    };
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
      } else {
        const errorText = await monthlyResponse.text();
        console.error('❌ 月別データ取得エラー（期間変更）:', errorText);
      }
    } catch (err: any) {
      console.error('日付範囲変更エラー:', err);
    }
  }, [user, selectedPropertyId]);


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
          setMonthlyData(monthlyResult.monthlyData || []);
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
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            全体サマリー
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            GA4データの全体像を確認できます
          </p>
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

        {/* GA4 Stats Cards - Top Row (4 cards) */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 新規ユーザー数 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-body-color dark:text-dark-6">新規ユーザー数</p>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
                  {stats.newUsers.toLocaleString()}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>
          </div>

          {/* セッション */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-body-color dark:text-dark-6">セッション</p>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
                  {stats.sessions.toLocaleString()}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* コンバージョン */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-body-color dark:text-dark-6">コンバージョン</p>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
                  {stats.conversions.toLocaleString()}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/20">
                <svg className="h-6 w-6 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              </div>
            </div>
          </div>

          {/* コンバージョン率 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-body-color dark:text-dark-6">コンバージョン率</p>
                  <button className="text-body-color hover:text-primary dark:text-dark-6">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
                  {stats.engagementRate.toFixed(2)}%
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

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

        {/* GA4 Chart */}
        <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            ユーザー数の推移
          </h3>
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={350}
          />
        </div>

        {/* AI Summary Section - 共通コンポーネント使用 */}
        {user && startDate && endDate && aiContextData && (
          <AISummarySection
            userId={user.uid}
            pageType="summary"
            startDate={startDate}
            endDate={endDate}
            contextData={aiContextData}
            propertyId={selectedPropertyId || undefined}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

