import { useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';

/**
 * アドミンダッシュボード
 * システム全体の統計を表示
 */
export default function AdminDashboard() {
  useEffect(() => {
    setPageTitle('管理ダッシュボード');
  }, []);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">
        システムダッシュボード
      </h2>

      {/* 統計カード（次のステップで実装） */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <p className="text-sm text-body-color dark:text-dark-6">準備中...</p>
        </div>
      </div>
    </div>
  );
}

