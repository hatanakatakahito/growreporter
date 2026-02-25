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
        <div className="mt-4 flex items-center gap-2">
          {trend === 'up' && (
            <>
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-sm font-medium text-green-500">+{trendValue}</span>
            </>
          )}
          {trend === 'down' && (
            <>
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm font-medium text-red-500">-{trendValue}</span>
            </>
          )}
          <span className="text-xs text-body-color dark:text-dark-6">今月</span>
        </div>
      )}
    </div>
  );
}

