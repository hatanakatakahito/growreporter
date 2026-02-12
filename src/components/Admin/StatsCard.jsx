/**
 * 統計カードコンポーネント
 */
export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-500',
    blue: 'bg-blue-500/10 text-blue-500',
    orange: 'bg-orange-500/10 text-orange-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-body-color dark:text-dark-6">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-dark dark:text-white">
            {value !== null && value !== undefined ? value.toLocaleString() : '-'}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-body-color dark:text-dark-6">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${colorClasses[color] || colorClasses.primary}`}>
            <Icon className="h-7 w-7" />
          </div>
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

