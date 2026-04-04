/**
 * 案A: テーブル型 — 「改善する」ページと同じテーブル形式。行クリックで下に詳細展開。
 */
import React, { useState, useEffect } from 'react';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  CheckCircle2, Clock, AlertCircle, Minus, Sparkles, Lightbulb,
  TrendingUp, ArrowUpRight, ArrowDownRight, Filter, ChevronDown, ChevronUp,
  RefreshCw, Loader2, Eye, Trash2,
} from 'lucide-react';
import { setPageTitle } from '../../utils/pageTitle';
import {
  useReportsData, useItemActions,
  categoryLabels, categoryColors, achievementLabels,
  getScoreLabel, getPrimaryMetrics, formatPeriod, formatDate,
} from './useReportsData';
import EvaluationDialog from '../../components/Reports/EvaluationDialog';

const emStatusIcon = { pending: Clock, measuring: Loader2, completed: CheckCircle2, error: AlertCircle };
const emStatusLabel = { pending: '計測待ち', measuring: '計測中', completed: '計測完了', error: 'エラー' };
const emStatusColor = { pending: 'text-amber-600', measuring: 'text-primary', completed: 'text-green-700', error: 'text-red-500' };

export default function ReportsA() {
  const {
    selectedSite, selectedSiteId, isLoading,
    completedImprovements, filteredItems, summary,
    statusFilter, setStatusFilter, deleteMutation, refresh,
  } = useReportsData();
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [evalItem, setEvalItem] = useState(null);

  useEffect(() => { setPageTitle('評価する（案A）'); }, []);

  const toggle = (id) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleDelete = (id, title) => {
    if (window.confirm(`「${title}」を削除しますか？`)) deleteMutation.mutate(id);
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader dateRange={null} setDateRange={null} showDateRange={false} showSiteInfo={false} showExport={false} />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">評価する <span className="text-sm font-normal text-body-color ml-2">案A: テーブル型</span></h2>
            <p className="text-sm text-body-color">{selectedSite?.siteName} の改善効果を自動計測し、成果を確認・評価</p>
          </div>

          {isLoading ? <LoadingSpinner message="評価データを読み込んでいます..." /> : completedImprovements.length === 0 ? (
            <div className="rounded-xl border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">評価待ちの完了課題はありません</p>
            </div>
          ) : (
            <>
              {/* インラインサマリー */}
              <div className="mb-4 flex items-center gap-6 text-sm">
                <span className="text-body-color">完了タスク <span className="ml-1 font-bold text-dark dark:text-white">{summary.total}</span>件</span>
                <span className="h-4 w-px bg-stroke dark:bg-dark-3" />
                <span className="text-body-color">計測完了 <span className="ml-1 font-bold text-dark dark:text-white">{summary.measured}</span>/{summary.total}件</span>
                <span className="h-4 w-px bg-stroke dark:bg-dark-3" />
                <span className="text-body-color">平均スコア <span className="ml-1 font-bold text-dark dark:text-white">{summary.avgScore != null ? `${summary.avgScore > 0 ? '+' : ''}${summary.avgScore.toFixed(1)}` : '—'}</span></span>
              </div>

              <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} items={completedImprovements} summary={summary} />

              {/* テーブル */}
              <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-3">
                      <th className="w-[7%] px-4 py-3 text-left text-xs font-semibold text-body-color">スコア</th>
                      <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold text-body-color">ステータス</th>
                      <th className="w-[40%] px-4 py-3 text-left text-xs font-semibold text-body-color">タスク名</th>
                      <th className="w-[9%] px-4 py-3 text-left text-xs font-semibold text-body-color">カテゴリ</th>
                      <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold text-body-color">完了日</th>
                      <th className="w-[9%] px-4 py-3 text-left text-xs font-semibold text-body-color">達成度</th>
                      <th className="w-[5%] px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => {
                      const em = item.effectMeasurement;
                      const expanded = expandedIds.has(item.id);
                      const StatusIcon = emStatusIcon[em?.status] || Minus;
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            onClick={() => toggle(item.id)}
                            className={`border-b border-gray-100 dark:border-dark-3 cursor-pointer transition-colors ${expanded ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-3/50'}`}
                          >
                            <td className="px-4 py-4 font-bold text-dark dark:text-white">
                              {em?.status === 'completed' && em.overallScore != null ? `${em.overallScore > 0 ? '+' : ''}${em.overallScore.toFixed(0)}` : '—'}
                            </td>
                            <td className="px-4 py-4">
                              {em?.status && (
                                <span className={`inline-flex items-center gap-1 text-xs ${emStatusColor[em.status] || 'text-body-color'}`}>
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {emStatusLabel[em.status]}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-dark dark:text-white">{item.title}</td>
                            <td className="px-4 py-4">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${categoryColors[item.category] || categoryColors.other}`}>
                                {categoryLabels[item.category] || 'その他'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-body-color">{formatDate(item.completedAt)}</td>
                            <td className="px-4 py-4 text-xs font-semibold text-dark dark:text-white">
                              {em?.aiEvaluation?.achievementLevel ? achievementLabels[em.aiEvaluation.achievementLevel] : '—'}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {expanded ? <ChevronUp className="h-4 w-4 text-body-color" /> : <ChevronDown className="h-4 w-4 text-body-color" />}
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-gray-100 dark:border-dark-3">
                              <td colSpan={7} className="px-6 py-5">
                                <ExpandedDetail item={item} siteId={selectedSiteId} onRefresh={refresh} onEvaluate={() => setEvalItem(item)} onDelete={() => handleDelete(item.id, item.title)} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center text-body-color">該当するタスクがありません</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <EvaluationDialog isOpen={!!evalItem} onClose={() => setEvalItem(null)} item={evalItem} siteId={selectedSiteId} />
    </div>
  );
}

// --- 共通サブコンポーネント（A/C/D/E共通で使う） ---
export function FilterBar({ statusFilter, setStatusFilter, items, summary }) {
  const filters = [
    { key: 'all', label: 'すべて', count: items.length },
    { key: 'completed', label: '計測完了', count: summary.measured },
    { key: 'pending', label: '計測待ち', count: items.filter(i => i.effectMeasurement?.status === 'pending').length },
    { key: 'measuring', label: '計測中', count: items.filter(i => i.effectMeasurement?.status === 'measuring').length },
    { key: 'error', label: 'エラー', count: summary.errors },
    { key: 'no_measurement', label: '計測なし', count: items.filter(i => !i.effectMeasurement).length },
  ].filter(f => f.count > 0 || f.key === 'all');

  return (
    <div className="mb-4 flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-body-color" />
      {filters.map(f => (
        <button key={f.key} onClick={() => setStatusFilter(f.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${statusFilter === f.key ? 'bg-primary text-white' : 'bg-white text-body-color hover:bg-gray-100 dark:bg-dark-2 dark:hover:bg-dark-3'}`}
        >
          {f.label} {f.count > 0 && <span className="ml-0.5 opacity-70">{f.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ExpandedDetail({ item, siteId, onRefresh, onEvaluate, onDelete }) {
  const { isRetrying, isScheduling, handleRetry, handleSchedule } = useItemActions(siteId, onRefresh);
  const em = item.effectMeasurement;
  const emStatus = em?.status;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        {item.description && (
          <div>
            <div className="mb-1 text-xs font-semibold text-body-color">改善内容</div>
            <p className="text-sm text-dark dark:text-white leading-relaxed">{item.description}</p>
          </div>
        )}
        {item.expectedImpact && (
          <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
            <div className="mb-1 text-xs font-semibold text-body-color">期待効果</div>
            <p className="text-sm text-dark dark:text-white">{item.expectedImpact}</p>
          </div>
        )}
        {em?.aiEvaluation && <AiSection ai={em.aiEvaluation} />}
        <ActionButtons item={item} onEvaluate={onEvaluate} onDelete={onDelete} isRetrying={isRetrying} isScheduling={isScheduling}
          onRetry={(action) => handleRetry(item.id, action)} onSchedule={(days) => handleSchedule(item.id, days)} />
      </div>
      <div className="space-y-3">
        {emStatus === 'completed' && em.before && em.after && em.changes && em.overallScore != null ? (
          <MetricsDetail em={em} category={item.category} />
        ) : emStatus === 'pending' || emStatus === 'measuring' ? (
          <PendingDetail em={em} effectiveDate={item.effectiveDate} />
        ) : emStatus === 'error' ? (
          <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-600"><AlertCircle className="h-4 w-4" /> 計測エラー</div>
            {em.error && <p className="mt-1 text-xs text-body-color">{em.error}</p>}
          </div>
        ) : (
          <div className="rounded-lg border border-stroke p-4 dark:border-dark-3"><p className="text-xs text-body-color">効果計測データはまだありません</p></div>
        )}
      </div>
    </div>
  );
}

export function AiSection({ ai }) {
  return (
    <div className="rounded-xl border border-stroke dark:border-dark-3">
      <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5 dark:border-dark-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-dark dark:text-white">AI評価</span>
        </div>
        {ai.achievementLevel && <span className="text-[11px] font-bold text-dark dark:text-white">{achievementLabels[ai.achievementLevel]}</span>}
      </div>
      <div className="space-y-3 p-4">
        {ai.summary && <p className="text-xs leading-relaxed text-dark dark:text-gray-300">{ai.summary}</p>}
        {ai.analysis && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
            <div className="mb-1 text-[10px] font-semibold text-body-color">分析</div>
            <div className="whitespace-pre-line text-[11px] leading-relaxed text-body-color">{ai.analysis}</div>
          </div>
        )}
        {ai.nextActions?.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-body-color"><Lightbulb className="h-3 w-3" /> 次のアクション</div>
            <ul className="space-y-1">
              {ai.nextActions.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-body-color">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-body-color opacity-40" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricsDetail({ em, category }) {
  const { before, after, changes, overallScore } = em;
  const scoreLabel = getScoreLabel(overallScore);
  const metrics = getPrimaryMetrics(category);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-stroke p-4 dark:border-dark-3">
        <div>
          <div className="text-[10px] text-body-color">総合スコア</div>
          <div className={`text-2xl font-bold ${overallScore >= 10 ? 'text-green-700 dark:text-green-400' : overallScore >= -5 ? 'text-dark dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
            {overallScore > 0 ? '+' : ''}{overallScore.toFixed(1)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-dark dark:text-white">{scoreLabel.label}</div>
          <div className="text-[10px] text-body-color">{scoreLabel.description}</div>
        </div>
      </div>
      <MetricsTable before={before} after={after} changes={changes} metrics={metrics} />
      <div className="text-[10px] text-body-color">Before: {formatPeriod(before.period)} | After: {formatPeriod(after.period)}</div>
    </div>
  );
}

export function MetricsTable({ before, after, changes, metrics }) {
  return (
    <div className="rounded-xl border border-stroke dark:border-dark-3">
      <div className="border-b border-stroke px-4 py-2 dark:border-dark-3">
        <span className="text-xs font-semibold text-dark dark:text-white">主要指標の変化</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-dark-3">
        {metrics.map(({ key, label, format: fmt, invertColor }) => {
          const bVal = before[key], aVal = after[key], change = changes[key];
          if (bVal == null && aVal == null) return null;
          return (
            <div key={key} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-body-color">{label}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-body-color">{fmt(bVal)}</span>
                <span className="text-gray-300 dark:text-gray-600">→</span>
                <span className="font-medium text-dark dark:text-white">{fmt(aVal)}</span>
                <ChangeIndicator value={change} invertColor={invertColor} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChangeIndicator({ value, invertColor = false }) {
  if (value == null || isNaN(value)) return null;
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.5;
  const isGood = invertColor ? !isPositive : isPositive;
  if (isNeutral) return <span className="text-[10px] font-medium text-body-color">±0%</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isGood ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

export function PendingDetail({ em, effectiveDate }) {
  const afterEndDate = effectiveDate
    ? new Date(new Date(effectiveDate).getTime() + 14 * 86400000).toLocaleDateString('ja-JP')
    : '—';
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-dark dark:text-white">{em?.before ? 'Before指標を取得済み' : '計測準備中'}</span>
      </div>
      <p className="text-sm text-body-color mb-4">改善後 期間の終了日（{afterEndDate}）以降に自動的に指標を取得し、効果を計測します。</p>
      {em?.before && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'セッション', v: em.before.sessions?.toLocaleString() },
            { l: 'ユーザー', v: em.before.totalUsers?.toLocaleString() },
            { l: 'エンゲージメント', v: em.before.engagementRate != null ? `${(em.before.engagementRate * 100).toFixed(1)}%` : '—' },
          ].map(s => (
            <div key={s.l} className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-dark-3">
              <div className="text-xs text-body-color">{s.l}</div>
              <div className="text-sm font-semibold text-dark dark:text-white">{s.v || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionButtons({ item, onEvaluate, onDelete, isRetrying, isScheduling, onRetry, onSchedule }) {
  const em = item.effectMeasurement;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const btnBase = "inline-flex items-center gap-1 rounded-md border border-stroke px-3 py-1.5 text-xs leading-4 font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3";
  return (
    <div className="flex items-center gap-2">
      <button onClick={onEvaluate} className={`${btnBase} text-dark dark:text-white`}>
        <Eye className="h-3.5 w-3.5 shrink-0" />{item.rating ? '評価を見る' : '評価する'}
      </button>
      {em?.status === 'error' && (
        <button onClick={() => onRetry('retry')} disabled={isRetrying} className={`${btnBase} text-dark dark:text-white`}>
          {isRetrying ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 shrink-0" />} 再計測
        </button>
      )}
      {em?.status === 'completed' && (
        <>
          <button onClick={() => onRetry('remeasure')} disabled={isRetrying} className={`${btnBase} text-body-color !mt-0`}>
            {isRetrying ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 shrink-0" />} 再取得
          </button>
          <div className="relative">
            <button onClick={() => setScheduleOpen(!scheduleOpen)} disabled={isScheduling}
              className={`${btnBase} text-body-color`}>
              {isScheduling ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Clock className="h-3.5 w-3.5 shrink-0" />} 追加計測 <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
            {scheduleOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setScheduleOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-dark-3 dark:bg-dark-2">
                  {[14, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => { onSchedule(d); setScheduleOpen(false); }}
                      className={`flex w-full items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-3 ${em?.scheduledRemeasureDays === d ? 'font-bold text-primary' : 'text-dark dark:text-white'}`}>
                      {d}日後に再計測
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
      <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-md border border-transparent px-3 py-1.5 text-xs leading-4 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
        <Trash2 className="h-3.5 w-3.5" /> 削除
      </button>
    </div>
  );
}
