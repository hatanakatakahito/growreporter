import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, Table2, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import CopyButton from './CopyButton';
import { formatMetricValue } from './closeMeetingFormat';
import { formatChangePercent } from '../../utils/comparisonHelpers';

/**
 * 増減%の小さなピル（invert: 下がると良い指標は反転）。null は薄いグレー。
 * 幅を固定（w-16・右寄せ）して、左隣の数値の桁位置が行ごとにずれないようにする。
 */
function ChangePill({ value, invert }) {
  if (value == null) {
    return <span className="ml-1.5 inline-block w-16 text-right text-[10px] text-slate-300">—</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  const cls = good ? 'bg-emerald-50 text-emerald-700' : bad ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400';
  return (
    <span className="ml-1.5 inline-block w-16 text-right">
      <span className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${cls}`}>{formatChangePercent(value)}</span>
    </span>
  );
}

function truncate(s, n = 64) {
  if (typeof s !== 'string') return s ?? '(なし)';
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** 表示する指標列を選ぶポップオーバー（分析画面の「表示項目」と同等。最低1つは残す） */
function ColumnPicker({ columns, visibleKeys, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-gray-50"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
        表示項目
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-stroke bg-white p-2 shadow-lg">
          {columns.map((c) => {
            const checked = visibleKeys.includes(c.key);
            const last = checked && visibleKeys.length === 1;
            return (
              <label
                key={c.key}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${last ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={last}
                  onChange={() => !last && onToggle(c.key)}
                  className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                />
                <span className="text-slate-700">{c.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 表 / グラフ の表示切替（セグメント） */
const VIEW_ITEMS = [
  { value: 'table', icon: Table2, label: '表' },
  { value: 'chart', icon: BarChart3, label: 'グラフ' },
];
function ViewToggle({ mode, onChange }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-stroke">
      {VIEW_ITEMS.map((it, idx) => {
        const Icon = it.icon;
        const on = mode === it.value;
        return (
          <React.Fragment key={it.value}>
            {idx > 0 && <span className="w-px bg-stroke" />}
            <button
              type="button"
              onClick={() => onChange(it.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                on ? 'bg-primary/5 text-primary' : 'text-slate-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {it.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

const BEFORE_COLOR = '#cbd5e1'; // slate-300
const AFTER_COLOR = '#3758F9'; // primary

/** グラフモード本体（横棒・公開前 vs 公開後 のグループ棒） */
function BreakdownChart({ rows, keyField, metricCol, hasComparison, topN, chartRef }) {
  const metricKey = metricCol?.key;
  const data = useMemo(() => {
    const arr = [...rows].sort((a, b) => (Number(b[metricKey]) || 0) - (Number(a[metricKey]) || 0));
    const capped = arr.slice(0, Math.min(topN || 25, 25));
    return capped.map((r) => {
      const prev = r[`${metricKey}_prev`];
      return {
        name: truncate(r[keyField] || '(なし)', 26),
        after: Number(r[metricKey]) || 0,
        before: hasComparison && prev != null ? Number(prev) : null,
      };
    });
  }, [rows, keyField, metricKey, hasComparison, topN]);

  const maxNameLen = data.reduce((m, d) => Math.max(m, d.name.length), 0);
  const yAxisWidth = Math.min(240, Math.max(108, Math.round(maxNameLen * 7.6)));
  const height = Math.max(260, data.length * 48 + (hasComparison ? 44 : 16) + 16);

  const fmtTick = (v) => {
    if (metricCol?.format === 'percent') return `${Math.round(Number(v) * 100)}%`;
    if (metricCol?.format === 'duration') return `${Math.round(Number(v))}秒`;
    return Number(v).toLocaleString('ja-JP');
  };

  if (data.length === 0) {
    return <div className="p-8 text-center text-sm text-body-color">グラフ化できるデータがありません。</div>;
  }

  return (
    <div className="px-3 pb-4 pt-2">
      <div ref={chartRef} className="rounded-md bg-white p-3">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 22, bottom: 4, left: 4 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis type="number" tick={{ fontSize: 13, fill: '#94a3b8' }} stroke="#e2e8f0" tickFormatter={fmtTick} />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              tick={{ fontSize: 13, fill: '#475569' }}
              stroke="#e2e8f0"
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{ fontSize: 13 }}
              formatter={(value, name) => [value == null ? '—' : formatMetricValue(value, metricCol?.format), name]}
            />
            {hasComparison && <Legend verticalAlign="top" height={30} iconType="circle" iconSize={11} wrapperStyle={{ fontSize: 13, paddingBottom: 4 }} />}
            {hasComparison && (
              <Bar dataKey="before" name="公開前" fill={BEFORE_COLOR} radius={[0, 3, 3, 0]} isAnimationActive={false} />
            )}
            <Bar dataKey="after" name="公開後" fill={AFTER_COLOR} radius={[0, 3, 3, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 汎用 before/after ブレイクダウン（チャネル/ページ/デバイス で再利用・白カード）
 * - 表モード: 指標ごとに「公開前 / 公開後」の2列＋増減ピル（hasComparison=false なら公開後のみ）。列ヘッダークリックでソート。
 * - グラフモード: 1指標を横棒で「公開前 vs 公開後」比較（指標は上部チップで切替）。
 * - 表示する指標列はヘッダーの「表示項目」で選択（表モード）。topN 指定時は上位 topN 件のみ。
 * - 表は semantic <table>（Notion 等へコピー可）、グラフは PNG 画像でコピー可。
 */
export default function BreakdownTable({
  title,
  icon = null,
  breakdown,
  columns = [],
  defaultColumns = null,
  hasComparison = false,
  topN = null,
  hideCopy = false,
}) {
  const tableRef = useRef(null);
  const chartRef = useRef(null);

  const allKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const defaultKeys = useMemo(() => {
    const d = (defaultColumns || []).filter((k) => allKeys.includes(k));
    return d.length ? d : allKeys.slice(0, 1);
  }, [defaultColumns, allKeys]);

  const [viewMode, setViewMode] = useState('chart');
  const [visibleKeys, setVisibleKeys] = useState(defaultKeys);
  const visibleColumns = useMemo(() => columns.filter((c) => visibleKeys.includes(c.key)), [columns, visibleKeys]);

  const [sortKey, setSortKey] = useState(() => defaultKeys[0] || breakdown?.defaultSortKey || allKeys[0]);
  const [sortDir, setSortDir] = useState('desc');
  useEffect(() => {
    if (visibleKeys.length && !visibleKeys.includes(sortKey)) setSortKey(visibleKeys[0]);
  }, [visibleKeys, sortKey]);

  // グラフに出す指標（表のソートとは独立。全 columns から選べる）
  const [chartMetric, setChartMetric] = useState(() => defaultKeys[0] || allKeys[0]);
  const chartCol = useMemo(() => columns.find((c) => c.key === chartMetric) || columns[0] || null, [columns, chartMetric]);

  const toggleColumn = (key) => {
    setVisibleKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      // columns の並び順を保ったまま追加
      return allKeys.filter((k) => prev.includes(k) || k === key);
    });
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const rows = useMemo(() => breakdown?.rows || [], [breakdown]);
  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = Number(a[sortKey]);
      const bv = Number(b[sortKey]);
      const an = Number.isNaN(av) ? 0 : av;
      const bn = Number.isNaN(bv) ? 0 : bv;
      return sortDir === 'desc' ? bn - an : an - bn;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const capped = !!topN && sorted.length > topN;
  const visible = topN ? sorted.slice(0, topN) : sorted;
  const isChart = viewMode === 'chart';

  return (
    <section className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {rows.length > 0 && <ViewToggle mode={viewMode} onChange={setViewMode} />}
          {!isChart && columns.length > 1 && <ColumnPicker columns={columns} visibleKeys={visibleKeys} onToggle={toggleColumn} />}
          {!hideCopy && rows.length > 0 && (
            isChart ? (
              <CopyButton variant="chart-image" getTarget={() => chartRef.current} filename="close-meeting-breakdown.png" label="コピー" />
            ) : (
              <CopyButton variant="html-table" getTarget={() => tableRef.current} label="コピー" />
            )
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-body-color">表示するデータがありません。</div>
      ) : isChart ? (
        <>
          {columns.length > 1 && (
            <div className="flex flex-wrap gap-1.5 border-b border-stroke px-5 py-3">
              {columns.map((c) => {
                const on = c.key === chartMetric;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setChartMetric(c.key)}
                    className={`rounded-md border px-2 py-1 text-[11px] transition ${
                      on ? 'border-primary/30 bg-primary/5 text-primary' : 'border-stroke text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
          <BreakdownChart rows={rows} keyField={breakdown.keyField} metricCol={chartCol} hasComparison={hasComparison} topN={topN} chartRef={chartRef} />
          {capped && (
            <div className="border-t border-stroke px-5 py-2.5 text-[11px] text-slate-400">
              上位 {topN} 件をグラフ化しています（全 {sorted.length} 件中・{chartCol?.label} の多い順）。
            </div>
          )}
        </>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold text-slate-400">
                <tr>
                  <th className="px-5 py-2.5">{breakdown.keyLabel}</th>
                  {visibleColumns.map((c) => (
                    <React.Fragment key={c.key}>
                      {hasComparison && (
                        <th className="whitespace-nowrap px-4 py-2.5 text-right leading-tight">
                          {c.label}
                          <br />
                          公開前
                        </th>
                      )}
                      <th
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-2.5 text-right leading-tight transition hover:text-slate-600"
                        onClick={() => toggleSort(c.key)}
                        title="クリックで並び替え"
                      >
                        {c.label}
                        <br />
                        公開後{sortKey === c.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {visible.map((r, i) => (
                  <tr key={`${r[breakdown.keyField] ?? ''}-${i}`} className="border-t border-stroke transition hover:bg-slate-50/60">
                    <td className="px-5 py-2.5 font-medium text-slate-700">{truncate(r[breakdown.keyField])}</td>
                    {visibleColumns.map((c) => (
                      <React.Fragment key={c.key}>
                        {hasComparison && (
                          <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500">{formatMetricValue(r[`${c.key}_prev`], c.format)}</td>
                        )}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <span className="font-medium text-slate-800">{formatMetricValue(r[c.key], c.format)}</span>
                          {hasComparison && <ChangePill value={r[`${c.key}_change`]} invert={!!c.invert} />}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {capped && (
            <div className="border-t border-stroke px-5 py-2.5 text-[11px] text-slate-400">
              上位 {topN} 件を表示しています（全 {sorted.length} 件中）。
            </div>
          )}
        </>
      )}
    </section>
  );
}
