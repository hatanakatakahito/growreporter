import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

const FOCUS_OPTIONS = [
  { value: 'balance', label: 'バランス（まんべんなく）' },
  { value: 'acquisition', label: '集客力の向上' },
  { value: 'conversion', label: 'コンバージョン（成果）の向上' },
  { value: 'branding', label: 'ブランディングの向上' },
  { value: 'usability', label: 'ユーザービリティの向上' },
];

/**
 * AI改善案生成前に「どの成果を優先するか」を選択するモーダル
 */
export default function ImprovementFocusModal({ isOpen, onClose, onConfirm }) {
  const [focus, setFocus] = useState('balance');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(focus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              どの成果を優先して改善案を出しますか？
            </h3>
          </div>
          <p className="mb-4 text-sm text-body-color">
            方針に合わせてAIが改善案を生成します。
          </p>
          <div className="space-y-2">
            {FOCUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  focus === opt.value
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-stroke hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3'
                }`}
              >
                <input
                  type="radio"
                  name="improvementFocus"
                  value={opt.value}
                  checked={focus === opt.value}
                  onChange={() => setFocus(opt.value)}
                  className="h-4 w-4 text-primary"
                />
                <span className="text-sm font-medium text-dark dark:text-white">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 border-t border-stroke p-4 dark:border-dark-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            生成する
          </button>
        </div>
      </div>
    </div>
  );
}
