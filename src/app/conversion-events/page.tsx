'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UserProfileService } from '@/lib/user/userProfileService';
import AISummarySheet from '@/components/ai/AISummarySheet';
import TableContainer from '@/components/table/TableContainer';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface MonthlyConversionData {
  displayName: string;
  sessions: number;
  screenPageViews: number;
  conversions: number;
  conversionBreakdown?: {
    [eventName: string]: number;
  };
  conversionRate: number;
}

export default function ConversionEventsPage() {
  const { user } = useAuth();
  const [conversions, setConversions] = useState<ConversionEvent[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyConversionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  
  // サイト情報
  const [siteName, setSiteName] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // データ取得関数
  const fetchMonthlyData = async (propertyId: string) => {
    if (!user || !propertyId) return;

    try {
      setIsLoading(true);

      console.log('📊 月次コンバージョンデータ取得開始:', { propertyId });

      // 月次データを取得（過去13ヶ月）
      const response = await fetch('/api/ga4/monthly-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          propertyId: propertyId,
          months: 13
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API Error Response:', errorData);
        throw new Error(`Failed to fetch monthly data: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 月次データ取得成功:', data);
      
      // 月次データをそのまま保存（conversionBreakdownを含む）
      setMonthlyData(data.monthlyData || []);

    } catch (error) {
      console.error('月次コンバージョンデータ取得エラー:', error);
      setMonthlyData([]);
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

        // コンバージョン定義を取得
        const conversionData = await ConversionService.getActiveConversions(user.uid);
        setConversions(conversionData);
        console.log('✅ コンバージョン定義取得:', conversionData);

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
          fetchMonthlyData(propertyId);
        }
      } catch (error) {
        console.error('初期データ読み込みエラー:', error);
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  // グラフのseries（メモ化）
  const chartSeries = useMemo(() => {
    if (conversions.length === 0 || monthlyData.length === 0) {
      return [];
    }

    // 月次データを逆順にして古い月から並べる
    const sortedMonthlyData = [...monthlyData].reverse();

    return conversions.map(conversion => ({
      name: conversion.displayName || conversion.eventName,
      data: sortedMonthlyData.map(month => 
        month.conversionBreakdown?.[conversion.eventName] || 0
      )
    }));
  }, [conversions, monthlyData]);

  // グラフのoptions（メモ化）
  const chartOptions = useMemo(() => {
    if (conversions.length === 0 || monthlyData.length === 0) {
      return {};
    }

    // 月次データを逆順にして古い月から並べる
    const sortedMonthlyData = [...monthlyData].reverse();

    return {
      colors: ["#3758F9", "#13C296", "#F59E0B", "#EF4444", "#8B5CF6"],
      chart: {
        fontFamily: "Inter, sans-serif",
        type: "line",
        height: 350,
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '11px',
          fontWeight: '500',
          colors: undefined,
        },
        background: {
          enabled: false,
        },
        offsetY: -8,
      },
      stroke: {
        width: 2,
        curve: "smooth",
      },
      xaxis: {
        categories: sortedMonthlyData.map(m => m.displayName),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "inter",
        markers: {
          radius: 99,
        },
      },
      yaxis: {
        title: {
          text: "コンバージョン数",
          style: {
            fontSize: "14px",
          },
        },
      },
      grid: {
        strokeDashArray: 5,
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val.toLocaleString();
          },
        },
      },
    };
  }, [conversions, monthlyData]);

  // AI要約用のコンテキストデータ（メモ化）
  const aiContextData = useMemo(() => {
    if (conversions.length === 0 || monthlyData.length === 0) {
      console.log('📊 コンバージョン月次推移 AI要約データ: データなし');
      return null;
    }
    
    const contextData = {
      conversions: conversions.map(c => c.displayName || c.eventName),
      monthlyData: monthlyData
    };
    console.log('📊 コンバージョン月次推移 AI要約データ:', contextData);
    return contextData;
  }, [conversions, monthlyData]);

  return (
    <DashboardLayout 
      siteInfo={{
        scope: '全体',
        propertyId: selectedPropertyId || undefined,
        siteName: siteName || undefined
      }}
    >
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            コンバージョン
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            コンバージョンに貢献したイベントの分析
          </p>
        </div>

        {/* 定義なしメッセージ */}
        {!isLoading && conversions.length === 0 && (
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
                  コンバージョンを表示するには、まずサイト設定でコンバージョンを定義してください。
                </p>
                <a
                  href="/site-settings?step=4"
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

        {/* 月次推移グラフ */}
        {chartSeries.length > 0 && (
          <div className="mb-6 rounded-lg border border-stroke bg-white px-5 pb-5 pt-[30px] dark:border-dark-3 dark:bg-dark-2 sm:px-[30px]">
            <div className="mb-4">
              <h5 className="text-lg font-semibold text-dark dark:text-white">
                コンバージョン月次推移
              </h5>
            </div>
            <div id="conversionChart" className="-mx-5">
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="line"
                height={350}
              />
            </div>
          </div>
        )}

        {/* 月次推移テーブル */}
        {conversions.length > 0 && monthlyData.length > 0 && (
          <TableContainer
            title="コンバージョン月次推移（過去13ヶ月）"
            isLoading={isLoading}
            isEmpty={false}
            emptyMessage=""
          >
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark">
                  <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">
                    年月
                  </th>
                  {conversions.map((conversion) => (
                    <th key={conversion.id} className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">
                      {conversion.displayName || conversion.eventName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month: any, index) => (
                  <tr key={index} className="border-b border-stroke dark:border-dark-3 transition-colors">
                    <td className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">
                      {month.displayName}
                    </td>
                    {conversions.map((conversion) => {
                      const count = month.conversionBreakdown?.[conversion.eventName] || 0;
                      return (
                        <td key={conversion.id} className="px-4 py-3 text-center text-sm text-dark dark:text-white">
                          {count.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
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
      {user && aiContextData && monthlyData.length > 0 && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="conversion"
          contextData={aiContextData}
          startDate={monthlyData[monthlyData.length - 1]?.yearMonth || ''}
          endDate={monthlyData[0]?.yearMonth || ''}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}
