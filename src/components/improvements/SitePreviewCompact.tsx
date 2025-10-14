/**
 * サイトプレビューカード（コンパクト版）
 * 全体サマリー用の小さいスクリーンショット表示
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ScreenshotService, Screenshot } from '@/lib/screenshots/screenshotService';
import Link from 'next/link';

interface SitePreviewCompactProps {
  siteUrl: string;
  siteName: string;
  userId: string;
}

interface MetaInfo {
  title: string;
  description: string;
}

export default function SitePreviewCompact({ siteUrl, siteName, userId }: SitePreviewCompactProps) {
  const [desktopScreenshot, setDesktopScreenshot] = useState<Screenshot | null>(null);
  const [mobileScreenshot, setMobileScreenshot] = useState<Screenshot | null>(null);
  const [loadingDesktop, setLoadingDesktop] = useState(false);
  const [loadingMobile, setLoadingMobile] = useState(false);
  const [metaInfo, setMetaInfo] = useState<MetaInfo>({ title: '', description: '' });

  // 初回ロード時にスクリーンショットとMeta情報を読み込み
  useEffect(() => {
    const loadData = async () => {
      if (!userId || !siteUrl) return;

      // スクリーンショット取得
      const [desktop, mobile] = await Promise.all([
        ScreenshotService.getLatestScreenshot(userId, siteUrl, 'desktop'),
        ScreenshotService.getLatestScreenshot(userId, siteUrl, 'mobile')
      ]);

      setDesktopScreenshot(desktop);
      setMobileScreenshot(mobile);

      // スクリーンショットがない場合は自動撮影
      if (!desktop) {
        handleCapture('desktop');
      }
      if (!mobile) {
        handleCapture('mobile');
      }

      // Meta情報取得
      try {
        const response = await fetch(`/api/meta-info?url=${encodeURIComponent(siteUrl)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMetaInfo({
              title: data.title || siteName,
              description: data.description || ''
            });
          }
        }
      } catch (error) {
        console.error('Meta情報取得エラー:', error);
      }
    };

    loadData();
  }, [userId, siteUrl, siteName]);

  const handleCapture = async (device: 'desktop' | 'mobile') => {
    try {
      if (device === 'desktop') {
        setLoadingDesktop(true);
      } else {
        setLoadingMobile(true);
      }
      
      const newScreenshot = await ScreenshotService.captureScreenshot(userId, siteUrl, device);
      
      if (device === 'desktop') {
        setDesktopScreenshot(newScreenshot);
      } else {
        setMobileScreenshot(newScreenshot);
      }
    } catch (err: any) {
      console.error('スクリーンショット撮影エラー:', err);
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
      <div className="device-desktop" style={{ fontSize: '0.7rem' }}>
        <div 
          className="relative rounded-[8px] p-[1.5%] bg-white"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[16/9]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : screenshot ? (
            <img
              src={screenshot.url}
              alt={`${siteName} - desktop`}
              className="w-full rounded"
            />
          ) : (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[16/9]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMobileMockup = (screenshot: Screenshot | null, loading: boolean) => {
    return (
      <div className="device-phone mx-auto" style={{ maxWidth: '180px' }}>
        <div 
          className="relative rounded-[20px] p-[12%_3%] bg-white"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[9/16]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : screenshot ? (
            <img
              src={screenshot.url}
              alt={`${siteName} - mobile`}
              className="w-full rounded"
            />
          ) : (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[9/16]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      style={{ 
        background: 'linear-gradient(to right, #e3f2fd, #fff8e1)',
        padding: '1.5rem'
      }}
    >
      <div className="flex gap-6">
        {/* 左側：サイト情報 */}
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-primary flex-shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold text-dark dark:text-white mb-0.5">
                {siteName || metaInfo.title || siteUrl}
              </div>
              <a 
                href={siteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline block mb-2"
              >
                {siteUrl}
              </a>
              <div className="mb-2">
                <span className="text-xs text-body-color dark:text-dark-6">サイトタイトル</span>
                <p className="text-sm font-medium text-dark dark:text-white max-w-[600px]">
                  {metaInfo.title || 'タイトル情報を取得中...'}
                </p>
              </div>
              <div className="mb-3">
                <span className="text-xs text-body-color dark:text-dark-6">サイト説明文</span>
                <p className="text-sm text-body-color dark:text-dark-6 max-w-[600px]">
                  {metaInfo.description || '説明文を取得中...'}
                </p>
              </div>
              <Link
                href="/site-settings"
                className="inline-block rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                サイト設定
              </Link>
            </div>
          </div>
        </div>

        {/* 右側：スクリーンショット */}
        <div className="flex items-center relative justify-end">
          {/* スマホ版 */}
          <div className="w-[100px] relative z-10 mt-8">
            {renderMobileMockup(mobileScreenshot, loadingMobile)}
          </div>

          {/* PC版 */}
          <div className="w-[400px] -ml-12">
            {renderDesktopMockup(desktopScreenshot, loadingDesktop)}
          </div>
        </div>
      </div>
    </div>
  );
}

