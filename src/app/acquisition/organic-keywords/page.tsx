'use client';

/**
 * 流入キーワード元ページ
 * Search Console のクエリデータを表示
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import AISummarySheet from '@/components/ai/AISummarySheet';
import Loading from '@/components/common/Loading';

export default function OrganicKeywordsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [queryData, setQueryData] = useState<any[]>([]);

  // 日付範囲（DashboardLayoutから受け取る）
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ソート機能
  const [sortKey, setSortKey] = useState<string>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // AI分析シート
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // データ取得関数
  const fetchData = async (siteUrl: string, start: string, end: string) => {
    if (!user) return;

    try {
      setIsLoading(true);

      const response = await fetch(`/api/gsc/queries?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${start}&endDate=${end}`, {
        method: 'GET',
        headers: {
          'x-user-id': user.uid
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch query data');
      }

      const data = await response.json();
      setQueryData(data.queries || []);
    } catch (error) {
      console.error('クエリデータ取得エラー:', error);
      setQueryData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回データ取得
  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      try {
        // ユーザープロファイルからサイト名を取得
        const profile = await UserProfileService.getUserProfile(user.uid);
        if (profile.profile?.siteName) {
          setSiteName(profile.profile.siteName);
        }

        // データソース一覧を取得
        const response = await fetch('/api/datasources/list', {
          headers: {
            'x-user-id': user.uid
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch datasources');
        }

        const data = await response.json();
        const siteUrl = data.selectedGSCSiteUrl || null;
        
        if (siteUrl) {
          setSelectedSiteUrl(siteUrl);
          
          // 初回データ取得（先月データ）
          const today = new Date();
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          
          const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          };
          
          const start = formatDate(lastMonthStart);
          const end = formatDate(lastMonthEnd);
          
          fetchData(siteUrl, start, end);
        }
      } catch (error) {
        console.error('初期データ読み込みエラー:', error);
      }
    };

    loadInitialData();
  }, [user]);

  // 日付範囲変更ハンドラ
  const handleDateRangeChange = useCallback((newStartDate: string, newEndDate: string, type: string) => {
    // 日付を保存（AI要約用）
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    if (!user?.uid || !selectedSiteUrl) return;
    
    // YYYY-MM-DD形式そのまま使用
    fetchData(selectedSiteUrl, newStartDate, newEndDate);
  }, [user, selectedSiteUrl]);

  // ソート処理
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // ソート済みデータ
  const sortedData = [...queryData].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    return 0;
  });

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (queryData.length === 0) return null;
    
    return {
      queries: queryData.slice(0, 10)
    };
  }, [queryData]);

  // ソートアイコン
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return (
        <svg className="ml-1 h-4 w-4 flex-shrink-0 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="ml-1 h-4 w-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 h-4 w-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <DashboardLayout 
      siteInfo={{
        scope: '全体',
        siteName: siteName || undefined,
        siteUrl: selectedSiteUrl || undefined
      }}
      onDateRangeChange={handleDateRangeChange}
    >
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            流入キーワード元
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            Search Console の検索クエリ分析
          </p>
        </div>

        {!selectedSiteUrl ? (
          <div className="rounded-lg border border-stroke bg-white p-10 text-center shadow-default dark:border-dark-3 dark:bg-dark-2">
            <p className="text-body-color dark:text-dark-6">
              Search Console サイトが設定されていません。
              <br />
              <a href="/site-settings" className="text-primary underline hover:no-underline">
                サイト設定
              </a>
              から接続してください。
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  検索クエリ一覧
                </h3>
              </div>
              <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loading size={40} />
                  </div>
                ) : sortedData.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-body-color dark:text-dark-6">
                      検索クエリデータがありません。
                    </p>
                  </div>
                ) : (
                  <div className="table-scroll-container">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                        <th 
                          className="cursor-pointer px-4 py-4 text-left text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                          onClick={() => handleSort('query')}
                        >
                          <div className="flex items-center gap-2">
                            クエリ
                            <SortIcon columnKey="query" />
                          </div>
                        </th>
                        <th 
                          className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                          onClick={() => handleSort('clicks')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            クリック数
                            <SortIcon columnKey="clicks" />
                          </div>
                        </th>
                        <th 
                          className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                          onClick={() => handleSort('impressions')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            表示回数
                            <SortIcon columnKey="impressions" />
                          </div>
                        </th>
                        <th 
                          className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                          onClick={() => handleSort('ctr')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            CTR
                            <SortIcon columnKey="ctr" />
                          </div>
                        </th>
                        <th 
                          className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                          onClick={() => handleSort('position')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            平均掲載順位
                            <SortIcon columnKey="position" />
                          </div>
                        </th>
                      </tr>
                      {/* 合計行 - theadの直後 */}
                      {queryData.length > 0 && (() => {
                        const totalClicks = queryData.reduce((sum, row) => sum + (row.clicks || 0), 0);
                        const totalImpressions = queryData.reduce((sum, row) => sum + (row.impressions || 0), 0);
                        // CTRは合計クリック数÷合計表示回数で計算（パーセンテージ）
                        const totalCtr = totalImpressions > 0 
                          ? (totalClicks / totalImpressions) * 100
                          : 0;
                        const avgPosition = queryData.length > 0 
                          ? queryData.reduce((sum, row) => sum + (row.position || 0), 0) / queryData.length 
                          : 0;
                        
                        return (
                          <tr className="total-header-row font-semibold">
                            <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">合計</td>
                            <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{totalClicks.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{totalImpressions.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{totalCtr.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{avgPosition.toFixed(1)}</td>
                          </tr>
                        );
                      })()}
                    </thead>
                    <tbody>
                      {sortedData.map((row, index) => (
                        <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                          <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">
                            {row.query}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                            {(row.clicks || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                            {(row.impressions || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                            {((row.ctr || 0) * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                            {(row.position || 0).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>

          </>
        )}
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

      {/* AI Analysis Sheet */}
      {user && startDate && endDate && aiContextData && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          userId={user.uid}
          pageType="organic-keywords"
          startDate={startDate}
          endDate={endDate}
          contextData={aiContextData}
        />
      )}
    </DashboardLayout>
  );
}
