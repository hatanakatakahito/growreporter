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
 * - forceStart=true なら isVisible/seenTours/他モーダルチェックをバイパス
 * - モバイルではスキップ
 * - onDestroyed で markTourSeen + markStep + トースト + イベント発火
 *
 * 重要: ローカル ref で「このマウント中に完了/起動したツアー」を記憶し、
 *       Firestore 反映の遅延による再起動バグを防ぐ。
 */
export default function OnboardingTour({ tourId, forceStart = false }) {
  const { isVisible, isDesktop, seenTours, markTourSeen, markStep } =
    useOnboarding();
  const driverRef = useRef(null);
  const startedRef = useRef(new Set()); // 起動済みツアーID
  const completedRef = useRef(new Set()); // 完了済みツアーID（再起動防止）

  useEffect(() => {
    if (!tourId) return undefined;
    if (!isDesktop) return undefined;
    // このコンポーネントマウント中に既に完了したツアーは再起動しない
    if (completedRef.current.has(tourId)) return undefined;
    // 既に起動済みなら何もしない（重複起動防止）
    if (startedRef.current.has(tourId) && driverRef.current) return undefined;

    if (!forceStart) {
      if (!isVisible) return undefined;
      if (seenTours[tourId]) return undefined;
      // 自動起動時のみ他モーダル検出: role="dialog" があればスキップ
      const otherDialog = document.querySelector('[role="dialog"]');
      if (otherDialog) {
        return undefined;
      }
    }

    const steps = TOUR_STEPS_BY_ID[tourId];
    if (!steps || steps.length === 0) return undefined;

    let cancelled = false;
    let retryTimer = null;
    let openModalTimer = null;

    const tryStart = (attempt = 0) => {
      if (cancelled) return;
      // ターゲット要素の存在確認（最初のステップ）
      const firstTarget = document.querySelector(steps[0].element);
      if (!firstTarget) {
        if (attempt < 15) {
          // 100ms 間隔で最大15回（合計1.5秒）リトライ
          retryTimer = setTimeout(() => tryStart(attempt + 1), 100);
        } else {
          console.warn(
            `[OnboardingTour] ターゲット要素が見つかりません: ${steps[0].element}`
          );
        }
        return;
      }

      startedRef.current.add(tourId);

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
          // 完了マーク（再起動防止用ローカル ref）
          completedRef.current.add(tourId);
          driverRef.current = null;

          const completionKey = TOUR_STEP_COMPLETION_KEY[tourId];
          markTourSeen(tourId);
          if (completionKey) {
            markStep(completionKey);
            const stepTitle = {
              dashboard: 'ダッシュボードの見方',
              analysisDay: '詳細分析画面',
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
          // forcedTourId をクリア（MainLayout に通知）
          window.dispatchEvent(new CustomEvent('onboarding:tour-consumed'));
          // 少し間を置いてから操作方法ガイドのモーダルを再表示
          openModalTimer = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('onboarding:open-modal'));
          }, 600);
        },
      });

      driverRef.current = drv;
      drv.drive();
    };

    // requestAnimationFrame を 2 回挟んで DOM マウント待ち
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tryStart(0);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (retryTimer) clearTimeout(retryTimer);
      if (openModalTimer) clearTimeout(openModalTimer);
      // 完了済みなら destroy 不要（既に destroy されている）
      if (driverRef.current && !completedRef.current.has(tourId)) {
        try {
          driverRef.current.destroy();
        } catch (e) {
          // noop
        }
        driverRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, isDesktop, forceStart]);

  return null;
}
