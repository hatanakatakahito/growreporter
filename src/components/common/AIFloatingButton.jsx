import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../contexts/AuthContext';

/**
 * AI分析フローティングボタン
 * 全ページ統一の右下固定ボタン
 * クリックでAI分析タブへスクロール
 * @param {string} pageType - ページタイプ
 * @param {function} onScrollToAI - AI分析タブへスクロールする関数
 */
export default function AIFloatingButton({ pageType, onScrollToAI }) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { plan, planId, getRemainingByType } = usePlan();
  const { userProfile } = useAuth();

  // pageTypeに応じて適切な残り回数を取得
  const type = pageType === 'comprehensive_improvement' ? 'improvement' : 'summary';
  const remaining = getRemainingByType(type);
  
  const memberRole = userProfile?.memberRole || 'owner';

  // 5秒ごとにアニメーションを実行
  useEffect(() => {
    const interval = setInterval(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 600); // アニメーション時間
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 閲覧者またはplanロード中は表示しない（全Hooksの後に配置）
  if (memberRole === 'viewer' || !plan) {
    return null;
  }

  const handleClick = () => {
    if (onScrollToAI) {
      onScrollToAI();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <button
        onClick={handleClick}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl ${shouldAnimate ? 'animate-bounce-once' : ''}`}
        aria-label="AI分析を見る"
      >
        <div className="flex flex-col items-center">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
          <span className="mt-1 text-[11px] font-medium">AI分析</span>
        </div>

        {/* 残り回数バッジ — 無料プランのsummaryは1回限りのためバッジ非表示 */}
        {remaining !== null && !(planId === 'free' && type === 'summary') && (
          <span
            className="absolute -top-2 -right-2 flex h-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-md whitespace-nowrap"
            title={`${plan?.displayName || 'プラン'}：AI分析の今月の残り回数`}
          >
            {remaining === -1 ? '無制限' : `${remaining}回`}
          </span>
        )}
      </button>
    </div>
  );
}

