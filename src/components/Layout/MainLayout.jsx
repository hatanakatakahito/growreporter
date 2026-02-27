import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';
import SiteSelectionModal from '../common/SiteSelectionModal';

/**
 * メインレイアウトコンポーネント
 * 全ページ共通のSidebarを提供
 * Headerは各ページで個別に管理
 */
export default function MainLayout() {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
      {/* サイドバー - 全ページ共通 */}
      <Sidebar />

      {/* メインコンテンツエリア（min-w-0 で flex 子が親幅いっぱいに使えるようにする） */}
      <div className={`relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-16'
      }`}>
        {/* 各ページのコンテンツ */}
        <Outlet />
      </div>

      {/* ダウングレード時のサイト選択モーダル */}
      <SiteSelectionModal />
    </div>
  );
}

