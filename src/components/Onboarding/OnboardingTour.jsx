import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driverTheme.css';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../hooks/useOnboarding';
import { TOUR_STEPS_BY_ID, TOUR_STEP_COMPLETION_KEY } from './tourSteps';

/**
 * driver.js のツアーディスパッチャ
 *
 * 設計方針:
 *   - 起動条件: URL に ?guide=1 がある場合のみ
 *   - useLocation/useSearchParams は使わない（re-render を避けるため）
 *   - URL 更新は window.history.replaceState のみ（React Router を巻き込まない）
 *   - useEffect deps は [tourId, isDesktop] のみ（URL 変更で cleanup が走って
 *     driver が破壊されるのを防ぐ）
 */
export default function OnboardingTour({ tourId }) {
  const { isDesktop, markTourSeen, markStep, planId } = useOnboarding();
  const isFree = planId === 'free';
  const driverRef = useRef(null);
  const startedTourIdsRef = useRef(new Set());

  // markStep / markTourSeen は常に最新を呼ぶため ref で保持
  const markStepRef = useRef(markStep);
  const markTourSeenRef = useRef(markTourSeen);
  useEffect(() => {
    markStepRef.current = markStep;
  }, [markStep]);
  useEffect(() => {
    markTourSeenRef.current = markTourSeen;
  }, [markTourSeen]);

  useEffect(() => {
    if (!tourId) return undefined;
    if (!isDesktop) return undefined;
    if (startedTourIdsRef.current.has(tourId)) return undefined;

    // window.location.search を直接読む（React Router 依存しない）
    const params = new URLSearchParams(window.location.search);
    const fromGuide = params.get('guide') === '1';
    if (!fromGuide) return undefined;

    const allSteps = TOUR_STEPS_BY_ID[tourId];
    if (!allSteps || allSteps.length === 0) return undefined;
    const steps = isFree ? allSteps.filter((s) => !s.businessOnly) : allSteps;
    if (steps.length === 0) return undefined;

    let cancelled = false;
    let retryTimer = null;
    let openModalTimer = null;
    let completed = false;

    const tryStart = (attempt = 0) => {
      if (cancelled) return;
      const firstTarget = document.querySelector(steps[0].element);
      if (!firstTarget) {
        if (attempt < 15) {
          retryTimer = setTimeout(() => tryStart(attempt + 1), 100);
        } else {
          console.warn(
            `[OnboardingTour] ターゲット要素が見つかりません: ${steps[0].element}`
          );
        }
        return;
      }

      // 起動済みマーク
      startedTourIdsRef.current.add(tourId);

      // URL から guide パラメータを削除（React Router に影響しない方法）
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('guide');
      const newSearch = newParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState(window.history.state, '', newUrl);

      const drv = driver({
        showProgress: true,
        allowClose: true,
        animate: true,
        smoothScroll: true,
        overlayOpacity: 0.6,
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: '次へ',
        prevBtnText: '戻る',
        doneBtnText: '完了',
        closeBtnText: 'スキップ',
        progressText: 'ステップ {{current}} / {{total}}',
        steps,
        onDestroyed: () => {
          completed = true;
          driverRef.current = null;

          const completionKey = TOUR_STEP_COMPLETION_KEY[tourId];
          markTourSeenRef.current(tourId);
          if (completionKey) {
            markStepRef.current(completionKey);
            const stepTitle = {
              analysisMonth: '詳細分析画面',
              analysisSummary: 'AI分析',
              members: 'メンバー招待',
              accountSettings: '通知設定',
              sites: 'サイト設定',
              aiChat: 'AIチャット',
              improve: '改善提案',
              reports: '評価機能',
            }[tourId];
            if (stepTitle) {
              toast.success(`${stepTitle}を確認しました`, {
                duration: 3000,
                style: {
                  border: '1px solid #DFE4EA',
                  borderRadius: '8px',
                  fontSize: '13px',
                },
              });
            }
          }
          // ツアー完了後、操作方法ガイドのモーダルを再表示
          openModalTimer = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('onboarding:open-modal'));
          }, 600);
        },
      });

      driverRef.current = drv;
      drv.drive();
    };

    // DOM マウント待ち
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tryStart(0);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (retryTimer) clearTimeout(retryTimer);
      // 完了済みの場合は openModalTimer を残す（モーダル再表示のため）
      if (!completed && openModalTimer) clearTimeout(openModalTimer);
      // 完了していない場合のみ destroy
      if (driverRef.current && !completed) {
        try {
          driverRef.current.destroy();
        } catch (e) {
          // noop
        }
        driverRef.current = null;
      }
    };
  }, [tourId, isDesktop]);

  return null;
}
