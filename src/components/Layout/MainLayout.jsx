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
    <div className="relative flex h-screen overflow-hidden bg-[#f0f2f8]">
      {/* アンビエントグラデーション背景（最背面、全画面に表示） */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-20 h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[100px]" />
        <div className="absolute bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-200/30 blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 h-[300px] w-[300px] rounded-full bg-sky-200/20 blur-[80px]" />
      </div>

      {/* サイドバー - 全ページ共通 */}
      <Sidebar />

      {/* メインコンテンツエリア */}
      <div className={`main-content flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden transition-[margin-left] duration-300 ${
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

