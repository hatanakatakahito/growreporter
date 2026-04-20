import { useEffect } from 'react';
import { useOnboarding } from './useOnboarding';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from './usePlan';
import { startOnboardingTour } from '../utils/startOnboardingTour';
import { TOUR_PLAN_REQUIRED } from '../components/Onboarding/tourSteps';

/**
 * ページ初回訪問時にツアーを自動起動するフック
 * - tourGuideEnabled が OFF なら起動しない
 * - seenTours[tourId] が true なら起動しない
 * - プラン不一致（Free で Business 専用ツアー）なら起動しない
 * - 多重起動は startOnboardingTour 内の window.__onboardingTourActive で防止
 *
 * @param {string} tourId - tourSteps.js のキー（例: 'analysisMonth'）
 */
export function useAutoTour(tourId) {
  const { seenTours, tourGuideEnabled, isDesktop, isLoading } = useOnboarding();
  const { isFree, isLoading: isPlanLoading } = usePlan();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    // プラン確定前は isFree の既定値 (true) で発火してしまい、
    // Business ユーザーで businessOnly ステップが除外される／tourId が誤側に解決される
    // 競合状態が発生するため、usePlan の読み込み完了を待つ。
    if (isPlanLoading) return;
    if (!tourGuideEnabled) return;
    if (!isDesktop) return;
    if (!currentUser?.uid) return;
    if (seenTours[tourId]) return;
    // 無料プランはダッシュボード初回のみ自動表示。それ以外のページは「使い方」ボタンからの手動起動とする。
    if (isFree && tourId !== 'dashboard') return;
    if (TOUR_PLAN_REQUIRED[tourId] === 'business' && isFree) return;

    startOnboardingTour(tourId, {
      isFree,
      userId: currentUser.uid,
    });
  }, [isLoading, isPlanLoading, tourGuideEnabled, isDesktop, seenTours, tourId, isFree, currentUser?.uid]);
}
