import { useState, useCallback, useMemo } from 'react';

const STORAGE_PREFIX = 'gr:table-columns:';
const ORDER_PREFIX = 'gr:table-order:';

function loadFromStorage(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveToStorage(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // silently ignore
  }
}

function getDefaultVisible(columns) {
  return columns.filter(c => c.defaultVisible !== false).map(c => c.key);
}

function getDefaultOrder(columns) {
  return columns.map(c => c.key);
}

/**
 * テーブルの表示カラム管理フック
 * @param {string} tableKey - テーブル識別キー（localStorage保存用）
 * @param {Array<{key: string, label: string, required?: boolean, defaultVisible?: boolean}>} columns - カラム定義
 */
export function useTableColumns(tableKey, columns) {
  const defaultVisible = useMemo(() => getDefaultVisible(columns), [columns]);
  const defaultOrder = useMemo(() => getDefaultOrder(columns), [columns]);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const stored = loadFromStorage(STORAGE_PREFIX + tableKey);
    if (!stored) return defaultVisible;
    const requiredKeys = columns.filter(c => c.required).map(c => c.key);
    const storedSet = new Set(stored);
    const newDefaultKeys = columns
      .filter(c => c.defaultVisible !== false && !storedSet.has(c.key))
      .map(c => c.key);
    return [...new Set([...requiredKeys, ...stored.filter(k => columns.some(c => c.key === k)), ...newDefaultKeys])];
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    const stored = loadFromStorage(ORDER_PREFIX + tableKey);
    if (!stored) return defaultOrder;
    const allKeys = columns.map(c => c.key);
    const valid = stored.filter(k => allKeys.includes(k));
    const missing = allKeys.filter(k => !valid.includes(k));
    return [...valid, ...missing];
  });

  const orderedVisibleColumns = useMemo(
    () => columnOrder.filter(key => visibleColumns.includes(key)),
    [columnOrder, visibleColumns]
  );

  const isVisible = useCallback(
    (key) => visibleColumns.includes(key),
    [visibleColumns]
  );

  const toggleColumn = useCallback(
    (key) => {
      const col = columns.find(c => c.key === key);
      if (col?.required) return;
      setVisibleColumns(prev => {
        const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
        saveToStorage(STORAGE_PREFIX + tableKey, next);
        return next;
      });
    },
    [columns, tableKey]
  );

  const moveColumn = useCallback(
    (key, direction) => {
      setColumnOrder(prev => {
        const idx = prev.indexOf(key);
        if (idx === -1) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
        saveToStorage(ORDER_PREFIX + tableKey, next);
        return next;
      });
    },
    [tableKey]
  );

  const resetToDefault = useCallback(() => {
    setVisibleColumns(defaultVisible);
    setColumnOrder(defaultOrder);
    saveToStorage(STORAGE_PREFIX + tableKey, defaultVisible);
    saveToStorage(ORDER_PREFIX + tableKey, defaultOrder);
  }, [defaultVisible, defaultOrder, tableKey]);

  return { visibleColumns, orderedVisibleColumns, columnOrder, isVisible, toggleColumn, moveColumn, resetToDefault };
}
