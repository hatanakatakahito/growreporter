import { useState } from 'react';
import { Lock } from 'lucide-react';
import UpgradeModal from './UpgradeModal';

/**
 * ビジネスプランロックオーバーレイ（統一コンポーネント）
 * サンプルデータの上に薄いボカシ+訴求カード→クリックでUpgradeModal
 */
export default function BusinessPlanLockOverlay({ children }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative min-h-[400px]">
      <div className="pointer-events-none select-none opacity-60" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px] bg-white/20 dark:bg-dark/20">
        <div className="pointer-events-auto text-center rounded-2xl bg-white p-8 shadow-2xl dark:bg-dark-2 max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-dark dark:text-white mb-2">
            ビジネスプランでご利用いただけます
          </h3>
          <p className="text-sm text-body-color dark:text-dark-6 mb-4">
            AIの力でサイト改善を本格的に推進しませんか？
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            プランを確認する
          </button>
        </div>
      </div>
      {showModal && <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </div>
  );
}
