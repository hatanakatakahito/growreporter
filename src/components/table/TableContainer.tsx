'use client';

/**
 * テーブルコンテナ共通コンポーネント
 * 全てのデータテーブルで統一された見た目を提供
 */

interface TableContainerProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export default function TableContainer({
  title,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'データがありません。'
}: TableContainerProps) {
  return (
    <div className="mb-6 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2" style={{ overflow: 'visible' }}>
      <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          {title}
        </h3>
      </div>
      <div style={{ overflow: 'visible' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : isEmpty ? (
          <div className="py-10 text-center">
            <p className="text-body-color dark:text-dark-6">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div style={{ overflow: 'visible' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}


