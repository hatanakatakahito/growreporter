'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserProfileService } from '@/lib/user/userProfileService';
import { UserProfile } from '@/types/user';
import SitePreviewCompact from '@/components/improvements/SitePreviewCompact';
import PDFLoadingOverlay from '@/components/common/PDFLoadingOverlay';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onDateRangeChange?: (startDate: string, endDate: string, type: string) => void;
}

export default function DashboardLayout({ children, onDateRangeChange }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // 印刷モードかどうかをチェック
  const isPrintMode = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('print') === 'true' ||
     new URLSearchParams(window.location.search).get('skipLoading') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyzeMenuOpen, setAnalyzeMenuOpen] = useState(false);
  const [acquisitionMenuOpen, setAcquisitionMenuOpen] = useState(false);
  const [engagementMenuOpen, setEngagementMenuOpen] = useState(false);
  const [conversionMenuOpen, setConversionMenuOpen] = useState(false);
  
  const dataExportDropdownRef = useRef<HTMLDivElement>(null);
  
  // 現在のパスに基づいてメニューを自動展開
  useEffect(() => {
    if (pathname?.startsWith('/summary') || pathname?.startsWith('/users') || 
        pathname?.startsWith('/acquisition') || pathname?.startsWith('/engagement') || 
        pathname?.startsWith('/conversion-events')) {
      setAnalyzeMenuOpen(true);
    }
    
    if (pathname?.startsWith('/acquisition')) {
      setAcquisitionMenuOpen(true);
    }
    
    if (pathname?.startsWith('/engagement')) {
      setEngagementMenuOpen(true);
    }
    
    if (pathname?.startsWith('/conversion-events')) {
      setConversionMenuOpen(true);
    }
  }, [pathname]);
  
  // ドロップダウンの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dataExportDropdownRef.current && !dataExportDropdownRef.current.contains(event.target as Node)) {
        setDataExportDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // データ出力機能の状態管理
  const [dataExportDropdownOpen, setDataExportDropdownOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [siteInfo, setSiteInfo] = useState<{ siteName: string; siteUrl: string } | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [currentPdfPage, setCurrentPdfPage] = useState<string>('');
  const [currentPdfIndex, setCurrentPdfIndex] = useState<number>(0);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<'generating' | 'completed' | 'error'>('generating');
  
  // Excel出力用の状態管理
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; message: string }>({ current: 0, total: 0, message: '' });
  
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

  // ページパスからタイトルを取得する関数
  const getPageTitle = (path: string): string => {
    const pageTitles: Record<string, string> = {
      '/summary': '全体サマリー',
      '/users': 'ユーザー',
      '/acquisition': '集客チャネル',
      '/acquisition/organic-keywords': 'オーガニックキーワード',
      '/acquisition/referrals': 'リファラー',
      '/engagement': 'ページ別',
      '/engagement/page-classification': 'ページ分類別',
      '/engagement/landing-pages': 'ランディングページ',
      '/engagement/file-downloads': 'ファイルダウンロード',
      '/engagement/external-links': '外部リンク',
      '/conversion-events': 'コンバージョンイベント',
      '/improvements': '改善提案'
    };
    return pageTitles[path] || path;
  };
  
  // データ出力ボタンのクリックハンドラー
  const handleDataExportClick = (type: 'pdf' | 'excel') => {
    setExportType(type);
    setDataExportDropdownOpen(false);
    setExportModalOpen(true);
  };

  // 選択されたページをPDF出力（PDF専用ページを使用）
  const handleExportSelectedPages = async () => {
    if (selectedPages.length === 0) {
      alert('出力する画面を選択してください');
      return;
    }

    if (exportType === 'pdf') {
      // 確認アラートを削除 - 直接PDF生成を開始
      try {
        // PDF専用ページを使用してPDF生成
        console.log('📄 PDF専用ページでPDF出力を開始します...');
        console.log('📄 選択されたページ:', selectedPages);

        // モーダルを閉じる
        setExportModalOpen(false);

        setIsPdfGenerating(true);
        setPdfGenerationStatus('generating');
        
        // PDF専用ページを使用してPDF生成
        for (let i = 0; i < selectedPages.length; i++) {
          const pagePath = selectedPages[i];
          const pageTitle = getPageTitle(pagePath);
          
          // 進捗を更新
          setCurrentPdfPage(pageTitle);
          setCurrentPdfIndex(i);

          try {
            // PDF専用ページのパスに変換
            const pdfPagePath = pagePath === '/summary' ? '/summary' : pagePath;
            
            // APIエンドポイントを呼び出してPDF生成
            const response = await fetch('/api/pdf/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ pagePath: pdfPagePath }),
            });

            if (!response.ok) {
              throw new Error(`PDF生成に失敗しました: ${response.statusText}`);
            }

            // PDFをダウンロード
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pageTitle}-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log(`✅ ${pageTitle} のPDF生成完了`);
          } catch (error) {
            console.error(`❌ ${pageTitle} のPDF生成エラー:`, error);
            throw error;
          }
        }
        
        // 完了状態を設定
        setPdfGenerationStatus('completed');
        console.log('✅ PDF出力が完了しました！すべてのページのPDFがダウンロードされました。');
        
        // 2秒後にローディング画面を閉じる
        setTimeout(() => {
          setSelectedPages([]);
          setCurrentPdfPage('');
          setCurrentPdfIndex(0);
          setIsPdfGenerating(false);
          setPdfGenerationStatus('generating');
        }, 2000);
      } catch (error) {
        console.error('❌ PDF出力エラー:', error);
        
        // エラー状態を設定
        setPdfGenerationStatus('error');
        console.error(
          'PDF出力に失敗しました。\n' +
          'ブラウザのコンソールでエラー詳細を確認してください。\n\n' +
          `エラー: ${error instanceof Error ? error.message : String(error)}`
        );
        
        // 3秒後にローディング画面を閉じる
        setTimeout(() => {
          setIsPdfGenerating(false);
          setCurrentPdfPage('');
          setCurrentPdfIndex(0);
          setPdfGenerationStatus('generating');
        }, 3000);
      }
    } else {
      // エクセル出力 - PDF出力と同じ挙動
      try {
        // モーダルを閉じる
        setExportModalOpen(false);
        
        // PDF用ローディング画面を表示
        setIsPdfGenerating(true);
        setPdfGenerationStatus('generating');
        
        const { exportToExcel } = await import('@/lib/excel/excelExporter');
        
        console.log('📊 エクセル出力を開始します...');
        console.log('📊 選択されたページ:', selectedPages);
        
        // 各ページの処理進捗を表示（PDF出力と同じ挙動）
        for (let i = 0; i < selectedPages.length; i++) {
          const pagePath = selectedPages[i];
          const pageTitle = getPageTitle(pagePath);
          
          setCurrentPdfPage(pageTitle);
          setCurrentPdfIndex(i);
          
          try {
            // プログレスコールバックを渡す
            await exportToExcel([pagePath], router, (current, total, message) => {
              console.log(`📊 ${pageTitle}: ${message}`);
            });
            
            console.log(`✅ ${pageTitle} のエクセル出力完了`);
          } catch (error) {
            console.error(`❌ ${pageTitle} のエクセル出力エラー:`, error);
            throw error;
          }
        }
        
        // 完了状態を設定
        setPdfGenerationStatus('completed');
        console.log('✅ エクセル出力が完了しました！すべてのページのエクセルがダウンロードされました。');
        
        // 2秒後にローディング画面を閉じる
        setTimeout(() => {
          setSelectedPages([]);
          setCurrentPdfPage('');
          setCurrentPdfIndex(0);
          setIsPdfGenerating(false);
          setPdfGenerationStatus('generating');
        }, 2000);
      } catch (error) {
        console.error('❌ エクセル出力エラー:', error);
        
        // エラー状態を設定
        setPdfGenerationStatus('error');
        console.error(
          'エクセル出力に失敗しました。\n' +
          'ブラウザのコンソールでエラー詳細を確認してください。\n\n' +
          `エラー: ${error instanceof Error ? error.message : String(error)}`
        );
        
        // 3秒後にローディング画面を閉じる
        setTimeout(() => {
          setIsPdfGenerating(false);
          setCurrentPdfPage('');
          setCurrentPdfIndex(0);
          setPdfGenerationStatus('generating');
        }, 3000);
      }
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
    <section className="relative flex min-h-screen w-full items-start dark:bg-dark" style={{ backgroundColor: '#f5f9fd' }}>
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
                <button
                  onClick={() => setAnalyzeMenuOpen(!analyzeMenuOpen)}
                  className={`relative flex w-full items-center justify-between gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/summary' || pathname === '/users' || pathname?.startsWith('/acquisition') || pathname?.startsWith('/engagement') || pathname?.startsWith('/conversion-events')
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                    分析する
                  </div>
                  <svg
                    className={`fill-current duration-200 ${analyzeMenuOpen ? 'rotate-180' : ''}`}
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
                {analyzeMenuOpen && (
                  <ul className="mt-2 flex flex-col gap-1 pl-[60px] pr-4">
                    <li>
                      <Link
                        href="/summary"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/summary'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                        }`}
                      >
                        全体サマリー
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/users"
                        className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname === '/users'
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                        }`}
                      >
                        ユーザー
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => setAcquisitionMenuOpen(!acquisitionMenuOpen)}
                        className={`flex w-full items-center justify-between rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname.startsWith('/acquisition')
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                        }`}
                      >
                        集客
                        <svg
                          className={`fill-current duration-200 ${acquisitionMenuOpen ? 'rotate-180' : ''}`}
                          width="16"
                          height="16"
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
                        <ul className="mt-1 flex flex-col gap-1 pl-4">
                          <li>
                            <Link
                              href="/acquisition"
                              className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                                pathname === '/acquisition'
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
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
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
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
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
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
                        className={`flex w-full items-center justify-between rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname.startsWith('/engagement')
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                        }`}
                      >
                        エンゲージメント
                        <svg
                          className={`fill-current duration-200 ${engagementMenuOpen ? 'rotate-180' : ''}`}
                          width="16"
                          height="16"
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
                        <ul className="mt-1 flex flex-col gap-1 pl-4">
                          <li>
                            <Link
                              href="/engagement"
                              className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                                pathname === '/engagement'
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                              }`}
                            >
                              ページ別
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/engagement/page-classification"
                              className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                                pathname === '/engagement/page-classification'
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                              }`}
                            >
                              ページ分類別
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/engagement/landing-pages"
                              className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                                pathname === '/engagement/landing-pages'
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
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
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
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
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                              }`}
                            >
                              外部リンククリック
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>
                    <li>
                      <button
                        onClick={() => setConversionMenuOpen(!conversionMenuOpen)}
                        className={`flex w-full items-center justify-between rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                          pathname.startsWith('/conversion-events')
                            ? 'bg-primary/10 text-primary'
                            : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                        }`}
                      >
                        コンバージョン
                        <svg
                          className={`fill-current duration-200 ${conversionMenuOpen ? 'rotate-180' : ''}`}
                          width="16"
                          height="16"
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
                        <ul className="mt-1 flex flex-col gap-1 pl-4">
                          <li>
                            <Link
                              href="/conversion-events"
                              className={`block rounded-md py-2 px-4 text-sm font-medium duration-200 ${
                                pathname === '/conversion-events'
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
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
                                  : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                              }`}
                            >
                              逆算フロー
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>
                  </ul>
                )}
              </li>
              
              {/* 改善する */}
              <li>
                <Link
                  href="/improvements"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/improvements'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  改善する
                </Link>
              </li>
              
              {/* 評価する */}
              <li>
                <Link
                  href="/evaluation"
                  className={`relative flex items-center gap-2.5 border-r-4 py-[15px] pr-10 pl-9 text-base font-medium duration-200 ${
                    pathname === '/evaluation'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-body-color hover:border-primary hover:bg-primary/5 dark:text-dark-6'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                  </svg>
                  評価する
                </Link>
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
        {!isPrintMode && (
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
              
              {/* データ出力ドロップダウン */}
              <div className="relative" ref={dataExportDropdownRef}>
                <button 
                  onClick={() => setDataExportDropdownOpen(!dataExportDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  データ出力
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* ドロップダウンメニュー */}
                {dataExportDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
                    <button
                      onClick={() => handleDataExportClick('pdf')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      PDF出力
                    </button>
                    <button
                      onClick={() => handleDataExportClick('excel')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                      </svg>
                      エクセル出力
                    </button>
                  </div>
                )}
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
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-2 text-sm font-medium text-dark dark:bg-dark-3 dark:text-white">
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push('/profile');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg
                        className="fill-current"
                        width="20"
                        height="20"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z" />
                        <path d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z" />
                      </svg>
                      アカウント
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                    >
                      <svg
                        className="fill-current"
                        width="20"
                        height="20"
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
        )}

        {/* Site Preview Section - Above Main Content */}
        {!isPrintMode && siteInfo && siteInfo.siteUrl && user && 
         !pathname?.startsWith('/profile') && 
         !pathname?.startsWith('/site-settings') && 
         !pathname?.startsWith('/admin') && (
          <div className="cover bg-white dark:bg-dark-2 w-full">
            <SitePreviewCompact
              siteUrl={siteInfo.siteUrl}
              siteName={siteInfo.siteName}
              userId={user.uid}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
      
      {/* データ出力モーダル */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-dark-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-dark dark:text-white">
                {exportType === 'pdf' ? 'PDF出力' : 'エクセル出力'}
              </h3>
              <button
                onClick={() => {
                  setExportModalOpen(false);
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
                    <span className="text-sm text-dark dark:text-white">ページ別</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes('/engagement/page-classification')}
                      onChange={() => togglePageSelection('/engagement/page-classification')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-dark dark:text-white">ページ分類別</span>
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
                  setExportModalOpen(false);
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
                {exportType === 'pdf' ? 'PDF出力' : 'エクセル出力'}
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

        {/* PDF生成ローディング画面 */}
        <PDFLoadingOverlay
          isVisible={isPdfGenerating}
          currentPage={currentPdfPage}
          totalPages={selectedPages.length}
          currentIndex={currentPdfIndex}
          status={pdfGenerationStatus}
        />

    </section>
  );
}