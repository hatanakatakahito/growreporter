import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * 統計カードコンポーネント
 */
export default function StatsCard({ title, value, subtitle, trend, trendValue, color = 'primary' }) {

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div>
        <p className="text-sm text-body-color dark:text-dark-6">{title}</p>
        <h3 className="mt-2 text-3xl font-bold text-dark dark:text-white">
          {value !== null && value !== undefined ? value.toLocaleString() : '-'}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-body-color dark:text-dark-6">{subtitle}</p>
        )}
      </div>

      {trend && trendValue !== null && trendValue !== undefined && (
        <div className="mt-4 flex items-center gap-1">
          {trend === 'up' && (
            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-green-500">
              <ArrowUpRight className="h-4 w-4" /> +{trendValue}
            </span>
          )}
          {trend === 'down' && (
            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-red-500">
              <ArrowDownRight className="h-4 w-4" /> -{trendValue}
            </span>
          )}
          <span className="text-xs text-body-color dark:text-dark-6">今月</span>
        </div>
      )}
    </div>
  );
}

