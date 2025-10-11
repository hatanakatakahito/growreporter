/**
 * サイトプレビューカード
 * サイトのスクリーンショットを表示するコンポーネント（PC/スマホ並列表示）
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

  const renderScreenshot = (screenshot: Screenshot | null, loading: boolean, device: 'desktop' | 'mobile') => {
    if (loading) {
      return (
        <div className="flex h-[300px] items-center justify-center bg-gray-2 dark:bg-dark-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }

    if (screenshot) {
      return (
        <div className="bg-gray-2 dark:bg-dark-3">
          <img
            src={screenshot.url}
            alt={`${siteName} - ${device} preview`}
            className="w-full h-auto object-contain"
            style={{ maxHeight: '400px' }}
          />
          <div className="px-3 py-2 text-xs text-body-color">
            撮影日時: {new Date(screenshot.capturedAt).toLocaleString('ja-JP')}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-[300px] flex-col items-center justify-center bg-gray-2 p-6 text-center dark:bg-dark-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-3 h-12 w-12 text-body-color">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <p className="text-sm text-body-color">撮影中...</p>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          サイトプレビュー
        </h3>
        
        <button
          onClick={handleRefreshAll}
          disabled={loadingDesktop || loadingMobile}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {(loadingDesktop || loadingMobile) ? '撮影中...' : '更新'}
        </button>
      </div>
      
      {/* エラー表示 */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* PC/スマホ並列表示 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PCプレビュー */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
              <span className="font-medium text-dark dark:text-white">PC</span>
            </div>
            <button
              onClick={() => handleCapture('desktop')}
              disabled={loadingDesktop}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              再撮影
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
            {renderScreenshot(desktopScreenshot, loadingDesktop, 'desktop')}
          </div>
        </div>

        {/* スマホプレビュー */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              <span className="font-medium text-dark dark:text-white">スマホ</span>
            </div>
            <button
              onClick={() => handleCapture('mobile')}
              disabled={loadingMobile}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              再撮影
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
            {renderScreenshot(mobileScreenshot, loadingMobile, 'mobile')}
          </div>
        </div>
      </div>
      
      {/* サイト情報 */}
      <div className="mt-6 space-y-2 border-t border-stroke pt-4 dark:border-dark-3">
        <div>
          <p className="text-xs font-medium text-body-color">サイト名</p>
          <p className="text-sm text-dark dark:text-white">{siteName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-body-color">URL</p>
          <a 
            href={siteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {siteUrl}
          </a>
        </div>
      </div>
    </div>
  );
}
