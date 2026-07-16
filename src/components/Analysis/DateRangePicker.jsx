import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { ja } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameDay } from 'date-fns';
import holidayJp from '@holiday-jp/holiday_jp';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, GitCompareArrows } from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { Button } from '../ui/button';
import 'react-day-picker/style.css';

const PRESETS = [
  { label: '先月', getRange: () => { const m = subMonths(new Date(), 1); return { from: startOfMonth(m), to: endOfMonth(m) }; } },
  { label: '今月', getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
];

const COMPARISON_MODES = [
  { value: 'none', label: '比較OFF' },
  { value: 'previous', label: '前期間' },
  { value: 'yearAgo', label: '前年同期' },
  { value: 'custom', label: 'カスタム' },
];

function getHolidaysForMonths(...months) {
  const all = [];
  const seen = new Set();
  months.forEach((date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const holidays = holidayJp.between(new Date(year, month - 1, 1), new Date(year, month, 0));
    holidays.forEach((h) => {
      const key = h.date.toString();
      if (!seen.has(key)) { seen.add(key); all.push(h); }
    });
  });
  return all;
}

/**
 * カレンダーの共通props
 */
function useCalendarProps(monthDates) {
  const holidays = useMemo(() => getHolidaysForMonths(...monthDates), [monthDates]);
  const holidayDates = useMemo(() => holidays.map((h) => new Date(h.date)), [holidays]);

  const getHolidayName = (date) => {
    const found = holidays.find((h) => isSameDay(new Date(h.date), date));
    return found ? found.name : null;
  };

  const modifiers = {
    sunday: { dayOfWeek: [0] },
    saturday: { dayOfWeek: [6] },
    holiday: holidayDates,
  };

  const modifiersClassNames = {
    sunday: 'rdp-day--sunday',
    saturday: 'rdp-day--saturday',
    holiday: 'rdp-day--holiday',
  };

  const renderDay = (day) => {
    const date = day.date || day;
    const dayNum = date.getDate();
    const isHoliday = holidayDates.some((h) => isSameDay(h, date));
    const holidayName = isHoliday ? getHolidayName(date) : null;
    return (
      <div className="relative flex flex-col items-center leading-none">
        <span>{dayNum}</span>
        {isHoliday && (
          <>
            <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 h-[5px] w-[5px] rounded-full bg-red-500 z-10" />
            <span
              className="absolute inset-0 z-20"
              title={holidayName}
            />
          </>
        )}
      </div>
    );
  };

  return { modifiers, modifiersClassNames, renderDay };
}

/**
 * 月ナビゲーションヘッダー
 */
function MonthNav({ label, month, onPrev, onNext }) {
  return (
    <div className="mb-1">
      {label && <div className="text-center text-[11px] font-medium text-gray-400 mb-1">{label}</div>}
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="rounded-full p-1 hover:bg-gray-100 transition">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <span className="text-[13px] font-semibold text-gray-700">
          {format(month, 'yyyy年M月', { locale: ja })}
        </span>
        <button onClick={onNext} className="rounded-full p-1 hover:bg-gray-100 transition">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

/**
 * 日付範囲選択カレンダーコンポーネント
 * @param {Array<{label:string,getRange:()=>{from:Date,to:Date}}>} [presets] 指定時はプリセット群を差し替え（既定: 先月/今月）
 * @param {string} [triggerClassName] 指定時はトリガーボタンの className を差し替え（compact 時は無視）
 * @param {boolean} [showChevron] トリガーボタン右端に ChevronDown を表示（セレクトボックス風）
 */
export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
  hideComparison = false,
  compact = false,
  presets,
  triggerClassName,
  showChevron = false,
}) {
  const presetList = Array.isArray(presets) && presets.length > 0 ? presets : PRESETS;
  const { comparisonMode, setComparisonMode, comparisonDateRange, setCustomComparisonRange } = useSite();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  // クリックフェーズ: 'start' = 次クリックで開始日, 'end' = 次クリックで終了日
  const [mainClickPhase, setMainClickPhase] = useState('start');
  const [displayMonth, setDisplayMonth] = useState(
    dateRange?.from ? new Date(dateRange.from) : new Date()
  );

  // カスタム比較用state（左右独立）
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [customLeftRange, setCustomLeftRange] = useState(null); // 左=対象期間
  const [customLeftPhase, setCustomLeftPhase] = useState('start');
  const [customRightRange, setCustomRightRange] = useState(null); // 右=比較期間
  const [customRightPhase, setCustomRightPhase] = useState('start');
  const [customLeftMonth, setCustomLeftMonth] = useState(
    dateRange?.from ? new Date(dateRange.from) : new Date()
  );
  const [customRightMonth, setCustomRightMonth] = useState(
    dateRange?.from ? subMonths(new Date(dateRange.from), 1) : subMonths(new Date(), 1)
  );

  const containerRef = useRef(null);

  // dateRangeが外部から変更されたら反映
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setSelectedRange({ from: new Date(dateRange.from), to: new Date(dateRange.to) });
    }
  }, [dateRange?.from, dateRange?.to]);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowCustomCalendar(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // メインカレンダーの祝日
  const mainMonthDates = useMemo(() => [displayMonth], [displayMonth]);
  const mainCalProps = useCalendarProps(mainMonthDates);

  // カスタム比較カレンダーの祝日
  const customMonthDates = useMemo(() => [customLeftMonth, customRightMonth], [customLeftMonth, customRightMonth]);
  const customCalProps = useCalendarProps(customMonthDates);

  // 2クリック選択ハンドラ生成（1=開始, 2=終了, 3=リセットして開始）
  // react-day-picker の range モードは from=to=undefined だと単日ハイライトが出ない仕様があるため、
  // 1クリック時は from=to=同じ日付を入れて確実にハイライトさせる
  const createTwoClickHandler = (phase, setPhase, setRange) => (day) => {
    if (!day) return;
    if (phase === 'start') {
      setRange({ from: day, to: day });
      setPhase('end');
    } else {
      setRange((prev) => {
        const from = prev?.from;
        if (!from) return { from: day, to: day };
        if (day < from) return { from: day, to: from };
        return { from, to: day };
      });
      setPhase('start');
    }
  };

  const handleMainDayClick = createTwoClickHandler(mainClickPhase, setMainClickPhase, setSelectedRange);
  const handleCustomLeftDayClick = createTwoClickHandler(customLeftPhase, setCustomLeftPhase, setCustomLeftRange);
  const handleCustomRightDayClick = createTwoClickHandler(customRightPhase, setCustomRightPhase, setCustomRightRange);

  // プリセットクリック
  const handlePreset = (preset) => {
    const range = preset.getRange();
    setSelectedRange(range);
    setMainClickPhase('start');
    setDisplayMonth(range.from);
  };

  // 適用
  const handleApply = () => {
    if (selectedRange?.from && selectedRange?.to) {
      onDateRangeChange({
        from: format(selectedRange.from, 'yyyy-MM-dd'),
        to: format(selectedRange.to, 'yyyy-MM-dd'),
      });
      setIsOpen(false);
    }
  };

  // カスタム比較期間の適用（左=対象期間、右=比較期間）
  const handleCustomCompApply = () => {
    if (customLeftRange?.from && customLeftRange?.to && customRightRange?.from && customRightRange?.to) {
      // 左の対象期間をメイン日付範囲として適用
      onDateRangeChange({
        from: format(customLeftRange.from, 'yyyy-MM-dd'),
        to: format(customLeftRange.to, 'yyyy-MM-dd'),
      });
      // 右の比較期間をカスタム比較として適用
      setCustomComparisonRange({
        from: format(customRightRange.from, 'yyyy-MM-dd'),
        to: format(customRightRange.to, 'yyyy-MM-dd'),
      });
      setShowCustomCalendar(false);
      setIsOpen(false);
    }
  };

  // 比較モード切替
  const handleCompModeChange = (mode) => {
    setComparisonMode(mode);
    if (mode === 'custom') {
      const fromDate = dateRange?.from ? new Date(dateRange.from) : new Date();
      setCustomLeftMonth(fromDate);
      setCustomRightMonth(subMonths(fromDate, 1));
      // 左カレンダーは現在の選択期間で初期化
      if (dateRange?.from && dateRange?.to) {
        setCustomLeftRange({ from: new Date(dateRange.from), to: new Date(dateRange.to) });
      } else {
        setCustomLeftRange(null);
      }
      setCustomRightRange(null);
      setShowCustomCalendar(true);
    } else {
      setShowCustomCalendar(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* トリガーボタン */}
      <button
        onClick={() => {
          if (!isOpen && dateRange?.from) setDisplayMonth(new Date(dateRange.from));
          setIsOpen(!isOpen);
          setShowCustomCalendar(false);
          // 開くたびにクリックフェーズを開始日待ちに戻す
          if (!isOpen) {
            setMainClickPhase('start');
            setCustomLeftPhase('start');
            setCustomRightPhase('start');
          }
        }}
        className={compact
          ? "flex h-9 w-9 items-center justify-center rounded-lg text-body-color hover:bg-gray-100"
          : (triggerClassName || "flex items-center gap-2 rounded-lg border border-stroke bg-white px-3.5 py-2 shadow-sm transition-all duration-200 hover:border-primary hover:shadow focus:outline-none")
        }
      >
        <Calendar className={compact ? "h-5 w-5" : "h-4 w-4 text-gray-400 shrink-0"} />
        {!compact && (
          <div className="flex flex-col items-start">
            {dateRange?.from && dateRange?.to ? (
              <span className="text-sm font-medium text-dark leading-tight">
                {format(new Date(dateRange.from), 'yyyy-MM-dd')} - {format(new Date(dateRange.to), 'yyyy-MM-dd')}
              </span>
            ) : (
              <span className="text-sm font-medium text-dark">期間を選択</span>
            )}
            {!hideComparison && comparisonMode !== 'none' && comparisonDateRange && (
              <span className="text-xs leading-tight text-blue-500">
                比較:{comparisonDateRange.from} ~ {comparisonDateRange.to}
              </span>
            )}
          </div>
        )}
        {!compact && showChevron && <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {/* メインカレンダードロップダウン */}
      {isOpen && !showCustomCalendar && (
        <div className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-gray-200 bg-white shadow-lg w-[290px]">
          {/* プリセット */}
          <div className="flex flex-wrap gap-1 border-b border-gray-100 px-3 pt-2.5 pb-2">
            {presetList.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className="rounded border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 transition hover:bg-primary hover:text-white hover:border-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 月ナビ */}
          <MonthNav
            month={displayMonth}
            onPrev={() => setDisplayMonth(subMonths(displayMonth, 1))}
            onNext={() => setDisplayMonth(addMonths(displayMonth, 1))}
          />

          {/* カレンダー */}
          <div className="gr-datepicker px-1.5 pb-1">
            <DayPicker
              mode="range"
              locale={ja}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              selected={selectedRange}
              onSelect={(_libRange, triggerDay) => handleMainDayClick(triggerDay)}
              modifiers={mainCalProps.modifiers}
              modifiersClassNames={mainCalProps.modifiersClassNames}
              components={{ DayDate: mainCalProps.renderDay }}
              hideNavigation
              weekStartsOn={0}
            />
          </div>

          {/* 比較モード */}
          {!hideComparison && (
          <div className="border-t border-gray-100 px-3 py-2">
            <div className="mb-1">
              <span className="text-[11px] font-medium text-gray-500">期間比較</span>
            </div>
            <div className="flex gap-1">
              {COMPARISON_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleCompModeChange(mode.value)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    comparisonMode === mode.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {comparisonMode !== 'none' && comparisonMode !== 'custom' && comparisonDateRange && (
              <p className="mt-1 text-[10px] text-blue-500">
                比較: {comparisonDateRange.from} ~ {comparisonDateRange.to}
              </p>
            )}
          </div>
          )}

          {/* フッター */}
          <div className="flex items-center border-t border-gray-100 px-3 py-2">
            <div className="flex-1 min-w-0 mr-2">
              {/* phase='end' の間は 1クリック目完了状態 → 開始日のみ表示 */}
              {mainClickPhase === 'end' && selectedRange?.from ? (
                <span className="text-[11px] truncate block">
                  <span className="text-gray-500">開始</span>{' '}
                  <span className="text-gray-800 font-medium">{format(selectedRange.from, 'yyyy/M/d')}</span>
                  <span className="text-blue-500"> → 次に終了日をクリック</span>
                </span>
              ) : selectedRange?.from && selectedRange?.to ? (
                <span className="text-[11px] truncate block">
                  <span className="text-gray-500">開始</span>{' '}
                  <span className="text-gray-800 font-medium">{format(selectedRange.from, 'yyyy/M/d')}</span>
                  <span className="text-gray-400"> 〜 </span>
                  <span className="text-gray-500">終了</span>{' '}
                  <span className="text-gray-800 font-medium">{format(selectedRange.to, 'yyyy/M/d')}</span>
                </span>
              ) : (
                <span className="text-[11px] text-blue-500">最初に開始日をクリック</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="primary"
                size="sm"
                pill
                onClick={handleApply}
                disabled={mainClickPhase === 'end' || !selectedRange?.from || !selectedRange?.to}
              >
                適用
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* カスタム比較: 左=対象期間（青）、右=比較期間（アンバー） */}
      {isOpen && showCustomCalendar && (
        <div className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex divide-x divide-gray-100">
            {/* 左カレンダー: 対象期間（青） */}
            <div className="px-3 pt-2 pb-1">
              <MonthNav
                label="対象期間"
                month={customLeftMonth}
                onPrev={() => setCustomLeftMonth(subMonths(customLeftMonth, 1))}
                onNext={() => setCustomLeftMonth(addMonths(customLeftMonth, 1))}
              />
              <div className="gr-datepicker">
                <DayPicker
                  mode="range"
                  locale={ja}
                  month={customLeftMonth}
                  onMonthChange={setCustomLeftMonth}
                  selected={customLeftRange}
                  onSelect={(_libRange, triggerDay) => handleCustomLeftDayClick(triggerDay)}
                  modifiers={customCalProps.modifiers}
                  modifiersClassNames={customCalProps.modifiersClassNames}
                  components={{ DayDate: customCalProps.renderDay }}
                  hideNavigation
                  weekStartsOn={0}
                />
              </div>
            </div>

            {/* 右カレンダー: 比較期間（アンバー） */}
            <div className="px-3 pt-2 pb-1">
              <MonthNav
                label="比較期間"
                month={customRightMonth}
                onPrev={() => setCustomRightMonth(subMonths(customRightMonth, 1))}
                onNext={() => setCustomRightMonth(addMonths(customRightMonth, 1))}
              />
              <div className="gr-datepicker-comp">
                <DayPicker
                  mode="range"
                  locale={ja}
                  month={customRightMonth}
                  onMonthChange={setCustomRightMonth}
                  selected={customRightRange}
                  onSelect={(_libRange, triggerDay) => handleCustomRightDayClick(triggerDay)}
                  modifiers={customCalProps.modifiers}
                  modifiersClassNames={customCalProps.modifiersClassNames}
                  components={{ DayDate: customCalProps.renderDay }}
                  hideNavigation
                  weekStartsOn={0}
                />
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center border-t border-gray-100 px-3 py-2">
            <div className="flex-1 min-w-0 mr-2 space-y-0.5">
              {customLeftRange?.from && customLeftRange?.to && (
                <span className="text-[11px] text-blue-600 font-medium truncate block">
                  対象: {format(customLeftRange.from, 'yyyy/MM/dd')} ~ {format(customLeftRange.to, 'yyyy/MM/dd')}
                </span>
              )}
              {customRightRange?.from && customRightRange?.to ? (
                <span className="text-[11px] text-amber-600 font-medium truncate block">
                  比較: {format(customRightRange.from, 'yyyy/MM/dd')} ~ {format(customRightRange.to, 'yyyy/MM/dd')}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">両方の期間を選択してください</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                pill
                onClick={() => setShowCustomCalendar(false)}
              >
                戻る
              </Button>
              <Button
                variant="primary"
                size="sm"
                pill
                onClick={handleCustomCompApply}
                disabled={customLeftPhase === 'end' || customRightPhase === 'end' || !customLeftRange?.from || !customLeftRange?.to || !customRightRange?.from || !customRightRange?.to}
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
