import React, { useEffect, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';

/**
 * 検索付き単一選択モーダル。
 * react-select ではドロップダウンが画面下部で見切れるため、項目数が多い選択肢用に用意。
 *
 * items: [{ key, primary, secondary?, searchText }]
 * selectedKey: 現在選択中のキー (ハイライト用)
 * onSelect(key): 項目クリック時のコールバック (呼び出し側で onClose を呼ぶ)
 */
export default function PickerModal({
  open,
  onClose,
  title,
  searchPlaceholder = '検索...',
  items,
  selectedKey,
  onSelect,
  emptyMessage = '該当する項目が見つかりません',
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open]);

  // ESC キーで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const lower = search.toLowerCase();
  const filtered = search
    ? items.filter((item) => (item.searchText || '').toLowerCase().includes(lower))
    : items;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl flex flex-col h-[80vh] max-h-[640px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
          <h3 className="text-lg font-semibold text-dark">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-body-color transition hover:text-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 検索 */}
        <div className="border-b border-stroke px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body-color" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-stroke bg-white pl-9 pr-9 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-body-color transition hover:bg-gray-100 hover:text-dark"
                title="クリア"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-body-color">{emptyMessage}</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((item) => {
                const isSelected = item.key === selectedKey;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.key)}
                      className={`flex w-full items-start gap-3 rounded-md px-4 py-2.5 text-left transition ${
                        isSelected
                          ? 'border border-primary bg-primary/10'
                          : 'border border-transparent hover:bg-gray-50'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      ) : (
                        <span className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-dark">{item.primary}</div>
                        {item.secondary && (
                          <div className="mt-0.5 truncate text-xs text-body-color">{item.secondary}</div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* フッター: 件数表示 */}
        <div className="border-t border-stroke px-6 py-3 text-xs text-body-color">
          {search ? `${filtered.length} 件 (${items.length} 件中)` : `${items.length} 件`}
        </div>
      </div>
    </div>
  );
}
