import { useState } from 'react';
import { Lock } from 'lucide-react';
import UpgradeModal from './UpgradeModal';

/**
 * ビジネスプランロックオーバーレイ（統一コンポーネント）
 * 無料プランユーザーに対して、ロック画面+UpgradeModal表示
 */
export default function BusinessPlanLockOverlay({ children }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative min-h-[400px]">
      {children && (
        <div className="pointer-events-none select-none opacity-[0.15]" aria-hidden="true">
          {children}
        </div>
      )}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="pointer-events-auto text-center rounded-2xl bg-white p-10 shadow-2xl dark:bg-dark-2 max-w-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-pink-600">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-dark dark:text-white mb-2">
            ビジネスプランでご利用いただけます
          </h3>
          <p className="text-sm text-body-color dark:text-dark-6 mb-6">
            AIの力でサイト改善を本格的に推進しませんか？
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-400 to-pink-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            プランを確認する
          </button>
        </div>
      </div>
      {showModal && <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </div>
  );
}
