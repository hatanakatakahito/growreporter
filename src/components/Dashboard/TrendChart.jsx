import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import DotWaveSpinner from '../common/DotWaveSpinner';

const METRIC_OPTIONS = [
  { key: 'sessions', label: 'セッション', color: '#3758F9', axis: 'left' },
  { key: 'totalUsers', label: 'ユーザー', color: '#13C296', axis: 'left' },
  { key: 'screenPageViews', label: 'PV', color: '#F59E0B', axis: 'left' },
  { key: 'totalConversions', label: 'CV数', color: '#EF4444', axis: 'right' },
];

const formatNumber = (v) => {
  if (v == null) return '0';
  return v.toLocaleString();
};

/**
 * トレンドチャート（月次/日次タブ切替、CV数は右Y軸）
 */
export default function TrendChart({ monthlyData, dailyData, dailyConversionData, isMonthlyLoading, isDailyLoading }) {
  const [tab, setTab] = useState('monthly');
  const [selectedMetrics, setSelectedMetrics] = useState(['sessions', 'totalUsers']);

  const toggleMetric = (key) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  // 月次データ整形
  const monthlyChartData = useMemo(() => {
    if (!monthlyData?.monthlyData) return [];
    return monthlyData.monthlyData
      .map((m) => {
        const ym = String(m.yearMonth || '');
        const displayLabel = ym.length >= 6 ? `${ym.slice(0, 4)}/${ym.slice(4, 6)}` : m.month || '';
        return {
          sortKey: ym,
          label: displayLabel,
          sessions: m.sessions || 0,
          totalUsers: m.users || m.totalUsers || 0,
          screenPageViews: m.pageViews || m.screenPageViews || 0,
          totalConversions: m.conversions || m.totalConversions || 0,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [monthlyData]);

  // 日次コンバージョンをマップ化
  const dailyConversionMap = useMemo(() => {
    const map = {};
    if (dailyConversionData?.rows) {
      dailyConversionData.rows.forEach((row) => {
        map[row.date] = row.conversions || 0;
      });
    }
    return map;
  }, [dailyConversionData]);

  // 日次データ整形
  const dailyChartData = useMemo(() => {
    if (!dailyData?.rows) return [];
    return dailyData.rows
      .map((row) => {
        const date = row.date || '';
        const formatted = date.length === 8
          ? `${date.slice(4, 6)}/${date.slice(6, 8)}`
          : date;
        return {
          sortKey: date,
          label: formatted,
          sessions: row.sessions || 0,
          totalUsers: row.totalUsers || 0,
          screenPageViews: row.screenPageViews || 0,
          totalConversions: dailyConversionMap[date] || 0,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [dailyData, dailyConversionMap]);

  const chartData = tab === 'monthly' ? monthlyChartData : dailyChartData;
  const isLoading = tab === 'monthly' ? isMonthlyLoading : isDailyLoading;

  // CV数が選択されているか
  const showRightAxis = selectedMetrics.includes('totalConversions');
  // 左軸の指標があるか
  const hasLeftMetrics = selectedMetrics.some((k) => k !== 'totalConversions');

  // 左Y軸のドメイン
  const yDomainLeft = useMemo(() => {
    const leftKeys = selectedMetrics.filter((k) => k !== 'totalConversions');
    if (chartData.length === 0 || leftKeys.length === 0) return [0, 'auto'];
    const values = chartData.flatMap((d) => leftKeys.map((k) => d[k] || 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === 0) return [0, 'auto'];
    if (tab === 'monthly') return [0, 'auto'];
    const padding = Math.max(Math.round((max - min) * 0.1), 1);
    return [Math.max(0, min - padding), max + padding];
  }, [chartData, selectedMetrics, tab]);

  // 右Y軸のドメイン（CV数用）
  const yDomainRight = useMemo(() => {
    if (!showRightAxis || chartData.length === 0) return [0, 'auto'];
    const values = chartData.map((d) => d.totalConversions || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === 0) return [0, 'auto'];
    if (tab === 'monthly') return [0, 'auto'];
    const padding = Math.max(Math.round((max - min) * 0.1), 1);
    return [Math.max(0, min - padding), max + padding];
  }, [chartData, showRightAxis, tab]);

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-dark dark:text-white">トレンド</h3>
        <div className="flex items-center gap-3">
          {/* 指標選択 */}
          <div className="flex flex-wrap gap-1.5">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleMetric(opt.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedMetrics.includes(opt.key)
                    ? 'text-white'
                    : 'bg-gray-100 text-body-color hover:bg-gray-200 dark:bg-dark-3 dark:text-dark-6 dark:hover:bg-dark-3/80'
                }`}
                style={selectedMetrics.includes(opt.key) ? { backgroundColor: opt.color } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* タブ切替 */}
          <div className="flex rounded-lg border border-stroke dark:border-dark-3">
            <button
              onClick={() => setTab('monthly')}
              className={`rounded-l-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === 'monthly'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-100 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              月次
            </button>
            <button
              onClick={() => setTab('daily')}
              className={`rounded-r-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === 'daily'
                  ? 'bg-primary text-white'
                  : 'text-body-color hover:bg-gray-100 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              日次
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <DotWaveSpinner size="md" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-body-color">
          データがありません
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: showRightAxis ? 10 : 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E7" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#637381' }}
              tickLine={false}
              axisLine={{ stroke: '#E7E7E7' }}
            />
            {/* 左Y軸（セッション、ユーザー、PV） */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#637381' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
              domain={yDomainLeft}
              hide={!hasLeftMetrics}
            />
            {/* 右Y軸（CV数） */}
            {showRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#EF4444' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatNumber}
                domain={yDomainRight}
              />
            )}
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E7E7E7',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value, name) => {
                const opt = METRIC_OPTIONS.find((o) => o.key === name);
                return [value.toLocaleString(), opt?.label || name];
              }}
            />
            <Legend
              formatter={(value) => {
                const opt = METRIC_OPTIONS.find((o) => o.key === value);
                return opt?.label || value;
              }}
              wrapperStyle={{ fontSize: '12px' }}
            />
            {METRIC_OPTIONS.filter((o) => selectedMetrics.includes(o.key)).map((opt) => (
              <Line
                key={opt.key}
                type="monotone"
                dataKey={opt.key}
                yAxisId={opt.axis}
                stroke={opt.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
