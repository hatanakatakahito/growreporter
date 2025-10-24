import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';

export default function Header({ title, subtitle, backLink, backLabel, action, showSiteSelector = false }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const siteDropdownRef = useRef(null);
  const { currentUser, logout } = useAuth();
  const { sites, selectedSite, selectSite } = useSite();
  const navigate = useNavigate();

  // ドロップダウン外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target)) {
        setIsSiteDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="border-b border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-body-color">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* サイト選択ドロップダウン */}
            {showSiteSelector && sites.length > 0 && (
              <div className="relative" ref={siteDropdownRef}>
                <button
                  onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2.5 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
                >
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-sm font-medium text-dark dark:text-white">
                    {selectedSite?.siteName || 'サイトを選択'}
                  </span>
                  <svg
                    className={`h-4 w-4 text-body-color transition-transform ${isSiteDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* サイトドロップダウンメニュー */}
                {isSiteDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
                    <div className="max-h-96 overflow-y-auto p-2">
                      {sites.map((site) => (
                        <button
                          key={site.id}
                          onClick={() => {
                            selectSite(site.id);
                            setIsSiteDropdownOpen(false);
                            navigate(`/dashboard?siteId=${site.id}`);
                          }}
                          className={`flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm transition ${
                            selectedSite?.id === site.id
                              ? 'bg-primary/10 text-primary'
                              : 'text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3'
                          }`}
                        >
                          {selectedSite?.id === site.id && (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{site.siteName}</div>
                            <div className="text-xs text-body-color truncate">{site.siteUrl}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-stroke p-2 dark:border-dark-3">
                      <Link
                        to="/sites/new"
                        onClick={() => setIsSiteDropdownOpen(false)}
                        className="flex w-full items-center gap-2 rounded-md px-4 py-2.5 text-sm text-primary transition hover:bg-primary/10"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新規サイト登録
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {backLink && (
              <Link
                to={backLink}
                className="rounded-md border border-stroke px-6 py-2.5 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
              >
                {backLabel || '戻る'}
              </Link>
            )}
            {action}

            {/* ユーザードロップダウン */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition hover:bg-gray-2 dark:hover:bg-dark-3"
              >
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
                    {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-dark dark:text-white">
                    {currentUser?.displayName || 'ユーザー'}
                  </p>
                  <p className="text-xs text-body-color">
                    {currentUser?.email}
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 text-body-color transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ドロップダウンメニュー */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
                  <div className="p-2">
                    <Link
                      to="/account/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      アカウント設定
                    </Link>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

