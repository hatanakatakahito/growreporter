import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import { Settings, ChevronDown, LogOut, User as UserIcon, Globe, Bell, Download } from 'lucide-react';
import DotWaveSpinner from '../common/DotWaveSpinner';
import { usePlan } from '../../hooks/usePlan';
import UpgradeModal from '../common/UpgradeModal';
import DateRangePicker from './DateRangePicker';

const ExcelIcon = ({ className, disabled }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="14" height="14" rx="2" fill={disabled ? '#9CA3AF' : '#217346'} />
    <path d="M5.5 4.5L8 8L5.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 4.5L8 8L10.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PowerPointIcon = ({ className, disabled }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="14" height="14" rx="2" fill={disabled ? '#9CA3AF' : '#D24726'} />
    <path d="M6 11.5V4.5H9C10.1046 4.5 11 5.3954 11 6.5C11 7.6046 10.1046 8.5 9 8.5H6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useGlobalMemoNotifications } from '../../hooks/useGlobalMemoNotifications';
import { useGlobalAlertNotifications } from '../../hooks/useGlobalAlertNotifications';
import { useAnalysisExport } from '../../hooks/useAnalysisExport';
import GlobalNotificationModal from '../Layout/GlobalMemoNotificationModal';

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
  hideComparison = false,
  title = '',
  subtitle = '',
  improveActions = null,
  customDownload = null,
}) {
  const { currentUser, userProfile, logout } = useAuth();
  const { sites, selectedSite: currentSite, selectedSiteId, selectSite, isAdminViewing } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // グローバルメモ通知
  const { unreadMemos, unreadCount: memoUnreadCount, markAllAsRead } = useGlobalMemoNotifications(
    currentUser?.uid,
    sites,
    isAdminViewing
  );

  // グローバルアラート通知
  const { unreadAlerts, unreadAlertCount, markAllAlertsAsRead } = useGlobalAlertNotifications(
    currentUser?.uid,
    sites,
    isAdminViewing
  );

  // 合計未読数
  const totalUnreadCount = memoUnreadCount + unreadAlertCount;

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

  const { isFree } = usePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const onExportExcel = async () => {
    setIsDownloadMenuOpen(false);
    if (isFree) { setShowUpgradeModal(true); return; }
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
    if (isFree) { setShowUpgradeModal(true); return; }
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
      <div className="bg-white border-b border-gray-200 glass-header sticky top-0 z-30 hidden md:block">
        <div className="mx-auto max-w-content px-6 py-5 flex items-center">
          <div className="flex items-center justify-between w-full gap-2">
            {/* サイト選択 */}
            <div className="relative flex items-center shrink-0">
              <Globe className="pointer-events-none absolute left-3 z-10 h-4 w-4 text-gray-400" />
              <ChevronDown className="pointer-events-none absolute right-3 z-10 h-3.5 w-3.5 text-gray-400" />
              <select
                value={selectedSiteId || ''}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="h-auto w-auto min-w-[200px] max-w-[400px] cursor-pointer appearance-none [background-image:none] rounded-lg border border-stroke bg-white py-2 pl-9 pr-8 text-xs sm:text-sm font-medium text-dark shadow-sm transition-all duration-200 hover:border-primary hover:shadow focus:border-primary focus:outline-none"
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


              {/* カスタムダウンロード（改善画面など） */}
              {customDownload}

              {/* ダウンロードメニュー（ダッシュボード・分析画面のみ、スマホ非表示） */}
              {showExport && (
                <div className="relative" ref={downloadMenuRef}>
                  <button
                    onClick={() => !isExporting && selectedSiteId && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    disabled={isExporting || !selectedSiteId}
                    className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="レポートダウンロード"
                  >
                    {isExporting ? (
                      <DotWaveSpinner size="xs" />
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
                        <ExcelIcon className="h-4 w-4" disabled={!canExportExcel} />
                        Excel
                        {!canExportExcel && <span className="ml-auto text-xs text-gray-400">上限</span>}
                      </button>
                      <button
                        onClick={onExportPptx}
                        disabled={!canExportPptx}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${!canExportPptx ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <PowerPointIcon className="h-4 w-4" disabled={!canExportPptx} />
                        PowerPoint
                        {!canExportPptx && <span className="ml-auto text-xs text-gray-400">上限</span>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 通知ベル（メモ＋アラート） */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title="通知"
              >
                <Bell className="h-5 w-5" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </button>

              {/* 期間選択 */}
              {showDateRange && dateRange && setDateRange && (
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  hideComparison={hideComparison}
                />
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

      {/* 通知モーダル（メモ＋アラート） */}
      <GlobalNotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        unreadMemos={unreadMemos}
        onMarkAllAsRead={markAllAsRead}
        unreadAlerts={unreadAlerts}
        onMarkAllAlertsAsRead={markAllAlertsAsRead}
      />

      {/* サイト情報セクション - ブルー＆パープルグラデーション */}
      {showSiteInfo && currentSite && (
        <div className="relative overflow-hidden border-b border-slate-200/40">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.7), rgba(237, 233, 254, 0.5), rgba(254, 249, 195, 0.4))' }} />
          <div className="absolute inset-0 backdrop-blur-sm" />
          <div className="relative mx-auto px-8 py-8" style={{ maxWidth: 1400 }}>
            <div className="flex items-center justify-between gap-10">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2.5">
                  <Globe className="h-5 w-5 shrink-0 text-primary" />
                  <h1 className="truncate text-2xl font-bold text-gray-900">
                    {currentSite.siteName || 'サイト名'}
                  </h1>
                </div>
                <p className="mb-4 pl-[30px] text-xs text-gray-500">{currentSite.siteUrl || ''}</p>
                <div className="mb-1.5 pl-[30px]">
                  <p className="text-sm font-semibold text-gray-800">
                    {currentSite.metaTitle || 'メタタイトルが設定されていません'}
                  </p>
                </div>
                <div className="pl-[30px]">
                  <p className="max-w-2xl text-[13px] leading-relaxed text-gray-500">
                    {currentSite.metaDescription || 'メタディスクリプションが設定されていません'}
                  </p>
                </div>
              </div>
              {/* スクリーンショット重ね配置 */}
              <div className="relative shrink-0" style={{ width: 320, height: 190 }}>
                {/* PC */}
                {currentSite.pcScreenshotUrl ? (
                  <div
                    className="absolute left-0 top-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/90 bg-white/50 shadow-xl shadow-slate-200/50 backdrop-blur-sm"
                    style={{ width: 280, height: 170 }}
                  >
                    <img src={currentSite.pcScreenshotUrl} alt="PCキャプチャ" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="absolute left-0 top-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/90 bg-white/50 shadow-xl shadow-slate-200/50 backdrop-blur-sm"
                    style={{ width: 280, height: 170 }}
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      <span className="mt-1 block text-[11px] text-slate-400">PC</span>
                    </div>
                  </div>
                )}
                {/* SP（右下に重ねる） */}
                {currentSite.mobileScreenshotUrl ? (
                  <div
                    className="absolute bottom-0 right-0 z-[2] flex items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white/70 shadow-2xl backdrop-blur-sm"
                    style={{ width: 70, height: 130 }}
                  >
                    <img src={currentSite.mobileScreenshotUrl} alt="スマホキャプチャ" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="absolute bottom-0 right-0 z-[2] flex items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white/70 shadow-2xl backdrop-blur-sm"
                    style={{ width: 70, height: 130 }}
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                      <span className="mt-0.5 block text-[8px] text-slate-400">SP</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showUpgradeModal && (
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}

