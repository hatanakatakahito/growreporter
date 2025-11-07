import { useEffect } from 'react';
import { setPageTitle } from '../../../utils/pageTitle';
import { Globe, Construction } from 'lucide-react';

/**
 * サイト管理（プレースホルダー）
 */
export default function AdminSiteList() {
  useEffect(() => {
    setPageTitle('サイト管理');
  }, []);

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">サイト管理</h2>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">
          全サイトの管理と詳細確認
        </p>
      </div>

      {/* プレースホルダー */}
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-stroke bg-white p-12 dark:border-dark-3 dark:bg-dark-2">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-3 text-xl font-bold text-dark dark:text-white">
            サイト管理機能
          </h3>
          <p className="mb-4 text-body-color dark:text-dark-6">
            この機能は現在開発中です。
          </p>
          <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2 text-sm text-orange-600 dark:bg-orange-900/20">
            <Construction className="h-4 w-4" />
            <span>Phase 2で実装予定</span>
          </div>
        </div>
      </div>
    </div>
  );
}

