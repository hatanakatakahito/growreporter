import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from './usePlan';
import { useAdmin } from './useAdmin';
import {
  getRequiredStepKeys,
  allRequiredStepsCompleted,
  getDefaultOnboarding,
  TOUR_TARGET_VERSION,
} from '../constants/onboarding';

/**
 * 操作方法のガイド（オンボーディング）状態管理フック
 */
export function useOnboarding() {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const { planId, isLoading: isPlanLoading } = usePlan();
  const { isAdmin, loading: isAdminLoading } = useAdmin();

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  // デスクトップ/モバイル判定の購読
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    // Safari fallback
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  const onboarding = userProfile?.onboarding || null;
  const steps = onboarding?.steps || getDefaultOnboarding().steps;
  const seenTours = onboarding?.seenTours || getDefaultOnboarding().seenTours;
  const memberRole = userProfile?.memberRole || 'owner';

  const requiredStepKeys = useMemo(
    () => getRequiredStepKeys(planId, memberRole),
    [planId, memberRole]
  );

  const completedKeys = useMemo(
    () => requiredStepKeys.filter((k) => steps[k] === true),
    [requiredStepKeys, steps]
  );

  const progress = useMemo(
    () => ({
      done: completedKeys.length,
      total: requiredStepKeys.length,
      pct:
        requiredStepKeys.length > 0
          ? (completedKeys.length / requiredStepKeys.length) * 100
          : 0,
    }),
    [completedKeys, requiredStepKeys]
  );

  const allCompleted = useMemo(
    () => allRequiredStepsCompleted(planId, memberRole, steps),
    [planId, memberRole, steps]
  );

  const isVisible = useMemo(() => {
    if (isPlanLoading || isAdminLoading) return false;
    if (isAdmin) return false;
    if (!userProfile) return false;
    if (!onboarding) return false;
    if (onboarding.dismissed) return false;
    if (allCompleted) return false;
    return true;
  }, [isPlanLoading, isAdminLoading, isAdmin, userProfile, onboarding, allCompleted]);

  // 「ダッシュボードを初めて表示する状態か」
  const isFirstVisit = useMemo(() => {
    if (!isVisible) return false;
    return !seenTours.dashboard;
  }, [isVisible, seenTours]);

  const updateOnboarding = useCallback(
    async (partial) => {
      if (!currentUser?.uid) return;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          ...partial,
          updatedAt: serverTimestamp(),
        });
        // ローカルの userProfile を最新化（再描画トリガ）
        if (refreshUserProfile) await refreshUserProfile();
      } catch (e) {
        console.error('[useOnboarding] 更新エラー:', e);
      }
    },
    [currentUser?.uid, refreshUserProfile]
  );

  const markStep = useCallback(
    async (key) => {
      if (!isVisible) return;
      if (steps[key]) return; // 既に完了
      await updateOnboarding({ [`onboarding.steps.${key}`]: true });
    },
    [isVisible, steps, updateOnboarding]
  );

  const markTourSeen = useCallback(
    async (tourId) => {
      if (!isVisible) return;
      if (seenTours[tourId]) return;
      await updateOnboarding({ [`onboarding.seenTours.${tourId}`]: true });
    },
    [isVisible, seenTours, updateOnboarding]
  );

  const dismiss = useCallback(async () => {
    await updateOnboarding({ 'onboarding.dismissed': true });
  }, [updateOnboarding]);

  const restart = useCallback(async () => {
    // 既に登録済みのサイトは自動完了のため siteRegistered は保持
    const defaults = getDefaultOnboarding();
    const resetSteps = {
      ...defaults.steps,
      siteRegistered: steps.siteRegistered === true,
    };
    await updateOnboarding({
      'onboarding.dismissed': false,
      'onboarding.steps': resetSteps,
      'onboarding.seenTours': defaults.seenTours,
      'onboarding.tourVersion': TOUR_TARGET_VERSION,
      'onboarding.completedAt': null,
    });
  }, [updateOnboarding, steps]);

  return {
    isVisible,
    isDesktop,
    isFirstVisit,
    isAdmin,
    isPlanLoading,
    isLoading: isPlanLoading || isAdminLoading,
    planId,
    memberRole,
    steps,
    seenTours,
    requiredStepKeys,
    progress,
    allCompleted,
    markStep,
    markTourSeen,
    dismiss,
    restart,
  };
}
