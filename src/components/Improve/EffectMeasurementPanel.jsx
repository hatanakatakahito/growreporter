import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle2, RefreshCw, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Loader2, Sparkles, Target, Lightbulb } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import toast from 'react-hot-toast';

/**
 * 改善効果計測パネル
 * ドロワー左カラムに表示し、Before/After比較・スコア・ステータスを表示
 */
export default function EffectMeasurementPanel({ item, siteId, onRefresh }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const em = item?.effectMeasurement;

  if (!em || item.status !== 'completed') return null;

  const handleRetry = async (action) => {
    setIsRetrying(true);
    try {
      const retryFn = httpsCallable(functions, 'retryEffectMeasurement');
      await retryFn({ siteId, improvementId: item.id, action });
      toast.success(action === 'retry' ? '再計測をスケジュールしました' : '再計測を開始しました');
      onRefresh?.();
    } catch (err) {
      console.error('[EffectMeasurement] retry error:', err);
      toast.error('操作に失敗しました');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-white">
        <BarChart3 className="h-4 w-4 text-primary" />
        効果計測
      </h3>

      {/* ステータス表示 */}
      <StatusBadge status={em.status} error={em.error} />

      {/* 完了: Before/After比較表示 */}
      {em.status === 'completed' && em.before && em.after && em.changes && em.overallScore != null && (
        <CompletedView em={em} category={item.category} />
      )}

      {/* Pending/Measuring: 待機中 */}
      {(em.status === 'pending' || em.status === 'measuring') && em.before && (
        <PendingView em={em} effectiveDate={item.effectiveDate} />
      )}

      {/* エラー時のリトライボタン */}
      {em.status === 'error' && (
        <div className="mt-3">
          <button
            onClick={() => handleRetry('retry')}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            再計測する
          </button>
        </div>
      )}

      {/* 完了時の再計測ボタン */}
      {em.status === 'completed' && (
        <div className="mt-3">
          <button
            onClick={() => handleRetry('remeasure')}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-gray-400 dark:hover:bg-dark-3"
          >
            {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            After指標を再取得
          </button>
        </div>
      )}
    </div>
  );
}

/** ステータスバッジ */
function StatusBadge({ status, error }) {
  const config = {
    pending: { icon: Clock, label: 'After期間の経過を待機中', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' },
    measuring: { icon: Clock, label: '計測待ち（次回自動取得）', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' },
    completed: { icon: CheckCircle2, label: '計測完了', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' },
    error: { icon: AlertCircle, label: 'エラー', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' },
    suspended: { icon: Minus, label: '一時停止', color: 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-dark-3' },
  };

  const c = config[status] || config.suspended;
  const Icon = c.icon;

  return (
    <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${c.color}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{c.label}</span>
      {status === 'error' && error && (
        <span className="ml-1 text-[10px] font-normal opacity-70">({error})</span>
      )}
    </div>
  );
}

/** 計測完了時のBefore/After表示 */
function CompletedView({ em, category }) {
  const { before, after, changes, overallScore, aiEvaluation } = em;

  // スコアに基づく評価ラベル
  const scoreLabel = getScoreLabel(overallScore);

  // カテゴリに基づいて表示する主要指標を選択
  const primaryMetrics = getPrimaryMetrics(category);

  return (
    <div className="space-y-3">
      {/* 総合スコア */}
      <div className={`flex items-center justify-between rounded-xl p-4 ${getScoreBgClass(overallScore)}`}>
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">総合スコア</div>
          <div className={`text-2xl font-bold ${getScoreTextClass(overallScore)}`}>
            {overallScore > 0 ? '+' : ''}{overallScore.toFixed(1)}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${getScoreTextClass(overallScore)}`}>{scoreLabel.label}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{scoreLabel.description}</div>
        </div>
      </div>

      {/* AI評価 */}
      {aiEvaluation && <AiEvaluationView aiEvaluation={aiEvaluation} />}

      {/* 主要指標のBefore/After比較 */}
      <div className="rounded-xl border border-gray-200 dark:border-dark-3">
        <div className="border-b border-gray-200 px-4 py-2 dark:border-dark-3">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">主要指標の変化</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-3">
          {primaryMetrics.map(({ key, label, format: fmt, invertColor }) => {
            const bVal = before[key];
            const aVal = after[key];
            const change = changes[key];
            if (bVal == null && aVal == null) return null;

            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{fmt(bVal)}</span>
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{fmt(aVal)}</span>
                  <ChangeIndicator value={change} invertColor={invertColor} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 期間情報 */}
      <div className="flex gap-2 text-[10px] text-gray-400 dark:text-gray-500">
        <span>Before: {formatPeriod(before.period)}</span>
        <span>|</span>
        <span>After: {formatPeriod(after.period)}</span>
      </div>
    </div>
  );
}

/** AI評価表示 */
function AiEvaluationView({ aiEvaluation }) {
  const { achievementLevel, summary, analysis, nextActions } = aiEvaluation;
  const levelConfig = getAchievementLevelConfig(achievementLevel);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-dark-3">
      {/* ヘッダー: AI評価ラベル */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-dark-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">AI評価</span>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${levelConfig.badgeClass}`}>
          <Target className="h-2.5 w-2.5" />
          {levelConfig.label}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {/* サマリー */}
        {summary && (
          <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">{summary}</p>
        )}

        {/* 分析 */}
        {analysis && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
            <div className="mb-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">分析</div>
            <div className="whitespace-pre-line text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
              {analysis}
            </div>
          </div>
        )}

        {/* 次のアクション */}
        {nextActions && nextActions.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              <Lightbulb className="h-3 w-3" />
              次のアクション
            </div>
            <ul className="space-y-1">
              {nextActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function getAchievementLevelConfig(level) {
  const config = {
    exceeded: { label: '期待以上', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    met: { label: '達成', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    partial: { label: '一部達成', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    not_met: { label: '未達成', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  return config[level] || config.partial;
}

/** 待機中表示 */
function PendingView({ em, effectiveDate }) {
  const afterEndDate = effectiveDate
    ? new Date(new Date(effectiveDate).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')
    : '—';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
        <Clock className="h-3.5 w-3.5" />
        Before指標を取得済み
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        After期間の終了日（{afterEndDate}）以降に自動的にAfter指標を取得し、効果を計測します。
      </p>
      {em.before && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat label="セッション" value={em.before.sessions?.toLocaleString()} />
          <MiniStat label="ユーザー" value={em.before.totalUsers?.toLocaleString()} />
          <MiniStat label="エンゲージメント" value={em.before.engagementRate != null ? `${(em.before.engagementRate * 100).toFixed(1)}%` : '—'} />
        </div>
      )}
    </div>
  );
}

/** 小さな統計値 */
function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2 dark:bg-dark-2">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-xs font-semibold text-gray-800 dark:text-white">{value || '—'}</div>
    </div>
  );
}

/** 変化率インジケーター */
function ChangeIndicator({ value, invertColor = false }) {
  if (value == null || isNaN(value)) return null;

  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.5;
  // invertColor: bounceRateなど減少が改善の場合
  const isGood = invertColor ? !isPositive : isPositive;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-dark-3">
        <Minus className="h-2.5 w-2.5" />
        0%
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
      isGood
        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    }`}>
      {isPositive
        ? <ArrowUpRight className="h-2.5 w-2.5" />
        : <ArrowDownRight className="h-2.5 w-2.5" />
      }
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

// --- ユーティリティ ---

function getScoreLabel(score) {
  if (score >= 30) return { label: '大幅改善', description: '非常に高い効果が出ています' };
  if (score >= 10) return { label: '改善傾向', description: '良い効果が確認できます' };
  if (score >= -5) return { label: '変化なし', description: '顕著な変化は見られません' };
  if (score >= -20) return { label: '要注意', description: '一部指標が悪化しています' };
  return { label: '悪化', description: '指標が全体的に悪化しています' };
}

function getScoreBgClass(score) {
  if (score >= 10) return 'bg-green-50 dark:bg-green-900/20';
  if (score >= -5) return 'bg-gray-50 dark:bg-dark-3';
  return 'bg-red-50 dark:bg-red-900/20';
}

function getScoreTextClass(score) {
  if (score >= 10) return 'text-green-700 dark:text-green-400';
  if (score >= -5) return 'text-gray-700 dark:text-gray-300';
  return 'text-red-700 dark:text-red-400';
}

function getPrimaryMetrics(category) {
  const fmt = {
    num: (v) => (v ?? 0).toLocaleString(),
    pct: (v) => `${((v ?? 0) * 100).toFixed(1)}%`,
    sec: (v) => {
      const s = Math.round(v ?? 0);
      return s >= 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s}秒`;
    },
    pos: (v) => (v ?? 0).toFixed(1),
  };

  const all = {
    sessions: { key: 'sessions', label: 'セッション', format: fmt.num },
    totalUsers: { key: 'totalUsers', label: 'ユーザー', format: fmt.num },
    newUsers: { key: 'newUsers', label: '新規ユーザー', format: fmt.num },
    pageViews: { key: 'pageViews', label: 'ページビュー', format: fmt.num },
    engagementRate: { key: 'engagementRate', label: 'エンゲージメント率', format: fmt.pct },
    bounceRate: { key: 'bounceRate', label: '直帰率', format: fmt.pct, invertColor: true },
    avgSessionDuration: { key: 'avgSessionDuration', label: '平均セッション時間', format: fmt.sec },
    conversions: { key: 'conversions', label: 'コンバージョン', format: fmt.num },
    conversionRate: { key: 'conversionRate', label: 'CVR', format: fmt.pct },
    impressions: { key: 'impressions', label: '表示回数(GSC)', format: fmt.num },
    clicks: { key: 'clicks', label: 'クリック数(GSC)', format: fmt.num },
    ctr: { key: 'ctr', label: 'CTR(GSC)', format: fmt.pct },
    avgPosition: { key: 'avgPosition', label: '平均掲載順位', format: fmt.pos, invertColor: true },
  };

  const byCategory = {
    acquisition: ['sessions', 'totalUsers', 'newUsers', 'clicks', 'impressions', 'ctr', 'engagementRate'],
    content: ['engagementRate', 'avgSessionDuration', 'bounceRate', 'pageViews', 'sessions'],
    design: ['engagementRate', 'bounceRate', 'avgSessionDuration', 'conversions', 'conversionRate'],
    feature: ['conversions', 'conversionRate', 'engagementRate', 'sessions', 'bounceRate'],
    other: ['sessions', 'engagementRate', 'bounceRate', 'conversions', 'conversionRate', 'pageViews'],
  };

  const keys = byCategory[category] || byCategory.other;
  return keys.map(k => all[k]).filter(Boolean);
}

function formatPeriod(periodStr) {
  if (!periodStr) return '—';
  // "2026-03-01_to_2026-03-14" → "3/1 〜 3/14"
  const [start, end] = periodStr.split('_to_');
  if (!start || !end) return periodStr;
  const fmtDate = (d) => {
    const [, m, day] = d.split('-');
    return `${parseInt(m)}/${parseInt(day)}`;
  };
  return `${fmtDate(start)} 〜 ${fmtDate(end)}`;
}
