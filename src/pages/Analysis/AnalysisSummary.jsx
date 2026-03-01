import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useSiteMetrics } from '../../hooks/useSiteMetrics';
import { useGA4MonthlyData } from '../../hooks/useGA4MonthlyData';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import MetricTabSection from '../../components/Analysis/MetricTabSection';
import { format, sub, startOfMonth } from 'date-fns';
import { Info } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 分析画面 - 全体サマリー
 * 主要指標サマリ / コンバージョン内訳 / KPI予実の3タブ構成
 */
export default function AnalysisSummary() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser, userProfile } = useAuth();

  const memberRole = userProfile?.memberRole || 'owner';
  const isViewer = memberRole === 'viewer';
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    setPageTitle('全体サマリー');
  }, []);

  // Search Console連携の有無
  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // 現在の期間のデータ取得
  const { data, isLoading, isError } = useSiteMetrics(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    hasGSCConnection
  );

  // 前月の日付範囲計算（コンバージョン内訳/KPI予実用）
  const previousMonthRange = useMemo(() => {
    const from = dateRange.from ? new Date(dateRange.from) : new Date();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();
    const diff = to - from;
    const prevTo = new Date(from.getTime() - 86400000); // 1日前
    const prevFrom = new Date(prevTo.getTime() - diff);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [dateRange]);

  // 前年同月の日付範囲計算
  const yearAgoRange = useMemo(() => {
    const from = dateRange.from ? sub(new Date(dateRange.from), { years: 1 }) : sub(new Date(), { years: 1 });
    const to = dateRange.to ? sub(new Date(dateRange.to), { years: 1 }) : sub(new Date(), { years: 1 });
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
  }, [dateRange]);

  const { data: previousMonthData } = useSiteMetrics(
    selectedSiteId, previousMonthRange.from, previousMonthRange.to, hasGSCConnection
  );
  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId, yearAgoRange.from, yearAgoRange.to, hasGSCConnection
  );

  // 13ヶ月分の月次データ（AI分析用に残す）
  const monthlyStartDate = useMemo(() => {
    if (!dateRange.to) return format(startOfMonth(sub(new Date(), { months: 12 })), 'yyyy-MM-dd');
    const endDate = new Date(dateRange.to);
    const endMonth = startOfMonth(endDate);
    return format(startOfMonth(sub(endMonth, { months: 12 })), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const monthlyEndDate = useMemo(() => {
    if (!dateRange.to) return format(new Date(), 'yyyy-MM-dd');
    return format(new Date(dateRange.to), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const { data: monthlyDataResponse } = useGA4MonthlyData(selectedSiteId, monthlyStartDate, monthlyEndDate);
  const monthlyData = monthlyDataResponse?.monthlyData || [];

  // ローディング中
  if (isLoading && !data) {
    return (
      <div className="flex h-full flex-col">
        <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="データを読み込んでいます..." />
          </div>
        </main>
      </div>
    );
  }

  // AI分析用のデータ構築
  const buildAIRawData = () => {
    if (!data) return null;

    const totalConversions = data.conversions
      ? Object.values(data.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const previousMonthTotalConversions = previousMonthData?.conversions
      ? Object.values(previousMonthData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const yearAgoTotalConversions = yearAgoData?.conversions
      ? Object.values(yearAgoData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const conversionBreakdown = {};
    if (selectedSite?.conversionEvents && data?.conversions) {
      selectedSite.conversionEvents.forEach(event => {
        const currentCount = data.conversions[event.eventName] || 0;
        const previousCount = previousMonthData?.conversions?.[event.eventName] || 0;
        const yearAgoCount = yearAgoData?.conversions?.[event.eventName] || 0;
        conversionBreakdown[event.displayName] = {
          current: currentCount,
          previous: previousCount,
          yearAgo: yearAgoCount,
          monthChange: previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : (currentCount > 0 ? 100 : 0),
          yearChange: yearAgoCount > 0 ? ((currentCount - yearAgoCount) / yearAgoCount) * 100 : (currentCount > 0 ? 100 : 0),
        };
      });
    }

    const kpiData = [];
    if (selectedSite?.kpiSettings?.kpiList && data?.metrics) {
      selectedSite.kpiSettings.kpiList.forEach(kpi => {
        let actualValue = 0;
        switch (kpi.metric) {
          case 'target_sessions': actualValue = data.metrics.sessions || 0; break;
          case 'target_users': actualValue = data.metrics.users || 0; break;
          case 'target_conversions': actualValue = data.metrics.conversions || 0; break;
          case 'target_conversion_rate':
            actualValue = data.metrics.sessions > 0
              ? ((data.metrics.conversions || 0) / data.metrics.sessions) * 100
              : 0;
            break;
          default:
            if (kpi.metric?.startsWith('conversion_') && kpi.eventName) {
              actualValue = data.conversions?.[kpi.eventName] || 0;
            }
        }
        const achievement = kpi.target > 0 ? (actualValue / kpi.target) * 100 : 0;
        const isRateMetric = kpi.metric?.includes('rate');
        kpiData.push({
          name: kpi.label,
          actual: actualValue,
          target: kpi.target,
          achievement,
          unit: isRateMetric ? '%' : '',
        });
      });
    }

    return {
      current: {
        metrics: data.metrics,
        conversions: data.conversions,
        totalConversions,
        conversionBreakdown,
      },
      previousMonth: previousMonthData ? {
        metrics: previousMonthData.metrics,
        conversions: previousMonthData.conversions,
        totalConversions: previousMonthTotalConversions,
      } : null,
      yearAgo: yearAgoData ? {
        metrics: yearAgoData.metrics,
        conversions: yearAgoData.conversions,
        totalConversions: yearAgoTotalConversions,
      } : null,
      monthlyTrend: monthlyData || [],
      kpiData,
      hasKpiSettings: kpiData.length > 0,
      hasConversionEvents: selectedSite?.conversionEvents?.length > 0,
      conversionEventNames: selectedSite?.conversionEvents?.map(e => e.eventName) || [],
    };
  };

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
          {/* ページタイトル */}
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">分析する - 全体サマリー</h2>
            <p className="text-sm text-body-color">
              GA4データの全般指標を詳細に分析します
            </p>
          </div>

          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-red-800 dark:text-red-300">
                    データの取得に失敗しました。
                    <Link to={`/sites/${selectedSiteId}/edit?step=2`} className="ml-2 font-semibold underline">
                      GA4/GSC設定を確認 →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <MetricTabSection
                data={data}
                previousMonthData={previousMonthData}
                yearAgoData={yearAgoData}
                isLoading={isLoading}
                selectedSite={selectedSite}
                selectedSiteId={selectedSiteId}
              />
            </div>
          )}

          {/* メモ & AI分析タブ */}
          {selectedSiteId && currentUser && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="analysis/summary"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="analysis/summary"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  (() => {
                    const rawData = buildAIRawData();
                    return rawData ? (
                      <AIAnalysisSection
                        pageType={PAGE_TYPES.SUMMARY}
                        rawData={rawData}
                        period={{
                          startDate: dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                          endDate: dateRange?.to || new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                        }}
                        onLimitExceeded={() => setIsLimitModalOpen(true)}
                      />
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        データを読み込み中...
                      </div>
                    );
                  })()
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && data && !isViewer && (
          <AIFloatingButton
            pageType={PAGE_TYPES.SUMMARY}
            onScrollToAI={scrollToAIAnalysis}
          />
        )}

        {/* 制限超過モーダル */}
        {isLimitModalOpen && (
          <PlanLimitModal
            onClose={() => setIsLimitModalOpen(false)}
            type="summary"
          />
        )}

      </main>
    </div>
  );
}
