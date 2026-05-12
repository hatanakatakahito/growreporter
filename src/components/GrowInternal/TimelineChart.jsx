import React, { useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import CopyButton from './CopyButton';
import { fmtNumber, fmtPercent } from './closeMeetingFormat';

const TIMELINE_METRICS = [
  { key: 'sessions', label: 'セッション', color: '#3758F9', type: 'number' },
  { key: 'users', label: 'ユーザー', color: '#94a3b8', type: 'number' },
  { key: 'newUsers', label: '新規ユーザー', color: '#0ea5e9', type: 'number' },
  { key: 'conversions', label: 'CV数', color: '#f59e0b', type: 'number' },
  { key: 'pageViews', label: 'PV', color: '#a78bfa', type: 'number' },
  { key: 'engagementRate', label: 'エンゲージ率', color: '#10b981', type: 'percent' },
];

function findLaunchBucketLabel(timeseries, launchDate) {
  if (!timeseries?.length || !launchDate) return null;
  const found = timeseries.find((r) => r.bucket >= launchDate);
  return (found || timeseries[timeseries.length - 1])?.label || null;
}

/**
 * 公開前後の推移グラフ（公開日に縦線、粒度は呼び出し側で決定済み）
 * - 指標トグル選択式（既定: セッション）
 * - 「コピー」= グラフを PNG 画像としてクリップボードへ
 */
export default function TimelineChart({ timeseries = [], launchDate, granularity = 'day', hideCopy = false }) {
  const chartRef = useRef(null);
  const [active, setActive] = useState(['sessions']);

  const launchLabel = useMemo(() => findLaunchBucketLabel(timeseries, launchDate), [timeseries, launchDate]);
  const activeMetrics = TIMELINE_METRICS.filter((m) => active.includes(m.key));
  const hasPercent = activeMetrics.some((m) => m.type === 'percent');
  const granLabel = granularity === 'day' ? '日次' : granularity === 'week' ? '週次' : '月次';

  const toggle = (key) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length ? next : prev;
      }
      return [...prev, key];
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          公開前後の推移（{granLabel}）
        </h2>
        {!hideCopy && <CopyButton variant="chart-image" getTarget={() => chartRef.current} filename="close-meeting-timeline.png" label="コピー" />}
      </div>

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TIMELINE_METRICS.map((m) => {
            const on = active.includes(m.key);
            return (
              <label
                key={m.key}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition ${
                  on ? 'border-primary/30 bg-primary/5 text-primary' : 'border-stroke text-slate-500 hover:bg-slate-50'
                }`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(m.key)} />
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                {m.label}
              </label>
            );
          })}
        </div>

        {timeseries.length === 0 ? (
          <div className="rounded-md border border-stroke p-12 text-center">
            <p className="text-body-color">表示するデータがありません。</p>
          </div>
        ) : (
          <div ref={chartRef} className="rounded-md bg-white p-3">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeseries} margin={{ top: 14, right: 14, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" width={48} />
                {hasPercent && (
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#e2e8f0" tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`} />
                )}
                <Tooltip
                  formatter={(value, name) => {
                    const m = TIMELINE_METRICS.find((x) => x.label === name);
                    return m?.type === 'percent' ? fmtPercent(value) : fmtNumber(value);
                  }}
                />
                {launchLabel && (
                  <ReferenceLine x={launchLabel} yAxisId="left" stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'リニューアル公開', position: 'top', fontSize: 10, fill: '#64748b' }} />
                )}
                {activeMetrics.map((m) => (
                  <Line key={m.key} yAxisId={m.type === 'percent' ? 'right' : 'left'} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={m.key === 'sessions' ? 2.2 : 1.6} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
