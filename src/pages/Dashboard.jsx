import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useSite } from '../contexts/SiteContext';
import { useSiteMetrics } from '../hooks/useSiteMetrics';
import { useGA4MonthlyData } from '../hooks/useGA4MonthlyData';
import { useGA4Data } from '../hooks/useGA4Data';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import AlertCards from '../components/Dashboard/AlertCards';
import MetricTabSection from '../components/Analysis/MetricTabSection';
import TrendChart from '../components/Dashboard/TrendChart';
import ImprovementSummary from '../components/Dashboard/ImprovementSummary';
import QuickActions from '../components/Dashboard/QuickActions';
import { setPageTitle } from '../utils/pageTitle';
import { SCREENSHOT_PC_DISPLAY, SCREENSHOT_MOBILE_DISPLAY } from '../constants/screenshotDisplay';
import { Globe } from 'lucide-react';
import { format, sub, subDays, subMonths, startOfMonth } from 'date-fns';

/**
 * ダッシュボード画面
 */
export default function Dashboard() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();

  useEffect(() => {
    setPageTitle('ダッシュボード');
  }, []);

  // GSC連携の有無
  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // 現在期間のデータ
  const { data: currentData, isLoading } = useSiteMetrics(
    selectedSiteId, dateRange.from, dateRange.to, hasGSCConnection
  );

  // 前期間の日付範囲計算
  const previousRange = useMemo(() => {
    const from = dateRange.from ? new Date(dateRange.from) : new Date();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();
    const diff = to - from;
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - diff);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [dateRange]);

  // 前期間のデータ
  const { data: previousData } = useSiteMetrics(
    selectedSiteId, previousRange.from, previousRange.to, hasGSCConnection
  );

  // 前年同月の日付範囲計算
  const yearAgoRange = useMemo(() => {
    const from = dateRange.from ? sub(new Date(dateRange.from), { years: 1 }) : sub(new Date(), { years: 1 });
    const to = dateRange.to ? sub(new Date(dateRange.to), { years: 1 }) : sub(new Date(), { years: 1 });
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
  }, [dateRange]);

  // 前年同月のデータ
  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId, yearAgoRange.from, yearAgoRange.to, hasGSCConnection
  );

  // 月次トレンド（13ヶ月）
  const monthlyStartDate = useMemo(() => {
    const end = dateRange.to ? new Date(dateRange.to) : new Date();
    return format(startOfMonth(subMonths(end, 12)), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const monthlyEndDate = useMemo(() => {
    return dateRange.to || format(new Date(), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const { data: monthlyData, isLoading: isMonthlyLoading } = useGA4MonthlyData(
    selectedSiteId, monthlyStartDate, monthlyEndDate
  );

  // 日次トレンド（過去30日）
  const dailyRange = useMemo(() => {
    const end = dateRange.to ? new Date(dateRange.to) : new Date();
    return {
      from: format(subDays(end, 30), 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange.to]);

  const { data: dailyData, isLoading: isDailyLoading } = useGA4Data(
    selectedSiteId,
    dailyRange.from,
    dailyRange.to,
    ['sessions', 'totalUsers', 'screenPageViews'],
    ['date']
  );

  // 日次コンバージョン（イベント名フィルタで正確に取得）
  const { data: dailyConversionData } = useQuery({
    queryKey: ['ga4-daily-conversions-dashboard', selectedSiteId, dailyRange.from, dailyRange.to],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4DailyConversionData');
      const result = await fn({ siteId: selectedSiteId, startDate: dailyRange.from, endDate: dailyRange.to });
      return result.data;
    },
    enabled: !!selectedSiteId && !!dailyRange.from && !!dailyRange.to,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
        showExport={false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* サイト情報カバー（スクロール領域内） */}
        {selectedSite && (
          <div
            style={{
              background: 'linear-gradient(to right, rgb(224, 242, 254), rgb(254, 249, 195))',
            }}
          >
            <div className="mx-auto max-w-content px-6 py-10">
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <h1 className="text-3xl font-bold text-gray-900">
                      {selectedSite.siteName || 'サイト名'}
                    </h1>
                  </div>
                  <p className="mb-6 text-xs text-gray-500">{selectedSite.siteUrl || ''}</p>
                  <div className="mb-3">
                    <p className="text-base font-semibold text-gray-900">
                      {selectedSite.metaTitle || 'メタタイトルが設定されていません'}
                    </p>
                  </div>
                  <div>
                    <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                      {selectedSite.metaDescription || 'メタディスクリプションが設定されていません'}
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  {selectedSite.pcScreenshotUrl ? (
                    <div
                      className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                      style={{ width: SCREENSHOT_PC_DISPLAY.width, height: SCREENSHOT_PC_DISPLAY.height }}
                    >
                      <img
                        src={selectedSite.pcScreenshotUrl}
                        alt="PCキャプチャ"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                      style={{ width: SCREENSHOT_PC_DISPLAY.width, height: SCREENSHOT_PC_DISPLAY.height }}
                    >
                      <p className="text-sm text-gray-400">PCスクリーンショット未設定</p>
                    </div>
                  )}
                  {selectedSite.mobileScreenshotUrl ? (
                    <div
                      className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                      style={{ width: SCREENSHOT_MOBILE_DISPLAY.width, height: SCREENSHOT_MOBILE_DISPLAY.height }}
                    >
                      <img
                        src={selectedSite.mobileScreenshotUrl}
                        alt="スマホキャプチャ"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                      style={{ width: SCREENSHOT_MOBILE_DISPLAY.width, height: SCREENSHOT_MOBILE_DISPLAY.height }}
                    >
                      <p className="text-center text-sm text-gray-400">スマホ<br />スクリーン<br />ショット<br />未設定</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-content px-6 py-10">
          <div className="space-y-8">
            {/* クイックアクション */}
            <QuickActions />

            {/* アラート通知 */}
            <AlertCards siteId={selectedSiteId} />

            {/* 主要指標（3タブ：サマリ / CV内訳 / KPI予実） */}
            <MetricTabSection
              data={currentData}
              previousMonthData={previousData}
              yearAgoData={yearAgoData}
              isLoading={isLoading}
              selectedSite={selectedSite}
              selectedSiteId={selectedSiteId}
            />

            {/* トレンドチャート */}
            <TrendChart
              monthlyData={monthlyData}
              dailyData={dailyData}
              dailyConversionData={dailyConversionData}
              isMonthlyLoading={isMonthlyLoading}
              isDailyLoading={isDailyLoading}
            />

            {/* 改善タスク進捗 */}
            <ImprovementSummary siteId={selectedSiteId} />
          </div>
        </div>
      </main>
    </div>
  );
}
