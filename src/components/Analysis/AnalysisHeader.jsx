import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import { Calendar, Settings, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

/**
 * 分析画面共通ヘッダーコンポーネント
 * サイト選択、期間選択、ユーザー情報を表示
 */
export default function AnalysisHeader({
  dateRange,
  setDateRange,
  showDateRange = true,
  showSiteInfo = true,
  title = '',
  subtitle = '',
}) {
  const { currentUser, logout } = useAuth();
  const { sites, selectedSite: currentSite, selectedSiteId, selectSite } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSiteChange = (newSiteId) => {
    selectSite(newSiteId);
    
    // URLパラメータを更新
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('siteId', newSiteId);
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      {/* ヘッダーセクション */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* サイト選択 */}
              <div className="relative">
                <select
                  value={selectedSiteId || ''}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-64 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:border-primary focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">サイトを選択</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 期間選択 */}
              {showDateRange && dateRange && setDateRange && (
                <div className="relative">
                  <button
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="flex w-80 items-center justify-start rounded-md border border-stroke bg-white px-4 py-2 text-sm font-normal text-dark transition hover:border-primary focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange && dateRange.from && dateRange.to ? (
                      <>
                        {format(new Date(dateRange.from), 'yyyy-MM-dd')} -{' '}
                        {format(new Date(dateRange.to), 'yyyy-MM-dd')}
                      </>
                    ) : (
                      <span>期間を選択</span>
                    )}
                  </button>
                  
                  {/* 簡易的な期間選択（TODO: カレンダーコンポーネントに置き換え） */}
                  {isDatePickerOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-stroke bg-white p-4 shadow-lg dark:border-dark-3 dark:bg-dark-2">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-dark dark:text-white">
                            開始日
                          </label>
                          <input
                            type="date"
                            value={dateRange.from || ''}
                            onChange={(e) =>
                              setDateRange({ ...dateRange, from: e.target.value })
                            }
                            className="w-full rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-dark dark:text-white">
                            終了日
                          </label>
                          <input
                            type="date"
                            value={dateRange.to || ''}
                            onChange={(e) =>
                              setDateRange({ ...dateRange, to: e.target.value })
                            }
                            className="w-full rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          />
                        </div>
                        <button
                          onClick={() => setIsDatePickerOpen(false)}
                          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                        >
                          適用
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ユーザーメニュー */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <div className="min-w-0 text-right">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {currentUser.displayName || currentUser.email}
                    </p>
                    <p className="truncate text-xs text-gray-500">{currentUser.email}</p>
                  </div>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User Avatar"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-semibold text-white">
                      {getInitials(currentUser.displayName || currentUser.email)}
                    </div>
                  )}
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {/* ドロップダウンメニュー */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
                    <div className="p-2">
                      <Link
                        to="/account/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm text-dark transition hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                      >
                        <UserIcon className="h-4 w-4" />
                        アカウント
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* サイト情報セクション */}
      {showSiteInfo && currentSite && (
        <div
          style={{
            background: 'linear-gradient(to right, rgb(227, 242, 253), rgb(255, 248, 225))',
          }}
        >
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentSite.siteName || 'サイト名'}
                  </h1>
                </div>
                <p className="mb-6 text-sm text-gray-600">{currentSite.siteUrl || ''}</p>

                    <div className="mb-3">
                      <p className="text-base font-semibold text-gray-900">
                        {currentSite.metaTitle || 'メタタイトルが設定されていません'}
                      </p>
                    </div>

                    <div>
                      <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                        {currentSite.metaDescription || 'メタディスクリプションが設定されていません'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    {currentSite.pcScreenshotUrl ? (
                      <div className="overflow-hidden rounded-lg bg-white shadow-md">
                        <img
                          src={currentSite.pcScreenshotUrl}
                          alt="PCキャプチャ"
                          className="h-48 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 w-64 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md">
                        <p className="text-sm text-gray-400">PCスクリーンショット未設定</p>
                      </div>
                    )}
                    {currentSite.mobileScreenshotUrl ? (
                      <div className="overflow-hidden rounded-lg bg-white shadow-md">
                        <img
                          src={currentSite.mobileScreenshotUrl}
                          alt="スマホキャプチャ"
                          className="h-48 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 w-32 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md">
                        <p className="text-center text-sm text-gray-400">スマホ<br />スクリーン<br />ショット<br />未設定</p>
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

