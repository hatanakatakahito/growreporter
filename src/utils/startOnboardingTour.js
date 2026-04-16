/**
 * ツアーガイドを React lifecycle の外で直接起動する関数。
 *
 * 設計方針:
 *   - driver.js は React と無関係な純粋 JavaScript ライブラリなので
 *     useEffect ではなく、直接呼び出して使う。
 *   - StrictMode・stale closure・cleanup 競合などの問題を根本的に回避。
 *   - 呼び出し側（useAutoTour）はページ遷移時にこの関数を呼ぶだけ。
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../components/Onboarding/driverTheme.css';
import toast from 'react-hot-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TOUR_STEPS_BY_ID } from '../components/Onboarding/tourSteps';

const STEP_TITLE = {
  dashboard: 'ダッシュボード',
  analysisMonth: '月別分析',
  analysisDay: '日別分析',
  analysisWeek: '曜日別分析',
  analysisHour: '時間帯別分析',
  analysisChannels: '集客チャネル',
  analysisKeywords: '流入キーワード',
  analysisReferrals: '被リンク元',
  analysisPages: 'ページ別',
  analysisContent: 'コンテンツ分析',
  analysisPageCategories: 'ページ分類別',
  analysisLandingPages: 'ランディングページ',
  analysisPageFlow: 'ページフロー',
  analysisConversions: 'コンバージョン',
  analysisReverseFlow: '逆算フロー',
  analysisExternalLinks: '外部リンククリック',
  analysisFileDownloads: 'ファイルダウンロード',
  analysisUsers: 'ユーザー属性',
  analysisSummaryFree: '全体サマリー',
  analysisExport: 'レポートダウンロード',
  analysisSummary: 'AI分析',
  comprehensiveAI: 'AI総合分析',
  members: 'メンバー招待',
  accountSettings: 'アカウント設定',
  sites: 'サイト管理',
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
  // 多重起動防止
  if (window.__onboardingTourActive) return;

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

    window.__onboardingTourActive = true;

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
      closeBtnText: 'ガイドを終了する',
      progressText: 'ステップ {{current}} / {{total}}',
      steps,
      onDestroyed: async () => {
        window.__onboardingTourActive = false;

        // Firestore に seenTours を書き込む
        if (userId) {
          try {
            await updateDoc(doc(db, 'users', userId), {
              [`onboarding.seenTours.${tourId}`]: true,
              updatedAt: serverTimestamp(),
            });
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
      },
    });

    drv.drive();
  };

  // ページマウントを少し待ってから開始
  setTimeout(tryStart, 300);
}
