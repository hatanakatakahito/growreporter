import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

/**
 * グラフ形式: クリック数 TOP / 表示回数 TOP / 順位 vs クリック散布図
 */
export default function KeywordsChartView({ data }) {
  const keywords = data?.keywords || [];

  // 上が最大値になるように降順で渡す（recharts は配列の先頭が最上行）
  const top10ByClicks = useMemo(
    () => [...keywords].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10),
    [keywords]
  );

  const top10ByImpressions = useMemo(
    () => [...keywords].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 10),
    [keywords]
  );

  const scatterData = useMemo(
    () =>
      keywords.slice(0, 100).map((k) => ({
        query: k.query,
        position: k.position,
        clicks: k.clicks,
        impressions: k.impressions,
      })),
    [keywords]
  );

  if (keywords.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color">表示するデータがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">クリック数 TOP 10</h3>
        <ResponsiveContainer width="100%" height={440}>
          <BarChart data={top10ByClicks} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              dataKey="query"
              type="category"
              width={180}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Bar dataKey="clicks" fill="#3758F9" name="クリック数" maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">表示回数 TOP 10</h3>
        <ResponsiveContainer width="100%" height={440}>
          <BarChart data={top10ByImpressions} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              dataKey="query"
              type="category"
              width={180}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Bar dataKey="impressions" fill="#13C296" name="表示回数" maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">クリック数 vs 順位（散布図）</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="position" name="順位" type="number" reversed label={{ value: '順位（左が上位）', position: 'bottom', offset: 20 }} />
            <YAxis dataKey="clicks" name="クリック" type="number" label={{ value: 'クリック数', angle: -90, position: 'left' }} />
            <ZAxis dataKey="impressions" range={[40, 400]} name="表示回数" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-md border border-stroke bg-white p-2 text-xs shadow-md dark:bg-dark-2 dark:border-dark-3">
                      <div className="font-semibold mb-1">{d.query}</div>
                      <div>順位: {(d.position || 0).toFixed(1)} 位</div>
                      <div>クリック: {(d.clicks || 0).toLocaleString()}</div>
                      <div>表示: {(d.impressions || 0).toLocaleString()}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="キーワード" data={scatterData} fill="#3758F9" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
