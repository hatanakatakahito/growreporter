'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function MainNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: '📊' },
    { href: '/analysis', label: '分析', icon: '🔍' },
    { href: '/kpi', label: 'KPI', icon: '🎯' },
    { href: '/history', label: '履歴', icon: '📝' },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-sm dark:bg-dark-2 dark:shadow-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-3"
            >
              <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xl font-bold text-primary">GrowReporter</span>
            </button>
          </div>

          {/* デスクトップナビゲーション */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-body-color hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="プロフィール"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  )}
                  <svg className="hidden h-4 w-4 text-body-color dark:text-dark-6 md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ドロップダウンメニュー */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    ></div>
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-dark-2 dark:shadow-card">
                      <div className="border-b border-stroke px-4 py-3 dark:border-dark-3">
                        <p className="text-sm font-medium text-dark dark:text-white">
                          {user.displayName || user.email}
                        </p>
                        <p className="text-xs text-body-color dark:text-dark-6">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          router.push('/profile');
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-body-color hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3"
                      >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        プロフィール
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin');
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-body-color hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3"
                      >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        管理者パネル
                      </button>
                      <div className="border-t border-stroke dark:border-dark-3"></div>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-2 dark:hover:bg-dark-3"
                      >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        ログアウト
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* モバイルメニューボタン */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center justify-center rounded-md p-2 text-body-color hover:bg-gray-2 focus:outline-none focus:ring-2 focus:ring-primary md:hidden dark:text-dark-6 dark:hover:bg-dark-3"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {showMobileMenu && (
          <div className="border-t border-stroke pb-4 pt-2 md:hidden dark:border-dark-3">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  setShowMobileMenu(false);
                }}
                className={`flex w-full items-center rounded-md px-3 py-2 text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-body-color hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-3'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
