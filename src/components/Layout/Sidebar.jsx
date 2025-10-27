import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isTimeSeriesOpen, setIsTimeSeriesOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
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
      hasSubmenu: true,
      submenu: [
        { label: '全体サマリー', path: '/analysis/summary' },
        { 
          label: '時系列', 
          hasSubmenu: true,
          submenu: [
            { label: '日別', path: '/analysis/day' },
            { label: '曜日別', path: '/analysis/week' },
            { label: '時間帯別', path: '/analysis/hour' },
          ]
        },
        { label: 'ユーザー', path: '/analysis/users' },
        { label: '集客', path: '/analysis/acquisition' },
        { label: 'エンゲージメント', path: '/analysis/engagement' },
        { label: 'コンバージョン', path: '/analysis/conversion' },
        { label: 'SEO分析', path: '/analysis/seo' },
      ],
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      label: '改善する',
      path: '/improvements',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: '評価する',
      path: '/evaluation',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
            src="/src/assets/img/logo.svg" 
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
                                onClick={() => setIsTimeSeriesOpen(!isTimeSeriesOpen)}
                                className="flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                              >
                                <span>{subItem.label}</span>
                                <svg
                                  className={`h-3 w-3 transition-transform ${isTimeSeriesOpen ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {isTimeSeriesOpen && (
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
      <div className="absolute bottom-0 left-0 right-0 border-t border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center gap-3">
          {currentUser?.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt="Profile" 
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
              {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-dark dark:text-white">
              {currentUser?.displayName || 'ユーザー'}
            </p>
            <p className="truncate text-xs text-body-color">
              {currentUser?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

