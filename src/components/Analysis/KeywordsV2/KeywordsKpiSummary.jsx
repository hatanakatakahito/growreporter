import React from 'react';

/**
 * KPI サマリー 4 枚カード
 * 検索キーワード数 / 総クリック / 推定 CV / 平均順位
 */
export default function KeywordsKpiSummary({ metrics, comparison }) {
  const items = [
    {
      label: '検索キーワード数',
      value: (metrics?.keywordCount || 0).toLocaleString(),
      change: changeRate(metrics?.keywordCount, comparison?.keywordCount),
    },
    {
      label: '総クリック数',
      value: (metrics?.totalClicks || 0).toLocaleString(),
      change: changeRate(metrics?.totalClicks, comparison?.totalClicks),
    },
    {
      label: '推定 CV 数',
      value: (metrics?.estimatedCV || 0).toLocaleString(),
      change: null,
    },
    {
      label: '平均掲載順位',
      value: `${(metrics?.avgPosition || 0).toFixed(1)} 位`,
      change: null,
      // 順位は逆: 数値が下がるほど良いので、別途処理が必要であれば後で対応
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-lg border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2"
        >
          <div className="text-xs text-body-color">{item.label}</div>
          <div className="mt-1 text-2xl font-bold text-dark dark:text-white">{item.value}</div>
          {item.change != null && (
            <div
              className={`text-[11px] font-medium ${
                item.change > 0 ? 'text-emerald-600' : item.change < 0 ? 'text-rose-600' : 'text-body-color'
              }`}
            >
              {item.change > 0 ? '▲' : item.change < 0 ? '▼' : '→'} {Math.abs(Math.round(item.change * 100))}% vs 前期
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function changeRate(current, previous) {
  if (previous == null || previous === 0 || current == null) return null;
  return (current - previous) / previous;
}
