/**
 * ツアーガイドを React lifecycle の外で直接起動する関数。
 *
 * 設計方針:
 *   - driver.js は React と無関係な純粋 JavaScript ライブラリなので
 *     useEffect ではなく、直接呼び出して使う。
 *   - StrictMode・stale closure・cleanup 競合などの問題を根本的に回避。
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
 * ツアーを起動
 * @param {string} tourId - tourSteps.js のキー
 * @param {object} options
 * @param {boolean} options.isFree - Freeプランかどうか（businessOnly フィルタ用）
 * @param {string} options.userId - Firestore 書き込み用の uid
 * @param {boolean} options.force - 「使い方」ボタンからの手動起動（seenTours を更新しない）
 */
export function startOnboardingTour(tourId, { isFree = false, userId, force = false } = {}) {
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

  // ページ側の自動モーダル等とバッティングしないよう、
  // DOM polling / setTimeout の待機中もツアー起動中とみなすため、ここで先にフラグを立てる。
  // ツアーが結果的に起動できなかった（全ステップ欠落）場合は launchTour で解除＋完了イベントを発火する。
  window.__onboardingTourActive = true;

  // DOM polling: element を持つステップの target 要素が揃うまで待つ
  // タイムアウト後は見つかったステップだけでツアーを開始（全失敗を避ける）
  let attempts = 0;
  const maxAttempts = 25; // 200ms × 25 = 5秒 まで待つ

  const stepsPresent = (stepList) =>
    stepList.filter((s) => !s.element || document.querySelector(s.element));

  const launchTour = (finalSteps) => {
    if (finalSteps.length === 0) {
      console.warn('[startOnboardingTour] 表示可能なステップがないため中断');
      window.__onboardingTourActive = false;
      window.dispatchEvent(new CustomEvent('onboardingTourEnded', { detail: { tourId } }));
      return;
    }

    let drv;
    drv = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: false,
      stagePadding: 4,
      overlayOpacity: 0.6,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: '次へ',
      prevBtnText: '戻る',
      doneBtnText: '完了',
      closeBtnText: 'ガイドを終了する',
      progressText: 'ステップ {{current}} / {{total}}',
      steps: finalSteps,
      // 途中ステップでも既読化して終了できる「スキップで完了」ボタンを挿入
      // クラス名に "driver-popover" を含めると driver.js の document レベル capture ハンドラが
      // stopImmediatePropagation を発火させてしまい click が届かないので別プレフィックスにする
      onPopoverRender: (popover, { driver: driverInstance, state }) => {
        // 最終ステップは「完了」ボタンが同義なのでスキップボタンは出さない
        if (state.activeIndex === finalSteps.length - 1) return;
        const skipBtn = document.createElement('button');
        skipBtn.type = 'button';
        skipBtn.textContent = 'スキップで完了';
        skipBtn.className = 'onboarding-tour-skip-btn';
        skipBtn.addEventListener('click', () => {
          const target = driverInstance || drv;
          if (target && typeof target.destroy === 'function') {
            target.destroy();
          }
        });
        // prev/next と同じフッター領域に追加
        if (popover.footerButtons) {
          popover.footerButtons.insertBefore(skipBtn, popover.footerButtons.firstChild);
        }
      },
      onDestroyed: async () => {
        window.__onboardingTourActive = false;
        // ツアー完了を通知（ページ側で被るモーダルの開閉制御などに利用）
        window.dispatchEvent(new CustomEvent('onboardingTourEnded', { detail: { tourId } }));

        // force モード（手動起動）の場合は seenTours を更新しない
        if (!force && userId) {
          try {
            await updateDoc(doc(db, 'users', userId), {
              [`onboarding.seenTours.${tourId}`]: true,
              updatedAt: serverTimestamp(),
            });
          } catch (e) {
            console.error('[startOnboardingTour] firestore write failed:', e);
          }
        }

        // 完走トースト（force モードは出さない）
        if (!force) {
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
        }
      },
    });

    drv.drive();
  };

  const tryStart = () => {
    const present = stepsPresent(steps);
    const allPresent = present.length === steps.length;

    // すべて揃っていれば即起動
    if (allPresent) {
      launchTour(steps);
      return;
    }

    // タイムアウト前はリトライ
    attempts += 1;
    if (attempts < maxAttempts) {
      setTimeout(tryStart, 200);
      return;
    }

    // タイムアウト後は見つかったステップだけで起動（1つでも欠けて全滅を防ぐ）
    const missing = steps
      .filter((s) => s.element && !document.querySelector(s.element))
      .map((s) => s.element);
    if (missing.length > 0) {
      console.warn(
        `[startOnboardingTour] 非表示要素をスキップ (tourId=${tourId}):`,
        missing
      );
    }
    launchTour(present);
  };

  // ページマウントを少し待ってから開始
  setTimeout(tryStart, 300);
}
