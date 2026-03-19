import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useGA4Data } from '../../hooks/useGA4Data';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 外部リンククリック分析画面
 * clickイベントを追跡
 */
export default function ExternalLinks() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  // AI分析タブへスクロールする関数
  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('外部リンククリック');
  }, []);

  // GA4データ取得（外部リンククリック別）
  const {
    data: clickData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['eventCount', 'activeUsers'],
    ['eventName', 'linkUrl'],
    ga4DimensionFilter
  );

  // テーブル用のデータ整形（イベント数降順）
  // clickイベントのみフィルタリング
  const tableData =
    clickData?.rows
      ?.filter((row) => row.eventName === 'click')
      ?.map((row) => ({
        linkUrl: row.linkUrl || '(不明)',
        clicks: row.eventCount || 0,
        users: row.activeUsers || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks) || [];

  // 合計値の計算
  const totalClicks = tableData.reduce((sum, row) => sum + row.clicks, 0);
  const totalUsers = tableData.reduce((sum, row) => sum + row.users, 0);

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={false}
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark dark:text-white">
                エンゲージメント - 外部リンククリック
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                clickイベントを追跡して外部リンクのクリック数を確認できます
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
              <DimensionFilters
                siteId={selectedSiteId}
                startDate={dateRange.from}
                endDate={dateRange.to}
                filters={dimensionFilters}
                onFiltersChange={setDimensionFilters}
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert
              message={error?.message || 'データの読み込みに失敗しました。'}
            />
          ) : !tableData || tableData.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">
                表示するデータがありません。
                <br />
                clickイベントが設定されていない可能性があります。
              </p>
            </div>
          ) : (
            <DataTable
              tableKey="analysis-external-links"
              columns={[
                {
                  key: 'linkUrl',
                  label: 'URL',
                  sortable: true,
                  required: true,
                  tooltip: 'externalLinkUrl',
                  render: (value) =>
                    value && value !== '(不明)' ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <span className="truncate max-w-md">{value}</span>
                        <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      '(不明)'
                    ),
                },
                {
                  key: 'clicks',
                  label: 'クリック数',
                  format: 'number',
                  align: 'right',
                  tooltip: 'clicks',
                },
                {
                  key: 'users',
                  label: 'ユーザー数',
                  format: 'number',
                  align: 'right',
                  tooltip: 'users',
                },
              ]}
              data={tableData}
              pageSize={25}
              showPagination={true}
              emptyMessage="表示するデータがありません。"
            />
          )}

          {/* メモ & AI分析タブ */}
          {currentUser && selectedSiteId && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="external-links"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="external-links"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  !isLoading && clickData ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.EXTERNAL_LINKS}
                      rawData={clickData}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      データを読み込み中...
                    </div>
                  )
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && !isLoading && clickData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.EXTERNAL_LINKS}
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
