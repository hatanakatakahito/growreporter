'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserProfileService } from '@/lib/user/userProfileService';
import { UserProfile } from '@/types/user';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onDateRangeChange?: (startDate: string, endDate: string, type: string) => void;
}

export default function DashboardLayout({ children, onDateRangeChange }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [acquisitionMenuOpen, setAcquisitionMenuOpen] = useState(false);
  const [engagementMenuOpen, setEngagementMenuOpen] = useState(false);
  const [conversionMenuOpen, setConversionMenuOpen] = useState(false);
  
  // PDF出力機能の状態管理
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [siteInfo, setSiteInfo] = useState<{ siteName: string; siteUrl: string } | null>(null);
  
  // 日付範囲の状態管理
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateRangeType, setDateRangeType] = useState<string>('last_month');
  const isInitializedRef = useRef(false);

  // 日付範囲を計算する関数
  const calculateDateRange = (type: string, customStart?: string, customEnd?: string) => {
    if (type === 'custom' && customStart && customEnd) {
      return {
        startDate: customStart,
        endDate: customEnd
      };
    }
    
    const today = new Date();
    let start: Date;
    let end: Date;
    
    if (type === 'last_month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    } else {
      start = today;
      end = today;
    }
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  // 初期化時に日付範囲を設定（マウント時のみ）
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const { startDate: start, endDate: end } = calculateDateRange('last_month');
    setStartDate(start);
    setEndDate(end);
    
    // 親に通知（初回のみ）
    if (onDateRangeChange) {
      isInitializedRef.current = true;
      setTimeout(() => {
        onDateRangeChange(start, end, 'last_month');
      }, 0);
    }
  }, [onDateRangeChange]);

  // 日付範囲変更ハンドラー
  const handleInternalDateRangeChange = (type: string, customStart?: string, customEnd?: string) => {
    const { startDate: newStart, endDate: newEnd } = calculateDateRange(type, customStart, customEnd);
    setStartDate(newStart);
    setEndDate(newEnd);
    setDateRangeType(type);
    
    // 親コンポーネントに通知
    if (onDateRangeChange) {
      onDateRangeChange(newStart, newEnd, type);
    }
  };

  // プロファイル情報を取得
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const profileData = await UserProfileService.getUserProfile(user.uid);
        setProfile(profileData);
        
        // サイト情報を取得
        if (profileData?.profile?.siteName && profileData?.profile?.siteUrl) {
          setSiteInfo({
            siteName: profileData.profile.siteName,
            siteUrl: profileData.profile.siteUrl
          });
        }
      } catch (error) {
        console.error('プロファイル取得エラー:', error);
      }
    };

    loadProfile();
  }, [user]);
  
  // ページ選択のトグル
  const togglePageSelection = (pagePath: string) => {
    setSelectedPages(prev =>
      prev.includes(pagePath)
        ? prev.filter(p => p !== pagePath)
        : [...prev, pagePath]
    );
  };
  
  // 選択されたページをPDF出力（複数ページを1つのPDFに統合）
  const handleExportSelectedPages = async () => {
    if (selectedPages.length === 0) {
      alert('出力する画面を選択してください');
      return;
    }

    try {
      const { exportMultiplePagesToPDF } = await import('@/lib/pdf/pdfExporter');
      
      // モーダルを閉じる
      setPdfModalOpen(false);
      
      // ローディング表示（オプション）
      alert('PDF出力を開始します。しばらくお待ちください...');
      
      // 複数ページを1つのPDFに統合して出力
      await exportMultiplePagesToPDF(selectedPages, router);
      
      alert('PDF出力が完了しました');
      setSelectedPages([]);
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDF出力に失敗しました');
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // 表示名を生成
  const getDisplayName = () => {
    if (profile?.profile?.lastName && profile?.profile?.firstName) {
      return `${profile.profile.lastName} ${profile.profile.firstName}`;
    }
    return user?.displayName || user?.email || 'ユーザー';
  };

  // アバターのイニシャルを生成
  const getInitial = () => {
    if (profile?.profile?.lastName) {
      return profile.profile.lastName.charAt(0);
    }
    return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  };

  return (
    <section className="relative flex min-h-screen w-full items-start bg-gray-2 dark:bg-dark">
      {/* Sidebar */}
      <div
        className={`shadow-card fixed top-0 left-0 z-40 flex h-screen w-full max-w-[300px] flex-col justify-between overflow-y-auto bg-white duration-200 dark:bg-dark-2 xl:translate-x-0 scrollbar-hide ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div>
          {/* Logo */}
          <div className="px-10 pt-10 pb-9">
            <Link href="/dashboard">
              <img 
                src="/logo.svg" 
                alt="GrowReporter" 
                className="h-12 w-auto"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav>
            <ul>
              <li>
                <Link
                  href="/dashboard"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/dashboard'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z" fill=""/>
                    <path d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z" fill=""/>
                    <path d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z" fill=""/>
                    <path d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z" fill=""/>
                  </svg>
                  ダッシュボード
                </Link>
              </li>
              <li>
                <Link
                  href="/summary"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/summary'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  全体サマリー
                </Link>
              </li>
              <li>
                <Link
                  href="/users"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/users'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.0002 7.79065C11.0814 7.79065 12.7689 6.1594 12.7689 4.1344C12.7689 2.1094 11.0814 0.478149 9.0002 0.478149C6.91895 0.478149 5.23145 2.1094 5.23145 4.1344C5.23145 6.1594 6.91895 7.79065 9.0002 7.79065ZM9.0002 1.7719C10.3783 1.7719 11.5033 2.84065 11.5033 4.16252C11.5033 5.48440 10.3783 6.55315 9.0002 6.55315C7.62207 6.55315 6.49707 5.48440 6.49707 4.16252C6.49707 2.84065 7.62207 1.7719 9.0002 1.7719Z" fill=""/>
                    <path d="M10.8283 9.05627H7.17207C4.16269 9.05627 1.71582 11.5313 1.71582 14.5406V16.875C1.71582 17.2125 1.99707 17.5219 2.3627 17.5219C2.72832 17.5219 3.00957 17.2407 3.00957 16.875V14.5406C3.00957 12.2344 4.89394 10.3219 7.22832 10.3219H10.8564C13.1627 10.3219 15.0752 12.2063 15.0752 14.5406V16.875C15.0752 17.2125 15.3564 17.5219 15.7221 17.5219C16.0877 17.5219 16.3689 17.2407 16.3689 16.875V14.5406C16.2846 11.5313 13.8377 9.05627 10.8283 9.05627Z" fill=""/>
                  </svg>
                  ユーザー
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setAcquisitionMenuOpen(!acquisitionMenuOpen)}
                  className={`relative flex w-full items-center justify-between gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname.startsWith('/acquisition')
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                    集客
                  </div>
                  <svg
                    className={`fill-current duration-200 ${acquisitionMenuOpen ? 'rotate-180' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                      fill=""
                    />
                  </svg>
                </button>
                {acquisitionMenuOpen && (
                  <ul className="mt-2 flex flex-col gap-1 pl-[60px] pr-4">
                    <li>
                      <Link
                        href="/acquisition"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/acquisition'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        集客チャネル
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/acquisition/organic-keywords"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/acquisition/organic-keywords'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        流入キーワード元
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/acquisition/referrals"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/acquisition/referrals'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        被リンク元
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <button
                  onClick={() => setEngagementMenuOpen(!engagementMenuOpen)}
                  className={`relative w-full flex items-center justify-between gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname.startsWith('/engagement')
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                    </svg>
                    エンゲージメント
                  </div>
                  <svg
                    className={`fill-current transition-transform duration-200 ${engagementMenuOpen ? 'rotate-180' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                      fill=""
                    />
                  </svg>
                </button>
                {engagementMenuOpen && (
                  <ul className="mt-2 flex flex-col gap-1 pl-[60px] pr-4">
                    <li>
                      <Link
                        href="/engagement"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/engagement'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        ページ別エンゲージメント
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/engagement/landing-pages"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/engagement/landing-pages'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        ランディングページ
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/engagement/file-downloads"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/engagement/file-downloads'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        ファイルダウンロード
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/engagement/external-links"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/engagement/external-links'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        外部リンククリック
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              
              {/* コンバージョン（親メニュー） */}
              <li>
                <button
                  onClick={() => setConversionMenuOpen(!conversionMenuOpen)}
                  className={`relative w-full flex items-center justify-between gap-2.5 border-r-4 py-[15px] pr-10 pl-6 text-base font-medium duration-200 ${
                    pathname.startsWith('/conversion-events')
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                    </svg>
                    コンバージョン
                  </div>
                  <svg
                    className={`fill-current transition-transform duration-200 ${conversionMenuOpen ? 'rotate-180' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                      fill=""
                    />
                  </svg>
                </button>
                {conversionMenuOpen && (
                  <ul className="mt-2 flex flex-col gap-1 pl-[60px] pr-4">
                    <li>
                      <Link
                        href="/conversion-events"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/conversion-events'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        コンバージョン一覧
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/conversion-events/funnel"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/conversion-events/funnel'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 hover:text-primary dark:text-dark-6 dark:hover:bg-dark-3'
                        }`}
                      >
                        逆算フロー
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              
              {/* サイト設定 */}
              <li>
                <Link
                  href="/site-settings"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/site-settings'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  サイト設定
                </Link>
              </li>
              
              {/* Divider */}
              <li>
                <div className="mx-9 my-5 h-px bg-stroke dark:bg-dark-3"></div>
              </li>

              <li>
                <Link
                  href="/profile"
                  className={`relative flex items-center border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/profile'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  アカウント
                </Link>
              </li>
              
              {user?.email === 'admin@example.com' && (
                <li>
                  <Link
                    href="/admin"
                    className={`relative flex items-center border-r-4 py-[10px] pr-10 pl-9 text-base font-medium duration-200 ${
                      pathname === '/admin'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                    }`}
                  >
                    管理者パネル
                  </Link>
                </li>
              )}

              <li>
                <button
                  onClick={handleLogout}
                  className="relative flex w-full items-center border-r-4 border-transparent py-[10px] pr-10 pl-9 text-base font-medium text-body-color duration-200 hover:border-primary hover:bg-primary/5 dark:text-dark-6"
                >
                  ログアウト
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-10">
          <div className="flex items-center">
            <div className="mr-4 h-[50px] w-full max-w-[50px] rounded-full">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="profile"
                  className="h-full w-full rounded-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                  {getInitial()}
                </div>
              )}
            </div>
            <div>
              <h6 className="text-base font-medium text-dark dark:text-white">
                {getDisplayName()}
              </h6>
              <p className="text-body-color dark:text-dark-6 text-sm">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col xl:ml-[300px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex w-full bg-white dark:bg-dark-2">
          <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Hamburger Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="block xl:hidden"
              >
                <svg
                  className="fill-current"
                  width="20"
                  height="18"
                  viewBox="0 0 20 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z" />
                </svg>
              </button>

              {/* Date Range Selector */}
              <div className="relative ml-4">
                <button
                  onClick={() => setDateRangeDropdownOpen(!dateRangeDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-body-color shadow-[inset_3px_3px_5px_rgba(0,0,0,0.1)] transition-all hover:text-primary hover:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.15)] dark:text-dark-6"
                  style={{ background: 'rgba(237, 243, 255, 0.5)' }}
                >
                  {startDate && endDate 
                    ? `${startDate} - ${endDate}`
                    : '日付範囲を選択'}
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dateRangeDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-md border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          handleInternalDateRangeChange('last_month');
                          setDateRangeDropdownOpen(false);
                          setShowDatePicker(false);
                        }}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-2 dark:hover:bg-dark-3 ${
                          dateRangeType === 'last_month' ? 'bg-primary/10 text-primary' : 'text-dark dark:text-white'
                        }`}
                      >
                        前月
                      </button>
                      <button
                        onClick={() => {
                          setShowDatePicker(true);
                        }}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-2 dark:hover:bg-dark-3 ${
                          dateRangeType === 'custom' ? 'bg-primary/10 text-primary' : 'text-dark dark:text-white'
                        }`}
                      >
                        カスタム
                      </button>

                      {/* Custom Date Picker */}
                      {showDatePicker && (
                        <div className="mt-3 space-y-3 border-t border-stroke pt-3 dark:border-dark-3">
                          <div>
                            <label className="mb-1 block text-xs text-body-color dark:text-dark-6">開始日</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="w-full rounded border border-stroke bg-transparent px-2 py-1.5 text-sm text-dark outline-none dark:border-dark-3 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-body-color dark:text-dark-6">終了日</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full rounded border border-stroke bg-transparent px-2 py-1.5 text-sm text-dark outline-none dark:border-dark-3 dark:text-white"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (customStartDate && customEndDate) {
                                handleInternalDateRangeChange('custom', customStartDate, customEndDate);
                                setDateRangeDropdownOpen(false);
                              }
                            }}
                            disabled={!customStartDate || !customEndDate}
                            className="w-full rounded bg-primary px-3 py-2 text-sm text-white hover:bg-opacity-90 disabled:opacity-50"
                          >
                            適用
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* サイト情報表示 */}
              {siteInfo && (
                <div className="hidden text-left lg:block ml-6">
                  <span className="block text-sm font-medium text-dark dark:text-white">
                    {siteInfo.siteName}
                  </span>
                  <span className="block text-xs text-body-color dark:text-dark-6">
                    {siteInfo.siteUrl}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 2xsm:gap-7">
              
              {/* PDF出力ボタン */}
              <div>
                <button 
                  onClick={() => setPdfModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  PDF出力
                </button>
              </div>
              
              {/* User Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3"
                >
                  <span className="hidden text-right lg:block">
                    <span className="block text-sm font-medium text-dark dark:text-white">
                      {getDisplayName()}
                    </span>
                    <span className="block text-xs text-body-color dark:text-dark-6">
                      {user?.email}
                    </span>
                  </span>

                  <span className="h-12 w-12 rounded-full">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                        {getInitial()}
                      </div>
                    )}
                  </span>

                  <svg
                    className={`hidden fill-current sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-4 flex w-62.5 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-dark-3 dark:bg-dark-2">
                    <ul className="flex flex-col overflow-y-auto border-b border-stroke dark:border-dark-3">
                      <li>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push('/profile');
                          }}
                          className="flex w-full gap-3.5 px-6 py-4 text-sm font-medium hover:bg-gray-2 dark:hover:bg-dark-3 lg:text-base"
                        >
                          <svg
                            className="fill-current"
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z" />
                            <path d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z" />
                          </svg>
                          アカウント
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push('/admin');
                          }}
                          className="flex w-full gap-3.5 px-6 py-4 text-sm font-medium hover:bg-gray-2 dark:hover:bg-dark-3 lg:text-base"
                        >
                          <svg
                            className="fill-current"
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M17.6687 1.44374C17.1187 0.893744 16.4312 0.618744 15.675 0.618744H7.42498C6.25623 0.618744 5.25935 1.58124 5.25935 2.78437V4.12499H4.29685C3.88435 4.12499 3.50623 4.46874 3.50623 4.91562C3.50623 5.36249 3.84998 5.70624 4.29685 5.70624H5.25935V10.2781H4.29685C3.88435 10.2781 3.50623 10.6219 3.50623 11.0687C3.50623 11.4812 3.84998 11.8594 4.29685 11.8594H5.25935V16.4312H4.29685C3.88435 16.4312 3.50623 16.775 3.50623 17.2219C3.50623 17.6687 3.84998 18.0125 4.29685 18.0125H5.25935V19.25C5.25935 20.4187 6.22185 21.4156 7.42498 21.4156H15.675C17.2218 21.4156 18.4937 20.1437 18.5281 18.5969V3.40937C18.4937 2.68437 18.2187 1.95937 17.6687 1.44374ZM16.9469 18.5625C16.9469 19.2844 16.3625 19.8344 15.6406 19.8344H7.3906C7.04685 19.8344 6.77185 19.5594 6.77185 19.2156V17.875H8.6281C9.0406 17.875 9.41873 17.5312 9.41873 17.0844C9.41873 16.6375 9.07498 16.2937 8.6281 16.2937H6.77185V11.7906H8.6281C9.0406 11.7906 9.41873 11.4469 9.41873 11C9.41873 10.5875 9.07498 10.2094 8.6281 10.2094H6.77185V5.63749H8.6281C9.0406 5.63749 9.41873 5.29374 9.41873 4.84687C9.41873 4.39999 9.07498 4.05624 8.6281 4.05624H6.77185V2.74999C6.77185 2.40624 7.04685 2.13124 7.3906 2.13124H15.6406C15.9844 2.13124 16.2937 2.26874 16.5687 2.50937C16.8094 2.74999 16.9469 3.09374 16.9469 3.43749V18.5625Z" />
                          </svg>
                          管理者パネル
                        </button>
                      </li>
                    </ul>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex gap-3.5 px-6 py-4 text-sm font-medium hover:bg-gray-2 dark:hover:bg-dark-3 lg:text-base"
                    >
                      <svg
                        className="fill-current"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M15.5375 0.618744H11.6531C10.7594 0.618744 10.0031 1.37499 10.0031 2.26874V4.64062C10.0031 5.05312 10.3469 5.39687 10.7594 5.39687C11.1719 5.39687 11.55 5.05312 11.55 4.64062V2.23437C11.55 2.16562 11.5844 2.13124 11.6531 2.13124H15.5375C16.3625 2.13124 17.0156 2.78437 17.0156 3.60937V18.3562C17.0156 19.1812 16.3625 19.8344 15.5375 19.8344H11.6531C11.5844 19.8344 11.55 19.8 11.55 19.7312V17.3594C11.55 16.9469 11.2062 16.6031 10.7594 16.6031C10.3125 16.6031 10.0031 16.9469 10.0031 17.3594V19.7312C10.0031 20.625 10.7594 21.3812 11.6531 21.3812H15.5375C17.2219 21.3812 18.5625 20.0062 18.5625 18.3562V3.64374C18.5625 1.95937 17.1875 0.618744 15.5375 0.618744Z" />
                        <path d="M6.05001 11.7563H12.2031C12.6156 11.7563 12.9594 11.4125 12.9594 11C12.9594 10.5875 12.6156 10.2438 12.2031 10.2438H6.08439L8.21564 8.07813C8.52501 7.76875 8.52501 7.2875 8.21564 6.97812C7.90626 6.66875 7.42501 6.66875 7.11564 6.97812L3.67814 10.4844C3.36876 10.7938 3.36876 11.275 3.67814 11.5844L7.11564 15.0906C7.25314 15.2281 7.45939 15.3312 7.66564 15.3312C7.87189 15.3312 8.04376 15.2625 8.21564 15.125C8.52501 14.8156 8.52501 14.3344 8.21564 14.025L6.05001 11.7563Z" />
                      </svg>
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
      
      {/* PDF出力モーダル */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-dark-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-dark dark:text-white">PDF出力</h3>
              <button
                onClick={() => {
                  setPdfModalOpen(false);
                  setSelectedPages([]);
                }}
                className="text-body-color hover:text-primary"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="mb-4 text-sm text-body-color dark:text-dark-6">
              出力する画面を選択してください
            </p>
            
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {/* 全体サマリー */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPages.includes('/summary')}
                  onChange={() => togglePageSelection('/summary')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-dark dark:text-white">全体サマリー</span>
              </label>
              
              {/* ユーザー */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPages.includes('/users')}
                  onChange={() => togglePageSelection('/users')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-dark dark:text-white">ユーザー</span>
              </label>
              
              {/* 集客 */}
              <div>
                <div className="font-medium text-sm text-dark dark:text-white mb-2">集客</div>
                <div className="pl-6 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/acquisition')}
                      onChange={() => togglePageSelection('/acquisition')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">集客チャネル</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/acquisition/organic-keywords')}
                      onChange={() => togglePageSelection('/acquisition/organic-keywords')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">流入キーワード元</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/acquisition/referrals')}
                      onChange={() => togglePageSelection('/acquisition/referrals')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">被リンク元</span>
                  </label>
                </div>
              </div>
              
              {/* エンゲージメント */}
              <div>
                <div className="font-medium text-sm text-dark dark:text-white mb-2">エンゲージメント</div>
                <div className="pl-6 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/engagement')}
                      onChange={() => togglePageSelection('/engagement')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">ページ別エンゲージメント</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/engagement/landing-pages')}
                      onChange={() => togglePageSelection('/engagement/landing-pages')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">ランディングページ</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/engagement/file-downloads')}
                      onChange={() => togglePageSelection('/engagement/file-downloads')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">ファイルダウンロード</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/engagement/external-links')}
                      onChange={() => togglePageSelection('/engagement/external-links')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">外部リンククリック</span>
                  </label>
                </div>
              </div>
              
              {/* コンバージョン */}
              <div>
                <div className="font-medium text-sm text-dark dark:text-white mb-2">コンバージョン</div>
                <div className="pl-6 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/conversion-events')}
                      onChange={() => togglePageSelection('/conversion-events')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">コンバージョン一覧</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/conversion-events/funnel')}
                      onChange={() => togglePageSelection('/conversion-events/funnel')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">逆算フロー</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setPdfModalOpen(false);
                  setSelectedPages([]);
                }}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-body-color hover:bg-gray-2 dark:border-dark-3"
              >
                キャンセル
              </button>
              <button
                onClick={handleExportSelectedPages}
                disabled={selectedPages.length === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                PDF出力
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </section>
  );
}