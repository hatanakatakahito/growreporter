import { useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useAdminStats } from '../../hooks/useAdminStats';
import StatsCard from '../../components/Admin/StatsCard';
import RevenueSummarySection from '../../components/Admin/RevenueSummarySection';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { BarChart3, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * アドミンダッシュボード
 * システム全体の統計を表示
 */
export default function AdminDashboard() {
  const { stats, loading, error, refetch } = useAdminStats();

  useEffect(() => {
    setPageTitle('管理ダッシュボード');
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <ErrorAlert message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            システムダッシュボード
          </h2>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            全体の統計と使用状況
          </p>
        </div>
        <Button variant="secondary" className="min-w-[180px]" onClick={refetch}>
          <svg data-slot="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </Button>
      </div>

      {/* 統計カード */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総ユーザー数"
          value={stats.totalUsers}
          color="primary"
          trend={stats.newUsersThisMonth > 0 ? 'up' : null}
          trendValue={stats.newUsersThisMonth}
          subtitle={`今月 +${stats.newUsersThisMonth}人`}
        />
        <StatsCard
          title="月間アクティブ"
          value={stats.monthlyActiveUsers}
          color="green"
          subtitle="過去30日間"
        />
        <StatsCard
          title="登録サイト数"
          value={stats.totalSites}
          color="blue"
          subtitle="全サイト"
        />
        <StatsCard
          title="AI分析使用"
          value={stats.aiUsage?.analysisCount || 0}
          color="purple"
          subtitle="今月の使用回数"
        />
      </div>

      {/* 契約・売上サマリー */}
      <RevenueSummarySection
        revenue={stats.revenue}
        contractTrend={stats.contractTrend}
        fetchedAt={stats.fetchedAt}
      />

      {/* スクレイピング状況カード */}
      {stats.scrapingStatus && (
        <div className="mb-6">
          <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              サイトマップスクレイピング状況
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <div className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">
                  完了
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-300">
                  {stats.scrapingStatus.completed}
                </div>
                <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                  サイト
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="mb-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                  処理中
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                  {stats.scrapingStatus.processing}
                </div>
                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  サイト
                </div>
              </div>
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <div className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">
                  失敗
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-300">
                  {stats.scrapingStatus.failed}
                </div>
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  サイト
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
                <div className="mb-1 text-xs font-medium text-body-color dark:text-dark-6">
                  待機中
                </div>
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {stats.scrapingStatus.pending}
                </div>
                <div className="mt-1 text-xs text-body-color dark:text-dark-6">
                  サイト
                </div>
              </div>
            </div>
            {stats.scrapingStatus.total > 0 && (
              <div className="mt-4 text-xs text-body-color dark:text-dark-6">
                合計: {stats.scrapingStatus.total}サイト
              </div>
            )}
          </div>
        </div>
      )}

      {/* プラン別ユーザー分布 */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            プラン別ユーザー分布
          </h3>
          <div className="space-y-4">
            {/* Free */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">無料</span>
                <span className="text-sm font-bold text-dark dark:text-white">
                  {stats.planDistribution?.free || 0}人
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${((stats.planDistribution?.free || 0) / Math.max(stats.totalUsers, 1) * 100)}%` }}
                />
              </div>
            </div>

            {/* Business */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">ビジネス</span>
                <span className="text-sm font-bold text-dark dark:text-white">
                  {stats.planDistribution?.business || 0}人
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-400 to-pink-600"
                  style={{ width: `${((stats.planDistribution?.business || 0) / Math.max(stats.totalUsers, 1) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI使用状況 */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            AI機能使用状況（今月）
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">分析サマリー</p>
                  <p className="text-xs text-body-color dark:text-dark-6">AI分析回数</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-dark dark:text-white">
                {stats.aiUsage?.analysisCount || 0}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">改善提案</p>
                  <p className="text-xs text-body-color dark:text-dark-6">AI改善案生成回数</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-dark dark:text-white">
                {stats.aiUsage?.improvementCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ユーザー数推移 */}
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
          ユーザー数推移（過去6ヶ月）
        </h3>
        <div className="flex items-end justify-between gap-2" style={{ height: '200px' }}>
          {stats.userTrend?.map((item, index) => {
            const maxCount = Math.max(...stats.userTrend.map(d => d.count));
            const height = (item.count / maxCount * 100) || 0;
            
            return (
              <div key={index} className="flex flex-1 flex-col items-center">
                <div className="relative w-full">
                  <div 
                    className="w-full rounded-t-lg bg-primary transition-all hover:bg-primary/80"
                    style={{ height: `${height * 1.6}px`, minHeight: '4px' }}
                  />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-dark dark:text-white">
                    {item.count}
                  </span>
                </div>
                <span className="mt-2 text-xs text-body-color dark:text-dark-6">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

