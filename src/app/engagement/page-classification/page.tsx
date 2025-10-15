'use client';

/**
 * ページ分類別エンゲージメントページ
 * ページパスの階層別集計機能
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import AISummarySheet from '@/components/ai/AISummarySheet';
import Loading from '@/components/common/Loading';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface HierarchyData {
  path: string;
  pageviews: number;
  pageviewRate: number;
  viewsPerUser: number;
  engagementRate: number;
  pageCount: number;
}

export default function PageClassificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateRangeType, setDateRangeType] = useState<string>('last_month');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [pageData, setPageData] = useState<any[]>([]);
  const [directoryData, setDirectoryData] = useState<HierarchyData[]>([]);

  // ソート機能
  const [sortKey, setSortKey] = useState<string>('pageviews');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 表示モード切り替え
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (directoryData.length === 0) return null;
    
    return {
      directoryData: directoryData.slice(0, 10)
    };
  }, [directoryData]);

  // ページパスからディレクトリ単位の集計キーを抽出する関数
  const extractDirectoryKey = (pagePath: string): string => {
    // パスを正規化（先頭の/を除去してから分割）
    const normalizedPath = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;
    const segments = normalizedPath.split('/').filter(segment => segment !== '');
    
    // ルートページの場合
    if (segments.length === 0) return '/';
    
    // 最初のディレクトリ名を返す（例: /about, /contact, /products）
    return `/${segments[0]}`;
  };

  // ディレクトリ別データを集計する関数
  const aggregateDirectoryData = (data: any[]): HierarchyData[] => {
    const directoryMap = new Map<string, {
      pageviews: number;
      engagementRate: number;
      pageCount: number;
    }>();

    data.forEach(page => {
      const directoryKey = extractDirectoryKey(page.pagePath);
      const existing = directoryMap.get(directoryKey) || {
        pageviews: 0,
        engagementRate: 0,
        pageCount: 0
      };

      existing.pageviews += page.pageviews;
      existing.engagementRate += page.engagementRate;
      existing.pageCount += 1;

      directoryMap.set(directoryKey, existing);
    });

    // 総ページビュー数を計算
    const totalPageviews = data.reduce((sum, page) => sum + page.pageviews, 0);

    return Array.from(directoryMap.entries()).map(([path, data]) => ({
      path,
      pageviews: data.pageviews,
      pageviewRate: totalPageviews > 0 ? (data.pageviews / totalPageviews) * 100 : 0,
      viewsPerUser: data.pageviews > 0 ? data.pageviews / data.pageCount : 0,
      engagementRate: data.pageCount > 0 ? data.engagementRate / data.pageCount : 0,
      pageCount: data.pageCount
    }));
  };

  // ソート処理
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // ソートされたデータ
  const sortedDirectoryData = [...directoryData].sort((a, b) => {
    let aValue: any = a[sortKey as keyof typeof a];
    let bValue: any = b[sortKey as keyof typeof b];

    if (sortKey === 'path') {
      aValue = String(aValue);
      bValue = String(bValue);
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }

    aValue = Number(aValue) || 0;
    bValue = Number(bValue) || 0;

    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Highcharts用のデータ
  const chartData = useMemo(() => {
    return directoryData.map((item, index) => ({
      name: item.path === '/' ? 'TOP' : item.path,
      y: item.pageviewRate
    }));
  }, [directoryData]);


  // Highchartsの設定
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'pie',
      height: 500
    },
    title: {
      text: null
    },
    accessibility: {
      announceNewData: {
        enabled: true
      },
      point: {
        valueSuffix: '%'
      }
    },
    plotOptions: {
      pie: {
        borderRadius: 5,
        allowPointSelect: false,
        cursor: 'default',
        dataLabels: [{
          enabled: true,
          distance: 15,
          format: '{point.name}'
        }, {
          enabled: true,
          distance: '-30%',
          filter: {
            property: 'percentage',
            operator: '>',
            value: 5
          },
          format: '{point.y:.1f}%',
          style: {
            fontSize: '0.9em',
            textOutline: 'none'
          }
        }]
      }
    },
    tooltip: {
      headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
      pointFormat: '<span style="color:{point.color}">{point.name}</span>: ' +
          '<b>{point.y:.2f}%</b> of total<br/>'
    },
    series: [{
      name: 'ディレクトリ',
      colorByPoint: true,
      data: chartData
    }],
    navigation: {
      breadcrumbs: {
        buttonTheme: {
          style: {
            color: 'var(--highcharts-highlight-color-100)'
          }
        }
      }
    },
    credits: {
      enabled: false
    }
  }), [chartData]);

  // 日付範囲を計算
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
      start = today;
      end = today;
    }

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    };

    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };


  // ページデータ変更時の処理
  useEffect(() => {
    if (pageData.length > 0) {
      const aggregated = aggregateDirectoryData(pageData);
      setDirectoryData(aggregated);
    }
  }, [pageData]);

  // 初回読み込み
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        console.log('📋 ページ分類別初期化開始');
        setIsLoading(true);
        const response = await fetch('/api/datasources/list', {
          headers: {
            'x-user-id': user.uid
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch datasources');
        }

        const data = await response.json();
        console.log('📋 データソース情報:', data);
        const propertyId = data.selectedGA4PropertyId ? data.selectedGA4PropertyId.replace('properties/', '') : null;

        // サイト名を取得
        if (data.ga4Properties && propertyId) {
          const property = data.ga4Properties.find((p: any) => p.name === `properties/${propertyId}`);
          if (property) {
            setSiteName(property.displayName);
          }
        }

        const { startDate: start, endDate: end } = calculateDateRange('last_month');
        setStartDate(start);
        setEndDate(end);

        if (propertyId) {
          console.log('📊 ページデータ取得開始:', { propertyId, start, end });
          setSelectedPropertyId(propertyId);
          
          try {
            setError(null);

            const url = `/api/ga4/pages?propertyId=${propertyId}&startDate=${start}&endDate=${end}`;
            console.log('📡 ページデータAPI呼び出し:', url);

            const pageResponse = await fetch(url, {
              headers: {
                'x-user-id': user.uid
              }
            });

            console.log('📡 APIレスポンス受信:', { ok: pageResponse.ok, status: pageResponse.status });

            if (!pageResponse.ok) {
              const errorData = await pageResponse.json();
              console.error('❌ APIエラーレスポンス:', errorData);
              throw new Error('Failed to fetch page data');
            }

            const pageDataResult = await pageResponse.json();
            console.log('✅ ページデータ取得成功:', pageDataResult.pageData?.length, '件');
            setPageData(pageDataResult.pageData || []);
          } catch (err: any) {
            console.error('❌ ページデータ取得エラー:', err);
            setError(err.message || 'データの取得に失敗しました');
          } finally {
            console.log('✅ fetchPageData完了');
            setIsLoading(false);
          }
        } else {
          console.log('⚠️ GA4プロパティが設定されていません');
          setIsLoading(false);
          setError('Google Analytics 4 プロパティが設定されていません。サイト設定から接続してください。');
        }
      } catch (err) {
        console.error('❌ 初期化エラー:', err);
        setIsLoading(false);
      }
    };

    init();
  }, [user]);

  // 日付範囲変更
  const handleDateRangeChange = useCallback(async (newStartDate: string, newEndDate: string, type: string) => {
    if (!user || !selectedPropertyId) return;

    try {
      // YYYY-MM-DD形式をYYYYMMDD形式に変換
      const start = newStartDate.replace(/-/g, '');
      const end = newEndDate.replace(/-/g, '');

      setStartDate(start);
      setEndDate(end);

      // ページデータを取得
      const url = `/api/ga4/pages?propertyId=${selectedPropertyId}&startDate=${start}&endDate=${end}`;
      const response = await fetch(url, {
        headers: {
          'x-user-id': user!.uid
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPageData(data.pageData || []);
      }
    } catch (error) {
      console.error('データ再取得エラー:', error);
    }
  }, [selectedPropertyId, user]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <Loading size={64} />
          <p className="mt-4 text-body-color dark:text-dark-6">読み込み中...</p>
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
            ページ分類別
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            ディレクトリ別のエンゲージメントデータ集計
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="mb-6 flex justify-end">
          <div className="flex rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              テーブル表示
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              円グラフ表示
            </button>
          </div>
        </div>

        {/* Directory Table */}
        {viewMode === 'table' && (
          <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                ディレクトリ別エンゲージメント
              </h3>
            </div>
          <div className="overflow-x-auto">
            <div className="table-scroll-container">
              <table className="w-full table-auto">
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                    <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">
                      パス
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('pageviews')}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        表示回数
                        <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortKey === 'pageviews' ? (
                            sortOrder === 'asc' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('pageviewRate')}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        表示回数率
                        <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortKey === 'pageviewRate' ? (
                            sortOrder === 'asc' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('viewsPerUser')}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        平均PV
                        <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortKey === 'viewsPerUser' ? (
                            sortOrder === 'asc' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('engagementRate')}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        ENG率
                        <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortKey === 'engagementRate' ? (
                            sortOrder === 'asc' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('pageCount')}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        ページ数
                        <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortKey === 'pageCount' ? (
                            sortOrder === 'asc' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          )}
                        </svg>
                      </div>
                    </th>
                  </tr>
                {/* 合計行 - theadの直後 */}
                {directoryData.length > 0 && (() => {
                  const totalPageviews = directoryData.reduce((sum, row) => sum + row.pageviews, 0);
                  const avgViewsPerUser = directoryData.length > 0 ? totalPageviews / directoryData.length : 0;
                  const avgEngagementRate = directoryData.length > 0 
                    ? directoryData.reduce((sum, row) => sum + row.engagementRate, 0) / directoryData.length 
                    : 0;
                  const totalPageCount = directoryData.reduce((sum, row) => sum + row.pageCount, 0);
                  
                  return (
                    <tr className="total-header-row font-semibold">
                      <td className="px-4 py-3 text-left text-sm text-dark dark:text-white">合計</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalPageviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">100.0%</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{avgViewsPerUser.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{avgEngagementRate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalPageCount.toLocaleString()}</td>
                    </tr>
                  );
                })()}
                </thead>
                <tbody>
                  {sortedDirectoryData.map((row, index) => (
                    <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                      <td className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">
                        <div className="max-w-full" title={row.path}>
                          {row.path || '/'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.pageviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.pageviewRate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.viewsPerUser.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.engagementRate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.pageCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Pie Chart */}
        {viewMode === 'chart' && (
          <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            {/* Highcharts円グラフ */}
            <div className="h-[500px]">
              <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
              />
            </div>
          </div>
        )}

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
          pageType="engagement"
          contextData={aiContextData}
          startDate={startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
          endDate={endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}
