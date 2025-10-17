'use client';

/**
 * 被リンク元ページ
 * GA4の Referral データを表示
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import AISummarySheet from '@/components/ai/AISummarySheet';
import Loading from '@/components/common/Loading';

export default function ReferralsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [referralData, setReferralData] = useState<any[]>([]);
  const [totalData, setTotalData] = useState<any>({
    users: 0,
    newUsers: 0,
    sessions: 0,
    pageviews: 0,
    engagementRate: 0,
    keyEvents: 0
  });

  // 日付範囲（DashboardLayoutから受け取る）
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ソート機能
  const [sortKey, setSortKey] = useState<string>('users');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // AI分析シート
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // データ取得関数
  const fetchData = async (propertyId: string, start: string, end: string) => {
    if (!user) return;

    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/ga4/referrals?propertyId=${propertyId}&startDate=${start}&endDate=${end}`,
        {
          headers: {
            'x-user-id': user.uid
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }

      const data = await response.json();
      setReferralData(data.referralData || []);
      
      // 合計データをAPIレスポンスから取得
      if (data.totalData) {
        setTotalData(data.totalData);
      }

    } catch (error) {
      console.error('Referral データ取得エラー:', error);
      setReferralData([]);
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
        if (profile && profile.profile?.siteName) {
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
        const propertyId = data.selectedGA4PropertyId?.replace('properties/', '') || null;
        
        if (propertyId) {
          setSelectedPropertyId(propertyId);
          
          // 初回データ取得（先月データ）
          const today = new Date();
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          
          const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}${m}${d}`;
          };
          
          const start = formatDate(lastMonthStart);
          const end = formatDate(lastMonthEnd);
          
          fetchData(propertyId, start, end);
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
    
    if (!user?.uid || !selectedPropertyId) return;
    
    // YYYY-MM-DD → YYYYMMDD
    const start = newStartDate.replace(/-/g, '');
    const end = newEndDate.replace(/-/g, '');
    
    fetchData(selectedPropertyId, start, end);
  }, [user, selectedPropertyId]);

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
  const sortedData = [...referralData].sort((a, b) => {
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
    if (referralData.length === 0) return null;
    
    return {
      referrals: referralData.slice(0, 10)
    };
  }, [referralData]);

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

  if (isLoading) {
    return (
      <div className="loading-screen flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <Loading size={64} />
          <p className="mt-4 text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            被リンク元
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            Referral トラフィックの分析
          </p>
        </div>

        {/* Table */}
        <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              Referral 一覧
            </h3>
          </div>
          <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
            {sortedData.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-body-color dark:text-dark-6">
                  Referral データがありません。
                </p>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                    <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">
                      ソース
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">
                      メディア
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('users')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        ユーザー数
                        <SortIcon columnKey="users" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('newUsers')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        新規ユーザー
                        <SortIcon columnKey="newUsers" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('sessions')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        セッション
                        <SortIcon columnKey="sessions" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('pageviews')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        ページビュー
                        <SortIcon columnKey="pageviews" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('engagementRate')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        ENG率
                        <SortIcon columnKey="engagementRate" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-4 text-center text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                      onClick={() => handleSort('keyEvents')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        キーイベント
                        <SortIcon columnKey="keyEvents" />
                      </div>
                    </th>
                  </tr>
                  {/* 合計行 - theadの直後 */}
                  <tr className="total-header-row font-semibold">
                    <td className="px-4 py-3 text-left text-sm text-dark dark:text-white" colSpan={2}>
                      合計
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                      {(totalData.users || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                      {(totalData.newUsers || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                      {(totalData.sessions || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                      {(totalData.pageviews || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                      {(totalData.engagementRate || 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                      {(totalData.keyEvents || 0).toLocaleString()}
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row, index) => (
                    <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                      <td className="px-4 py-3 text-left text-sm text-dark dark:text-white">
                        {row.source || '(not set)'}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-dark dark:text-white">
                        {row.medium || '(not set)'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                        {(row.users || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                        {(row.newUsers || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                        {(row.sessions || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                        {(row.pageviews || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                        {(row.engagementRate || 0).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                        {(row.keyEvents || 0).toLocaleString()}
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
          pageType="referrals"
          startDate={startDate}
          endDate={endDate}
          contextData={aiContextData}
        />
      )}
    </DashboardLayout>
  );
}
