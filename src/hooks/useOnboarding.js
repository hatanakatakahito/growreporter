import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const { currentUser, userProfile } = useAuth();
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

  // セッション内の書き込み済みキーを記録（stale closure による早期リターン回避のため
  // userProfile を deps に入れずに重複抑止する）
  const markedStepsRef = useRef(new Set());
  const markedToursRef = useRef(new Set());

  const updateOnboarding = useCallback(
    async (partial) => {
      if (!currentUser?.uid) return;
      try {
        // Firestore に書き込み → onSnapshot 経由で自動的に
        // userProfile が更新される（refreshUserProfile 不要）
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

  const markStep = useCallback(
    async (key) => {
      if (isAdmin) return;
      if (!currentUser?.uid) return;
      if (markedStepsRef.current.has(key)) return;
      markedStepsRef.current.add(key);
      await updateOnboarding({ [`onboarding.steps.${key}`]: true });
    },
    [isAdmin, currentUser?.uid, updateOnboarding]
  );

  const markTourSeen = useCallback(
    async (tourId) => {
      if (isAdmin) return;
      if (!currentUser?.uid) return;
      if (markedToursRef.current.has(tourId)) return;
      markedToursRef.current.add(tourId);
      await updateOnboarding({ [`onboarding.seenTours.${tourId}`]: true });
    },
    [isAdmin, currentUser?.uid, updateOnboarding]
  );

  const dismiss = useCallback(async () => {
    await updateOnboarding({ 'onboarding.dismissed': true });
  }, [updateOnboarding]);

  const restart = useCallback(async () => {
    // 「操作方法ガイドを再開」は dismissed を解除してツアーを再視聴できる
    // 状態に戻すだけ。完了済みの steps は保持する（ユーザーの進捗を消さない）。
    // ツアーは再視聴可能にしたいので seenTours だけ ref もクリア。
    markedToursRef.current.clear();
    const defaults = getDefaultOnboarding();
    await updateOnboarding({
      'onboarding.dismissed': false,
      'onboarding.seenTours': defaults.seenTours,
      'onboarding.tourVersion': TOUR_TARGET_VERSION,
    });
  }, [updateOnboarding]);

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
