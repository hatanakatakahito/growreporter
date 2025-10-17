'use client';

/**
 * ユーザーページ
 * ユーザー属性データを表示
 */

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AISummarySheet from '@/components/ai/AISummarySheet';
import Loading from '@/components/common/Loading';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // 印刷モードかどうかをチェック
  const isPrintMode = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('print') === 'true' ||
     new URLSearchParams(window.location.search).get('skipLoading') === 'true');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // ユーザー属性データ
  const [newVsReturningData, setNewVsReturningData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [regionType, setRegionType] = useState<string>('city'); // 'country' | 'region' | 'city'

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    // 合計ユーザー数を計算
    const totalUsers = newVsReturningData.reduce((sum, item) => sum + (item.users || 0), 0);
    
    if (totalUsers === 0) return null;
    
    return {
      newVsReturning: newVsReturningData,
      gender: genderData,
      age: ageData,
      device: deviceData,
      region: regionData.slice(0, 5)
    };
  }, [newVsReturningData, genderData, ageData, deviceData, regionData]);


  // 日付範囲を計算する関数
  const calculateDateRange = (type: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    if (type === 'last_month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    } else {
      const year = today.getFullYear();
      const month = today.getMonth();
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    }

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  // ユーザー属性データを取得
  const fetchDemographicsData = async (propertyId: string, start: string, end: string, regType: string = 'city') => {
    console.log('📊 ユーザー属性データ取得開始:', { propertyId, start, end, regionType: regType });

    const response = await fetch(
      `/api/ga4/demographics?propertyId=${propertyId}&startDate=${start}&endDate=${end}&regionType=${regType}`,
      {
        headers: {
          'x-user-id': user!.uid
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ ユーザー属性データ取得エラー:', errorData);
      throw new Error(errorData.error || 'Failed to fetch demographics data');
    }

    const data = await response.json();
    console.log('✅ ユーザー属性データ取得成功:', data);

    // データを状態にセット
    setNewVsReturningData(data.newVsReturning || []);
    setGenderData(data.gender || []);
    setAgeData(data.age || []);
    setDeviceData(data.device || []);
    setRegionData(data.region || []);
  };

  // 地域タイプが変更されたらデータを再取得
  const handleRegionTypeChange = async (newRegionType: string) => {
    if (!user || !selectedPropertyId) return;

    setRegionType(newRegionType);
    setIsLoading(true);
    setError(null);

    try {
      await fetchDemographicsData(selectedPropertyId, startDate, endDate, newRegionType);
    } catch (err: any) {
      console.error('地域タイプ変更エラー:', err);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 日付範囲が変更されたらデータを再取得
  const handleDateRangeChange = async (newStartDate: string, newEndDate: string, type: string) => {
    if (!user || !selectedPropertyId) return;

    try {
      setStartDate(newStartDate);
      setEndDate(newEndDate);

      // YYYY-MM-DD形式をYYYYMMDD形式に変換
      const start = newStartDate.replace(/-/g, '');
      const end = newEndDate.replace(/-/g, '');

      // ユーザー属性データを再取得
      const url = `/api/ga4/demographics?propertyId=${selectedPropertyId}&startDate=${start}&endDate=${end}&regionType=${regionType}`;
      const response = await fetch(url, {
        headers: {
          'x-user-id': user!.uid
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 各種データを設定
        setNewVsReturningData(data.newVsReturning || []);
        setGenderData(data.gender || []);
        setAgeData(data.age || []);
        setDeviceData(data.device || []);
        setRegionData(data.region || []);
      }
    } catch (err: any) {
      console.error('日付範囲変更エラー:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // データソース情報を取得
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


        // デフォルトの日付範囲を設定（前月）
        const range = calculateDateRange('last_month');
        setStartDate(range.startDate);
        setEndDate(range.endDate);

        // ユーザー属性データを取得
        await fetchDemographicsData(propertyId, range.startDate, range.endDate, regionType);

      } catch (err: any) {
        console.error('データ取得エラー:', err);
        setError('データの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);

  // 新規ユーザー/リピーター比率（ドーナツチャート）
  const newVsReturningOptions: any = {
    chart: {
      type: 'donut',
      fontFamily: 'Inter, sans-serif',
    },
    labels: ['新規ユーザー', 'リピーター'],
    colors: ['#3B82F6', '#10B981'],
    legend: {
      position: 'right',
      fontSize: '14px',
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        colors: ['#fff'],
      },
      dropShadow: {
        enabled: false,
      },
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '合計',
              fontSize: '14px',
              fontWeight: 600,
              color: '#64748B',
              formatter: function () {
                return '100%';
              },
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1F2937',
              formatter: function (val: string) {
                return parseFloat(val).toFixed(1) + '%';
              },
            },
          },
        },
      },
    },
  };
  // 新規 vs リピーターのデータを計算
  const newVsReturningSeries = (() => {
    const newUsers = newVsReturningData.find((d: any) => d.type === 'new')?.users || 0;
    const returningUsers = newVsReturningData.find((d: any) => d.type === 'returning')?.users || 0;
    const total = newUsers + returningUsers;
    
    if (total === 0) return [0, 0];
    
    return [
      (newUsers / total) * 100,
      (returningUsers / total) * 100
    ];
  })();

  // 性別比率（ドーナツチャート）
  const genderOptions: any = {
    chart: {
      type: 'donut',
      fontFamily: 'Inter, sans-serif',
    },
    labels: ['女性', '男性', '不明'],
    colors: ['#EC4899', '#3B82F6', '#9CA3AF'],
    legend: {
      position: 'right',
      fontSize: '14px',
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        colors: ['#fff'],
      },
      dropShadow: {
        enabled: false,
      },
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '合計',
              fontSize: '14px',
              fontWeight: 600,
              color: '#64748B',
              formatter: function () {
                return '100%';
              },
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1F2937',
              formatter: function (val: string) {
                return parseFloat(val).toFixed(1) + '%';
              },
            },
          },
        },
      },
    },
  };
  // 性別データを計算
  const genderSeries = (() => {
    const female = genderData.find((d: any) => d.gender === 'female')?.users || 0;
    const male = genderData.find((d: any) => d.gender === 'male')?.users || 0;
    const unknown = genderData.find((d: any) => d.gender === '(not set)' || d.gender === 'unknown')?.users || 0;
    const total = female + male + unknown;
    
    if (total === 0) return [0, 0, 0];
    
    return [
      (female / total) * 100,
      (male / total) * 100,
      (unknown / total) * 100
    ];
  })();

  // 年齢比率（横棒グラフ）
  const ageOptions: any = {
    chart: {
      type: 'bar',
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetX: 30,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#3B82F6'],
      },
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
    },
    colors: ['#3B82F6'],
    xaxis: {
      categories: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+', '不明'],
      labels: {
        formatter: function (val: number) {
          return val.toFixed(1) + '%';
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px',
        },
      },
    },
    grid: {
      borderColor: '#E2E8F0',
    },
  };
  // 年齢データを計算
  const ageSeries = (() => {
    const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+', '(not set)'];
    const total = ageData.reduce((sum: number, d: any) => sum + d.users, 0);
    
    if (total === 0) return [{ name: '割合', data: [0, 0, 0, 0, 0, 0, 0] }];
    
    const data = ageOrder.map((age: string) => {
      const users = ageData.find((d: any) => d.ageBracket === age)?.users || 0;
      return (users / total) * 100;
    });
    
    return [{ name: '割合', data }];
  })();

  // デバイス比率（ドーナツチャート）
  const deviceOptions: any = {
    chart: {
      type: 'donut',
      fontFamily: 'Inter, sans-serif',
    },
    labels: ['PC', 'モバイル', 'タブレット', 'Smart TV'],
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    legend: {
      position: 'right',
      fontSize: '14px',
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        colors: ['#fff'],
      },
      dropShadow: {
        enabled: false,
      },
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '合計',
              fontSize: '14px',
              fontWeight: 600,
              color: '#64748B',
              formatter: function () {
                return '100%';
              },
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1F2937',
              formatter: function (val: string) {
                return parseFloat(val).toFixed(1) + '%';
              },
            },
          },
        },
      },
    },
  };
  // デバイスデータを計算
  const deviceSeries = (() => {
    const desktop = deviceData.find((d: any) => d.category === 'desktop')?.users || 0;
    const mobile = deviceData.find((d: any) => d.category === 'mobile')?.users || 0;
    const tablet = deviceData.find((d: any) => d.category === 'tablet')?.users || 0;
    const smartTv = deviceData.find((d: any) => d.category === 'smart tv')?.users || 0;
    const total = desktop + mobile + tablet + smartTv;
    
    if (total === 0) return [0, 0, 0, 0];
    
    return [
      (desktop / total) * 100,
      (mobile / total) * 100,
      (tablet / total) * 100,
      (smartTv / total) * 100
    ];
  })();

  // 地域比率（横棒グラフ）
  const regionOptions: any = {
    chart: {
      type: 'bar',
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetX: 30,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#3B82F6'],
      },
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
    },
    colors: ['#3B82F6'],
    xaxis: {
      categories: regionData.map((d: any) => d.region),
      labels: {
        formatter: function (val: number) {
          return val.toFixed(1) + '%';
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px',
        },
      },
    },
    grid: {
      borderColor: '#E2E8F0',
    },
    tooltip: {
      y: {
        formatter: function (val: number, opts: any) {
          const index = opts.dataPointIndex;
          const users = regionData[index]?.users || 0;
          return users.toLocaleString() + ' ユーザー';
        },
      },
    },
  };
  
  // 地域データを計算
  const regionSeries = (() => {
    const total = regionData.reduce((sum: number, d: any) => sum + d.users, 0);
    
    if (total === 0) return [{ name: '割合', data: [] }];
    
    const data = regionData.map((d: any) => {
      return (d.users / total) * 100;
    });
    
    return [{ name: '割合', data }];
  })();

  if (authLoading || isLoading) {
    return (
      <div className="loading-screen flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <Loading size={64} />
          <p className="mt-4 text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout
      onDateRangeChange={handleDateRangeChange}
    >
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10" data-loaded="true">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            ユーザー
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            ユーザー属性データを確認できます
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

        {/* Charts Grid - 2x2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 新規ユーザー/リピーター比率 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              新規ユーザー/リピーター比率
            </h3>
            <ReactApexChart
              options={newVsReturningOptions}
              series={newVsReturningSeries}
              type="donut"
              height={300}
            />
          </div>

          {/* 性別比率 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              性別比率
            </h3>
            <ReactApexChart
              options={genderOptions}
              series={genderSeries}
              type="donut"
              height={300}
            />
          </div>

          {/* 年齢比率 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              年齢比率
            </h3>
            <ReactApexChart
              options={ageOptions}
              series={ageSeries}
              type="bar"
              height={300}
            />
          </div>

          {/* デバイス比率 */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              デバイス比率
            </h3>
            <ReactApexChart
              options={deviceOptions}
              series={deviceSeries}
              type="donut"
              height={300}
            />
          </div>
        </div>

        {/* 地域比率 */}
        <div className="mt-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              地域比率（上位10地域）
            </h3>
            <select
              value={regionType}
              onChange={(e) => handleRegionTypeChange(e.target.value)}
              className="rounded-md border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            >
              <option value="city">市区町村別</option>
              <option value="region">都道府県別</option>
              <option value="country">国別</option>
            </select>
          </div>
          <ReactApexChart
            options={regionOptions}
            series={regionSeries}
            type="bar"
            height={350}
          />
        </div>

        {/* Fixed AI Analysis Button */}
        <button
          onClick={() => setIsAISheetOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 w-16 h-16 text-xs font-medium text-white hover:from-purple-700 hover:to-pink-700 hover:scale-105 shadow-xl transition-all"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span className="text-[10px] leading-tight">AI分析</span>
        </button>
      </div>

      {/* AI分析シート */}
      {user && startDate && endDate && aiContextData && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="users"
          contextData={aiContextData}
          startDate={startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
          endDate={endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}
