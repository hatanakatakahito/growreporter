import React, { useState } from 'react';
import { addMonths, subDays, parseISO } from 'date-fns';
import { Pencil, Check, X as XIcon, ChevronDown, Info } from 'lucide-react';
import DateRangePicker from '../Analysis/DateRangePicker';
import { comparisonModeLabel } from '../../utils/closeMeetingPeriod';
import { recordDisplayLabel, fmtDate } from './closeMeetingFormat';

/**
 * クローズMTGレポートのサブツールバー（分析画面の AnalysisHeader の下に配置）
 * - リニューアル記録の切替ドロップダウン（＋新規作成）
 * - リニューアル公開日（インライン編集可。変更すると AI 総括はサーバ側でクリアされる）
 * - 観測期間（公開後）: 分析画面と同じ DateRangePicker（カレンダー）＋「公開後1ヶ月 / 3ヶ月」プリセット
 * - 比較期間（旧サイト）: モード選択（前年同期 / 公開前同期間 / カスタム）＋カスタム時はカレンダー
 *
 * 3 つのセレクト風コントロール（記録 / 観測期間 / 比較）はすべて同じ DROPDOWN_BTN_CLS でスタイル統一。
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateStr = (s) => DATE_RE.test(s || '') && !Number.isNaN(Date.parse(s));
// セレクト風コントロール（記録 / 観測期間 / 比較）と公開日入力で高さを統一（h-9 = 36px）
const CONTROL_H = 'h-9';
const LAUNCH_INPUT_CLS = `${CONTROL_H} rounded-md border border-stroke px-2 text-sm text-slate-800 focus:border-primary focus:outline-none`;
const DROPDOWN_BTN_CLS = `inline-flex ${CONTROL_H} items-center gap-2 rounded-md border border-stroke bg-white px-3 text-sm text-slate-700 transition hover:bg-gray-50`;
const COMPARISON_MODES = ['yoy', 'prevPeriod', 'custom'];

function Field({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function CloseMeetingHeader({
  record,
  records = [],
  onSelectRecord,
  onNewRecord,
  onUpdateRecord,
  observationRange,
  onObservationChange,
  comparison,
  comparisonRange,
  onComparisonChange,
}) {
  const [editingLaunch, setEditingLaunch] = useState(false);
  const [launchDraft, setLaunchDraft] = useState(record?.launchDate || '');
  const [recordMenuOpen, setRecordMenuOpen] = useState(false);
  const [compMenuOpen, setCompMenuOpen] = useState(false);

  const launch = record?.launchDate || '';
  const compMode = comparison?.mode || 'yoy';

  const observationPresets = isDateStr(launch)
    ? [
        {
          label: '公開後1ヶ月',
          getRange: () => {
            const l = parseISO(launch);
            return { from: l, to: subDays(addMonths(l, 1), 1) };
          },
        },
        {
          label: '公開後3ヶ月',
          getRange: () => {
            const l = parseISO(launch);
            return { from: l, to: subDays(addMonths(l, 3), 1) };
          },
        },
      ]
    : undefined;

  const startEditLaunch = () => {
    setLaunchDraft(launch);
    setEditingLaunch(true);
  };
  const commitLaunch = () => {
    if (!isDateStr(launchDraft)) return;
    if (launchDraft !== launch) {
      if (!window.confirm('公開日を変更すると、生成済みの AI 総括（ある場合）はクリアされます。よろしいですか？')) return;
    }
    onUpdateRecord({ launchDate: launchDraft });
    setEditingLaunch(false);
  };

  const handleCompMode = (mode) => {
    setCompMenuOpen(false);
    if (mode === compMode) return;
    onComparisonChange({ mode });
  };

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
        {/* リニューアル記録の切替 */}
        <Field label="リニューアル記録">
          <div className="relative">
            <button type="button" onClick={() => setRecordMenuOpen((v) => !v)} className={DROPDOWN_BTN_CLS}>
              <span className="max-w-[15rem] truncate font-medium">{recordDisplayLabel(record)}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  record?.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {record?.status === 'finalized' ? '確定済み' : '下書き'}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            {recordMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-stroke bg-white py-1 shadow-lg">
                {records.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRecordMenuOpen(false);
                      onSelectRecord(r.id);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
                      r.id === record?.id ? 'font-medium text-primary' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{recordDisplayLabel(r)}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-slate-400">{r.status === 'finalized' ? '確定' : '下書き'}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-stroke" />
                <button
                  type="button"
                  onClick={() => {
                    setRecordMenuOpen(false);
                    onNewRecord();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-primary transition hover:bg-gray-50"
                >
                  ＋ 新規リニューアル記録を作成
                </button>
              </div>
            )}
          </div>
        </Field>

        {/* リニューアル公開日 */}
        <Field label="リニューアル公開日">
          {editingLaunch ? (
            <div className="flex items-center gap-1">
              <input type="date" value={launchDraft} onChange={(e) => setLaunchDraft(e.target.value)} className={LAUNCH_INPUT_CLS} />
              <button onClick={commitLaunch} className="rounded p-1 text-green-600 transition hover:bg-green-50" aria-label="確定">
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditingLaunch(false);
                  setLaunchDraft(launch);
                }}
                className="rounded p-1 text-slate-400 transition hover:bg-gray-100"
                aria-label="キャンセル"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-slate-800">{fmtDate(launch)}</span>
              <button onClick={startEditLaunch} className="rounded p-1 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600" aria-label="公開日を編集">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </Field>

        {/* 観測期間（公開後） */}
        <Field label="観測期間（公開後）">
          <DateRangePicker
            dateRange={observationRange}
            onDateRangeChange={onObservationChange}
            hideComparison
            presets={observationPresets}
            triggerClassName={DROPDOWN_BTN_CLS}
            showChevron
          />
          {observationRange?.partial && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">計測中 残り{observationRange.remainingDays}日</span>
          )}
        </Field>

        {/* 比較期間（旧サイト） */}
        <Field label="比較期間（旧サイト）">
          <div className="relative">
            <button type="button" onClick={() => setCompMenuOpen((v) => !v)} className={DROPDOWN_BTN_CLS}>
              <span className="font-medium">{comparisonModeLabel(compMode)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            {compMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-stroke bg-white py-1 shadow-lg">
                {COMPARISON_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleCompMode(m)}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
                      m === compMode ? 'font-medium text-primary' : 'text-slate-700'
                    }`}
                  >
                    {comparisonModeLabel(m)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {compMode === 'custom' ? (
            <DateRangePicker
              dateRange={comparisonRange?.from ? { from: comparisonRange.from, to: comparisonRange.to } : null}
              onDateRangeChange={(r) => onComparisonChange({ mode: 'custom', range: r })}
              hideComparison
              triggerClassName={DROPDOWN_BTN_CLS}
              showChevron
            />
          ) : (
            comparisonRange?.from && (
              <span className="text-xs text-slate-400">
                {fmtDate(comparisonRange.from)} 〜 {fmtDate(comparisonRange.to)}
              </span>
            )
          )}
        </Field>
      </div>

      {comparisonRange?.from && comparisonRange?.to && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <Info className="h-3.5 w-3.5 shrink-0" />
          レポート内の「公開前」は {comparisonModeLabel(compMode)}（{fmtDate(comparisonRange.from)} 〜 {fmtDate(comparisonRange.to)}）＝ リニューアル前の数値です。
        </p>
      )}
    </div>
  );
}
