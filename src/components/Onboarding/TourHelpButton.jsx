import React from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { startOnboardingTour } from '../../utils/startOnboardingTour';

/**
 * 「使い方」ボタン
 * 各ページのタイトル横に配置し、クリックでそのページのツアーを手動起動する。
 * seenTours や tourGuideEnabled の状態に関わらず常に起動可能。
 * モバイルでは非表示（driver.js がデスクトップ専用のため）。
 *
 * @param {string} tourId - 起動するツアーのID
 * @param {string} [className] - 追加のクラス
 */
export default function TourHelpButton({ tourId, className = '' }) {
  const { currentUser } = useAuth();
  const { isFree } = usePlan();

  const handleClick = () => {
    startOnboardingTour(tourId, {
      isFree,
      userId: currentUser?.uid,
      force: true,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`hidden md:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary text-white px-3 py-1 text-xs font-medium whitespace-nowrap ${className}`}
      title="このページの使い方を見る"
    >
      <BookOpen className="h-3.5 w-3.5" />
      <span>使い方</span>
    </button>
  );
}
