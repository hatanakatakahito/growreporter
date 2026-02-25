import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * 複数選択フィールド（ドロップダウン＋選択済みタグ表示で省スペース）
 * @param {Object} props
 * @param {string} label - ラベル
 * @param {boolean} required - 必須表示
 * @param {Array<{value: string, label: string}>} options - 選択肢
 * @param {string[]} value - 選択中の値の配列
 * @param {function(string[]): void} onChange - 変更時
 * @param {string} error - エラーメッセージ
 * @param {string} placeholder - 未選択時の表示
 */
export default function MultiSelectField({ label, required, options, value = [], onChange, error, placeholder = '選択してください' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = Array.isArray(value) ? value : [];
  const labels = selected.map((v) => options.find((o) => (o.value ?? o) === v)?.label ?? v);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (optionValue) => {
    const v = typeof optionValue === 'object' ? optionValue.value : optionValue;
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-md border bg-white px-4 py-2.5 text-left text-sm outline-none transition dark:bg-dark dark:text-white ${
          error ? 'border-red-500 focus:border-red-500' : 'border-stroke dark:border-dark-3 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20'
        }`}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {labels.length > 0 ? (
            labels.map((l) => (
              <span key={l} className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/25">
                {l}
              </span>
            ))
          ) : (
            <span className="text-gray-400 dark:text-dark-6">{placeholder}</span>
          )}
          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark">
          {options.map((opt) => {
            const v = opt.value ?? opt;
            const isSelected = selected.includes(v);
            const lab = opt.label ?? opt;
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggle(opt)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-3 ${
                  isSelected ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-dark dark:text-white'
                }`}
              >
                <span className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 dark:border-dark-6'}`}>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </span>
                {lab}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
