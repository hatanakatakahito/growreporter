import { Check, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * 改善タスクのステータスに応じてアクションボタンを出し分けるセル。
 *
 * - draft        → primary の「着手する」ボタン（クリックで in_progress へ）
 * - in_progress  → green の「完了にする」ボタン + サブの「起案に戻す」
 * - completed (計測中) → 「効果計測中」表示 + 「対応中に戻す」
 * - completed (計測完了) → 「計測完了 · スコア 〇〇」表示
 * - archived → 表示なし（呼び出し側で別扱い）
 *
 * compact=true: サブ説明を省略して高さを抑える（ドロワー内など）
 */
export default function StatusActionCell({
  item,
  onStatusChange,
  compact = false,
  isViewer = false,
  className = '',
}) {
  const status = item.status || 'draft';

  // viewer は表示のみ
  if (isViewer) {
    const label = { draft: '起案', in_progress: '対応中', completed: '完了', archived: 'アーカイブ' }[status] || status;
    return <span className={`text-xs text-body-color ${className}`}>{label}</span>;
  }

  if (status === 'draft') {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStatusChange(item, 'in_progress'); }}
          className="w-full inline-flex items-center justify-center rounded-lg bg-primary hover:bg-opacity-90 px-3 py-2 text-sm font-semibold text-white shadow-sm transition"
        >
          着手する
        </button>
      </div>
    );
  }

  if (status === 'in_progress') {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStatusChange(item, 'completed'); }}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition"
        >
          <Check className="h-4 w-4" />
          完了にする
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStatusChange(item, 'draft'); }}
          className="mt-1.5 w-full text-[11px] text-body-color hover:text-dark dark:hover:text-white transition"
        >
          起案に戻す
        </button>
      </div>
    );
  }

  if (status === 'completed') {
    const em = item.effectMeasurement;
    const emStatus = em?.status;

    // 計測完了
    if (emStatus === 'completed' && em?.overallScore != null) {
      const score = em.overallScore;
      const scoreText = `${score > 0 ? '+' : ''}${Math.round(score)}`;
      return (
        <div className={className}>
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/40 dark:bg-green-900/20">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              計測完了 · スコア {scoreText}
            </div>
          </div>
        </div>
      );
    }

    // エラー
    if (emStatus === 'error') {
      return (
        <div className={className}>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
            <div className="text-sm font-semibold text-red-700 dark:text-red-300">計測エラー</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStatusChange(item, 'in_progress'); }}
            className="mt-1.5 w-full text-[11px] text-body-color hover:text-dark dark:hover:text-white transition"
          >
            対応中に戻す
          </button>
        </div>
      );
    }

    // 計測中 (pending / measuring / suspended いずれも)
    return (
      <div className={className}>
        <div className="rounded-lg border border-stroke bg-gray-50 px-3 py-2 dark:border-dark-3 dark:bg-dark-3">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-dark dark:text-white">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            効果計測中
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStatusChange(item, 'in_progress'); }}
          className="mt-1.5 w-full text-[11px] text-body-color hover:text-dark dark:hover:text-white transition"
        >
          対応中に戻す
        </button>
      </div>
    );
  }

  if (status === 'archived') {
    return <span className={`text-xs text-body-color ${className}`}>アーカイブ済み</span>;
  }

  return null;
}
