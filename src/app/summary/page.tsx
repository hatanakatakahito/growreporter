'use client';

/**
 * 全体サマリーページ
 * GA4データを表示
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GA4DataService, GA4Metrics, GA4TimeSeriesData } from '@/lib/api/ga4DataService';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function SummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateRangeType, setDateRangeType] = useState<string>('last_month'); // 'last_month' | 'custom'
  const [showDatePicker, setShowDatePicker] = useState(false);

  // GA4データ
  const [stats, setStats] = useState<GA4Metrics>({
    newUsers: 0,
    sessions: 0,
    totalUsers: 0,
    activeUsers: 0,
    keyEvents: 0,
    keyEventRate: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState<GA4TimeSeriesData[]>([]);

  // 日付範囲を計算する関数
  const calculateDateRange = (type: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    if (type === 'last_month') {
      // 前月の1日から末日
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    } else {
      // デフォルトは前月
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  // 日付範囲が変更されたらデータを再取得
  const handleDateRangeChange = async (type: string, customStart?: string, customEnd?: string) => {
    if (!user || !selectedPropertyId) return;

    setDateRangeType(type);
    setIsLoading(true);
    setError(null);

    try {
      let newStartDate: string;
      let newEndDate: string;

      if (type === 'custom' && customStart && customEnd) {
        newStartDate = customStart;
        newEndDate = customEnd;
      } else {
        const range = calculateDateRange(type);
        newStartDate = range.startDate;
        newEndDate = range.endDate;
      }

      setStartDate(newStartDate);
      setEndDate(newEndDate);

      // GA4メトリクスを再取得
      const metrics = await GA4DataService.getMetrics(user.uid, selectedPropertyId, 
        newStartDate.replace(/-/g, ''), newEndDate.replace(/-/g, ''));
      setStats(metrics);

      // GA4時系列データを再取得
      const timeSeries = await GA4DataService.getTimeSeriesData(user.uid, selectedPropertyId,
        newStartDate.replace(/-/g, ''), newEndDate.replace(/-/g, ''));
      setTimeSeriesData(timeSeries);

    } catch (err: any) {
      console.error('日付範囲変更エラー:', err);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
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

        // サイト情報を取得
        const { UserProfileService } = await import('@/lib/user/userProfileService');
        const profile = await UserProfileService.getUserProfile(user.uid);
        if (profile.profile?.siteUrl) {
          setSiteUrl(profile.profile.siteUrl);
        }
        if (profile.profile?.siteName) {
          setSiteName(profile.profile.siteName);
        }

        // デフォルトの日付範囲を設定（前月）
        const range = calculateDateRange('last_month');
        setStartDate(range.startDate);
        setEndDate(range.endDate);

        console.log('📊 GA4メトリクス取得開始 - Property ID:', propertyId);

        // GA4メトリクスを取得
        try {
          const metrics = await GA4DataService.getMetrics(user.uid, propertyId);
          console.log('✅ GA4メトリクス取得成功:', metrics);
          setStats(metrics);
        } catch (metricsError) {
          console.error('❌ メトリクス取得エラー:', metricsError);
          throw metricsError;
        }

        // GA4時系列データを取得
        try {
          const timeSeries = await GA4DataService.getTimeSeriesData(user.uid, propertyId);
          console.log('✅ GA4時系列データ取得成功:', timeSeries.length, '件');
          setTimeSeriesData(timeSeries);
        } catch (timeSeriesError) {
          console.error('❌ 時系列データ取得エラー:', timeSeriesError);
          throw timeSeriesError;
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
      name: 'キーイベント',
      data: timeSeriesData.map(d => d.keyEvents)
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
          text: 'キーイベント',
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
    <DashboardLayout
      siteInfo={{
        startDate,
        endDate,
        scope: '全体',
        propertyId: selectedPropertyId || undefined,
        siteName: siteName || undefined,
        siteUrl: siteUrl || undefined,
        dateRangeType,
        onDateRangeChange: handleDateRangeChange
      }}
    >
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

        {/* Stats Cards */}
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

          {/* キーイベント */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-body-color dark:text-dark-6">キーイベント</p>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
                  {stats.keyEvents.toLocaleString()}
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

          {/* キーイベント率 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-body-color dark:text-dark-6">キーイベント率</p>
                  <button className="text-body-color hover:text-primary dark:text-dark-6">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
                  {stats.keyEventRate.toFixed(2)}%
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

        {/* Chart */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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
      </div>
    </DashboardLayout>
  );
}

