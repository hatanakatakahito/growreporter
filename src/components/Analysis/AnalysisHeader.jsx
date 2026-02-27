import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import { Calendar, Settings, ChevronDown, LogOut, User as UserIcon, Globe, Bell, Download, Loader2, FileSpreadsheet, Presentation } from 'lucide-react';
import { format } from 'date-fns';
import { SCREENSHOT_PC_DISPLAY, SCREENSHOT_MOBILE_DISPLAY } from '../../constants/screenshotDisplay';
import toast from 'react-hot-toast';
import { useGlobalMemoNotifications } from '../../hooks/useGlobalMemoNotifications';
import { useAnalysisExport } from '../../hooks/useAnalysisExport';
import GlobalMemoNotificationModal from '../Layout/GlobalMemoNotificationModal';

/**
 * 分析画面共通ヘッダーコンポーネント
 * サイト選択、期間選択、ユーザー情報を表示
 */
export default function AnalysisHeader({
  dateRange,
  setDateRange,
  showDateRange = true,
  showSiteInfo = true,
  showExport = true,
  title = '',
  subtitle = '',
  improveActions = null,
}) {
  const { currentUser, userProfile, logout } = useAuth();
  const { sites, selectedSite: currentSite, selectedSiteId, selectSite, isAdminViewing } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // 一時的な日付範囲（適用ボタンを押すまで保持）
  const [tempDateRange, setTempDateRange] = useState({ from: '', to: '' });

  // グローバルメモ通知
  const { unreadMemos, unreadCount, markAllAsRead } = useGlobalMemoNotifications(
    currentUser?.uid,
    sites,
    isAdminViewing
  );

  // エクスポート
  const { isExporting, handleExportExcel, handleExportPptx, canExportExcel, canExportPptx } = useAnalysisExport();
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef(null);

  // ダウンロードメニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setIsDownloadMenuOpen(false);
      }
    };
    if (isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDownloadMenuOpen]);

  const onExportExcel = async () => {
    setIsDownloadMenuOpen(false);
    try {
      await handleExportExcel();
      toast.success('Excelダウンロードが完了しました');
    } catch (e) {
      console.error('[AnalysisHeader] Excel export error:', e);
      toast.error('ダウンロードに失敗しました');
    }
  };

  const onExportPptx = async () => {
    setIsDownloadMenuOpen(false);
    try {
      await handleExportPptx();
      toast.success('PowerPointダウンロードが完了しました');
    } catch (e) {
      console.error('[AnalysisHeader] PPTX export error:', e);
      toast.error('ダウンロードに失敗しました');
    }
  };

  // ユーザー名を取得（lastName + firstName 優先、なければdisplayName）
  const getUserName = () => {
    if (userProfile?.lastName && userProfile?.firstName) {
      return `${userProfile.lastName} ${userProfile.firstName}`;
    }
    return currentUser?.displayName || currentUser?.email || 'ユーザー';
  };

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
      <div className="bg-white border-b border-gray-200 h-20">
        <div className="mx-auto max-w-content px-6 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            {/* サイト選択 */}
            <div className="relative">
              <select
                value={selectedSiteId || ''}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="h-10 w-64 rounded-md border border-stroke bg-white px-4 text-sm font-medium text-dark transition hover:border-primary focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="">サイトを選択</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteName}
                  </option>
                ))}
              </select>
            </div>

            {/* 期間選択とベル通知 */}
            <div className="flex items-center gap-3">
              {/* 改善画面専用アクション */}
              {improveActions && improveActions}

              {/* ダウンロードメニュー（ダッシュボード・分析画面のみ） */}
              {showExport && (
                <div className="relative" ref={downloadMenuRef}>
                  <button
                    onClick={() => !isExporting && selectedSiteId && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    disabled={isExporting || !selectedSiteId}
                    className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="レポートダウンロード"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>ダウンロード</span>
                  </button>

                  {isDownloadMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={onExportExcel}
                        disabled={!canExportExcel}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${!canExportExcel ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <FileSpreadsheet className={`h-4 w-4 ${!canExportExcel ? 'text-gray-400' : 'text-green-600'}`} />
                        Excel
                        {!canExportExcel && <span className="ml-auto text-xs text-gray-400">上限</span>}
                      </button>
                      <button
                        onClick={onExportPptx}
                        disabled={!canExportPptx}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${!canExportPptx ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Presentation className={`h-4 w-4 ${!canExportPptx ? 'text-gray-400' : 'text-orange-500'}`} />
                        PowerPoint
                        {!canExportPptx && <span className="ml-auto text-xs text-gray-400">上限</span>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* メモ通知ベル */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title="メモ通知"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* 期間選択 */}
              {showDateRange && dateRange && setDateRange && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setTempDateRange({ from: dateRange.from, to: dateRange.to });
                      setIsDatePickerOpen(!isDatePickerOpen);
                    }}
                    className="flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:outline-none dark:bg-dark-2 dark:text-white"
                  >
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {dateRange && dateRange.from && dateRange.to ? (
                      <span className="font-medium">
                        {format(new Date(dateRange.from), 'yyyy-MM-dd')} - {format(new Date(dateRange.to), 'yyyy-MM-dd')}
                      </span>
                    ) : (
                      <span>期間を選択</span>
                    )}
                  </button>
                  
                  {/* 簡易的な期間選択（TODO: カレンダーコンポーネントに置き換え） */}
                  {isDatePickerOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-stroke bg-white p-4 shadow-lg dark:border-dark-3 dark:bg-dark-2">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-dark dark:text-white">
                            開始日
                          </label>
                          <input
                            type="date"
                            value={tempDateRange.from || ''}
                            onChange={(e) =>
                              setTempDateRange({ ...tempDateRange, from: e.target.value })
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
                            value={tempDateRange.to || ''}
                            onChange={(e) =>
                              setTempDateRange({ ...tempDateRange, to: e.target.value })
                            }
                            className="w-full rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          />
                        </div>
                          <button
                            onClick={() => {
                              if (tempDateRange.from && tempDateRange.to) {
                                setDateRange({ from: tempDateRange.from, to: tempDateRange.to });
                                setIsDatePickerOpen(false);
                              }
                            }}
                            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                          >
                            適用
                          </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
            </div>

            {/* ユーザーメニュー - 削除 */}
            {false && currentUser && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <div className="min-w-0 text-right">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {getUserName()}
                    </p>
                    <p className="truncate text-xs text-gray-500">{currentUser.email}</p>
                  </div>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User Avatar"
                      className="h-10 w-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-semibold text-white">
                      {getInitials(getUserName())}
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

      {/* メモ通知モーダル */}
      <GlobalMemoNotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        unreadMemos={unreadMemos}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* サイト情報セクション - ブルー＆パープルグラデーション */}
      {showSiteInfo && currentSite && (
        <div
          style={{
            background: 'linear-gradient(to right, rgb(224, 242, 254), rgb(254, 249, 195))',
          }}
        >
          <div className="mx-auto max-w-content px-6 py-10">
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <h1 className="text-3xl font-bold text-gray-900">
                    {currentSite.siteName || 'サイト名'}
                  </h1>
                </div>
                <p className="mb-6 text-xs text-gray-500">{currentSite.siteUrl || ''}</p>

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
                  <div className="flex items-end gap-4">
                    {currentSite.pcScreenshotUrl ? (
                      <div
                        className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                        style={{ width: SCREENSHOT_PC_DISPLAY.width, height: SCREENSHOT_PC_DISPLAY.height }}
                      >
                        <img
                          src={currentSite.pcScreenshotUrl}
                          alt="PCキャプチャ"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                        style={{ width: SCREENSHOT_PC_DISPLAY.width, height: SCREENSHOT_PC_DISPLAY.height }}
                      >
                        <p className="text-sm text-gray-400">PCスクリーンショット未設定</p>
                      </div>
                    )}
                    {currentSite.mobileScreenshotUrl ? (
                      <div
                        className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                        style={{ width: SCREENSHOT_MOBILE_DISPLAY.width, height: SCREENSHOT_MOBILE_DISPLAY.height }}
                      >
                        <img
                          src={currentSite.mobileScreenshotUrl}
                          alt="スマホキャプチャ"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-md"
                        style={{ width: SCREENSHOT_MOBILE_DISPLAY.width, height: SCREENSHOT_MOBILE_DISPLAY.height }}
                      >
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

