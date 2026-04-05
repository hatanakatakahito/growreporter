import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu, X, ChevronRight, Lock, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useGlobalMemoNotifications } from '../../hooks/useGlobalMemoNotifications';
import { useGlobalAlertNotifications } from '../../hooks/useGlobalAlertNotifications';
import GlobalNotificationModal from './GlobalMemoNotificationModal';
import DateRangePicker from '../Analysis/DateRangePicker';
import SiteSelectionModal from '../common/SiteSelectionModal';
import UpgradeModal from '../common/UpgradeModal';
import logoImg from '../../assets/img/logo.svg';

/**
 * スマホ用モバイルヘッダー（ロゴ + ハンバーガー）
 */
function MobileHeader({ onMenuToggle, isMenuOpen }) {
  const { selectedSiteId, sites, selectSite, isAdminViewing, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { unreadMemos, unreadCount: memoUnreadCount, markAllAsRead } = useGlobalMemoNotifications(
    currentUser?.uid, sites, isAdminViewing
  );
  const { unreadAlerts, unreadAlertCount, markAllAlertsAsRead } = useGlobalAlertNotifications(
    currentUser?.uid, sites, isAdminViewing
  );
  const totalUnreadCount = memoUnreadCount + unreadAlertCount;

  return (
    <div className="sticky top-0 z-50 flex md:hidden items-center justify-between px-3 py-[10px] bg-white border-b border-stroke dark:bg-dark-2 dark:border-dark-3">
      <Link to="/dashboard" className="shrink-0">
        <img src={logoImg} alt="GROW REPORTER" className="h-7 w-auto" />
      </Link>
      <div className="flex items-center gap-1">
        {/* サイト選択 */}
        <div className="relative">
          <select
            value={selectedSiteId || ''}
            onChange={(e) => selectSite(e.target.value)}
            className="h-9 w-9 cursor-pointer appearance-none rounded-lg bg-transparent text-transparent absolute inset-0 z-10 opacity-0"
            title="サイト切替"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.siteName}</option>
            ))}
          </select>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-body-color">
            <Home className="h-5 w-5" />
          </div>
        </div>
        {/* 通知 */}
        <button
          onClick={() => setIsNotificationOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-body-color hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
        {/* 日付 */}
        {/* 日付 */}
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={updateDateRange}
          hideComparison
          compact
        />
        {/* ハンバーガー */}
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-dark hover:bg-gray-100 dark:text-white"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <GlobalNotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        unreadMemos={unreadMemos}
        onMarkAllAsRead={markAllAsRead}
        unreadAlerts={unreadAlerts}
        onMarkAllAlertsAsRead={markAllAlertsAsRead}
      />
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

  const iconClass = "h-5 w-5 shrink-0";
  const menuItems = [
    { label: 'ダッシュボード', path: '/dashboard', icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { label: 'AIチャット', path: '/ai-chat', locked: true, icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
    { divider: true, label: '分析する', icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { label: '全体サマリー', path: '/analysis/summary', indent: true },
    { label: 'ユーザー属性', path: '/analysis/users', indent: true },
    { groupLabel: '時系列' },
    { label: '月別', path: '/analysis/month', indent: 2 },
    { label: '日別', path: '/analysis/day', indent: 2 },
    { label: '曜日別', path: '/analysis/week', indent: 2 },
    { label: '時間帯別', path: '/analysis/hour', indent: 2 },
    { groupLabel: '集客' },
    { label: '集客チャネル', path: '/analysis/channels', indent: 2 },
    { label: '流入キーワード', path: '/analysis/keywords', indent: 2 },
    { label: '被リンク元', path: '/analysis/referrals', indent: 2 },
    { groupLabel: 'ページ' },
    { label: 'ページ別', path: '/analysis/pages', indent: 2 },
    { label: 'ページ分類別', path: '/analysis/page-categories', indent: 2 },
    { label: 'ランディングページ', path: '/analysis/landing-pages', indent: 2 },
    { groupLabel: 'コンバージョン' },
    { label: 'コンバージョン一覧', path: '/analysis/conversions', indent: 2 },
    { label: '逆算フロー', path: '/analysis/reverse-flow', indent: 2 },
    { label: 'AI総合分析', path: '/analysis/comprehensive', indent: true, locked: true },
    { divider: true },
    { label: '改善する', path: '/improve', locked: true, icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { label: '評価する', path: '/reports', locked: true, icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    { divider: true },
    { label: 'サイト管理', path: '/sites', icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg> },
    { label: 'アカウント設定', path: '/account/settings', icon: <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
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
            if (item.groupLabel) {
              return (
                <div key={i} className="pl-8 pt-3 pb-1">
                  <p className="text-[11px] font-semibold text-body-color/60">{item.groupLabel}</p>
                </div>
              );
            }

            if (item.divider) {
              return (
                <div key={i} className="px-4 pt-4 pb-1">
                  {item.label ? (
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-body-color">
                      {item.icon && item.icon}
                      {item.label}
                    </div>
                  ) : (
                    <div className="border-t border-stroke dark:border-dark-3" />
                  )}
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
                  item.indent === 2 ? 'pl-12' : item.indent ? 'pl-8' : ''
                } ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : locked
                      ? 'text-body-color/50'
                      : 'text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-3'
                }`}
              >
                {item.icon && item.icon}
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
