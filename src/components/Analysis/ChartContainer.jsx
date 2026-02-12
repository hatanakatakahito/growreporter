import React from 'react';
import { Info } from 'lucide-react';
import { getTooltip } from '../../constants/tooltips';

/**
 * 共通グラフコンテナコンポーネント
 * グラフのタイトル、説明、ツールチップを統一的に表示
 */
export default function ChartContainer({
  title,
  tooltip,
  description,
  children,
  height = 400,
  className = '',
}) {
  return (
    <div className={`rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 ${className}`}>
      {/* ヘッダー */}
      {(title || tooltip || description) && (
        <div className="mb-6">
          {(title || tooltip) && (
            <div className="mb-2 flex items-center gap-2">
              {title && (
                <h3 className="text-lg font-semibold text-dark dark:text-white">{title}</h3>
              )}
              {tooltip && (
                <div className="group relative">
                  <Info className="h-4 w-4 cursor-help text-body-color" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-dark p-2 text-xs text-white shadow-lg group-hover:block">
                    {getTooltip(tooltip)}
                  </div>
                </div>
              )}
            </div>
          )}
          {description && (
            <p className="text-sm text-body-color">{description}</p>
          )}
        </div>
      )}

      {/* グラフコンテンツ */}
      <div style={{ height: `${height}px` }} className="w-full">
        {children}
      </div>
    </div>
  );
}




