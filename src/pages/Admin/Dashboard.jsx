import { useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useAdminStats } from '../../hooks/useAdminStats';
import StatsCard from '../../components/Admin/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { Users, Globe, TrendingUp, Sparkles, BarChart3 } from 'lucide-react';

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
        <button
          onClick={refetch}
          className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        >
          <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </button>
      </div>

      {/* 統計カード */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総ユーザー数"
          value={stats.totalUsers}
          icon={Users}
          color="primary"
          trend={stats.newUsersThisMonth > 0 ? 'up' : null}
          trendValue={stats.newUsersThisMonth}
          subtitle={`今月 +${stats.newUsersThisMonth}人`}
        />
        <StatsCard
          title="月間アクティブ"
          value={stats.monthlyActiveUsers}
          icon={TrendingUp}
          color="green"
          subtitle="過去30日間"
        />
        <StatsCard
          title="登録サイト数"
          value={stats.totalSites}
          icon={Globe}
          color="blue"
          subtitle="全サイト"
        />
        <StatsCard
          title="AI分析使用"
          value={stats.aiUsage?.analysisCount || 0}
          icon={Sparkles}
          color="purple"
          subtitle="今月の使用回数"
        />
      </div>

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
                <span className="text-sm font-medium text-body-color dark:text-dark-6">
                  無料プラン
                </span>
                <span className="text-sm font-bold text-dark dark:text-white">
                  {stats.planDistribution?.free || 0}人
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ 
                    width: `${((stats.planDistribution?.free || 0) / stats.totalUsers * 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Standard */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">
                  スタンダード
                </span>
                <span className="text-sm font-bold text-dark dark:text-white">
                  {stats.planDistribution?.standard || 0}人
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-red-400 to-pink-600"
                  style={{ 
                    width: `${((stats.planDistribution?.standard || 0) / stats.totalUsers * 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Premium */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-body-color dark:text-dark-6">
                  プレミアム
                </span>
                <span className="text-sm font-bold text-dark dark:text-white">
                  {stats.planDistribution?.premium || 0}人
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                  style={{ 
                    width: `${((stats.planDistribution?.premium || 0) / stats.totalUsers * 100)}%` 
                  }}
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

