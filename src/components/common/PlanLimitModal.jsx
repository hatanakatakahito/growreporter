import { Info } from 'lucide-react';
import { useState } from 'react';
import { usePlan } from '../../hooks/usePlan';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import UpgradeModal from './UpgradeModal';

/**
 * AI生成回数制限超過時のモーダル
 */
export default function PlanLimitModal({ onClose, type = 'summary' }) {
  const { plan, planId, getUsedByType } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const used = getUsedByType(type);
  const limit = type === 'summary'
    ? plan.features?.aiSummaryMonthly || 0
    : plan.features?.aiImprovementMonthly || 0;
  const typeName = type === 'summary' ? 'AI分析' : 'AI改善提案';

  return (
    <Dialog open={true} onClose={onClose} size="md">
      {/* ヘッダー: プラン制限訴求なので bg-gradient-business（ビジネス色） */}
      <div className="-mx-(--gutter) -mt-(--gutter) mb-6 rounded-t-2xl bg-gradient-business p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Info className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            生成回数の上限に達しました
          </h2>
        </div>
      </div>

      <DialogBody className="!mt-0">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="mb-4 text-sm text-blue-900 dark:text-blue-200">
            今月の{typeName}生成回数の上限に達しました。
          </p>

          {/* 利用状況 */}
          <div className="mb-4 rounded-lg bg-white p-4 dark:bg-dark-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-dark dark:text-white">
                {typeName}回数
              </span>
              <span className="text-lg font-bold text-dark dark:text-white">
                {used} / {limit === -1 ? '∞' : limit}回
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-4">
              <div
                className="h-full bg-gradient-business transition-all"
                style={{ width: limit === -1 ? '100%' : `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* 情報 */}
          <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-200">
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
                ビジネスプランにアップグレードすると無制限でご利用いただけます
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

        {/* アップグレード案内 */}
        {planId === 'free' && (
          <div className="mt-4">
            <Button variant="upgrade" className="w-full" onClick={() => setIsUpgradeModalOpen(true)}>
              有料プランを確認する
            </Button>
          </div>
        )}
        <p className="mt-3 text-xs text-body-color">
          ※ プラン変更をご希望の場合は、運営までお問い合わせください。
        </p>
      </DialogBody>

      <DialogActions>
        <Button variant="primary" className="w-full" onClick={onClose}>
          閉じる
        </Button>
      </DialogActions>

      {/* アップグレードモーダル */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </Dialog>
  );
}
