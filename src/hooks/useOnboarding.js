import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { usePlan } from './usePlan';
import { getDefaultOnboarding, TOUR_TARGET_VERSION } from '../constants/onboarding';

/**
 * ツアーガイドの状態管理フック（トグル式）
 * - tourGuideEnabled: ON/OFF トグル（OFF→ON で seenTours リセット）
 * - seenTours: 各ツアーの既読状態
 * - Free→Business アップグレード時に seenTours を自動リセット
 */
export function useOnboarding() {
  const { currentUser, userProfile } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useAdmin();
  const { planId, isLoading: isPlanLoading } = usePlan();

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  const onboarding = userProfile?.onboarding || null;
  const seenTours = onboarding?.seenTours || getDefaultOnboarding().seenTours;
  const tourGuideEnabled = userProfile?.tourGuideEnabled ?? true;

  const markedToursRef = useRef(new Set());

  const updateUserDoc = useCallback(
    async (partial) => {
      if (!currentUser?.uid) return;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          ...partial,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('[useOnboarding] 更新エラー:', e);
      }
    },
    [currentUser?.uid]
  );

  // Free → Business アップグレード検知: seenTours を自動リセット
  // planId (usePlan の state) が確定する前に実行すると、初期値 'free' と Firestore の
  // lastPlanId が食い違って誤って「Free→Business 昇格」と判定してしまうため、
  // usePlan の読み込み完了を必ず待つ。
  useEffect(() => {
    if (isPlanLoading) return;
    if (!currentUser?.uid || !userProfile) return;
    const lastPlanId = onboarding?.lastPlanId || 'free';
    if (planId === 'business' && lastPlanId !== 'business') {
      markedToursRef.current.clear();
      const defaults = getDefaultOnboarding();
      updateUserDoc({
        'onboarding.seenTours': defaults.seenTours,
        'onboarding.lastPlanId': 'business',
        'onboarding.tourVersion': TOUR_TARGET_VERSION,
        tourGuideEnabled: true,
      });
    } else if (planId && planId !== lastPlanId) {
      updateUserDoc({ 'onboarding.lastPlanId': planId });
    }
  }, [isPlanLoading, planId, currentUser?.uid, userProfile?.plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const markTourSeen = useCallback(
    async (tourId) => {
      if (!currentUser?.uid) return;
      if (markedToursRef.current.has(tourId)) return;
      markedToursRef.current.add(tourId);
      await updateUserDoc({ [`onboarding.seenTours.${tourId}`]: true });
    },
    [currentUser?.uid, updateUserDoc]
  );

  return {
    tourGuideEnabled,
    seenTours,
    markTourSeen,
    isDesktop,
    isAdmin,
    isLoading: !userProfile || isAdminLoading,
  };
}
