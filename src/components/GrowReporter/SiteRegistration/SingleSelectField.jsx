import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * 単一選択フィールド（ドロップダウン形式）
 * MultiSelectField のフラット版。タクソノミーV2 の
 * ビジネスモデル／業種大分類／業種小分類／サイト役割 で使用。
 *
 * @param {Object} props
 * @param {string} label - ラベル
 * @param {boolean} required - 必須表示
 * @param {Array<{value: string, label: string, description?: string}>} options - 選択肢
 * @param {string} value - 選択中の value
 * @param {function(string): void} onChange - 変更時コールバック（value を渡す）
 * @param {string} [error] - エラーメッセージ
 * @param {string} [placeholder='選択してください']
 * @param {boolean} [disabled=false]
 * @param {string} [hint] - 下部に表示する補足テキスト（AI推定バッジ等）
 */
export default function SingleSelectField({
  label,
  required,
  options = [],
  value = '',
  onChange,
  error,
  placeholder = '選択してください',
  disabled = false,
  hint,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = options.find((o) => (o.value ?? o) === value);
  const selectedLabel = selectedOption?.label ?? selectedOption ?? '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full rounded-md border bg-white px-4 py-2.5 text-left text-sm outline-none transition dark:bg-dark dark:text-white ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        } ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-stroke dark:border-dark-3 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20'
        }`}
      >
        <span className="flex items-center gap-2">
          {selectedLabel ? (
            <span className="font-medium text-dark dark:text-white">{selectedLabel}</span>
          ) : (
            <span className="text-gray-400 dark:text-dark-6">{placeholder}</span>
          )}
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark">
          {options.map((opt) => {
            const v = opt.value ?? opt;
            const lab = opt.label ?? opt;
            const desc = opt.description;
            const isSelected = v === value;
            return (
              <button
                key={v}
                type="button"
                onClick={() => handleSelect(v)}
                className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-3 ${
                  isSelected
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-dark dark:text-white'
                }`}
              >
                <span className="flex w-full items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      isSelected ? 'border-primary bg-primary' : 'border-gray-300 dark:border-dark-6'
                    }`}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-medium">{lab}</span>
                </span>
                {desc && (
                  <span className="ml-6 text-xs text-body-color">{desc}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-body-color">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
