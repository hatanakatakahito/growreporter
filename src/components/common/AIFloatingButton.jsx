import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePlan } from '../../hooks/usePlan';
import AIAnalysisModal from './AIAnalysisModal';
import PlanLimitModal from './PlanLimitModal';

/**
 * AI分析フローティングボタン
 * 全ページ統一の右下固定ボタン
 */
export default function AIFloatingButton({ pageType, metrics, period }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { plan, getRemainingGenerations } = usePlan();

  const remaining = getRemainingGenerations();

  // planがロード中の場合は何も表示しない
  if (!plan) {
    return null;
  }

  // 5秒ごとにアニメーションを実行
  useEffect(() => {
    const interval = setInterval(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 600); // アニメーション時間
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleLimitExceeded = () => {
    setIsModalOpen(false);
    setIsLimitModalOpen(true);
  };

  return (
    <>
      {/* フローティングボタン（既存デザイン維持） */}
      <div className="fixed bottom-6 right-6 z-30">
        <style>
          {`
            @keyframes pulse-scale {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
            }
            .animate {
              animation: pulse-scale 0.6s ease-in-out;
            }
          `}
        </style>
        <button
          onClick={handleClick}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 ${shouldAnimate ? 'animate' : ''}`}
          aria-label="AI分析を見る"
        >
          <div className="flex flex-col items-center">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
            <span className="mt-1 text-[11px] font-medium">AI分析</span>
          </div>

          {/* 無料プラン時: 残り回数バッジ */}
          {plan.id === 'free' && remaining >= 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold shadow-md">
              {remaining}
            </span>
          )}
        </button>
      </div>

      {/* AI分析モーダル */}
      {isModalOpen && (
        <AIAnalysisModal
          pageType={pageType}
          metrics={metrics}
          period={period}
          onClose={() => setIsModalOpen(false)}
          onLimitExceeded={handleLimitExceeded}
        />
      )}

      {/* 制限超過モーダル */}
      {isLimitModalOpen && (
        <PlanLimitModal onClose={() => setIsLimitModalOpen(false)} />
      )}
    </>
  );
}

