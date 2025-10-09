'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import AISummarySection from '@/components/ai/AISummarySection';
import TableContainer from '@/components/table/TableContainer';

interface FileDownload {
  filePath: string;
  clicks: number;
}

export default function FileDownloadsPage() {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<FileDownload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof FileDownload>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // サイト情報
  const [siteName, setSiteName] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // 日付範囲（DashboardLayoutから受け取る）
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // データ取得関数
  const fetchDownloadData = async (propertyId: string, start: string, end: string) => {
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

      const response = await fetch('/api/ga4/file-downloads', {
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
        throw new Error(`Failed to fetch file downloads: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Success Response:', data);
      setDownloads(data.downloads || []);

    } catch (error) {
      console.error('ファイルダウンロードデータ取得エラー:', error);
      setDownloads([]);
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
          fetchDownloadData(propertyId, startDate, endDate);
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
    
    console.log('✅ Calling fetchDownloadData with:', { propertyId: selectedPropertyId, formattedStart, formattedEnd });
    fetchDownloadData(selectedPropertyId, formattedStart, formattedEnd);
  }, [user, selectedPropertyId]);

  // ソート処理
  const handleSort = (key: keyof FileDownload) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // ソート済みデータ
  const sortedDownloads = [...downloads].sort((a, b) => {
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
    if (downloads.length === 0) return null;
    
    return {
      totalDownloads: downloads.length,
      topDownloads: downloads.slice(0, 5).map(d => ({
        filePath: d.filePath,
        clicks: d.clicks
      }))
    };
  }, [downloads]);

  // ソートアイコン
  const SortIcon = ({ columnKey }: { columnKey: keyof FileDownload }) => {
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
            ファイルダウンロード
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            ダウンロードされたファイルの分析
          </p>
        </div>

        {/* Table */}
        <TableContainer
          title="ダウンロード一覧"
          isLoading={isLoading}
          isEmpty={downloads.length === 0}
          emptyMessage="ファイルダウンロードデータがありません。"
        >
          <table className="w-full table-auto">
                  <colgroup>
                    <col style={{ width: '70%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                      <th 
                        className="cursor-pointer px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                        onClick={() => handleSort('filePath')}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          ファイル名
                          <SortIcon columnKey="filePath" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer px-4 py-4 text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                        onClick={() => handleSort('clicks')}
                      >
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          クリック数
                          <SortIcon columnKey="clicks" />
                        </div>
                      </th>
                    </tr>
                    {/* 合計行 - theadの直後 */}
                    {sortedDownloads.length > 0 && (() => {
                      const totalClicks = sortedDownloads.reduce((sum, row) => sum + row.clicks, 0);
                      
                      return (
                        <tr className="total-header-row font-semibold">
                          <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">合計</td>
                          <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">{totalClicks.toLocaleString()}</td>
                        </tr>
                      );
                    })()}
                  </thead>
                  <tbody>
                    {sortedDownloads.map((row, index) => (
                      <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                        <td className="px-4 py-3 text-sm text-left text-dark dark:text-white">
                          {row.filePath}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-dark dark:text-white">
                          {row.clicks.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </TableContainer>

        {/* AI Summary Section - 共通コンポーネント使用 */}
        {user && startDate && endDate && aiContextData && (
          <AISummarySection
            userId={user.uid}
            pageType="engagement"
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
