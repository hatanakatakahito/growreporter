import { useState } from 'react';
import { Lock } from 'lucide-react';
import UpgradeModal from './UpgradeModal';

/**
 * ビジネスプランロックオーバーレイ（AI分析タブ用）
 * サンプルデータの上にボカシ+UpgradeModal表示ボタン
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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-dark dark:text-white">
          ビジネスプランでご利用いただけます
        </h3>
        <p className="text-sm text-body-color dark:text-dark-6">
          AIの力でサイト改善を本格的に推進しませんか？
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
        >
          プランを確認する
        </button>
      </div>
      {showModal && <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </div>
  );
}
