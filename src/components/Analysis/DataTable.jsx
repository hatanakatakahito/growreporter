import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import { getTooltip } from '../../constants/tooltips';
import { useTableColumns } from '../../hooks/useTableColumns';
import ColumnToggle from '../common/ColumnToggle';
import ComparisonBadge from './ComparisonBadge';

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
 * ソート、ページネーション、表示項目切替機能付き
 */
export default function DataTable({
  columns,
  data,
  tableKey,
  pageSize = 10,
  showPagination = true,
  emptyMessage = 'データがありません',
  isComparing = false,
  showTotals = false,
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // 表示項目管理（tableKeyがある場合のみ有効）
  const columnToggle = useTableColumns(tableKey || '__noop__', columns);
  const displayColumns = useMemo(() => {
    if (!tableKey) return columns;
    return columnToggle.orderedVisibleColumns
      .map(key => columns.find(c => c.key === key))
      .filter(Boolean);
  }, [tableKey, columns, columnToggle.orderedVisibleColumns]);

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

  // 合計行の計算（全データ対象、ページネーション前のデータを使用）
  const totalsRow = useMemo(() => {
    if (!showTotals || !data || data.length === 0) return null;
    const row = {};
    displayColumns.forEach((col, idx) => {
      if (idx === 0) {
        row[col.key] = '合計';
        return;
      }
      const totalType = col.totalType || (col.format === 'number' ? 'sum' : col.format === 'percent' || col.format === 'decimal' || col.format === 'duration' ? 'avg' : 'none');
      if (totalType === 'none') {
        row[col.key] = null;
        return;
      }
      const values = data.map(r => r[col.key]).filter(v => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) {
        row[col.key] = null;
        return;
      }
      if (totalType === 'sum') {
        row[col.key] = values.reduce((a, b) => a + b, 0);
      } else {
        row[col.key] = values.reduce((a, b) => a + b, 0) / values.length;
      }

      // 比較モード: _prev の合計も計算
      if (isComparing && col.comparison) {
        const prevValues = data.map(r => r[`${col.key}_prev`]).filter(v => typeof v === 'number' && !isNaN(v));
        if (prevValues.length > 0) {
          const prevTotal = totalType === 'sum'
            ? prevValues.reduce((a, b) => a + b, 0)
            : prevValues.reduce((a, b) => a + b, 0) / prevValues.length;
          row[`${col.key}_prev`] = prevTotal;
          const cur = row[col.key];
          if (prevTotal === 0 && cur === 0) row[`${col.key}_change`] = 0;
          else if (prevTotal === 0) row[`${col.key}_change`] = cur > 0 ? 100 : -100;
          else row[`${col.key}_change`] = ((cur - prevTotal) / Math.abs(prevTotal)) * 100;
        }
      }
    });
    return row;
  }, [showTotals, data, displayColumns, isComparing]);

  if (!data || data.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-stroke bg-white p-12">
        <p className="text-body-color">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white">
      {/* ツールバー: 横スクロールヒント + 表示項目 */}
      <div className="border-b border-stroke px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-body-color">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>左右にスクロールできます</span>
          </div>
          {tableKey && (
            <ColumnToggle
              columns={columns}
              visibleColumns={columnToggle.visibleColumns}
              columnOrder={columnToggle.columnOrder}
              onToggleColumn={columnToggle.toggleColumn}
              onMoveColumn={columnToggle.moveColumn}
              onResetColumns={columnToggle.resetToDefault}
            />
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b-2 border-primary-mid/20 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5">
              {displayColumns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-primary-mid/10 transition-colors duration-200' : ''
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
            {paginatedData.map((row, rowIndex) => {
              // 日付列から曜日を判定（土曜=blue, 日曜=red）
              const firstColValue = String(row[displayColumns[0]?.key] || '');
              const isSaturday = firstColValue.includes('（土）') || firstColValue.includes('(土)');
              const isSunday = firstColValue.includes('（日）') || firstColValue.includes('(日)') || firstColValue.includes('（祝）') || firstColValue.includes('(祝)');
              const dayRowClass = isSunday ? 'bg-red-50/60' : isSaturday ? 'bg-blue-50/60' : '';

              return (
                <tr key={rowIndex} className={`border-b border-stroke last:border-b-0 hover:bg-gray-1 ${dayRowClass}`}>
                  {displayColumns.map((column) => {
                    const cellValue = column.render
                      ? column.render(row[column.key], row)
                      : formatValue(row[column.key], column.format);
                    const isFirstCol = column.key === displayColumns[0]?.key;
                    const textColorClass = isFirstCol && isSunday ? 'text-red-500' : isFirstCol && isSaturday ? 'text-blue-500' : 'text-dark';

                    // 比較モード: セル内に当期値+バッジ（上）、前期値（下）を表示
                    if (isComparing && column.comparison) {
                      const prevValue = row[`${column.key}_prev`];
                      const changeValue = row[`${column.key}_change`];
                      const prevRow = {};
                      displayColumns.forEach(col => {
                        if (col.comparison) prevRow[col.key] = row[`${col.key}_prev`];
                      });
                      const formattedPrev = prevValue == null
                        ? '—'
                        : column.render
                          ? column.render(prevValue, prevRow)
                          : formatValue(prevValue, column.format);

                      return (
                        <td
                          key={column.key}
                          className={`whitespace-nowrap px-4 py-2.5 ${
                            column.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          <div className="grid gap-0.5" style={{ gridTemplateColumns: '1fr 72px' }}>
                            <span className={`text-sm ${textColorClass} ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                              {cellValue}
                            </span>
                            <span className="pl-1.5">
                              <ComparisonBadge value={changeValue} invertColor={column.invertColor} />
                            </span>
                            <span className={`text-sm text-gray-400 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                              {formattedPrev}
                            </span>
                            <span></span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap px-4 py-3 text-sm ${textColorClass} ${
                          column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {totalsRow && (
            <tfoot>
              <tr className="border-t-2 border-primary-mid/30 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5 font-semibold">
                {displayColumns.map((column) => {
                  const isFirstCol = column.key === displayColumns[0]?.key;
                  const cellValue = isFirstCol
                    ? totalsRow[column.key]
                    : totalsRow[column.key] != null
                      ? (column.render
                          ? column.render(totalsRow[column.key], totalsRow)
                          : formatValue(totalsRow[column.key], column.format))
                      : '';

                  // 比較モード: 合計行もセル内2段で表示
                  if (isComparing && column.comparison && !isFirstCol) {
                    const prevValue = totalsRow[`${column.key}_prev`];
                    const changeValue = totalsRow[`${column.key}_change`];
                    const formattedPrev = prevValue == null
                      ? '—'
                      : column.render
                        ? column.render(prevValue, totalsRow)
                        : formatValue(prevValue, column.format);

                    return (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap px-4 py-2.5 ${
                          column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div className="grid gap-0.5" style={{ gridTemplateColumns: '1fr 72px' }}>
                          <span className={`text-sm text-dark ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                            {cellValue}
                          </span>
                          <span className="pl-1.5">
                            <ComparisonBadge value={changeValue} invertColor={column.invertColor} />
                          </span>
                          <span className={`text-sm text-gray-400 font-medium ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                            {formattedPrev}
                          </span>
                          <span></span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={column.key}
                      className={`whitespace-nowrap px-4 py-3 text-sm text-dark ${
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ページネーション */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stroke px-4 py-3">
          <div className="text-sm text-body-color">
            {sortedData.length}件中 {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, sortedData.length)}件を表示
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-md border border-stroke px-3 py-1 text-sm text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              前へ
            </button>
            <span className="text-sm text-body-color">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-stroke px-3 py-1 text-sm text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
