import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Sparkles, Settings, Menu, X, ChevronRight, Lock, Bell, Calendar } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSite } from '../../contexts/SiteContext';
import { usePlan } from '../../hooks/usePlan';
import SiteSelectionModal from '../common/SiteSelectionModal';
import UpgradeModal from '../common/UpgradeModal';
import logoImg from '../../assets/img/logo.svg';

/**
 * スマホ用モバイルヘッダー（ロゴ + ハンバーガー）
 */
function MobileHeader({ onMenuToggle, isMenuOpen }) {
  return (
    <div className="sticky top-0 z-50 flex md:hidden items-center justify-between h-14 px-4 bg-white border-b border-stroke dark:bg-dark-2 dark:border-dark-3">
      <Link to="/dashboard" className="shrink-0">
        <img src={logoImg} alt="GROW REPORTER" className="h-7 w-auto" />
      </Link>
      <button
        onClick={onMenuToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-dark hover:bg-gray-100 dark:text-white"
      >
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );
}

/**
 * スマホ用ドロワーメニュー（左からスライド）
 */
function MobileDrawer({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFree } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNav = (path, locked) => {
    if (locked && isFree) {
      setShowUpgrade(true);
      return;
    }
    navigate(path);
    onClose();
  };

  const menuItems = [
    { label: 'ダッシュボード', path: '/dashboard' },
    { label: 'AIチャット', path: '/ai-chat', locked: true },
    { divider: true, label: '分析する' },
    { label: '全体サマリー', path: '/analysis/summary', indent: true },
    { label: 'ユーザー属性', path: '/analysis/users', indent: true },
    { label: '月別', path: '/analysis/month', indent: true },
    { label: '日別', path: '/analysis/day', indent: true },
    { label: '曜日別', path: '/analysis/week', indent: true },
    { label: '時間帯別', path: '/analysis/hour', indent: true },
    { label: '集客チャネル', path: '/analysis/channels', indent: true },
    { label: '流入キーワード', path: '/analysis/keywords', indent: true },
    { label: '被リンク元', path: '/analysis/referrals', indent: true },
    { label: 'ページ別', path: '/analysis/pages', indent: true },
    { label: 'ページ分類別', path: '/analysis/page-categories', indent: true },
    { label: 'ランディングページ', path: '/analysis/landing-pages', indent: true },
    { label: 'コンバージョン一覧', path: '/analysis/conversions', indent: true },
    { label: '逆算フロー', path: '/analysis/reverse-flow', indent: true },
    { label: 'AI総合分析', path: '/analysis/comprehensive', indent: true, locked: true },
    { divider: true },
    { label: '改善する', path: '/improve', locked: true },
    { label: '評価する', path: '/reports', locked: true },
    { divider: true },
    { label: 'サイト管理', path: '/sites' },
    { label: 'アカウント設定', path: '/account/settings' },
  ];

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* ドロワー */}
      <div className={`fixed left-0 top-0 z-[9999] h-screen w-72 bg-white dark:bg-dark-2 shadow-2xl transform transition-transform duration-300 md:hidden flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* ドロワーヘッダー */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-stroke dark:border-dark-3">
          <img src={logoImg} alt="GROW REPORTER" className="h-8 w-auto" />
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3">
            <X className="h-5 w-5 text-body-color" />
          </button>
        </div>

        {/* メニュー */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item, i) => {
            if (item.divider) {
              return (
                <div key={i} className="px-4 pt-4 pb-1">
                  {item.label && <p className="text-xs font-semibold uppercase tracking-wider text-body-color">{item.label}</p>}
                  {!item.label && <div className="border-t border-stroke dark:border-dark-3" />}
                </div>
              );
            }

            const active = isActive(item.path);
            const locked = item.locked && isFree;

            return (
              <button
                key={i}
                onClick={() => handleNav(item.path, item.locked)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition ${
                  item.indent ? 'pl-8' : ''
                } ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : locked
                      ? 'text-body-color/50'
                      : 'text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-3'
                }`}
              >
                <span className="flex-1 text-left">{item.label}</span>
                {locked && <Lock className="h-3.5 w-3.5 text-body-color/40" />}
                {!locked && !item.indent && <ChevronRight className="h-3.5 w-3.5 text-body-color/30" />}
              </button>
            );
          })}
        </nav>
      </div>

      {showUpgrade && <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />}
    </>
  );
}

/**
 * スマホ用ボトムナビ
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-stroke bg-white dark:bg-dark-2 dark:border-dark-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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

/**
 * メインレイアウト
 */
export default function MainLayout() {
  const { isSidebarOpen } = useSidebar();
  const { sites, isLoading } = useSite();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isLoading && sites.length === 0) {
    return <Navigate to="/sites/new" replace />;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f0f2f8]">
      {/* アンビエントグラデーション背景 */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-20 h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[100px]" />
        <div className="absolute bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-200/30 blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 h-[300px] w-[300px] rounded-full bg-sky-200/20 blur-[80px]" />
      </div>

      {/* デスクトップ: サイドバー */}
      <Sidebar />

      {/* メインコンテンツエリア */}
      <div className={`main-content flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden transition-[margin-left] duration-300 ${
        isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0 md:ml-16'
      }`}>
        {/* スマホ: モバイルヘッダー */}
        <MobileHeader
          isMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* ページコンテンツ */}
        <Outlet />
      </div>

      {/* スマホ: ドロワーメニュー */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />


      {/* サイト選択モーダル */}
      <SiteSelectionModal />
    </div>
  );
}
