import React from 'react';

/**
 * スケルトンローディングコンポーネント（パフォーマンス最適化）
 * 読み込み中のUIを視覚的に表示し、より良いUXを提供
 */

// 基本的なスケルトンボックス
export function SkeletonBox({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-dark-3 ${className}`}
    />
  );
}

// テーブル用スケルトン
export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
      {/* ヘッダー */}
      <div className="border-b border-stroke bg-gray-50 px-4 py-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBox key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* 行 */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="border-b border-stroke px-4 py-4 last:border-b-0 dark:border-dark-3"
        >
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <SkeletonBox key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// カード用スケルトン
export function SkeletonCard({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2"
        >
          <SkeletonBox className="mb-3 h-4 w-1/2" />
          <SkeletonBox className="mb-2 h-8 w-full" />
          <SkeletonBox className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ダッシュボード用スケルトン
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2"
          >
            <SkeletonBox className="mb-3 h-4 w-3/4" />
            <SkeletonBox className="mb-2 h-10 w-1/2" />
            <SkeletonBox className="h-3 w-2/3" />
          </div>
        ))}
      </div>

      {/* チャート */}
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <SkeletonBox className="mb-4 h-6 w-1/4" />
        <SkeletonBox className="h-64 w-full" />
      </div>

      {/* テーブル */}
      <SkeletonTable rows={3} columns={4} />
    </div>
  );
}

// チャート用スケルトン
export function SkeletonChart({ height = 'h-64' }) {
  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <SkeletonBox className="mb-4 h-6 w-1/3" />
      <SkeletonBox className={`w-full ${height}`} />
    </div>
  );
}

// 汎用スケルトンローディング
export function SkeletonLoading({ type = 'table', ...props }) {
  switch (type) {
    case 'table':
      return <SkeletonTable {...props} />;
    case 'card':
      return <SkeletonCard {...props} />;
    case 'dashboard':
      return <SkeletonDashboard {...props} />;
    case 'chart':
      return <SkeletonChart {...props} />;
    default:
      return <SkeletonTable {...props} />;
  }
}

export default SkeletonLoading;

