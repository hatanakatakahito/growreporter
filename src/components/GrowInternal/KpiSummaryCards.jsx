import React, { useRef, useState } from 'react';
import { LayoutGrid, Table as TableIcon, BarChart3 } from 'lucide-react';
import ComparisonBadge from '../Analysis/ComparisonBadge';
import CopyButton from './CopyButton';
import { KPI_GROUPS, formatMetricValue } from './closeMeetingFormat';
import { formatChangePercent } from '../../utils/comparisonHelpers';

/** 増減%の文字色（invert: 下がると良い指標は反転） */
function changeClass(value, invert) {
  if (value == null) return 'text-slate-400';
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  if (good) return 'text-emerald-700';
  if (bad) return 'text-rose-500';
  return 'text-slate-400';
}

/**
 * サマリー指標カード（標準10指標、公開前 → 公開後 ＋ 増減%）
 * - カード表示 / 表組表示 を切替可
 * - 任意で AI 総括の要旨をカード冒頭に表示（aiExcerpt）
 * - 「コピー」（Notion 等へ貼り付け用 <table>）
 */
export default function KpiSummaryCards({ kpi, hideCopy = false, aiExcerpt = null }) {
  const tableRef = useRef(null);
  const [view, setView] = useState('card'); // 'card' | 'table'
  const after = kpi?.after;
  const comparison = kpi?.comparison;
  const changes = kpi?.changes || {};
  const hasComparison = !!kpi?.hasComparison;
  const tableVisible = view === 'table';
  const cellPad = tableVisible ? 'px-3 py-2' : '';

  return (
    <section className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          サマリー指標（公開前 → 公開後）
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-stroke p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setView('card')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                view === 'card' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />カード
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                view === 'table' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />表組
            </button>
          </div>
          {!hideCopy && <CopyButton variant="html-table" getTarget={() => tableRef.current} label="コピー" />}
        </div>
      </div>

      <div className="p-5">
        {aiExcerpt && (
          <div className="mb-5 rounded-md bg-slate-50 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2a7 7 0 00-4 12.7V17a2 2 0 002 2h4a2 2 0 002-2v-2.3A7 7 0 0012 2zM9 22h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              AI 総括の要旨
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {aiExcerpt}{' '}
              <a href="#cm-ai-summary" className="font-medium text-primary hover:underline">全文を見る ↓</a>
            </p>
          </div>
        )}

        {!after ? (
          <div className="rounded-md border border-stroke p-12 text-center">
            <p className="text-body-color">表示するデータがありません。</p>
          </div>
        ) : view === 'card' ? (
          <>
            {KPI_GROUPS.map((group, gi) => (
              <div key={group.title} className={gi === 0 ? 'mb-4' : ''}>
                <div className="mb-2 text-xs font-semibold text-slate-400">{group.title}</div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  {group.metrics.map((m) => (
                    <div key={m.key} className="rounded-md border border-stroke p-3.5">
                      <div className="text-[11px] text-slate-500">{m.label}</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-slate-800">{formatMetricValue(after[m.key], m.format)}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        {hasComparison ? (
                          <>
                            <ComparisonBadge value={changes[m.key]} invertColor={!!m.invert} />
                            {comparison && (
                              <span className="text-[11px] tabular-nums text-slate-400">前 {formatMetricValue(comparison[m.key], m.format)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-300">公開前データなし</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* コピー用テーブル（視覚的に非表示） */}
            <table ref={tableRef} className="sr-only">
              <thead>
                <tr><th>指標</th><th>公開前</th><th>公開後</th><th>増減率</th></tr>
              </thead>
              <tbody>
                {KPI_GROUPS.flatMap((g) => g.metrics).map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>{hasComparison ? formatMetricValue(comparison?.[m.key], m.format) : '—'}</td>
                    <td>{formatMetricValue(after[m.key], m.format)}</td>
                    <td>{hasComparison ? formatChangePercent(changes[m.key]) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="overflow-x-auto rounded-md border border-stroke">
            <table ref={tableRef} className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold text-slate-400">
                <tr>
                  <th className="px-3 py-2">指標</th>
                  <th className="px-3 py-2 text-right">公開前</th>
                  <th className="px-3 py-2 text-right">公開後</th>
                  <th className="px-3 py-2 text-right">増減率</th>
                </tr>
              </thead>
              <tbody>
                {KPI_GROUPS.map((g) => (
                  <React.Fragment key={g.title}>
                    <tr><td colSpan={4} className="bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-500">{g.title}</td></tr>
                    {g.metrics.map((m) => (
                      <tr key={m.key} className="border-t border-stroke">
                        <td className={`${cellPad} text-slate-700`}>{m.label}</td>
                        <td className={`${cellPad} text-right text-slate-600 tabular-nums`}>{hasComparison ? formatMetricValue(comparison?.[m.key], m.format) : '—'}</td>
                        <td className={`${cellPad} text-right font-medium text-slate-800 tabular-nums`}>{formatMetricValue(after[m.key], m.format)}</td>
                        <td className={`${cellPad} text-right`}>
                          {hasComparison ? (
                            <span className={`font-medium ${changeClass(changes[m.key], !!m.invert)}`}>{formatChangePercent(changes[m.key])}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
