import { useEffect, useRef } from 'react';
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
 *
 * @param {string} tourId - tourSteps.js のキー（例: 'analysisMonth'）
 */
export function useAutoTour(tourId) {
  const { seenTours, tourGuideEnabled, isDesktop, isLoading } = useOnboarding();
  const { isFree } = usePlan();
  const { currentUser } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (isLoading) return;
    if (!tourGuideEnabled) return;
    if (!isDesktop) return;
    if (!currentUser?.uid) return;
    if (seenTours[tourId]) return;
    if (TOUR_PLAN_REQUIRED[tourId] === 'business' && isFree) return;

    firedRef.current = true;
    startOnboardingTour(tourId, {
      isFree,
      userId: currentUser.uid,
    });
  }, [isLoading, tourGuideEnabled, isDesktop, seenTours, tourId, isFree, currentUser?.uid]);
}
