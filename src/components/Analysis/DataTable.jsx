import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import { getTooltip } from '../../constants/tooltips';

/**
 * ツールチップコンポーネント（Portal使用）
 */
function TooltipPortal({ children, tooltipText }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const updatePosition = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
  };

  return (
    <>
      <div
        ref={iconRef}
        onMouseEnter={() => {
          setIsVisible(true);
          updatePosition();
        }}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center"
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[99999] w-64 whitespace-normal rounded-lg bg-dark px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-2xl"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltipText}
            <div
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-dark"
            ></div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * 共通データテーブルコンポーネント
 * ソート、ページネーション機能付き
 */
export default function DataTable({
  columns,
  data,
  pageSize = 10,
  showPagination = true,
  emptyMessage = 'データがありません',
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // ソート処理
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr, 'ja');
      } else {
        return bStr.localeCompare(aStr, 'ja');
      }
    });
  }, [data, sortColumn, sortDirection]);

  // ページネーション処理
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // ソートハンドラー
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // 値のフォーマット
  const formatValue = (value, format) => {
    if (value === null || value === undefined) return '-';

    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'percent':
        return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : value;
      case 'decimal':
        return typeof value === 'number' ? value.toFixed(2) : value;
      case 'duration':
        // 秒を mm:ss 形式に変換
        if (typeof value === 'number') {
          const minutes = Math.floor(value / 60);
          const seconds = Math.floor(value % 60);
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return value;
      default:
        return value;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-stroke bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      {/* 横スクロールヒント */}
      <div className="border-b border-stroke px-4 py-2 dark:border-dark-3">
        <div className="flex items-center gap-2 text-xs text-body-color">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>左右にスクロールできます</span>
        </div>
      </div>
      
      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-3">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-3 dark:hover:bg-dark-4' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <span>{column.label}</span>
                    {column.tooltip && (
                      <TooltipPortal tooltipText={getTooltip(column.tooltip)}>
                        <Info className="h-4 w-4 text-body-color cursor-help hover:text-primary transition-colors" />
                      </TooltipPortal>
                    )}
                    {column.sortable !== false && (
                      <div className="flex flex-col">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4 text-primary" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-primary" />
                          )
                        ) : (
                          <div className="flex flex-col opacity-30">
                            <ChevronUp className="h-3 w-3" />
                            <ChevronDown className="-mt-1 h-3 w-3" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-stroke last:border-b-0 hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 text-sm text-dark dark:text-white ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : formatValue(row[column.key], column.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stroke px-4 py-3 dark:border-dark-3">
          <div className="text-sm text-body-color">
            {sortedData.length}件中 {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, sortedData.length)}件を表示
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-md border border-stroke px-3 py-1 text-sm text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              前へ
            </button>
            <span className="text-sm text-body-color">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-stroke px-3 py-1 text-sm text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



