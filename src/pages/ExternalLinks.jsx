import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import { useSite } from '../contexts/SiteContext';
import { useGA4Data } from '../hooks/useGA4Data';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import DataTable from '../components/Analysis/DataTable';
import AISummarySheet from '../components/Analysis/AISummarySheet';
import { Sparkles, ExternalLink as ExternalLinkIcon } from 'lucide-react';

/**
 * 外部リンククリック分析画面
 * clickイベントを追跡
 */
export default function ExternalLinks() {
  const { selectedSiteId, dateRange, updateDateRange } = useSite();
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

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
    null
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
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              エンゲージメント - 外部リンククリック
            </h2>
            <p className="text-body-color">
              clickイベントを追跡して外部リンクのクリック数を確認できます
            </p>
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
              columns={[
                {
                  key: 'linkUrl',
                  label: 'URL',
                  sortable: true,
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
                },
                {
                  key: 'users',
                  label: 'ユーザー数',
                  format: 'number',
                  align: 'right',
                },
              ]}
              data={tableData}
              pageSize={25}
              showPagination={true}
              emptyMessage="表示するデータがありません。"
            />
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {!isError && (
          <button
            onClick={() => setIsAISheetOpen(true)}
            disabled={isLoading}
            className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="AI分析を見る"
          >
            <div className="flex flex-col items-center">
              <Sparkles className="h-6 w-6" />
              <span className="mt-0.5 text-[10px] font-medium">AI分析</span>
            </div>
          </button>
        )}

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="externalLinks"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            totalClicks,
            totalUsers,
            clickData: tableData,
          }}
        />
      </main>
    </>
  );
}

