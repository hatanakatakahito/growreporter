import React, { useRef, useState } from 'react';
import { Target } from 'lucide-react';
import CopyButton from './CopyButton';
import CollapseToggle from './CollapseToggle';
import { fmtNumber, fmtPercent, periodLabels } from './closeMeetingFormat';
import { computeKpiTargetRows } from '../../utils/kpiTargetResolve';

function fmtVal(value, isRate) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  if (!isRate) return fmtNumber(value);
  const v = Number(value);
  return fmtPercent(v > 1 ? v / 100 : v);
}

/** KPI予実テーブル（白カード）。サイトに kpiSettings.kpiList があるときのみ表示 */
export default function KpiTargetTable({ kpiList, actuals, observationDays, hideCopy = false, meetingType = 'close', footer = null, collapsible = false }) {
  const tableRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const L = periodLabels(meetingType);
  if (!Array.isArray(kpiList) || kpiList.length === 0 || !actuals) return null;

  const rows = computeKpiTargetRows(kpiList, actuals);

  const barColor = (a) => (a == null ? 'bg-slate-300' : a >= 100 ? 'bg-emerald-500' : a >= 80 ? 'bg-amber-400' : 'bg-rose-400');
  const textColor = (a) => (a == null ? 'text-slate-400' : a >= 100 ? 'text-emerald-700' : a >= 80 ? 'text-amber-600' : 'text-rose-500');

  return (
    <section className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          {collapsible && <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />}
          <Target className="h-4 w-4 text-slate-400" />
          KPI 予実（{L.after}）
        </h2>
        {!hideCopy && !collapsed && <CopyButton variant="html-table" getTarget={() => tableRef.current} label="コピー" />}
      </div>
      <div className={`overflow-x-auto ${collapsed ? 'hidden' : ''}`}>
        <table ref={tableRef} className="w-full text-sm tabular-nums">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold text-slate-400">
            <tr>
              <th className="px-5 py-2.5">KPI</th>
              <th className="px-5 py-2.5 text-right">月次目標</th>
              <th className="px-5 py-2.5 text-right">観測期間 実績</th>
              <th className="px-5 py-2.5 text-right">達成率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const w = r.achievement == null ? 0 : Math.max(0, Math.min(100, r.achievement));
              return (
                <tr key={`${r.name}-${i}`} className="border-t border-stroke">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{r.name}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtVal(r.target, r.isRate)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-800">{fmtVal(r.actual, r.isRate)}</td>
                  <td className="px-5 py-2.5 text-right">
                    {r.achievement == null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-16 rounded-full bg-slate-200 sm:inline-block">
                          <span className={`block h-full rounded-full ${barColor(r.achievement)}`} style={{ width: `${w}%` }} />
                        </span>
                        <span className={`font-semibold ${textColor(r.achievement)}`}>{r.achievement.toFixed(1)}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={`border-t border-stroke px-5 py-2.5 text-[11px] text-slate-400 ${collapsed ? 'hidden' : ''}`}>
        ※ 達成率は「月次目標」に対する観測期間
        {observationDays ? `（約 ${observationDays} 日間）` : ''}
        の実績比です。観測期間が1ヶ月より長い/短い場合は目安としてご覧ください。
      </div>
      {footer && !collapsed && <div className="border-t border-stroke p-4">{footer}</div>}
    </section>
  );
}
