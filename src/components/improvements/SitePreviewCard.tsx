/**
 * サイトプレビューカード
 * サイトのスクリーンショットを表示するコンポーネント（PC大/スマホ小の並列表示）
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ScreenshotService, Screenshot } from '@/lib/screenshots/screenshotService';

interface SitePreviewCardProps {
  siteUrl: string;
  siteName: string;
  userId: string;
}

export default function SitePreviewCard({ siteUrl, siteName, userId }: SitePreviewCardProps) {
  const [desktopScreenshot, setDesktopScreenshot] = useState<Screenshot | null>(null);
  const [mobileScreenshot, setMobileScreenshot] = useState<Screenshot | null>(null);
  const [loadingDesktop, setLoadingDesktop] = useState(false);
  const [loadingMobile, setLoadingMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初回ロード時に両方のスクリーンショットを読み込み＋自動撮影
  useEffect(() => {
    const loadAndCapture = async () => {
      if (!userId || !siteUrl) return;

      // デスクトップ
      const existingDesktop = await ScreenshotService.getLatestScreenshot(userId, siteUrl, 'desktop');
      if (existingDesktop) {
        setDesktopScreenshot(existingDesktop);
      } else {
        // 自動撮影
        console.log('📸 デスクトップスクリーンショットがないため自動撮影を開始');
        await handleCapture('desktop');
      }

      // モバイル
      const existingMobile = await ScreenshotService.getLatestScreenshot(userId, siteUrl, 'mobile');
      if (existingMobile) {
        setMobileScreenshot(existingMobile);
      } else {
        // 自動撮影
        console.log('📸 モバイルスクリーンショットがないため自動撮影を開始');
        await handleCapture('mobile');
      }
    };

    loadAndCapture();
  }, [userId, siteUrl]);

  const handleCapture = async (device: 'desktop' | 'mobile') => {
    try {
      if (device === 'desktop') {
        setLoadingDesktop(true);
      } else {
        setLoadingMobile(true);
      }
      setError(null);
      
      const newScreenshot = await ScreenshotService.captureScreenshot(userId, siteUrl, device);
      
      if (device === 'desktop') {
        setDesktopScreenshot(newScreenshot);
      } else {
        setMobileScreenshot(newScreenshot);
      }
    } catch (err: any) {
      console.error('スクリーンショット撮影エラー:', err);
      setError(err?.message || 'スクリーンショットの撮影に失敗しました');
    } finally {
      if (device === 'desktop') {
        setLoadingDesktop(false);
      } else {
        setLoadingMobile(false);
      }
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      handleCapture('desktop'),
      handleCapture('mobile')
    ]);
  };

  const renderDesktopMockup = (screenshot: Screenshot | null, loading: boolean) => {
    return (
      <div className="browser-mockup with-url shadow-xl">
        {/* ブラウザのトップバー */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#e8eaed] dark:bg-gray-700 rounded-t-lg border-b border-gray-300 dark:border-gray-600">
          {/* ウィンドウ制御ボタン */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80"></div>
            <div className="w-3 h-3 rounded-full bg-[#28ca42] hover:bg-[#28ca42]/80"></div>
          </div>
          {/* アドレスバー */}
          <div className="flex-1 flex items-center gap-2 ml-2">
            <div className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="truncate">{siteUrl}</span>
              </div>
            </div>
            <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
          </div>
        </div>
        {/* ブラウザコンテンツエリア */}
        <div className="relative bg-white dark:bg-gray-900" style={{ height: '400px' }}>
          {loading ? (
            <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : screenshot ? (
            <img
              src={screenshot.url}
              alt={`${siteName} - desktop preview`}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-2 h-10 w-10 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">撮影中...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMobileMockup = (screenshot: Screenshot | null, loading: boolean) => {
    return (
      <div className="mobile-browser-mockup shadow-xl mx-auto" style={{ width: '320px' }}>
        {/* デバイスフレーム */}
        <div className="relative border-8 border-gray-800 dark:border-gray-700 bg-gray-800 dark:bg-gray-700 rounded-[2.5rem] overflow-hidden">
          {/* ステータスバー */}
          <div className="flex items-center justify-between px-6 py-2 bg-white dark:bg-gray-900">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">9:41</span>
            <div className="flex items-center gap-1">
              {/* シグナル */}
              <svg className="w-4 h-4 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              {/* Wi-Fi */}
              <svg className="w-4 h-4 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {/* バッテリー */}
              <div className="flex items-center">
                <div className="w-5 h-2.5 border border-gray-900 dark:border-white rounded-sm relative">
                  <div className="absolute inset-0.5 bg-gray-900 dark:bg-white rounded-sm"></div>
                </div>
                <div className="w-0.5 h-1.5 bg-gray-900 dark:bg-white rounded-r-sm ml-0.5"></div>
              </div>
            </div>
          </div>

          {/* Safari風アドレスバー */}
          <div className="px-3 py-2 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate">{siteUrl}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="relative bg-white dark:bg-gray-900" style={{ height: '480px' }}>
            {loading ? (
              <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : screenshot ? (
              <img
                src={screenshot.url}
                alt={`${siteName} - mobile preview`}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-2 h-8 w-8 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-xs text-gray-500 dark:text-gray-400">撮影中...</p>
              </div>
            )}
          </div>

          {/* 下部タブバー（Safari風） */}
          <div className="flex items-center justify-around px-4 py-3 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <button className="flex flex-col items-center gap-0.5">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="flex flex-col items-center gap-0.5">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="flex flex-col items-center gap-0.5">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button className="flex flex-col items-center gap-0.5">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button className="flex flex-col items-center gap-0.5">
              <div className="relative">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
          </svg>
          <div>
            <h3 className="text-base font-semibold text-dark dark:text-white">
              {siteName}
            </h3>
            <a 
              href={siteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {siteUrl}
            </a>
          </div>
        </div>
        
        <button
          onClick={handleRefreshAll}
          disabled={loadingDesktop || loadingMobile}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {(loadingDesktop || loadingMobile) ? '撮影中...' : '更新'}
        </button>
      </div>
      
      {/* エラー表示 */}
      {error && (
        <div className="mx-6 mt-4 rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* スクリーンショット表示エリア */}
      <div className="p-6">
        <div className="flex gap-8">
          {/* PC版（左側・大）*/}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-body-color">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                </svg>
                <span className="text-sm font-medium text-body-color">PC</span>
              </div>
              {desktopScreenshot && (
                <span className="text-xs text-body-color">
                  撮影: {new Date(desktopScreenshot.capturedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {renderDesktopMockup(desktopScreenshot, loadingDesktop)}
          </div>

          {/* スマホ版（右側・小）*/}
          <div className="w-[300px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-body-color">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
                <span className="text-sm font-medium text-body-color">スマホ</span>
              </div>
              {mobileScreenshot && (
                <span className="text-xs text-body-color">
                  撮影: {new Date(mobileScreenshot.capturedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {renderMobileMockup(mobileScreenshot, loadingMobile)}
          </div>
        </div>
      </div>
    </div>
  );
}
