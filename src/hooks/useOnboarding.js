import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { getDefaultOnboarding, TOUR_TARGET_VERSION } from '../constants/onboarding';

/**
 * ツアーガイドの状態管理フック（トグル式）
 * - tourGuideEnabled: ON/OFF トグル
 * - seenTours: 各ツアーの既読状態
 * - resetSeenTours: 全ツアーをリセット
 */
export function useOnboarding() {
  const { currentUser, userProfile } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useAdmin();

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

  const markTourSeen = useCallback(
    async (tourId) => {
      if (!currentUser?.uid) return;
      if (markedToursRef.current.has(tourId)) return;
      markedToursRef.current.add(tourId);
      await updateUserDoc({ [`onboarding.seenTours.${tourId}`]: true });
    },
    [currentUser?.uid, updateUserDoc]
  );

  const toggleTourGuide = useCallback(async () => {
    await updateUserDoc({ tourGuideEnabled: !tourGuideEnabled });
  }, [tourGuideEnabled, updateUserDoc]);

  const resetSeenTours = useCallback(async () => {
    markedToursRef.current.clear();
    const defaults = getDefaultOnboarding();
    await updateUserDoc({
      'onboarding.seenTours': defaults.seenTours,
      'onboarding.tourVersion': TOUR_TARGET_VERSION,
    });
  }, [updateUserDoc]);

  return {
    tourGuideEnabled,
    toggleTourGuide,
    resetSeenTours,
    seenTours,
    markTourSeen,
    isDesktop,
    isAdmin,
    isLoading: !userProfile || isAdminLoading,
  };
}
