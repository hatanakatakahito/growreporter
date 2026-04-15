import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driverTheme.css';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../hooks/useOnboarding';
import { TOUR_STEPS_BY_ID, TOUR_STEP_COMPLETION_KEY } from './tourSteps';

/**
 * driver.js のツアーディスパッチャ
 *
 * 起動条件:
 *   - URL に ?guide=1 がある（ガイドから遷移してきた）場合のみ起動
 *
 * ?guide=1 があればツアー起動後に history.replaceState で URL から
 * 即座にパラメータを除去する。これにより
 * - リロードしても再起動しない
 * - サイドバーから普通に遷移した場合はパラメータがないので誤作動しない
 * - ガイド再表示後に同じ項目を再度クリックすれば param が付くので再生可能
 */
export default function OnboardingTour({ tourId }) {
  const location = useLocation();
  const { isDesktop, markTourSeen, markStep, planId } = useOnboarding();
  const isFree = planId === 'free';
  const driverRef = useRef(null);
  const startedKeysRef = useRef(new Set()); // `${tourId}:${locationKey}` 単位の起動済みマーカー

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

    // 同じ location key で同じ tourId を既に起動していたら重複起動しない
    const startKey = `${tourId}:${location.key}`;
    if (startedKeysRef.current.has(startKey)) return undefined;

    // ?guide=1 パラメータ判定（ガイドからの遷移時のみ起動）
    const params = new URLSearchParams(location.search);
    const fromGuide = params.get('guide') === '1';
    if (!fromGuide) return undefined;

    const allSteps = TOUR_STEPS_BY_ID[tourId];
    if (!allSteps || allSteps.length === 0) return undefined;
    // Free プランは Business 限定ステップを除外
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

      // 起動済みマーク & URL から guide パラメータ削除（リロード時に再起動しない）
      startedKeysRef.current.add(startKey);
      const newParams = new URLSearchParams(location.search);
      newParams.delete('guide');
      const newSearch = newParams.toString();
      const newUrl = location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState(window.history.state, '', newUrl);

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
          completed = true;
          driverRef.current = null;

          const completionKey = TOUR_STEP_COMPLETION_KEY[tourId];
          // 常に最新 ref を呼ぶ（stale closure 回避）
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
      // 完了済みなら openModalTimer は残す（モーダル再表示のため）
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, location.key, isDesktop]);

  return null;
}
