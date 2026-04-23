import { X, AlertTriangle, ArrowLeftCircle, CheckCircle } from 'lucide-react';

/**
 * 改善を「対応中」を経由せずに直接「完了」にしようとしたときの誘導ダイアログ。
 *
 * Before スナップショットは「対応中」遷移時に撮影される仕様のため、
 * draft → completed に直行すると実装検証ができない（verified=null になる）。
 * このダイアログでユーザーに対応中への経由を促す。
 */
export default function ImplementationCheckGuideDialog({
  isOpen,
  onClose,
  onMoveToInProgress,
  onProceedWithoutCheck,
  isLoading,
  item,
}) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              効果検証のために一度お確かめください
            </h3>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="rounded p-1 text-body-color hover:bg-gray-100 dark:hover:bg-dark-3"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* タスク情報 */}
        <div className="mb-4 rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
          <div className="text-sm font-medium text-dark dark:text-white">{item.title}</div>
        </div>

        {/* 説明 */}
        <div className="mb-5 space-y-2 text-sm text-body-color dark:text-dark-6">
          <p>
            正確な効果検証のためには、<strong className="text-dark dark:text-white">実装作業を始める前に「対応中」ステータスにする</strong>
            ことで、改善前のページ状態を自動記録できます。
          </p>
          <p>すでに実装済みの場合は、検証なしで完了にすることもできます。</p>
        </div>

        {/* ボタン */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onMoveToInProgress}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            <ArrowLeftCircle className="h-4 w-4" />
            対応中に戻して、改善前の状態を記録する（推奨）
          </button>
          <button
            type="button"
            onClick={onProceedWithoutCheck}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
          >
            <CheckCircle className="h-4 w-4" />
            このまま完了にする（実装検証はスキップ）
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full rounded-lg px-4 py-2 text-sm text-body-color transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-dark-3"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
