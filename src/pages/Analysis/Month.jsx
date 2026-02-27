import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGA4MonthlyData } from '../../hooks/useGA4MonthlyData';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { format, sub, startOfMonth } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

/**
 * 月別分析画面
 * 13ヶ月の月別推移を表形式/グラフ形式で表示
 */
export default function Month() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('table');
  const [hiddenLines, setHiddenLines] = useState({});
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
    setPageTitle('月別分析');
  }, []);

  // 13ヶ月分の月次データを取得
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

  const {
    data: monthlyDataResponse,
    isLoading,
  } = useGA4MonthlyData(selectedSiteId, monthlyStartDate, monthlyEndDate);

  const monthlyData = monthlyDataResponse?.monthlyData || [];

  // グラフ用のツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">{label}</p>
          {payload
            .filter((entry) => !hiddenLines[entry.dataKey])
            .map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value?.toLocaleString()}
              </p>
            ))}
        </div>
      );
    }
    return null;
  };

  // グラフ用の凡例
  const CustomLegend = ({ payload }) => {
    return (
      <div className="mt-4 flex flex-wrap justify-center gap-6">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
            onClick={() => setHiddenLines((prev) => ({ ...prev, [entry.dataKey]: !prev[entry.dataKey] }))}
          >
            <div
              className="h-0.5 w-8"
              style={{
                backgroundColor: hiddenLines[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenLines[entry.dataKey] ? 0.3 : 1,
              }}
            />
            <span
              className="text-sm"
              style={{
                color: hiddenLines[entry.dataKey] ? '#ccc' : entry.color,
                textDecoration: hiddenLines[entry.dataKey] ? 'line-through' : 'none',
              }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading && !monthlyData.length) {
    return (
      <div className="flex h-full flex-col">
        <AnalysisHeader showDateRange={false} showSiteInfo={false} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="月次データを読み込んでいます..." />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader showDateRange={false} showSiteInfo={false} />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
          {/* ページタイトル */}
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">分析する - 月別</h2>
            <p className="text-sm text-body-color">
              月別のトレンドを把握し、中長期的な傾向を分析します
            </p>
          </div>

          {monthlyData.length === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">データがありません。GA4連携を確認してください。</p>
            </div>
          ) : (
            <>
              {/* タブ（表形式/グラフ形式） */}
              <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'table'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  表形式
                </button>
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'chart'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  グラフ形式
                </button>
              </div>

              {/* 表形式 */}
              {activeTab === 'table' ? (
                <DataTable
                  columns={[
                    { key: 'label', label: '年月', sortable: true },
                    { key: 'users', label: 'ユーザー数', format: 'number', align: 'right', tooltip: 'users' },
                    { key: 'sessions', label: '訪問者', format: 'number', align: 'right', tooltip: 'sessions' },
                    { key: 'avgPageviews', label: '平均PV', format: 'decimal', align: 'right', tooltip: 'avgPageviews' },
                    { key: 'pageViews', label: '表示回数', format: 'number', align: 'right', tooltip: 'pageViews' },
                    { key: 'engagementRate', label: 'ENG率', format: 'percent', align: 'right', tooltip: 'engagementRate' },
                    { key: 'conversions', label: 'CV数', format: 'number', align: 'right', tooltip: 'conversions' },
                    { key: 'conversionRate', label: 'CVR', format: 'percent', align: 'right', tooltip: 'conversionRate' },
                  ]}
                  data={monthlyData}
                  pageSize={13}
                  showPagination={false}
                  emptyMessage="データがありません。GA4連携を確認してください。"
                />
              ) : (
                /* グラフ形式 */
                <ChartContainer title="月別推移グラフ" height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                      <Line type="monotone" dataKey="users" name="ユーザー数" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} hide={hiddenLines.users} />
                      <Line type="monotone" dataKey="sessions" name="訪問者" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} hide={hiddenLines.sessions} />
                      <Line type="monotone" dataKey="pageViews" name="PV数" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} hide={hiddenLines.pageViews} />
                      <Line type="monotone" dataKey="conversions" name="CV数" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} hide={hiddenLines.conversions} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </>
          )}

          {/* メモ & AI分析タブ */}
          {selectedSiteId && currentUser && monthlyData.length > 0 && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="analysis/month"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="analysis/month"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.MONTHLY}
                    rawData={{
                      monthlyTrend: monthlyData,
                    }}
                    period={{
                      startDate: monthlyStartDate,
                      endDate: monthlyEndDate,
                    }}
                    onLimitExceeded={() => setIsLimitModalOpen(true)}
                  />
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && monthlyData.length > 0 && (
          <AIFloatingButton
            pageType={PAGE_TYPES.MONTHLY}
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
