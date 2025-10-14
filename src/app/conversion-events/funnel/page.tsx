'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TableContainer from '@/components/table/TableContainer';
import { ConversionService } from '@/lib/conversion/conversionService';
import { Conversion } from '@/lib/conversion/conversionService';
import AISummarySheet from '@/components/ai/AISummarySheet';

interface FunnelData {
  totalPageViews: number;
  formPageViews: number;
  conversions: number;
  formToTotalRate: number;
  conversionToFormRate: number;
  conversionToTotalRate: number;
}

interface MonthlyFunnelData {
  yearMonth: string;
  displayName: string;
  totalPageViews: number;
  formPageViews: number;
  conversions: number;
  formToTotalRate: number;
  conversionToFormRate: number;
  conversionToTotalRate: number;
}

export default function FunnelPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [monthlyFunnelData, setMonthlyFunnelData] = useState<MonthlyFunnelData[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [selectedConversion, setSelectedConversion] = useState<string>('');
  const [formPagePath, setFormPagePath] = useState<string>('/contact'); // デフォルトのフォームページパス
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [tempPath, setTempPath] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '30daysAgo',
    endDate: 'today'
  });
  const [pagePaths, setPagePaths] = useState<string[]>([]);
  const [filteredPaths, setFilteredPaths] = useState<string[]>([]);
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  const [showConversionDropdown, setShowConversionDropdown] = useState(false);
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // 日付範囲変更ハンドラー
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  // コンバージョン定義を取得
  useEffect(() => {
    const loadConversions = async () => {
      if (!user) return;

      try {
        const activeConversions = await ConversionService.getActiveConversions(user.uid);
        setConversions(activeConversions);
        if (activeConversions.length > 0 && !selectedConversion) {
          setSelectedConversion(activeConversions[0].eventName);
        }
      } catch (error) {
        console.error('コンバージョン定義の取得に失敗:', error);
      }
    };

    loadConversions();
  }, [user]);

  // 選択されたGA4プロパティを取得
  useEffect(() => {
    const fetchSelectedProperty = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/datasources/list', {
          headers: { 'x-user-id': user.uid },
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedPropertyId(data.selectedGA4PropertyId || null);
        }
      } catch (error) {
        console.error('GA4プロパティの取得に失敗:', error);
      }
    };

    fetchSelectedProperty();
  }, [user]);

  // ページパス一覧を取得
  useEffect(() => {
    const fetchPagePaths = async () => {
      if (!user || !selectedPropertyId) return;

      try {
        const response = await fetch(
          `/api/ga4/pages?propertyId=${selectedPropertyId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
          {
            headers: { 'x-user-id': user.uid },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const paths = data.pageData.map((page: any) => page.pagePath).filter((path: string) => path !== '(not set)');
          setPagePaths(paths);
        }
      } catch (error) {
        console.error('ページパスの取得に失敗:', error);
      }
    };

    fetchPagePaths();
  }, [user, selectedPropertyId, dateRange]);

  // ファネルデータを取得
  useEffect(() => {
    const fetchFunnelData = async () => {
      if (!user || !selectedPropertyId || !selectedConversion) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ga4/funnel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
          },
          body: JSON.stringify({
            propertyId: selectedPropertyId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            formPagePath,
            conversionEventName: selectedConversion,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('ファネルデータ取得エラー:', errorText);
          throw new Error('ファネルデータの取得に失敗しました');
        }

        const text = await response.text();
        if (!text) {
          console.warn('空のレスポンスを受信しました');
          setFunnelData(null);
          return;
        }

        try {
          const data = JSON.parse(text);
          setFunnelData(data);
        } catch (jsonError) {
          console.error('JSONパースエラー:', jsonError, 'レスポンス:', text);
          throw new Error('データの解析に失敗しました');
        }
      } catch (error: any) {
        console.error('ファネルデータ取得エラー:', error);
        setError(error.message || 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchFunnelData();
  }, [user, selectedPropertyId, selectedConversion, formPagePath, dateRange]);

  // 月次ファネルデータを取得
  useEffect(() => {
    const fetchMonthlyFunnelData = async () => {
      if (!user || !selectedPropertyId || !selectedConversion || !formPagePath) {
        return;
      }

      try {
        const response = await fetch('/api/ga4/funnel-monthly', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
          },
          body: JSON.stringify({
            propertyId: selectedPropertyId,
            formPagePath,
            conversionEventName: selectedConversion,
          }),
        });

        if (response.ok) {
          const text = await response.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              setMonthlyFunnelData(data.monthlyData || []);
            } catch (jsonError) {
              console.error('月次データJSONパースエラー:', jsonError, 'レスポンス:', text);
            }
          }
        }
      } catch (error: any) {
        console.error('月次ファネルデータ取得エラー:', error);
      }
    };

    fetchMonthlyFunnelData();
  }, [user, selectedPropertyId, selectedConversion, formPagePath]);

  const handlePathEdit = () => {
    setTempPath(formPagePath);
    setIsEditingPath(true);
    setShowPathDropdown(false);
  };

  const handlePathSave = () => {
    setFormPagePath(tempPath);
    setIsEditingPath(false);
    setShowPathDropdown(false);
  };

  const handlePathCancel = () => {
    setIsEditingPath(false);
    setShowPathDropdown(false);
  };

  const handlePathInput = (value: string) => {
    setTempPath(value);
    if (value.length > 0) {
      const filtered = pagePaths.filter(path => 
        path.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPaths(filtered);
      setShowPathDropdown(true);
    } else {
      setShowPathDropdown(false);
    }
  };

  const handlePathSelect = (path: string) => {
    setTempPath(path);
    setShowPathDropdown(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">読み込み中...</div>
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
            逆算フロー
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            フォームページからのコンバージョンフローを分析
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">

        {/* 設定セクション */}
        <TableContainer title="フロー設定">
          <div className="p-6 space-y-4" style={{ overflow: 'visible' }}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* フォームページパス設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フォームページパス
                </label>
                {isEditingPath ? (
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={tempPath}
                        onChange={(e) => handlePathInput(e.target.value)}
                        onFocus={() => {
                          if (tempPath.length > 0 && filteredPaths.length > 0) {
                            setShowPathDropdown(true);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="例: /contact, /form（入力して候補を表示）"
                      />
                      {showPathDropdown && filteredPaths.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredPaths.slice(0, 50).map((path, index) => (
                            <div
                              key={index}
                              onClick={() => handlePathSelect(path)}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            >
                              {path}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handlePathSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                      保存
                    </button>
                    <button
                      onClick={handlePathCancel}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 whitespace-nowrap"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      {formPagePath}
                    </div>
                    <button
                      onClick={handlePathEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      編集
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  フォームが表示されるページのパスを指定してください（候補から選択可能）
                </p>
              </div>

              {/* コンバージョン選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  送信完了（CV）
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowConversionDropdown(!showConversionDropdown)}
                    onBlur={() => setTimeout(() => setShowConversionDropdown(false), 200)}
                    className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={conversions.length === 0}
                  >
                    <div className="flex items-center justify-between h-full">
                      <span className="text-sm text-gray-900">
                        {conversions.length === 0
                          ? 'コンバージョン定義がありません'
                          : conversions.find((c) => c.eventName === selectedConversion)?.displayName ||
                            conversions.find((c) => c.eventName === selectedConversion)?.eventName ||
                            '選択してください'}
                      </span>
                      <svg
                        className={`fill-current h-4 w-4 text-gray-500 transition-transform ${
                          showConversionDropdown ? 'rotate-180' : ''
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </button>
                  {showConversionDropdown && conversions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {conversions.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setSelectedConversion(conv.eventName);
                            setShowConversionDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                        >
                          {conv.displayName || conv.eventName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  測定するコンバージョンを選択してください
                </p>
              </div>
            </div>
          </div>
        </TableContainer>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* ファネルビジュアライゼーション */}
        {funnelData && (
          <TableContainer title="コンバージョンフロー">
            <div className="p-6">
              
              <div className="flex items-center justify-between gap-8 px-4">
                {/* 全PV数 */}
                <div className="flex-1 relative">
                  <div className="bg-blue-600 rounded-lg p-8 text-white text-center shadow-lg">
                    <div className="text-sm opacity-90 mb-2">全PV数</div>
                    <div className="text-4xl font-bold">
                      {funnelData.totalPageViews.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 矢印と遷移率 */}
                <div className="flex flex-col items-center justify-center min-w-[120px]">
                  <div className="text-xs text-gray-500 mb-1">遷移率</div>
                  <div className="text-2xl text-gray-400 mb-2">→</div>
                  <div className="bg-blue-100 px-4 py-2 rounded-full">
                    <div className="text-blue-700 font-semibold text-lg">
                      {funnelData.formToTotalRate.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* フォームPV */}
                <div className="flex-1 relative">
                  <div className="bg-blue-500 rounded-lg p-8 text-white text-center shadow-lg">
                    <div className="text-sm opacity-90 mb-2">
                      フォーム到達
                    </div>
                    <div className="text-4xl font-bold">
                      {funnelData.formPageViews.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 矢印と遷移率 */}
                <div className="flex flex-col items-center justify-center min-w-[120px]">
                  <div className="text-xs text-gray-500 mb-1">遷移率</div>
                  <div className="text-2xl text-gray-400 mb-2">→</div>
                  <div className="bg-blue-100 px-4 py-2 rounded-full">
                    <div className="text-blue-700 font-semibold text-lg">
                      {funnelData.conversionToFormRate.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* 送信完了 */}
                <div className="flex-1 relative">
                  <div className="bg-blue-700 rounded-lg p-8 text-white text-center shadow-lg">
                    <div className="text-sm opacity-90 mb-2">送信完了</div>
                    <div className="text-4xl font-bold">
                      {funnelData.conversions.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* CVR表示 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-center">
                  <div className="bg-blue-50 rounded-lg px-8 py-4 text-center">
                    <div className="text-sm text-gray-600 mb-1">全体CVR</div>
                    <div className="text-3xl font-bold text-blue-700">
                      {funnelData.conversionToTotalRate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TableContainer>
        )}

        {/* 月次推移テーブル */}
        {monthlyFunnelData.length > 0 && (
          <TableContainer title="コンバージョンフロー月次推移（過去13ヶ月）">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-3">
                  <th className="px-4 py-4 text-left text-sm font-medium text-dark dark:text-white">年月</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">全PV数</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">遷移率①</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">フォーム到達</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">遷移率②</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">送信完了</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-dark dark:text-white">全体CVR</th>
                </tr>
              </thead>
              <tbody>
                {monthlyFunnelData.map((month, index) => (
                  <tr 
                    key={month.yearMonth} 
                    className="border-b border-stroke dark:border-dark-3 hover:bg-gray-2 dark:hover:bg-dark-3"
                  >
                    <td className="px-4 py-4 text-left text-sm text-dark dark:text-white font-medium">
                      {month.displayName}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-body-color dark:text-dark-6">
                      {month.totalPageViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-primary font-semibold">
                      {month.formToTotalRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-body-color dark:text-dark-6">
                      {month.formPageViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-primary font-semibold">
                      {month.conversionToFormRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-body-color dark:text-dark-6 font-medium">
                      {month.conversions.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-primary font-bold">
                      {month.conversionToTotalRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}

        {/* データがない場合 */}
        {!funnelData && !error && !loading && (
          <div className="p-8 text-center text-gray-500">
            <p>データがありません</p>
            <p className="text-sm mt-2">
              GA4プロパティとコンバージョン定義を設定してください
            </p>
          </div>
        )}
        </div>
        {/* End Main Content */}
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
      {user && dateRange.startDate && dateRange.endDate && (
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="funnel"
          contextData={{ funnelData, monthlyFunnelData, selectedConversion, formPagePath }}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          userId={user.uid}
        />
      )}
    </DashboardLayout>
  );
}

