import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

/**
 * アドミン画面のレイアウト
 * メインアプリのMainLayout に合わせたデザイン
 */
export default function AdminLayout() {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f0f2f8]">
      {/* アンビエントグラデーション背景（メインアプリと同じ） */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-20 h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[100px]" />
        <div className="absolute bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-200/30 blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 h-[300px] w-[300px] rounded-full bg-sky-200/20 blur-[80px]" />
      </div>

      {/* サイドバー */}
      <AdminSidebar />

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <AdminHeader />

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-content px-6 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
