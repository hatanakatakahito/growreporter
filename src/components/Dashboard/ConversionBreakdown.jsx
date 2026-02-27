import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Settings } from 'lucide-react';

/**
 * コンバージョン内訳
 */
export default function ConversionBreakdown({ conversionEvents, conversionsData, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">コンバージョン内訳</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-dark-3" />
                <div className="h-4 w-12 rounded bg-gray-200 dark:bg-dark-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const events = conversionEvents || [];

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">コンバージョン内訳</h3>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Target className="h-10 w-10 text-body-color/40" />
          <p className="text-sm text-body-color">コンバージョンが設定されていません</p>
          <Link
            to="/sites/list"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90"
          >
            <Settings className="h-3.5 w-3.5" />
            サイト設定で登録
          </Link>
        </div>
      </div>
    );
  }

  const items = events.map((ev) => ({
    name: ev.displayName || ev.eventName,
    count: conversionsData?.[ev.eventName] || 0,
  }));

  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">コンバージョン内訳</h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-dark dark:text-white">{item.name}</span>
              <span className="text-sm font-semibold text-dark dark:text-white">
                {item.count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
