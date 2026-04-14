import React from 'react';
import { X } from 'lucide-react';
import ChecklistBody from './ChecklistBody';
import { useOnboarding } from '../../hooks/useOnboarding';

/**
 * Dashboard 上に常設するインラインチェックリストカード
 * - 初回モーダルを閉じた後に表示
 * - ×ボタンで dismiss()（永久非表示）
 */
export default function OnboardingChecklistCard() {
  const { isVisible, dismiss } = useOnboarding();

  if (!isVisible) return null;

  return (
    <div
      data-tour="dashboard-checklist"
      className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2"
    >
      <div className="flex items-start justify-between border-b border-stroke px-6 py-5 dark:border-dark-3">
        <div>
          <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-body-color">
            操作方法のガイド
          </div>
          <h2 className="text-lg font-bold text-dark dark:text-white">
            グローレポータ を始めよう
          </h2>
          <p className="mt-1 text-xs text-body-color">
            主要な機能を一通り見て、本アプリを使いこなしましょう（所要時間: 約3分）
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismiss()}
          className="rounded p-1 text-dark-6 hover:bg-gray-100 dark:hover:bg-dark-3"
          aria-label="閉じる"
          title="閉じる（サイドバーから再開できます）"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-6 py-5">
        <ChecklistBody />
      </div>
    </div>
  );
}
