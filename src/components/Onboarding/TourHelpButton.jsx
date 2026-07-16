import React from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { startOnboardingTour } from '../../utils/startOnboardingTour';
import { Button } from '../ui/button';

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
    <Button
      variant="primary-outline"
      size="sm"
      pill
      onClick={handleClick}
      className={`hidden md:inline-flex shrink-0 whitespace-nowrap !py-1 ${className}`}
      title="このページの使い方を見る"
    >
      <BookOpen className="h-3.5 w-3.5" data-slot="icon" />
      <span>使い方</span>
    </Button>
  );
}
