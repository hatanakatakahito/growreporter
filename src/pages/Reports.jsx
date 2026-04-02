/**
 * 評価する — カードアコーディオン型（C案ベース）
 * サマリーカード + フィルタ + カード一覧（クリックで3カラム展開）
 */
import React, { useState, useEffect } from 'react';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Clock, Sparkles, Lightbulb, ArrowUpRight, ArrowDownRight, Filter,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import toast from 'react-hot-toast';
import { setPageTitle } from '../utils/pageTitle';
import {
  useReportsData, useItemActions, categoryLabels, categoryColors, achievementLabels,
  getPrimaryMetrics, formatPeriod, formatDate,
} from './ReportsMockup/useReportsData';
import { FilterBar, PendingDetail, ActionButtons, ChangeIndicator } from './ReportsMockup/ReportsA';
import EvaluationDialog from '../components/Reports/EvaluationDialog';

export default function Reports() {
  const {
    selectedSite, selectedSiteId, isLoading,
    completedImprovements, filteredItems, summary,
    statusFilter, setStatusFilter, deleteMutation, refresh,
  } = useReportsData();
  const [evalItem, setEvalItem] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const toggle = (id) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  useEffect(() => { setPageTitle('評価する'); }, []);

  const handleDelete = (id, title) => {
    if (window.confirm(`「${title}」を削除しますか？`)) deleteMutation.mutate(id);
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader dateRange={null} setDateRange={null} showDateRange={false} showSiteInfo={false} showExport={false} />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">評価する</h2>
            <p className="text-sm text-body-color">{selectedSite?.siteName} の改善効果を自動計測し、成果を確認・評価</p>
          </div>

          {isLoading ? <LoadingSpinner message="評価データを読み込んでいます..." /> : completedImprovements.length === 0 ? (
            <div className="rounded-xl border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">評価待ちの完了課題はありません</p>
            </div>
          ) : (
            <>
              {/* サマリーカード */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: '完了タスク', value: summary.total, sub: '件' },
                  { label: '計測完了', value: summary.measured, sub: `/ ${summary.total}件` },
                  { label: '平均スコア', value: summary.avgScore != null ? `${summary.avgScore > 0 ? '+' : ''}${summary.avgScore.toFixed(1)}` : '—' },
                  { label: '期待超え', value: summary.exceeded, sub: '件' },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
                    <div className="mb-2 text-xs font-medium text-body-color">{c.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-dark dark:text-white">{c.value}</span>
                      {c.sub && <span className="text-xs text-body-color">{c.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <FilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} items={completedImprovements} summary={summary} />

              {/* カード一覧 */}
              <div className="space-y-4">
                {filteredItems.map(item => (
                  <FullCard key={item.id} item={item} siteId={selectedSiteId} onRefresh={refresh}
                    expanded={expandedIds.has(item.id)} onToggle={() => toggle(item.id)}
                    onEvaluate={() => setEvalItem(item)} onDelete={() => handleDelete(item.id, item.title)} />
                ))}
                {filteredItems.length === 0 && (
                  <div className="rounded-xl border border-stroke bg-white p-8 text-center dark:border-dark-3 dark:bg-dark-2">
                    <p className="text-body-color">該当するタスクがありません</p>
                  </div>
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

function FullCard({ item, siteId, onRefresh, onEvaluate, onDelete, expanded, onToggle }) {
  const em = item.effectMeasurement;
  const { isRetrying, isScheduling, handleRetry, handleSchedule } = useItemActions(siteId, onRefresh);
  const hasMetrics = em?.status === 'completed' && em?.before && em?.after && em?.changes && em?.overallScore != null;
  const isPending = em?.status === 'pending' || em?.status === 'measuring';
  const metrics = hasMetrics ? getPrimaryMetrics(item.category) : [];

  return (
    <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2 overflow-hidden">
      {/* ヘッダー（クリックで展開） */}
      <div onClick={onToggle} className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${expanded ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-3/50'}`}>
        <div className="text-2xl font-bold text-dark dark:text-white w-14 shrink-0 text-right">
          {hasMetrics ? `${em.overallScore > 0 ? '+' : ''}${em.overallScore.toFixed(0)}` : '—'}
        </div>
        <div className="h-8 w-px bg-stroke dark:bg-dark-3" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-dark dark:text-white truncate">{item.title}</span>
            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${categoryColors[item.category] || categoryColors.other}`}>
              {categoryLabels[item.category] || 'その他'}
            </span>
          </div>
          <div className="text-sm text-body-color">
            {formatDate(item.completedAt)}完了
            {em?.aiEvaluation?.achievementLevel && ` | 達成度: ${achievementLabels[em.aiEvaluation.achievementLevel]}`}
            {isPending && ' | 計測待ち'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <ActionButtons item={item} onEvaluate={onEvaluate} onDelete={onDelete}
            isRetrying={isRetrying} isScheduling={isScheduling}
            onRetry={(action) => handleRetry(item.id, action)} onSchedule={(days) => handleSchedule(item.id, days)} />
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-body-color shrink-0" /> : <ChevronDown className="h-4 w-4 text-body-color shrink-0" />}
      </div>

      {/* 展開コンテンツ */}
      {expanded && (
        <>
          {hasMetrics ? (
            <>
            <div className="border-t border-stroke dark:border-dark-3 grid grid-cols-3 divide-x divide-gray-100 dark:divide-dark-3">
              {/* 左: タスク情報 */}
              <div className="p-5 space-y-3">
                {item.description && (
                  <div>
                    <div className="mb-1.5 text-sm font-semibold text-dark dark:text-white">改善内容</div>
                    <p className="text-sm text-dark dark:text-white leading-relaxed">{item.description}</p>
                  </div>
                )}
                {item.expectedImpact && (
                  <div>
                    <div className="mb-1.5 text-sm font-semibold text-dark dark:text-white">期待効果</div>
                    <p className="text-sm text-dark dark:text-white">{item.expectedImpact}</p>
                  </div>
                )}
              </div>

              {/* 中: AI評価 */}
              <div className="p-5 space-y-3">
                {em.aiEvaluation ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-dark dark:text-white">AI評価</span>
                    </div>
                    {em.aiEvaluation.summary && <p className="text-sm leading-relaxed text-dark dark:text-gray-300">{em.aiEvaluation.summary}</p>}
                    {em.aiEvaluation.analysis && (
                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
                        <div className="whitespace-pre-line text-sm leading-relaxed text-body-color">{em.aiEvaluation.analysis}</div>
                      </div>
                    )}
                    {em.aiEvaluation.nextActions?.length > 0 && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-dark dark:text-white"><Lightbulb className="h-3.5 w-3.5" /> 次のアクション</div>
                        <ul className="space-y-1">
                          {em.aiEvaluation.nextActions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-body-color">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-body-color opacity-40" />{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-body-color">AI評価なし</p>
                )}
              </div>

              {/* 右: 指標 */}
              <div className="p-5">
                <div className="mb-2 text-sm font-semibold text-dark dark:text-white">主要指標の変化</div>
                <div className="divide-y divide-gray-100 dark:divide-dark-3 -mx-1">
                  {metrics.map(({ key, label, format: fmt, invertColor }) => {
                    const bVal = em.before[key], aVal = em.after[key], change = em.changes[key];
                    if (bVal == null && aVal == null) return null;
                    return (
                      <div key={key} className="flex items-center justify-between px-1 py-2.5">
                        <span className="text-sm font-medium text-dark dark:text-white">{label}</span>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-dark dark:text-gray-300">{fmt(bVal)}</span>
                          <span className="text-body-color">→</span>
                          <span className="font-bold text-dark dark:text-white">{fmt(aVal)}</span>
                          <ChangeIndicator value={change} invertColor={invertColor} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-body-color">改善前 期間: {formatPeriod(em.before.period)} | 改善後 期間: {formatPeriod(em.after.period)}</div>
              </div>
            </div>
            {/* 次ステップ提案ボタン */}
            <NextStepButton item={item} siteId={siteId} onRefresh={onRefresh} />
            </>
          ) : isPending ? (
            <>
              <div className="border-t border-stroke dark:border-dark-3 p-5">
                <PendingDetail em={em} effectiveDate={item.effectiveDate} />
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function NextStepButton({ item, siteId, onRefresh }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const em = item.effectMeasurement;

  if (!em?.aiEvaluation || generated) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generateFn = httpsCallable(functions, 'generateImprovements');
      const result = await generateFn({
        siteId,
        improvementFocus: 'auto',
        userNote: `前回完了した改善: 「${item.title}」（カテゴリ: ${item.category || 'other'}、期待効果: ${item.expectedImpact || '不明'}、達成度: ${em.aiEvaluation.achievementLevel || '不明'}）。効果計測結果を踏まえた次ステップとして最適な提案を1-2件生成してください。`,
        triggeredBy: 'completion',
        autoGenerated: true,
      });
      const count = result.data?.count || 0;
      if (count > 0) {
        toast.success(`次ステップの改善提案を${count}件生成しました`);
        setGenerated(true);
        onRefresh?.();
      } else {
        toast('新しい提案はありませんでした');
      }
    } catch {
      toast.error('提案の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="border-t border-stroke dark:border-dark-3 px-5 py-3 flex items-center gap-3">
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm text-body-color">この結果をもとに次の改善提案を生成できます</span>
      <button onClick={handleGenerate} disabled={isGenerating}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3">
        {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        次ステップ提案を生成
      </button>
    </div>
  );
}
