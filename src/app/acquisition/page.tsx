'use client';

/**
 * 集客ページ
 * トラフィック獲得データを表示
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AISummarySheet from '@/components/ai/AISummarySheet';
import Loading from '@/components/common/Loading';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AcquisitionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [totalData, setTotalData] = useState<any>({
    users: 0,
    newUsers: 0,
    sessions: 0,
    pageviews: 0,
    engagementRate: 0,
    keyEvents: 0
  });

  // AI要約
  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (trafficData.length === 0) return null;
    
    return {
      totalChannels: trafficData.length,
      trafficData: trafficData,
      totalData: totalData,
      topChannels: trafficData.slice(0, 5).map(c => ({
        channel: c.sessionDefaultChannelGroup,
        users: c.users,
        sessions: c.sessions
      }))
    };
  }, [trafficData, totalData]);

  // ソート機能
  const [sortKey, setSortKey] = useState<string>('users'); // デフォルトはユーザー数でソート
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ツールチップ表示用の状態
  const [tooltipChannel, setTooltipChannel] = useState<string | null>(null);

  // チャネル名の用語説明
  const channelDescriptions: { [key: string]: string } = {
    'Organic Search': 'Googleなど検索結果からの流入',
    'Paid Search': '広告クリックによる検索流入',
    'Direct': 'URL直打ち・ブックマーク流入',
    'Referral': '他サイトのリンク経由の流入',
    'Organic Social': 'SNS自然投稿からの流入',
    'Paid Social': 'SNS広告経由の流入',
    'Display': 'バナー広告やGDNからの流入',
    'Video': 'YouTubeなど動画広告から流入',
    'Organic Video': 'YouTubeなど動画広告から流入',
    'Affiliate': 'アフィリエイト経由の流入',
    'Affiliates': 'アフィリエイト経由の流入',
    'Email': 'メールマガジンなどからの流入',
    'Organic Shopping': '無料商品リスティング経由流入',
    'Paid Shopping': '商品リスティング広告からの流入',
    'Audio': '音声広告やPodcast経由の流入',
    'Mobile Push Notifications': 'アプリのプッシュ通知経由流入',
    'SMS': 'SMS（ショートメッセージ）経由流入',
    'Other Advertising': 'その他広告（例：未分類広告）',
    'Cross-network': 'Google広告のクロスネットワーク機能からの流入',
    'Unassigned': 'チャネル分類できない流入',
    '(not set)': 'チャネル分類できない流入'
  };

  // ソート処理
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // 同じキーの場合は昇順/降順を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいキーの場合は降順でソート
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // ソートされたデータ
  const sortedTrafficData = [...trafficData].sort((a, b) => {
    let aValue: any = a[sortKey as keyof typeof a];
    let bValue: any = b[sortKey as keyof typeof b];

    // チャネル名の場合は文字列比較
    if (sortKey === 'channel') {
      aValue = String(aValue);
      bValue = String(bValue);
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }

    // 数値の場合は数値比較
    aValue = Number(aValue) || 0;
    bValue = Number(bValue) || 0;

    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

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

  // 日付範囲が変更されたらデータを再取得
  const handleDateRangeChange = useCallback(async (newStartDate: string, newEndDate: string, type: string) => {
    if (!user || !selectedPropertyId) return;

    try {
      // 日付をYYYYMMDD形式に変換
      const formattedStartDate = newStartDate.replace(/-/g, '');
      const formattedEndDate = newEndDate.replace(/-/g, '');
      
      const response = await fetch(
        `/api/ga4/traffic-acquisition?propertyId=${selectedPropertyId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
        {
          headers: {
            'x-user-id': user!.uid
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrafficData(data.trafficData || []);
        setTotalData(data.totalData || {
          users: 0,
          newUsers: 0,
          sessions: 0,
          pageviews: 0,
          engagementRate: 0,
          keyEvents: 0
        });
      }
    } catch (error) {
      console.error('データ再取得エラー:', error);
    }
  }, [user, selectedPropertyId]);

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

        // トラフィックデータを取得
        const formattedStartDate = range.startDate.replace(/-/g, '');
        const formattedEndDate = range.endDate.replace(/-/g, '');
        
        const trafficResponse = await fetch(
          `/api/ga4/traffic-acquisition?propertyId=${propertyId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
          {
            headers: {
              'x-user-id': user.uid
            }
          }
        );

        if (trafficResponse.ok) {
          const trafficData = await trafficResponse.json();
          setTrafficData(trafficData.trafficData || []);
          setTotalData(trafficData.totalData || {
            users: 0,
            newUsers: 0,
            sessions: 0,
            pageviews: 0,
            engagementRate: 0,
            keyEvents: 0
          });
        }

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

  // チャネル別ユーザー数グラフ（棒グラフ）
  const channelUsersOptions: any = {
    chart: {
      type: 'bar',
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    colors: ['#3B82F6'],
    xaxis: {
      categories: trafficData.length > 0 ? trafficData.map(d => d.channel) : [],
      labels: {
        style: {
          fontSize: '11px',
        },
        rotate: -45,
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
    noData: {
      text: 'データを読み込み中...',
      align: 'center',
      verticalAlign: 'middle',
    },
  };

  const channelUsersSeries = [
    {
      name: 'ユーザー数',
      data: trafficData.length > 0 ? trafficData.map(d => d.users) : [],
    },
  ];

  // チャネル別セッション数グラフ（棒グラフ）
  const channelSessionsOptions: any = {
    chart: {
      type: 'bar',
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    colors: ['#10B981'],
    xaxis: {
      categories: trafficData.length > 0 ? trafficData.map(d => d.channel) : [],
      labels: {
        style: {
          fontSize: '11px',
        },
        rotate: -45,
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
    noData: {
      text: 'データを読み込み中...',
      align: 'center',
      verticalAlign: 'middle',
    },
  };

  const channelSessionsSeries = [
    {
      name: 'セッション数',
      data: trafficData.length > 0 ? trafficData.map(d => d.sessions) : [],
    },
  ];

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
            集客
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            トラフィック獲得データを確認できます
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

        {/* Traffic Acquisition Table */}
        <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              集客チャネル
            </h3>
          </div>
          <div className="table-scroll-container">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-stroke bg-gray-2 text-left dark:border-dark-3 dark:bg-dark">
                  <th 
                    className="cursor-pointer px-4 py-4 text-left text-sm font-medium text-dark dark:text-white hover:bg-gray-3 dark:hover:bg-dark-2"
                    onClick={() => handleSort('channel')}
                  >
                    <div className="flex items-center gap-2">
                      チャネル
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'channel' ? (
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
                    <div className="flex items-center justify-center gap-2">
                      ユーザー数
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={() => handleSort('newUsers')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      新規ユーザー数
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'newUsers' ? (
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
                    <div className="flex items-center justify-center gap-2">
                      セッション
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="flex items-center justify-center gap-2">
                      表示回数
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={() => handleSort('engagementRate')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      ENG率
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={() => handleSort('keyEvents')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      キーイベント
                      <svg className="h-4 w-4 text-body-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortKey === 'keyEvents' ? (
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
                <tr className="total-header-row font-semibold">
                  <td className="px-4 py-3 text-left text-sm text-dark dark:text-white">合計</td>
                  <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{(totalData.users || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{(totalData.newUsers || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{(totalData.sessions || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{(totalData.pageviews || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{(totalData.engagementRate || 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{totalData.keyEvents || 0}</td>
                </tr>
              </thead>
              <tbody>
                {sortedTrafficData.map((row, index) => (
                  <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors" style={{ position: 'relative' }}>
                    <td className="relative px-4 py-3 text-left text-sm font-medium text-dark dark:text-white" style={{ overflow: 'visible' }}>
                      {channelDescriptions[row.channel] ? (
                        <div className="tooltip-container inline-flex items-center gap-1">
                          {row.channel === 'Organic Search' ? (
                            <Link href="/acquisition/organic-keywords" className="cursor-pointer hover:text-primary hover:underline">
                              {row.channel}
                            </Link>
                          ) : row.channel === 'Referral' ? (
                            <Link href="/acquisition/referrals" className="cursor-pointer hover:text-primary hover:underline">
                              {row.channel}
                            </Link>
                          ) : (
                            <span className="cursor-help hover:text-primary">
                              {row.channel}
                            </span>
                          )}
                          <svg className="h-3.5 w-3.5 text-body-color opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="tooltip-wrapper pointer-events-none absolute bottom-full left-0 z-[9999] hidden whitespace-nowrap rounded bg-dark px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800" style={{ marginBottom: '0px' }}>
                            <div className="absolute left-4 top-full h-2 w-2 rotate-45 bg-dark dark:bg-gray-800" style={{ marginTop: '-4px' }}></div>
                            {channelDescriptions[row.channel]}
                          </div>
                        </div>
                      ) : (
                        <span>{row.channel}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{row.users.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{row.newUsers.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{row.sessions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{row.pageviews.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{row.engagementRate.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center text-sm text-dark dark:text-white">{row.keyEvents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Grid - 2 columns */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Channel Users Chart */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              チャネル別ユーザー数
            </h3>
            <ReactApexChart
              options={channelUsersOptions}
              series={channelUsersSeries}
              type="bar"
              height={350}
            />
          </div>

          {/* Channel Sessions Chart */}
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              チャネル別セッション数
            </h3>
            <ReactApexChart
              options={channelSessionsOptions}
              series={channelSessionsSeries}
              type="bar"
              height={350}
            />
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
          pageType="acquisition"
          contextData={aiContextData}
          startDate={startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
          endDate={endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}