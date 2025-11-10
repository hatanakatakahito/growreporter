import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import logoImg from '../../assets/img/logo.svg';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isTimeSeriesOpen, setIsTimeSeriesOpen] = useState(false);
  const [isAcquisitionOpen, setIsAcquisitionOpen] = useState(false);
  const [isEngagementOpen, setIsEngagementOpen] = useState(false);
  const [isConversionOpen, setIsConversionOpen] = useState(false);

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (userProfile?.lastName && userProfile?.firstName) {
      return `${userProfile.lastName} ${userProfile.firstName}`;
    }
    return currentUser?.displayName || 'ユーザー';
  };

  const userInitial = getUserName().charAt(0);

  // 現在のパスに基づいてメニューを開く
  useEffect(() => {
    const path = location.pathname;
    
    // 分析ページかどうか
    if (path.startsWith('/analysis/') || path === '/users' || path.startsWith('/acquisition/') || path.startsWith('/engagement/') || path.startsWith('/conversion/')) {
      setIsAnalysisOpen(true);
    }
    
    // 時系列サブメニュー
    if (path.startsWith('/analysis/day') || path.startsWith('/analysis/week') || path.startsWith('/analysis/hour')) {
      setIsTimeSeriesOpen(true);
    }
    
    // 集客サブメニュー
    if (path.startsWith('/acquisition/')) {
      setIsAcquisitionOpen(true);
    }
    
    // エンゲージメントサブメニュー
    if (path.startsWith('/engagement/')) {
      setIsEngagementOpen(true);
    }
    
    // コンバージョンサブメニュー
    if (path.startsWith('/conversion/')) {
      setIsConversionOpen(true);
    }
  }, [location.pathname]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const menuItems = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'ダッシュボード',
      path: '/dashboard',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: '分析する',
      path: '/analysis',
      hasSubmenu: true,
      submenu: [
        { label: '全体サマリー', path: '/analysis/summary' },
        { label: 'ユーザー属性', path: '/users' },
        { 
          label: '時系列', 
          hasSubmenu: true,
          submenu: [
            { label: '日別', path: '/analysis/day' },
            { label: '曜日別', path: '/analysis/week' },
            { label: '時間帯別', path: '/analysis/hour' },
          ]
        },
        { 
          label: '集客', 
          hasSubmenu: true,
          submenu: [
            { label: '集客チャネル', path: '/acquisition/channels' },
            { label: '流入キーワード元', path: '/acquisition/keywords' },
            { label: '被リンク元', path: '/acquisition/referrals' },
          ]
        },
        { 
          label: 'エンゲージメント', 
          hasSubmenu: true,
          submenu: [
            { label: 'ページ別', path: '/engagement/pages' },
            { label: 'ページ分類別', path: '/engagement/page-categories' },
            { label: 'ランディングページ', path: '/engagement/landing-pages' },
            { label: 'ファイルダウンロード', path: '/engagement/file-downloads' },
            { label: '外部リンククリック', path: '/engagement/external-links' },
          ]
        },
        { 
          label: 'コンバージョン', 
          hasSubmenu: true,
          submenu: [
            { label: 'コンバージョン一覧', path: '/conversion/list' },
            { label: '逆算フロー', path: '/conversion/reverse-flow' },
          ]
        },
      ],
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      label: '改善する',
      path: '/improve',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      label: '評価する',
      path: '/reports',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
        </svg>
      ),
      label: 'サイト管理',
      path: '/sites/list',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      {/* ロゴ */}
      <div className="flex h-20 items-center justify-center border-b border-stroke px-6 dark:border-dark-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img 
            src={logoImg}
            alt="GROW REPORTER" 
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="h-[calc(100vh-5rem)] overflow-y-auto px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.hasSubmenu ? (
                <>
                  <button
                    onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <svg
                      className={`h-4 w-4 transition-transform ${isAnalysisOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isAnalysisOpen && (
                    <ul className="ml-4 mt-2 space-y-1 border-l-2 border-stroke pl-4 dark:border-dark-3">
                      {item.submenu.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          {subItem.hasSubmenu ? (
                            <>
                              <button
                                onClick={() => {
                                  if (subItem.label === '時系列') {
                                    setIsTimeSeriesOpen(!isTimeSeriesOpen);
                                  } else if (subItem.label === '集客') {
                                    setIsAcquisitionOpen(!isAcquisitionOpen);
                                  } else if (subItem.label === 'エンゲージメント') {
                                    setIsEngagementOpen(!isEngagementOpen);
                                  } else if (subItem.label === 'コンバージョン') {
                                    setIsConversionOpen(!isConversionOpen);
                                  }
                                }}
                                className="flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                              >
                                <span>{subItem.label}</span>
                                <svg
                                  className={`h-3 w-3 transition-transform ${
                                    (subItem.label === '時系列' && isTimeSeriesOpen) ||
                                    (subItem.label === '集客' && isAcquisitionOpen) ||
                                    (subItem.label === 'エンゲージメント' && isEngagementOpen) ||
                                    (subItem.label === 'コンバージョン' && isConversionOpen)
                                      ? 'rotate-180'
                                      : ''
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {((subItem.label === '時系列' && isTimeSeriesOpen) ||
                                (subItem.label === '集客' && isAcquisitionOpen) ||
                                (subItem.label === 'エンゲージメント' && isEngagementOpen) ||
                                (subItem.label === 'コンバージョン' && isConversionOpen)) && (
                                <ul className="ml-4 mt-1 space-y-1 border-l-2 border-stroke pl-4 dark:border-dark-3">
                                  {subItem.submenu.map((subSubItem, subSubIndex) => (
                                    <li key={subSubIndex}>
                                      <Link
                                        to={subSubItem.path}
                                        className={`block rounded-lg px-4 py-2 text-sm transition ${
                                          isActive(subSubItem.path)
                                            ? 'bg-primary text-white'
                                            : 'text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3'
                                        }`}
                                      >
                                        {subSubItem.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          ) : (
                            <Link
                              to={subItem.path}
                              className={`block rounded-lg px-4 py-2 text-sm transition ${
                                isActive(subItem.path)
                                  ? 'bg-primary text-white'
                                  : 'text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3'
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* ユーザー情報 */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
                {userInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-dark dark:text-white">
                {getUserName()}
              </p>
              <p className="truncate text-xs text-body-color">
                {currentUser?.email}
              </p>
            </div>
          </div>
          
          {/* 管理者画面ボタン（管理者のみ表示） */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 dark:border-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              管理者画面
            </button>
          )}
          
          {/* アカウント設定とログアウトボタン */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/account/settings')}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              アカウント
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}


