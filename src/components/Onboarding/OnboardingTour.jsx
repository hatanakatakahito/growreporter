import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driverTheme.css';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../hooks/useOnboarding';
import { TOUR_STEPS_BY_ID, TOUR_STEP_COMPLETION_KEY } from './tourSteps';

/**
 * driver.js のツアーディスパッチャ
 * - tourId を渡すと該当ステップを起動
 * - 他モーダルが開いていたらスキップ
 * - モバイルではスキップ
 * - onDestroyed で markTourSeen + markStep + トースト
 */
export default function OnboardingTour({ tourId, forceStart = false }) {
  const { isVisible, isDesktop, seenTours, markTourSeen, markStep } =
    useOnboarding();
  const driverRef = useRef(null);

  useEffect(() => {
    if (!tourId) return undefined;
    if (!isDesktop) return undefined;
    // 強制起動でない場合は通常のガード
    if (!forceStart) {
      if (!isVisible) return undefined;
      if (seenTours[tourId]) return undefined;
    }

    const steps = TOUR_STEPS_BY_ID[tourId];
    if (!steps || steps.length === 0) return undefined;

    // 他モーダル検出: role="dialog" が既にあればスキップ
    const otherDialog = document.querySelector('[role="dialog"]');
    if (otherDialog) {
      return undefined;
    }

    // ターゲット要素の存在確認（最初のステップ）
    const firstTarget = document.querySelector(steps[0].element);
    if (!firstTarget) {
      console.warn(`[OnboardingTour] ターゲット要素が見つかりません: ${steps[0].element}`);
      return undefined;
    }

    let cancelled = false;
    let destroyHandler = null;

    // requestAnimationFrame を 2 回挟んで DOM マウント待ち
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return;

        const drv = driver({
          showProgress: true,
          allowClose: true,
          animate: true,
          smoothScroll: true,
          overlayOpacity: 0.6,
          nextBtnText: '次へ',
          prevBtnText: '戻る',
          doneBtnText: '完了',
          progressText: 'ステップ {{current}} / {{total}}',
          steps,
          onDestroyed: () => {
            const completionKey = TOUR_STEP_COMPLETION_KEY[tourId];
            markTourSeen(tourId);
            if (completionKey) {
              markStep(completionKey);
              // 完走トースト
              const stepTitle = {
                dashboard: 'ダッシュボードの見方',
                analysisDay: '詳細分析画面',
                analysisSummary: 'AI分析',
                members: 'メンバー招待',
                accountSettings: '通知設定',
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
            // 少し間を置いてから操作方法ガイドのモーダルを再表示
            // （次のステップに進めるよう促す）
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('onboarding:open-modal'));
            }, 600);
          },
        });

        driverRef.current = drv;
        drv.drive();

        destroyHandler = () => {
          try {
            drv.destroy();
          } catch (e) {
            // noop
          }
        };
      });

      return () => cancelAnimationFrame(raf2);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (destroyHandler) destroyHandler();
      driverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, isVisible, isDesktop, forceStart]);

  return null;
}
