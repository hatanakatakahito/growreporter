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
          <div className="relative overflow-hidden border-b border-slate-200/40">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.7), rgba(237, 233, 254, 0.5), rgba(254, 249, 195, 0.4))' }} />
            <div className="absolute inset-0 backdrop-blur-sm" />
            <div className="relative mx-auto px-8 py-8" style={{ maxWidth: 1400 }}>
              <div className="flex items-center justify-between gap-10">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2.5">
                    <Globe className="h-5 w-5 shrink-0 text-primary" />
                    <h1 className="truncate text-2xl font-bold text-gray-900">
                      {selectedSite.siteName || 'サイト名'}
                    </h1>
                  </div>
                  <p className="mb-4 pl-[30px] text-xs text-gray-500">{selectedSite.siteUrl || ''}</p>
                  <div className="mb-1.5 pl-[30px]">
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedSite.metaTitle || 'メタタイトルが設定されていません'}
                    </p>
                  </div>
                  <div className="pl-[30px]">
                    <p className="max-w-2xl text-[13px] leading-relaxed text-gray-500">
                      {selectedSite.metaDescription || 'メタディスクリプションが設定されていません'}
                    </p>
                  </div>
                </div>
                {/* スクリーンショット重ね配置 */}
                <div className="relative shrink-0" style={{ width: 320, height: 190 }}>
                  {/* PC */}
                  {selectedSite.pcScreenshotUrl ? (
                    <div
                      className="absolute left-0 top-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/90 bg-white/50 shadow-xl shadow-slate-200/50 backdrop-blur-sm"
                      style={{ width: 280, height: 170 }}
                    >
                      <img src={selectedSite.pcScreenshotUrl} alt="PCキャプチャ" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="absolute left-0 top-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/90 bg-white/50 shadow-xl shadow-slate-200/50 backdrop-blur-sm"
                      style={{ width: 280, height: 170 }}
                    >
                      <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        <span className="mt-1 block text-[11px] text-slate-400">PC</span>
                      </div>
                    </div>
                  )}
                  {/* SP（右下に重ねる） */}
                  {selectedSite.mobileScreenshotUrl ? (
                    <div
                      className="absolute bottom-0 right-0 z-[2] flex items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white/70 shadow-2xl backdrop-blur-sm"
                      style={{ width: 70, height: 130 }}
                    >
                      <img src={selectedSite.mobileScreenshotUrl} alt="スマホキャプチャ" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="absolute bottom-0 right-0 z-[2] flex items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white/70 shadow-2xl backdrop-blur-sm"
                      style={{ width: 70, height: 130 }}
                    >
                      <div className="text-center">
                        <svg className="mx-auto h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        <span className="mt-0.5 block text-[8px] text-slate-400">SP</span>
                      </div>
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
