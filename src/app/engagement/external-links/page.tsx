'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import AISummarySheet from '@/components/ai/AISummarySheet';
import TableContainer from '@/components/table/TableContainer';

interface ExternalLink {
  linkUrl: string;
  clicks: number;
}

export default function ExternalLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ExternalLink>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // サイト情報
  const [siteName, setSiteName] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // 日付範囲（DashboardLayoutから受け取る）
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // データ取得関数
  const fetchLinkData = async (propertyId: string, start: string, end: string) => {
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

      const response = await fetch('/api/ga4/external-links', {
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
        throw new Error(`Failed to fetch external links: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Success Response:', data);
      setLinks(data.links || []);

    } catch (error) {
      console.error('外部リンクデータ取得エラー:', error);
      setLinks([]);
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
          
          const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}${m}${d}`;
          };
          
          const startDate = formatDate(lastMonthStart);
          const endDate = formatDate(lastMonthEnd);
          
          console.log('📊 初回データ取得:', { propertyId, startDate, endDate });
          fetchLinkData(propertyId, startDate, endDate);
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
    
    console.log('✅ Calling fetchLinkData with:', { propertyId: selectedPropertyId, formattedStart, formattedEnd });
    fetchLinkData(selectedPropertyId, formattedStart, formattedEnd);
  }, [user, selectedPropertyId]);

  // ソート処理
  const handleSort = (key: keyof ExternalLink) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // ソート済みデータ
  const sortedLinks = [...links].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (links.length === 0) return null;
    
    return {
      totalLinks: links.length,
      topLinks: links.slice(0, 5).map(l => ({
        linkUrl: l.linkUrl,
        clicks: l.clicks
      }))
    };
  }, [links]);

  // ソートアイコン
  const SortIcon = ({ columnKey }: { columnKey: keyof ExternalLink }) => {
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
            外部リンククリック
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            クリックされた外部リンクの分析
          </p>
        </div>

        {/* Table */}
        <TableContainer
          title="外部リンク一覧"
          isLoading={isLoading}
          isEmpty={links.length === 0}
          emptyMessage="外部リンククリックデータがありません。"
        >
          <table className="w-full table-auto">
                  <colgroup>
                    <col style={{ width: '70%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                      <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        リンクURL
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">
                        クリック数
                      </th>
                    </tr>
                    {/* 合計行 - theadの直後 */}
                    {sortedLinks.length > 0 && (() => {
                      const totalClicks = sortedLinks.reduce((sum, row) => sum + row.clicks, 0);
                      
                      return (
                        <tr className="total-header-row font-semibold">
                          <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">合計</td>
                          <td className="px-4 py-3 text-sm text-center text-dark dark:text-white">{totalClicks.toLocaleString()}</td>
                        </tr>
                      );
                    })()}
                  </thead>
                  <tbody>
                    {sortedLinks.map((row, index) => (
                      <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                        <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">
                          {row.linkUrl}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-dark dark:text-white">
                          {row.clicks.toLocaleString()}
                        </td>
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

      {/* AI分析シート */}
      {user && startDate && endDate && aiContextData && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="external-links"
          contextData={aiContextData}
          startDate={startDate}
          endDate={endDate}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}
