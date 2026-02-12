import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * メインレイアウトコンポーネント
 * 全ページ共通のSidebarを提供
 * Headerは各ページで個別に管理
 */
export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark">
      {/* サイドバー - 全ページ共通 */}
      <Sidebar />

      {/* メインコンテンツエリア */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ml-64">
        {/* 各ページのコンテンツ */}
        <Outlet />
      </div>
    </div>
  );
}

