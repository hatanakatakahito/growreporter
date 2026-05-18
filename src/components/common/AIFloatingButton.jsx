import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePlan } from '../../hooks/usePlan';

/**
 * AI分析フローティングボタン
 * 全ページ統一の右下固定ボタン
 * クリックでAI分析タブへスクロール
 *
 * 注: 80x80 の円形＋カラム配置（アイコン上、ラベル下）が独自要件のため、
 * 共通 Button comp ではなく直接 button を使用。色は variant="ai" と同じ
 * `bg-gradient-ai` トークンに統一。
 *
 * 仕様: viewer も AI 生成は許可されているため、ロール非表示ガードは行わない
 * （オーナーのプラン枠を消費する）。
 *
 * @param {function} onScrollToAI - AI分析タブへスクロールする関数
 */
export default function AIFloatingButton({ onScrollToAI }) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { plan } = usePlan();

  // 5秒ごとにアニメーションを実行
  useEffect(() => {
    const interval = setInterval(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 600); // アニメーション時間
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // planロード中は表示しない（全Hooksの後に配置）
  if (!plan) {
    return null;
  }

  const handleClick = () => {
    if (onScrollToAI) {
      onScrollToAI();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 hidden md:block">
      <button
        onClick={handleClick}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-ai hover:bg-gradient-ai-hover text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl ${shouldAnimate ? 'animate-bounce-once' : ''}`}
        aria-label="AI分析を見る"
      >
        <div className="flex flex-col items-center">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
          <span className="mt-1 text-[11px] font-medium">AI分析</span>
        </div>
      </button>
    </div>
  );
}
