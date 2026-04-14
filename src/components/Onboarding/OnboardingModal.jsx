import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import ChecklistBody from './ChecklistBody';
import { useOnboarding } from '../../hooks/useOnboarding';
import './driverTheme.css';

/**
 * 初回モーダル（操作方法のガイド）
 * - 「はじめる」→ モーダル閉じる + Dashboard ツアー自動起動フラグ
 * - 「あとで」「×」→ モーダル閉じるのみ（インラインカードに切替）
 * - 「今後このガイドを表示しない」→ dismiss()
 */
export default function OnboardingModal({ open, onClose, onStart }) {
  const { dismiss } = useOnboarding();
  const [neverShow, setNeverShow] = useState(false);

  const handleClose = async () => {
    if (neverShow) {
      await dismiss();
    }
    onClose?.();
  };

  const handleStart = async () => {
    if (neverShow) {
      await dismiss();
    }
    onClose?.();
    onStart?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} size="xl">
      <div className="-mx-(--gutter) -mt-(--gutter) mb-0 flex items-start justify-between border-b border-stroke rounded-t-2xl px-6 py-5 dark:border-dark-3">
        <div>
          <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-body-color">
            操作方法のガイド
          </div>
          <h3 className="text-lg font-bold text-dark dark:text-white">
            グローレポータ へようこそ
          </h3>
          <p className="mt-1 text-xs text-body-color">
            分析ダッシュボードの使い方をステップでご案内します（所要時間: 約3分）
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded p-1 text-dark-6 hover:bg-gray-100 dark:hover:bg-dark-3"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="py-5 max-h-[60vh] overflow-y-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <ChecklistBody />
      </div>

      <div className="-mx-(--gutter) -mb-(--gutter) flex flex-col gap-3 rounded-b-2xl border-t border-stroke px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-3">
        <label className="flex items-center gap-2 text-xs text-body-color cursor-pointer">
          <input
            type="checkbox"
            checked={neverShow}
            onChange={(e) => setNeverShow(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-stroke text-primary focus:ring-primary"
          />
          今後このガイドを表示しない
        </label>
        <div className="flex items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            あとで
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            はじめる
          </button>
        </div>
      </div>
    </Dialog>
  );
}
