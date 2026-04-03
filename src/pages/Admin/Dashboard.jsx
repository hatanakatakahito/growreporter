import { useEffect, useState } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useAdminStats } from '../../hooks/useAdminStats';
import StatsCard from '../../components/Admin/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { BarChart3, Sparkles, Zap } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import toast from 'react-hot-toast';

/**
 * アドミンダッシュボード
 * システム全体の統計を表示
 */
export default function AdminDashboard() {
  const { stats, loading, error, refetch } = useAdminStats();
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  useEffect(() => {
    setPageTitle('管理ダッシュボード');
  }, []);

  const handleBatchGenerateAI = async () => {
    if (batchRunning) return;
    if (!window.confirm('全サイトのAI分析を一括生成します。\nGA4データの取得とAI分析の生成を行います。\nサイト数によっては数分かかります。\n\n実行しますか？')) return;

    setBatchRunning(true);
    setBatchResult(null);
    const toastId = toast.loading('全サイトのAI分析を一括生成中...');
    try {
      const batchFn = httpsCallable(functions, 'batchGenerateAISummaries');
      const result = await batchFn({ pageTypes: ['summary'], skipCached: false });
      setBatchResult(result.data);
      toast.success(`一括生成完了: ${result.data.summary.generated}件生成, ${result.data.summary.cached}件キャッシュ済み, ${result.data.summary.errors}件エラー`, { id: toastId, duration: 8000 });
    } catch (err) {
      console.error('[AdminDashboard] batchGenerateAI error:', err);
      toast.error(err?.message || '一括生成に失敗しました', { id: toastId });
    } finally {
      setBatchRunning(false);
    }
  };

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
          className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
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
                <span className="text-sm font-medium text-body-color dark:text-dark-6">Free</span>
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
                <span className="text-sm font-medium text-body-color dark:text-dark-6">Business</span>
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

      {/* AI一括生成 */}
      <div className="mb-6 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              AI分析一括生成
            </h3>
            <p className="mt-1 text-sm text-body-color dark:text-dark-6">
              全サイトのGA4データを取得し、サマリーページのAI分析を一括生成します
            </p>
          </div>
          <button
            onClick={handleBatchGenerateAI}
            disabled={batchRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-medium text-white transition hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 ${batchRunning ? 'animate-pulse' : ''}`} />
            {batchRunning ? '生成中...' : '一括生成'}
          </button>
        </div>

        {batchResult && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
            <div className="mb-2 grid grid-cols-4 gap-3 text-center text-sm">
              <div>
                <div className="text-lg font-bold text-dark dark:text-white">{batchResult.summary.total}</div>
                <div className="text-xs text-body-color">合計</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{batchResult.summary.generated}</div>
                <div className="text-xs text-body-color">生成成功</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{batchResult.summary.cached}</div>
                <div className="text-xs text-body-color">キャッシュ済み</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{batchResult.summary.errors}</div>
                <div className="text-xs text-body-color">エラー</div>
              </div>
            </div>
            {batchResult.results?.filter(r => r.status === 'error' || r.status === 'ai_error' || r.status === 'no_data').length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-red-600">エラー詳細:</p>
                {batchResult.results.filter(r => r.status === 'error' || r.status === 'ai_error' || r.status === 'no_data').map((r, i) => (
                  <p key={i} className="text-xs text-red-500">
                    {r.siteName}: {r.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
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

