import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * テーブルの表示項目を切り替えるポップオーバー
 */
export default function ColumnToggle({
  columns,
  visibleColumns,
  columnOrder,
  onToggleColumn,
  onMoveColumn,
  onResetColumns,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const orderedColumns = columnOrder
    .map(key => columns.find(c => c.key === key))
    .filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
      >
        <SlidersHorizontal className="h-4 w-4 text-body-color" />
        表示項目
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <div className="space-y-0.5">
            {orderedColumns.map((col, idx) => {
              const checked = visibleColumns.includes(col.key);
              const disabled = !!col.required;
              return (
                <div
                  key={col.key}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm ${disabled ? 'opacity-50' : ''}`}
                >
                  <label
                    className={`flex flex-1 items-center gap-2 select-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => !disabled && onToggleColumn(col.key)}
                      className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                    />
                    <span className="text-dark dark:text-white">{col.label}</span>
                  </label>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveColumn(col.key, 'up')}
                      disabled={idx === 0}
                      className="rounded p-0.5 text-body-color hover:text-dark disabled:opacity-20 disabled:cursor-not-allowed dark:hover:text-white"
                      title="上へ移動"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveColumn(col.key, 'down')}
                      disabled={idx === orderedColumns.length - 1}
                      className="rounded p-0.5 text-body-color hover:text-dark disabled:opacity-20 disabled:cursor-not-allowed dark:hover:text-white"
                      title="下へ移動"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 border-t border-stroke pt-2 dark:border-dark-3">
            <button
              type="button"
              onClick={onResetColumns}
              className="text-xs text-body-color hover:text-dark dark:hover:text-white"
            >
              デフォルトに戻す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
