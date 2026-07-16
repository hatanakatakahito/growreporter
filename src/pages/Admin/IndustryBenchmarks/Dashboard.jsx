import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../../utils/pageTitle';
import {
  useBenchmarkOverview,
  useTriggerBenchmarkAggregator,
  useClearAllAICache,
} from '../../../hooks/useBenchmarkOverview';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Button } from '../../../components/ui/button';
import {
  Database,
  PlayCircle,
  Trash2,
  Key,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * lively-aggregating-bobcat: 業界ベンチマーク管理ダッシュボード（ランディング）
 *
 * `/admin/industry-benchmarks`
 *
 * - tokens 状況・sources 状況・最新ベンチマーク状況を統合表示
 * - 「バッチ手動実行」「AI キャッシュクリア」のクイックアクション
 * - 直近12ヶ月のバッチ実行履歴
 * - サブページ（Tokens / Migrate / Improvement Knowledge）へのリンク
 */
export default function IndustryBenchmarksDashboard() {
  const { data, isLoading, error, refetch, isFetching } = useBenchmarkOverview();
  const { mutateAsync: triggerBatch, isPending: triggerPending } = useTriggerBenchmarkAggregator();
  const { mutateAsync: clearCache, isPending: clearPending } = useClearAllAICache();
  const [batchResult, setBatchResult] = useState(null);

  useEffect(() => {
    setPageTitle('業界ベンチマーク 管理');
  }, []);

  const handleTriggerBatch = async () => {
    if (!window.confirm('benchmarkAggregator を手動実行します。\n5〜30分かかる可能性があります。続行しますか？')) {
      return;
    }
    try {
      const result = await triggerBatch();
      setBatchResult(result.stats || null);
      toast.success('バッチ実行完了');
    } catch (err) {
      toast.error(`バッチ失敗: ${err.message}`);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('aiAnalysisCache を全件削除します。\n（次の AI 生成は新プロンプトで実行されます）')) {
      return;
    }
    try {
      const result = await clearCache();
      toast.success(`キャッシュ削除完了: ${result.totalDeleted || 0}件`);
    } catch (err) {
      toast.error(`削除失敗: ${err.message}`);
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            業界ベンチマーク 管理ダッシュボード
          </h2>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            Grow Group が運用する 4 つの Google アカウント配下のサイト群から、
            業種・サイト役割・ビジネスモデル別のベンチマーク値を毎月自動集計し、
            ユーザー向け AI 提案の補助情報として裏側で活用します。
          </p>
        </div>
        <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          再取得
        </Button>
      </div>

      {/* ローディング・エラー */}
      {isLoading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
      {error && !isLoading && <ErrorAlert message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !error && data && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              icon={<Key size={20} className="text-primary" />}
              title="OAuth アカウント"
              primary={`${data.tokens.active} 件`}
              secondary={`active / 全 ${data.tokens.total}（revoked ${data.tokens.revoked}）`}
              link="/admin/industry-benchmarks/tokens"
              linkLabel="トークン管理 →"
            />
            <SummaryCard
              icon={<Database size={20} className="text-primary" />}
              title="ソースサイト"
              primary={`${data.sources.classified} 件`}
              secondary={`業種判定済 / 全 ${data.sources.total}（opt-out ${data.sources.optedOut}）`}
            />
            <SummaryCard
              icon={<Activity size={20} className="text-primary" />}
              title="最新ベンチマーク"
              primary={data.latestBenchmark
                ? `${data.latestBenchmark.n10IndustriesCount}/17 業種`
                : '未集計'}
              secondary={data.latestBenchmark
                ? `${data.latestBenchmark.period} - N≥10 (N≥30: ${data.latestBenchmark.n30IndustriesCount}業種)`
                : 'バッチ未実行'}
            />
          </div>

          {/* クイックアクション */}
          <div className="mb-6 border border-stroke dark:border-dark-3 rounded-lg p-4 bg-white dark:bg-dark-2">
            <h3 className="font-semibold text-dark dark:text-white mb-3">
              クイックアクション
            </h3>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" onClick={handleTriggerBatch} disabled={triggerPending}>
                {triggerPending ? <RefreshCw size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                バッチ手動実行
              </Button>
              <Button variant="danger-outline" onClick={handleClearCache} disabled={clearPending}>
                {clearPending ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                AI キャッシュ全削除
              </Button>
              <Link
                to="/admin/industry-benchmarks/tokens"
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-stroke dark:border-dark-3 rounded hover:bg-gray-50 dark:hover:bg-dark-3"
              >
                <Key size={14} />
                OAuth トークン管理
              </Link>
            </div>
            <div className="mt-3 text-xs text-body-color dark:text-dark-6 space-y-1">
              <p>・バッチ手動実行: 翌月1日 02:00 JST の自動実行を待たず、すぐに業界ベンチマークを更新します（5〜30分）</p>
              <p>・AI キャッシュ全削除: 改善提案・分析サマリの保存済み AI 出力を全件破棄し、次回アクセス時に最新プロンプトで再生成させます</p>
              <p>・OAuth トークン管理: 集計対象データを取得するための Google アカウントを追加・確認・取消します</p>
            </div>
          </div>

          {/* 直前バッチ実行結果（手動実行後） */}
          {batchResult && (
            <div className="mb-6 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-dark dark:text-white mb-2">
                バッチ実行結果（{batchResult.period}）
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <Stat label="所要時間" value={`${batchResult.durationSeconds}秒`} />
                <Stat label="アクティブトークン" value={batchResult.sourceTokensActive} />
                <Stat label="新規ドメイン" value={batchResult.newDomainsThisMonth} />
                <Stat label="業種判定成功" value={batchResult.classifiedThisRun} />
                <Stat label="メトリクス取得成功" value={batchResult.metricsActive} />
                <Stat label="異常値除外" value={batchResult.metricsExcluded} />
                <Stat label="ベンチマーク書込" value={batchResult.benchmarksWritten} />
                <Stat label="古ドキュメント削除" value={batchResult.benchmarksDeleted} />
              </div>
              {batchResult.errors?.length > 0 && (
                <div className="mt-3 text-xs text-red-700">
                  エラー: {batchResult.errors.join(' / ')}
                </div>
              )}
            </div>
          )}

          {/* 初期セットアップ案内（データが空の時に表示） */}
          {data.tokens.total === 0 && (
            <div className="mb-6 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-dark dark:text-white mb-2">
                初期セットアップが必要です
              </h3>
              <ol className="text-sm text-body-color dark:text-dark-6 list-decimal pl-5 space-y-1">
                <li>
                  <Link to="/admin/industry-benchmarks/tokens" className="text-primary hover:underline">
                    OAuth トークン管理
                  </Link>
                  画面で Grow Group 運用アカウント (webmaster@/ads@/analytics@/analytics-02@grow-group.jp) を追加
                </li>
                <li>初期データの投入は社内エンジニアに依頼（functions/src/scripts/setupBenchmarkAdmin.mjs）</li>
                <li>このページの「バッチ手動実行」ボタンで初回集計</li>
                <li>
                  <Link to="/admin/improvement-knowledge" className="text-primary hover:underline">
                    改善ナレッジ
                  </Link>
                  画面でマトリクス確認
                </li>
              </ol>
            </div>
          )}

          {/* バッチ実行履歴 */}
          <div className="border border-stroke dark:border-dark-3 rounded-lg bg-white dark:bg-dark-2 overflow-hidden">
            <h3 className="font-semibold text-dark dark:text-white px-4 py-3 border-b border-stroke dark:border-dark-3">
              バッチ実行履歴（直近12回）
            </h3>
            {data.batchLogs.length === 0 ? (
              <div className="p-6 text-center text-body-color dark:text-dark-6">
                バッチ実行履歴がまだありません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-dark-3">
                    <tr>
                      <th className="px-3 py-2 text-left text-dark dark:text-white">期間</th>
                      <th className="px-3 py-2 text-right text-dark dark:text-white">所要(秒)</th>
                      <th className="px-3 py-2 text-right text-dark dark:text-white">アクティブ/失敗</th>
                      <th className="px-3 py-2 text-right text-dark dark:text-white">新規</th>
                      <th className="px-3 py-2 text-right text-dark dark:text-white">判定済</th>
                      <th className="px-3 py-2 text-right text-dark dark:text-white">アクティブ/除外</th>
                      <th className="px-3 py-2 text-right text-dark dark:text-white">書込/削除</th>
                      <th className="px-3 py-2 text-center text-dark dark:text-white">エラー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batchLogs.map((log) => (
                      <tr key={log.period} className="border-t border-stroke dark:border-dark-3">
                        <td className="px-3 py-2 font-medium text-dark dark:text-white">{log.period}</td>
                        <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                          {log.durationSeconds}
                        </td>
                        <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                          {log.sourceTokensActive}/{log.sourceTokensFailed}
                        </td>
                        <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                          +{log.newDomainsThisMonth}
                        </td>
                        <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                          {log.classifiedThisRun}（失敗{log.classificationFailures}）
                        </td>
                        <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                          {log.metricsActive}/{log.metricsExcluded}
                        </td>
                        <td className="px-3 py-2 text-right text-body-color dark:text-dark-6">
                          {log.benchmarksWritten}/{log.benchmarksDeleted}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {log.errors?.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-700" title={log.errors.join(', ')}>
                              <AlertCircle size={14} />
                              {log.errors.length}
                            </span>
                          ) : (
                            <CheckCircle2 size={14} className="text-green-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, title, primary, secondary, link, linkLabel }) {
  return (
    <div className="border border-stroke dark:border-dark-3 rounded-lg p-4 bg-white dark:bg-dark-2">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-body-color dark:text-dark-6">{title}</span>
      </div>
      <div className="text-2xl font-bold text-dark dark:text-white mb-1">{primary}</div>
      <div className="text-xs text-body-color dark:text-dark-6 mb-2">{secondary}</div>
      {link && (
        <Link to={link} className="text-xs text-primary hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white dark:bg-dark-2 rounded p-2">
      <div className="text-xs text-body-color dark:text-dark-6">{label}</div>
      <div className="text-base font-semibold text-dark dark:text-white">{value}</div>
    </div>
  );
}
