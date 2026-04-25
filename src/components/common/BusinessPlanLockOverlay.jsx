import { useState } from 'react';
import { Lock } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import { Button } from '../ui/button';

/**
 * ビジネスプランロックオーバーレイ（AI分析タブ用）
 * サンプルデータの上にボカシ+UpgradeModal表示ボタン
 *
 * 色は `variant="upgrade"` / `bg-gradient-business` に統一。
 * （プラン購買訴求なので AI 色ではなく Business 色）
 */
export default function BusinessPlanLockOverlay({ children }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative min-h-[300px] md:min-h-[400px]">
      {children && (
        <div className="pointer-events-none select-none opacity-50 blur-[1.5px]" aria-hidden="true">
          {children}
        </div>
      )}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-business">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-dark dark:text-white">
          ビジネスプランでご利用いただけます
        </h3>
        <p className="text-sm text-body-color dark:text-dark-6">
          AIの力でサイト改善を本格的に推進しませんか？
        </p>
        <Button variant="upgrade" size="lg" onClick={() => setShowModal(true)}>
          プランを確認する
        </Button>
      </div>
      {showModal && <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </div>
  );
}
