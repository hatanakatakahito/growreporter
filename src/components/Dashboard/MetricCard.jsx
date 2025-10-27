import React from 'react';

export default function MetricCard({ title, value, change, icon, isLoading, format = 'number' }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-dark-3"></div>
          <div className="mb-2 h-8 w-32 rounded bg-gray-200 dark:bg-dark-3"></div>
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-dark-3"></div>
        </div>
      </div>
    );
  }

  const isPositive = change >= 0;
  
  // 値のフォーマット
  let formattedValue = value;
  if (format === 'number') {
    formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
  } else if (format === 'percent') {
    formattedValue = typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value;
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-body-color">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-dark dark:text-white">
            {formattedValue}
          </h3>
          {change !== undefined && change !== null && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-body-color">前期間比</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}



