import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * 複数選択フィールド（ドロップダウン＋選択済みタグ表示で省スペース）
 * @param {Object} props
 * @param {string} label - ラベル
 * @param {boolean} required - 必須表示
 * @param {Array<{value: string, label: string}>} [options] - フラット選択肢
 * @param {Array<{label: string, items: string[]}>} [groups] - グループ付き選択肢（2階層）
 * @param {string[]} value - 選択中の値の配列
 * @param {function(string[]): void} onChange - 変更時
 * @param {string} error - エラーメッセージ
 * @param {string} placeholder - 未選択時の表示
 */
export default function MultiSelectField({ label, required, options, groups, value = [], onChange, error, placeholder = '選択してください' }) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const ref = useRef(null);

  const selected = Array.isArray(value) ? value : [];

  // 選択済みラベルを取得
  const getLabels = () => {
    if (groups) {
      return selected.map((v) => v);
    }
    return selected.map((v) => options?.find((o) => (o.value ?? o) === v)?.label ?? v);
  };
  const labels = getLabels();

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

  const toggleGroup = (groupLabel) => {
    setExpandedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  // グループ内の選択数を取得
  const getGroupSelectedCount = (group) => {
    if (group.items.length === 0) return selected.includes(group.label) ? 1 : 0;
    return group.items.filter((item) => selected.includes(item)).length;
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
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark">
          {groups ? (
            // 2階層グループ表示
            groups.map((group) => {
              const isExpanded = expandedGroups[group.label];
              const groupCount = getGroupSelectedCount(group);
              const hasItems = group.items.length > 0;

              return (
                <div key={group.label}>
                  {hasItems ? (
                    // サブ分類があるグループ: アコーディオンヘッダー
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center gap-2 border-b border-stroke/50 bg-gray-50 px-4 py-2 text-left text-sm font-semibold text-dark hover:bg-gray-100 dark:border-dark-3/50 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-body-color" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-body-color" />
                      )}
                      {group.label}
                      {groupCount > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {groupCount}
                        </span>
                      )}
                    </button>
                  ) : (
                    // サブ分類なし（例: 「その他」）: 直接選択可能
                    <button
                      type="button"
                      onClick={() => toggle(group.label)}
                      className={`flex w-full items-center gap-2 border-b border-stroke/50 px-4 py-2 text-left text-sm font-semibold hover:bg-gray-100 dark:border-dark-3/50 dark:hover:bg-dark-3 ${
                        selected.includes(group.label) ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-gray-50 text-dark dark:bg-dark-2 dark:text-white'
                      }`}
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected.includes(group.label) ? 'border-primary bg-primary' : 'border-gray-300 dark:border-dark-6'}`}>
                        {selected.includes(group.label) && <span className="text-xs text-white">✓</span>}
                      </span>
                      {group.label}
                    </button>
                  )}
                  {/* サブ分類の展開 */}
                  {hasItems && isExpanded && (
                    <div>
                      {group.items.map((item) => {
                        const isSelected = selected.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggle(item)}
                            className={`flex w-full items-center gap-2 py-2 pl-10 pr-4 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-3 ${
                              isSelected ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-dark dark:text-white'
                            }`}
                          >
                            <span className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 dark:border-dark-6'}`}>
                              {isSelected && <span className="text-xs text-white">✓</span>}
                            </span>
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // フラット表示（従来互換）
            options?.map((opt) => {
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
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 dark:border-dark-6'}`}>
                    {isSelected && <span className="text-xs text-white">✓</span>}
                  </span>
                  {lab}
                </button>
              );
            })
          )}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
