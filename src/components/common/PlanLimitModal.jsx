import { X, AlertTriangle } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

/**
 * AI生成回数制限超過時のモーダル
 */
export default function PlanLimitModal({ onClose }) {
  const { plan, getUsedGenerations } = usePlan();
  const used = getUsedGenerations();
  const limit = plan.aiGenerationsPerMonth;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-dark-2">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-dark dark:text-white">
              生成回数の上限に達しました
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-2 dark:hover:bg-dark-3"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="mb-4 text-sm text-yellow-800 dark:text-yellow-200">
              今月のAI分析生成回数の上限に達しました。
            </p>

            {/* 利用状況 */}
            <div className="mb-4 rounded-lg bg-white p-4 dark:bg-dark-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark dark:text-white">
                  AI生成回数
                </span>
                <span className="text-lg font-bold text-dark dark:text-white">
                  {used} / {limit}回
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-4">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-pink-500 transition-all"
                  style={{ width: `${(used / limit) * 100}%` }}
                />
              </div>
            </div>

            {/* 情報 */}
            <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>来月1日に自動的にリセットされます</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>キャッシュされた分析は引き続きご利用いただけます</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span className="font-medium">
                  無料プランは週1回（月4回）が目安です
                </span>
              </li>
            </ul>
          </div>

          {/* 現在の状態 */}
          <div className="mt-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-body-color">
              現在のプラン
            </p>
            <p className="text-lg font-bold text-dark dark:text-white">{plan.name}</p>
            <p className="mt-1 text-sm text-body-color">{plan.description}</p>
          </div>

          {/* 注記 */}
          <p className="mt-4 text-xs text-body-color">
            ※ 現在は手動でFirestoreからプランを変更できます。将来的に有料プランへのアップグレード機能を実装予定です。
          </p>
        </div>

        {/* フッター */}
        <div className="border-t border-stroke p-6 dark:border-dark-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

