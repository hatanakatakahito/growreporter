/**
 * ツアーガイドを React lifecycle の外で直接起動する関数。
 *
 * 設計方針:
 *   - driver.js は React と無関係な純粋 JavaScript ライブラリなので
 *     useEffect ではなく、直接呼び出して使う。
 *   - StrictMode・stale closure・cleanup 競合などの問題を根本的に回避。
 *   - 呼び出し側（ChecklistBody 等）は navigate 後にこの関数を呼ぶだけ。
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../components/Onboarding/driverTheme.css';
import toast from 'react-hot-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  TOUR_STEPS_BY_ID,
  TOUR_STEP_COMPLETION_KEY,
} from '../components/Onboarding/tourSteps';

const STEP_TITLE = {
  analysisMonth: '詳細分析画面',
  analysisSummary: 'AI分析',
  members: 'メンバー招待',
  accountSettings: '通知設定',
  sites: 'サイト設定',
  aiChat: 'AIチャット',
  improve: '改善提案',
  reports: '評価機能',
};

/**
 * @param {string} tourId - tourSteps.js のキー
 * @param {object} options
 * @param {boolean} options.isFree - Freeプランかどうか（businessOnly フィルタ用）
 * @param {string} options.userId - Firestore 書き込み用の uid
 */
export function startOnboardingTour(tourId, { isFree = false, userId } = {}) {
  const allSteps = TOUR_STEPS_BY_ID[tourId];
  if (!allSteps || allSteps.length === 0) return;

  // Free プランは businessOnly ステップを除外
  const steps = isFree ? allSteps.filter((s) => !s.businessOnly) : allSteps;
  if (steps.length === 0) return;

  // デスクトップ以外（モバイル）はスキップ
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(min-width: 768px)').matches) return;

  // DOM polling: target 要素がレンダリングされるまで待つ
  let attempts = 0;
  const maxAttempts = 25; // 100ms × 25 = 2.5秒 まで待つ

  const tryStart = () => {
    const target = document.querySelector(steps[0].element);
    if (!target) {
      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(tryStart, 100);
      } else {
        console.warn(
          `[startOnboardingTour] target not found: ${steps[0].element}`
        );
      }
      return;
    }

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
      onDestroyed: async () => {
        // Firestore に完了を書き込む（単一の source of truth）
        const completionKey = TOUR_STEP_COMPLETION_KEY[tourId];
        if (userId) {
          try {
            const updates = {
              [`onboarding.seenTours.${tourId}`]: true,
              updatedAt: serverTimestamp(),
            };
            if (completionKey) {
              updates[`onboarding.steps.${completionKey}`] = true;
            }
            await updateDoc(doc(db, 'users', userId), updates);
          } catch (e) {
            console.error('[startOnboardingTour] firestore write failed:', e);
          }
        }

        // 完走トースト
        const stepTitle = STEP_TITLE[tourId];
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

        // 操作方法ガイドのモーダルを再表示
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('onboarding:open-modal'));
        }, 600);
      },
    });

    drv.drive();
  };

  // navigate 後のページマウントを少し待ってから開始
  setTimeout(tryStart, 300);
}
