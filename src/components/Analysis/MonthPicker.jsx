import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addYears, subYears } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

const PRESETS = [
  { label: '先月', getMonth: () => subMonths(new Date(), 1) },
  { label: '今月', getMonth: () => new Date() },
];

/**
 * 月単位ピッカー（DateRangePickerのUIを踏襲した月選択版）
 * 選択した月の1日〜末日を dateRange として返す
 */
export default function MonthPicker({ dateRange, onDateRangeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const initialMonth = dateRange?.to ? new Date(dateRange.to) : new Date();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [displayYear, setDisplayYear] = useState(initialMonth.getFullYear());
  const containerRef = useRef(null);

  useEffect(() => {
    if (dateRange?.to) {
      const d = new Date(dateRange.to);
      setSelectedMonth(d);
      setDisplayYear(d.getFullYear());
    }
  }, [dateRange?.to]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePreset = (preset) => {
    const m = preset.getMonth();
    setSelectedMonth(m);
    setDisplayYear(m.getFullYear());
  };

  const handleSelectMonth = (monthIndex) => {
    setSelectedMonth(new Date(displayYear, monthIndex, 1));
  };

  const handleApply = () => {
    if (selectedMonth) {
      onDateRangeChange({
        from: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(selectedMonth), 'yyyy-MM-dd'),
      });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    if (dateRange?.to) {
      const d = new Date(dateRange.to);
      setSelectedMonth(d);
      setDisplayYear(d.getFullYear());
    }
    setIsOpen(false);
  };

  const displayLabel = dateRange?.to
    ? format(new Date(dateRange.to), 'yyyy年M月', { locale: ja })
    : '月を選択';

  const today = new Date();
  const isSelectedMonth = (monthIndex) =>
    selectedMonth &&
    selectedMonth.getFullYear() === displayYear &&
    selectedMonth.getMonth() === monthIndex;
  const isCurrentMonth = (monthIndex) =>
    today.getFullYear() === displayYear && today.getMonth() === monthIndex;

  return (
    <div className="relative" ref={containerRef}>
      {/* トリガーボタン（DateRangePickerと同一スタイル） */}
      <button
        onClick={() => {
          if (!isOpen && dateRange?.to) {
            const d = new Date(dateRange.to);
            setSelectedMonth(d);
            setDisplayYear(d.getFullYear());
          }
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-3.5 py-2 shadow-sm transition-all duration-200 hover:border-primary hover:shadow focus:outline-none"
      >
        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-dark leading-tight">{displayLabel}</span>
        </div>
      </button>

      {/* ドロップダウン */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-gray-200 bg-white shadow-lg w-[290px]">
          {/* プリセット */}
          <div className="flex flex-wrap gap-1 border-b border-gray-100 px-3 pt-2.5 pb-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className="rounded border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 transition hover:bg-primary hover:text-white hover:border-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 年ナビ */}
          <div className="mb-1 px-3 pt-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDisplayYear((y) => y - 1)}
                className="rounded-full p-1 hover:bg-gray-100 transition"
              >
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </button>
              <span className="text-[13px] font-semibold text-gray-700">{displayYear}年</span>
              <button
                onClick={() => setDisplayYear((y) => y + 1)}
                className="rounded-full p-1 hover:bg-gray-100 transition"
              >
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* 月グリッド */}
          <div className="px-3 pb-2">
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i).map((i) => {
                const selected = isSelectedMonth(i);
                const current = isCurrentMonth(i);
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectMonth(i)}
                    className={`rounded-md py-2 text-[12px] font-medium transition ${
                      selected
                        ? 'bg-primary text-white'
                        : current
                        ? 'bg-blue-50 text-primary hover:bg-blue-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}月
                  </button>
                );
              })}
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center border-t border-gray-100 px-3 py-2">
            <div className="flex-1 min-w-0 mr-2">
              {selectedMonth && (
                <span className="text-[11px] text-gray-400 truncate block">
                  {format(selectedMonth, 'yyyy年M月', { locale: ja })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                pill
                onClick={handleCancel}
              >
                キャンセル
              </Button>
              <Button
                variant="primary"
                size="sm"
                pill
                onClick={handleApply}
                disabled={!selectedMonth}
              >
                適用
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
