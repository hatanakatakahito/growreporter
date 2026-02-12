import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

/**
 * アドミン画面のレイアウト
 */
export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
      {/* サイドバー */}
      <AdminSidebar />

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <AdminHeader />

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

