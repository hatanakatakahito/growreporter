'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TableContainer from '@/components/table/TableContainer';
import AISummarySheet from '@/components/ai/AISummarySheet';
import Loading from '@/components/common/Loading';

interface LandingPageData {
  landingPage: string;
  users: number;
  sessions: number;
  cvr: number;
  conversions: number;
}

export default function LandingPagesPage() {
  const { user } = useAuth();
  const [landingPageData, setLandingPageData] = useState<LandingPageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [sortKey, setSortKey] = useState<keyof LandingPageData>('users');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // AI分析シート
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (landingPageData.length === 0) return null;
    
    return {
      landingPages: landingPageData.slice(0, 10)
    };
  }, [landingPageData]);

  // DashboardLayoutから日付範囲変更を受け取るハンドラー
  const handleDateRangeChange = useCallback(async (newStartDate: string, newEndDate: string, type: string) => {
    if (!user || !selectedPropertyId) return;
    
    // 日付を保存
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    // YYYY-MM-DD形式をYYYYMMDD形式に変換
    const start = newStartDate.replace(/-/g, '');
    const end = newEndDate.replace(/-/g, '');
    
    // データを再取得
    try {
      const url = `/api/ga4/landing-pages?propertyId=${selectedPropertyId}&startDate=${start}&endDate=${end}`;
      const response = await fetch(url, {
        headers: {
          'x-user-id': user!.uid
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLandingPageData(data.landingPageData || []);
      }
    } catch (error) {
      console.error('データ再取得エラー:', error);
    }
  }, [user, selectedPropertyId]);

  const handleSort = (key: keyof LandingPageData) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedLandingPageData = [...landingPageData].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        console.log('📋 ランディングページ初期化開始');
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
        const { UserProfileService } = await import('@/lib/user/userProfileService');
        const profile = await UserProfileService.getUserProfile(user.uid);
        if (profile && profile.profile?.siteName) {
          setSiteName(profile.profile.siteName);
        }

        if (propertyId) {
          setSelectedPropertyId(propertyId);
          console.log('📊 ランディングページ初期化完了、初回データ取得開始');
          
          // 初回データ取得（DashboardLayoutからの日付を待たずに）
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const start = new Date(year, month - 1, 1);
          const end = new Date(year, month, 0);
          
          const formatDate = (date: Date, withHyphen = false) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return withHyphen ? `${y}-${m}-${d}` : `${y}${m}${d}`;
          };
          
          const startDateFormatted = formatDate(start);
          const endDateFormatted = formatDate(end);
          
          // 状態に保存（YYYY-MM-DD形式）
          setStartDate(formatDate(start, true));
          setEndDate(formatDate(end, true));
          
          try {
            const url = `/api/ga4/landing-pages?propertyId=${propertyId}&startDate=${startDateFormatted}&endDate=${endDateFormatted}`;
            const response = await fetch(url, {
              headers: {
                'x-user-id': user.uid
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              setLandingPageData(data.landingPageData || []);
              console.log('✅ 初回データ取得成功:', data.landingPageData?.length || 0, '件');
            }
          } catch (error) {
            console.error('❌ 初回データ取得エラー:', error);
          }
        } else {
          console.log('⚠️ GA4プロパティが設定されていません');
          setError('Google Analytics 4 プロパティが設定されていません。サイト設定から接続してください。');
        }
        setIsLoading(false);
      } catch (err) {
        console.error('❌ 初期化エラー:', err);
        setIsLoading(false);
        setError('初期化に失敗しました');
      }
    };

    init();
  }, [user]);

  // DashboardLayoutから初回の日付範囲を受け取ったらデータを取得
  useEffect(() => {
    // handleDateRangeChangeはuseEffectの外で定義されているため、依存配列に含める必要がある
    // ただし、今回はDashboardLayoutから呼ばれるため、ここでは何もしない
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loading size={48} className="mb-4" />
            <p className="text-base text-body-color dark:text-dark-6">読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-stroke bg-white p-8 dark:border-dark-3 dark:bg-dark-2">
          <p className="text-base text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout onDateRangeChange={handleDateRangeChange}>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            ランディングページ
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            Google Analytics 4 から取得したランディングページ別データ
          </p>
        </div>

        {/* Landing Pages Table */}
        <TableContainer
          title="ランディングページ別パフォーマンス"
          isLoading={isLoading}
          isEmpty={landingPageData.length === 0}
          emptyMessage="ランディングページデータがありません。"
        >
          <table className="w-full table-auto">
              <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '12.5%' }} />
                <col style={{ width: '12.5%' }} />
                <col style={{ width: '12.5%' }} />
                <col style={{ width: '12.5%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                  <th 
                    className="cursor-pointer px-4 py-4 text-left text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                    onClick={() => handleSort('landingPage')}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      ランディングページ
                      <svg className="h-4 w-4 text-body-color flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'landingPage' ? (
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
                    onClick={() => handleSort('users')}
                  >
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      ユーザー数
                      <svg className="h-4 w-4 text-body-color flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      セッション
                      <svg className="h-4 w-4 text-body-color flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={() => handleSort('cvr')}
                  >
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      CVR
                      <svg className="h-4 w-4 text-body-color flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'cvr' ? (
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
                    onClick={() => handleSort('conversions')}
                  >
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      CV
                      <svg className="h-4 w-4 text-body-color flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'conversions' ? (
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
                {landingPageData.length > 0 && (() => {
                  const totalUsers = landingPageData.reduce((sum, row) => sum + row.users, 0);
                  const totalSessions = landingPageData.reduce((sum, row) => sum + row.sessions, 0);
                  const totalConversions = landingPageData.reduce((sum, row) => sum + row.conversions, 0);
                  const avgCvr = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;
                  
                  return (
                    <tr className="total-header-row font-semibold">
                      <td className="px-4 py-3 text-left text-sm text-dark dark:text-white">合計</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalUsers.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalSessions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{avgCvr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{totalConversions.toLocaleString()}</td>
                    </tr>
                  );
                })()}
              </thead>
              <tbody>
                {sortedLandingPageData.map((row, index) => (
                  <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                    <td className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">
                      <div className="max-w-full" title={row.landingPage}>
                        {row.landingPage}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.users.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.sessions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.cvr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white whitespace-nowrap">{row.conversions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </TableContainer>

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
      {user && startDate && endDate && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          userId={user.uid}
          pageType="landing-pages"
          startDate={startDate}
          endDate={endDate}
          contextData={aiContextData}
        />
      )}
    </DashboardLayout>
  );
}

