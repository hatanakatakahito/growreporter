import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  STEP_DEFINITIONS,
  CATEGORIES,
  STEP_ORDER,
} from '../../constants/onboarding';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAuth } from '../../contexts/AuthContext';

/**
 * チェックリスト本体（モーダルとインラインカードで共用）
 * - 進捗バー
 * - カテゴリグルーピング
 * - ステップ番号 / 所要時間 / サブ説明 / 「次におすすめ」バッジ
 * - 項目ホバーで対応する Sidebar メニューを一時ハイライト
 * @param {function} onBeforeNavigate - 項目クリック時、画面遷移前に呼ばれる（モーダルを閉じる用）
 */
export default function ChecklistBody({ onBeforeNavigate }) {
  const navigate = useNavigate();
  const { steps, requiredStepKeys, progress, isDesktop } = useOnboarding();
  const { currentUser, refreshUserProfile } = useAuth();

  // 表示対象のステップ配列（カテゴリ順）
  const orderedItems = useMemo(() => {
    const items = STEP_ORDER.filter((key) => requiredStepKeys.includes(key)).map(
      (key) => ({
        key,
        ...STEP_DEFINITIONS[key],
        done: steps[key] === true,
      })
    );

    // カテゴリでグルーピング
    const groups = {};
    items.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    // カテゴリ順にソート
    const sortedCats = Object.keys(groups).sort(
      (a, b) => CATEGORIES[a].order - CATEGORIES[b].order
    );

    // 通し番号を付与
    let stepNo = 0;
    const rendered = [];
    sortedCats.forEach((cat) => {
      rendered.push({ type: 'category', cat });
      groups[cat].forEach((item) => {
        stepNo += 1;
        rendered.push({ type: 'item', ...item, stepNo });
      });
    });
    return rendered;
  }, [requiredStepKeys, steps]);

  // 未完了の最上位項目（「次におすすめ」対象）
  const firstUnfinishedKey = useMemo(() => {
    const items = orderedItems.filter((x) => x.type === 'item' && !x.done);
    return items[0]?.key || null;
  }, [orderedItems]);

  const handleItemClick = async (item) => {
    // siteRegistered は自動完了専用、クリックしても何もしない
    if (!item.to) return;

    // 【重要】クリックした時点で Firestore に直接書き込む
    // これにより React state の伝播・stale closure・ツアー完了タイミング
    // などに依存せず、確実にステップ完了を記録できる。
    if (currentUser?.uid && !item.done) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          [`onboarding.steps.${item.key}`]: true,
          updatedAt: serverTimestamp(),
        });
        if (refreshUserProfile) await refreshUserProfile();
      } catch (e) {
        console.error('[ChecklistBody] step mark failed:', e);
      }
    }

    // モーダルを閉じる
    if (onBeforeNavigate) onBeforeNavigate();
    // 該当ページのツアー起動要求
    window.dispatchEvent(
      new CustomEvent('onboarding:force-tour', { detail: { stepKey: item.key } })
    );
    // 遷移
    navigate(item.to);
  };

  return (
    <div>
      {/* 進捗バー */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-body-color">進捗（自動保存されます）</span>
          <span className="font-medium text-dark dark:text-white">
            {progress.done} / {progress.total} 完了
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-stroke dark:bg-dark-3">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {/* 項目リスト */}
      <div className="space-y-5">
        {(() => {
          // カテゴリごとにレンダリング
          const groupedRender = [];
          let currentCat = null;
          let currentItems = [];

          const flush = () => {
            if (currentCat) {
              groupedRender.push(
                <div key={currentCat}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-body-color">
                      {CATEGORIES[currentCat].label}
                    </div>
                    <div className="h-px flex-1 bg-stroke dark:bg-dark-3" />
                  </div>
                  <div className="space-y-2">
                    {currentItems.map((it) => renderItem(it))}
                  </div>
                </div>
              );
            }
          };

          const renderItem = (it) => {
            const isNext = it.key === firstUnfinishedKey;
            const numStr = String(it.stepNo).padStart(2, '0');
            const isDisabledMobile = it.desktopOnly && !isDesktop;

            return (
              <button
                key={it.key}
                type="button"
                disabled={isDisabledMobile}
                onClick={() => handleItemClick(it)}
                title={isDisabledMobile ? 'PCで実行してください' : undefined}
                className={`group relative flex w-full items-start gap-4 rounded-lg border px-4 py-3 text-left transition cursor-pointer [&_*]:pointer-events-none ${
                  isNext
                    ? 'border-primary bg-primary/[0.03] dark:bg-primary/10'
                    : 'border-stroke dark:border-dark-3'
                } ${
                  isDisabledMobile
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10'
                }`}
              >
                {it.done ? (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-stroke dark:border-dark-3" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary/60">
                      {numStr}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        it.done ? 'text-body-color' : 'text-dark dark:text-white'
                      }`}
                    >
                      {it.title}
                    </span>
                    {isNext && !it.done && (
                      <span className="rounded border border-primary px-1.5 py-0 text-[10px] font-medium text-primary">
                        次におすすめ
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[11px] text-body-color">
                      {it.done ? '完了' : it.estimatedTime}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-body-color">{it.subtitle}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 self-center text-dark-6" />
              </button>
            );
          };

          orderedItems.forEach((entry) => {
            if (entry.type === 'category') {
              flush();
              currentCat = entry.cat;
              currentItems = [];
            } else {
              currentItems.push(entry);
            }
          });
          flush();

          return groupedRender;
        })()}
      </div>
    </div>
  );
}
