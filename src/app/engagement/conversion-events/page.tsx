'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import AISummarySection from '@/components/ai/AISummarySection';
import TableContainer from '@/components/table/TableContainer';

interface ConversionEvent {
  eventName: string;
  users: number;
  keyEvents: number;
}

export default function ConversionEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ConversionEvent>('keyEvents');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // サイト情報
  const [siteName, setSiteName] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // 日付範囲（DashboardLayoutから受け取る）
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // データ取得関数
  const fetchEventData = async (propertyId: string, start: string, end: string) => {
    if (!user || !propertyId) return;

    try {
      setIsLoading(true);

      // YYYYMMDD → YYYY-MM-DD に変換
      const formatDate = (date: string) => {
        if (date.length === 8) {
          return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        }
        return date;
      };

      const formattedStart = formatDate(start);
      const formattedEnd = formatDate(end);

      console.log('📊 API呼び出し:', { propertyId, formattedStart, formattedEnd });

      const response = await fetch('/api/ga4/conversion-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          propertyId: propertyId,
          startDate: formattedStart,
          endDate: formattedEnd
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API Error Response:', errorData);
        throw new Error(`Failed to fetch conversion events: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Success Response:', data);
      setEvents(data.events || []);

    } catch (error) {
      console.error('コンバージョンイベントデータ取得エラー:', error);
      setEvents([]);
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
        const propertyId = data.selectedGA4PropertyId?.replace('properties/', '') || null;
        
        console.log('✅ Property ID取得:', propertyId);
        
        if (propertyId) {
          setSelectedPropertyId(propertyId);
          
          // 初回データ取得（先月データ）
          const today = new Date();
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          
          const formatDateToYYYYMMDD = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}${m}${d}`;
          };
          
          const startDate = formatDateToYYYYMMDD(lastMonthStart);
          const endDate = formatDateToYYYYMMDD(lastMonthEnd);
          
          console.log('📊 初回データ取得:', { propertyId, startDate, endDate });
          fetchEventData(propertyId, startDate, endDate);
        }
      } catch (error) {
        console.error('初期データ読み込みエラー:', error);
      }
    };

    loadInitialData();
  }, [user]);

  // 日付範囲変更ハンドラ（PropertyIDの最新値を参照）
  const handleDateRangeChange = useCallback((newStartDate: string, newEndDate: string, type: string) => {
    console.log('📅 handleDateRangeChange called:', { newStartDate, newEndDate, type });
    
    // 日付を保存（AI要約用）
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    if (!user?.uid) {
      console.log('⚠️ User not authenticated');
      return;
    }
    
    if (!selectedPropertyId) {
      console.log('⚠️ Property ID not set yet');
      return;
    }
    
    // YYYY-MM-DD → YYYYMMDD
    const formattedStart = newStartDate.replace(/-/g, '');
    const formattedEnd = newEndDate.replace(/-/g, '');
    
    console.log('✅ Calling fetchEventData with:', { propertyId: selectedPropertyId, formattedStart, formattedEnd });
    fetchEventData(selectedPropertyId, formattedStart, formattedEnd);
  }, [user, selectedPropertyId]);

  // ソート処理
  const handleSort = (key: keyof ConversionEvent) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // デフォルトは降順
    }
  };

  // ソートされたイベントデータ
  const sortedEvents = [...events].sort((a, b) => {
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
    if (events.length === 0) return null;
    
    return {
      totalEvents: events.length,
      topEvents: events.slice(0, 5).map(e => ({
        eventName: e.eventName,
        users: e.users,
        keyEvents: e.keyEvents
      }))
    };
  }, [events]);

  // ソートアイコン
  const SortIcon = ({ columnKey }: { columnKey: keyof ConversionEvent }) => {
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
        propertyId: selectedPropertyId || undefined,
        siteName: siteName || undefined
      }}
      onDateRangeChange={handleDateRangeChange}
    >
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            コンバージョン一覧
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            コンバージョンに貢献したイベントの分析
          </p>
        </div>

        {/* 定義なしメッセージ */}
        {!isLoading && events.length === 0 && (
          <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
                  コンバージョンが定義されていません
                </h3>
                <p className="mb-4 text-sm text-body-color dark:text-dark-6">
                  コンバージョンイベントを表示するには、まずサイト設定でコンバージョンを定義してください。
                </p>
                <a
                  href="/site-settings"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  サイト設定でコンバージョンを定義
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {events.length > 0 && (
          <TableContainer
            title="定義済みコンバージョン一覧"
            isLoading={isLoading}
            isEmpty={false}
            emptyMessage=""
          >
          <table className="w-full table-auto">
                  <colgroup>
                    <col style={{ width: '50%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                      <th 
                        className="cursor-pointer px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                        onClick={() => handleSort('eventName')}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          イベント名
                          <SortIcon columnKey="eventName" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                        onClick={() => handleSort('users')}
                      >
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          ユーザー数
                          <SortIcon columnKey="users" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                        onClick={() => handleSort('keyEvents')}
                      >
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          キーイベント数
                          <SortIcon columnKey="keyEvents" />
                      </div>
                    </th>
                  </tr>
                  {/* 合計行 - theadの直後 */}
                  {sortedEvents.length > 0 && (() => {
                    const totalUsers = sortedEvents.reduce((sum, row) => sum + row.users, 0);
                    const totalKeyEvents = sortedEvents.reduce((sum, row) => sum + row.keyEvents, 0);
                    
                    return (
                      <tr className="total-header-row font-semibold">
                        <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">合計</td>
                        <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{totalUsers.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{totalKeyEvents.toLocaleString()}</td>
                      </tr>
                    );
                  })()}
                </thead>
                <tbody>
                  {sortedEvents.map((row, index) => (
                      <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                        <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">
                          {row.eventName}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                          {row.users.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                          {row.keyEvents.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </TableContainer>
        )}

        {/* AI Summary Section - 共通コンポーネント使用 */}
        {user && startDate && endDate && aiContextData && (
          <AISummarySection
            userId={user.uid}
            pageType="acquisition"
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
