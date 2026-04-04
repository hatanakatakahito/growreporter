import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Sparkles, Settings, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSite } from '../../contexts/SiteContext';
import SiteSelectionModal from '../common/SiteSelectionModal';

/**
 * メインレイアウトコンポーネント
 * 全ページ共通のSidebarを提供
 * Headerは各ページで個別に管理
 */
function MobileBottomNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const items = [
    { icon: Home, label: 'ホーム', path: '/dashboard' },
    { icon: BarChart3, label: '分析', path: '/analysis/summary' },
    { icon: Sparkles, label: 'AI', path: '/ai-chat' },
    { icon: Settings, label: '管理', path: '/sites' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-stroke bg-white dark:bg-dark-2 dark:border-dark-3 safe-bottom">
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-1 flex-col items-center justify-center py-2 text-[10px] font-medium transition ${
              active ? 'text-primary' : 'text-body-color'
            }`}
          >
            <item.icon className={`h-5 w-5 mb-0.5 ${active ? 'text-primary' : ''}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function MainLayout() {
  const { isSidebarOpen } = useSidebar();
  const { sites, isLoading } = useSite();

  // サイト未登録の場合、サイト設定画面へ強制リダイレクト
  if (!isLoading && sites.length === 0) {
    return <Navigate to="/sites/new" replace />;
  }

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
      <div className={`main-content flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden transition-[margin-left] duration-300 pb-16 md:pb-0 ${
        isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0 md:ml-16'
      }`}>
        {/* 各ページのコンテンツ */}
        <Outlet />
      </div>

      {/* スマホ用ボトムナビゲーション */}
      <MobileBottomNav />

      {/* ダウングレード時のサイト選択モーダル */}
      <SiteSelectionModal />
    </div>
  );
}

