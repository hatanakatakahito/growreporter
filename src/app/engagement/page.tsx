'use client';

/**
 * エンゲージメントページ
 * ページ別エンゲージメントデータを表示
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import AISummarySheet from '@/components/ai/AISummarySheet';

export default function EngagementPage() {
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

  // ソート機能
  const [sortKey, setSortKey] = useState<string>('users');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (pageData.length === 0) return null;
    
    return {
      pages: pageData.slice(0, 10)
    };
  }, [pageData]);

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
  const sortedPageData = [...pageData].sort((a, b) => {
    let aValue: any = a[sortKey as keyof typeof a];
    let bValue: any = b[sortKey as keyof typeof b];

    if (sortKey === 'pagePath' || sortKey === 'screenClass') {
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


  // 初回読み込み
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        console.log('📋 エンゲージメント初期化開始');
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
          
          // propertyIdを直接使用してfetchPageDataを呼び出す
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
            エンゲージメント
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            Google Analytics 4 から取得したページ別エンゲージメントデータ
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

        {/* Pages Table */}
        <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              ページ別エンゲージメント
            </h3>
          </div>
          <div className="overflow-x-auto">
            <div className="table-scroll-container">
              <table className="w-full table-auto">
                <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                  <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">
                    URL・ページ
                  </th>
                  <th 
                    className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                    onClick={() => handleSort('users')}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      ユーザー数
                      <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'users' ? (
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
                    onClick={() => handleSort('sessions')}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      セッション
                      <svg className="h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'sessions' ? (
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
                </tr>
                {/* 合計行 - theadの直後 */}
                {pageData.length > 0 && (() => {
                  const totalUsers = pageData.reduce((sum, row) => sum + row.users, 0);
                  const totalSessions = pageData.reduce((sum, row) => sum + row.sessions, 0);
                  const totalPageviews = pageData.reduce((sum, row) => sum + row.pageviews, 0);
                  const avgViewsPerUser = totalUsers > 0 ? totalPageviews / totalUsers : 0;
                  const avgEngagementRate = pageData.length > 0 
                    ? pageData.reduce((sum, row) => sum + row.engagementRate, 0) / pageData.length 
                    : 0;
                  
                  return (
                    <tr className="total-header-row font-semibold">
                      <td className="px-4 py-3 text-left text-sm text-dark dark:text-white">合計</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalUsers.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalSessions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalPageviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{avgViewsPerUser.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{avgEngagementRate.toFixed(2)}%</td>
                    </tr>
                  );
                })()}
              </thead>
              <tbody>
                {sortedPageData.map((row, index) => (
                  <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                    <td className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">
                      <div className="max-w-full" title={row.pagePath}>
                        {row.pagePath}
                      </div>
                      {row.screenClass !== '(not set)' && (
                        <div className="mt-0.5 max-w-full text-xs text-body-color dark:text-dark-6" title={row.screenClass}>
                          {row.screenClass}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.users.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.sessions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.pageviews.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.viewsPerUser.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.engagementRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
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

