/**
 * サイトプレビューカード（コンパクト版）
 * 全体サマリー用の小さいスクリーンショット表示
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ScreenshotService, Screenshot } from '@/lib/screenshots/screenshotService';

interface SitePreviewCompactProps {
  siteUrl: string;
  siteName: string;
  userId: string;
}

export default function SitePreviewCompact({ siteUrl, siteName, userId }: SitePreviewCompactProps) {
  const [desktopScreenshot, setDesktopScreenshot] = useState<Screenshot | null>(null);
  const [mobileScreenshot, setMobileScreenshot] = useState<Screenshot | null>(null);
  const [loadingDesktop, setLoadingDesktop] = useState(false);
  const [loadingMobile, setLoadingMobile] = useState(false);

  // 初回ロード時にスクリーンショットを読み込み
  useEffect(() => {
    const loadScreenshots = async () => {
      if (!userId || !siteUrl) return;

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
    };

    loadScreenshots();
  }, [userId, siteUrl]);

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
      <div className="device-desktop" style={{ fontSize: '0.6rem' }}>
        <div 
          className="relative mb-[11%] rounded-[1vw] p-[1.5%] bg-white"
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
              className="w-full rounded border border-black/25"
            />
          ) : (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[16/9]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        <div 
          className="absolute left-0 right-0 bottom-[-18%] mx-auto w-[20%] h-[20%] bg-[#fafafa] -z-10"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        />
        <div 
          className="absolute left-0 right-0 bottom-[-19.5%] mx-auto rounded-b-[24px] rounded-t w-[34%] h-[2%] bg-white"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        />
      </div>
    );
  };

  const renderMobileMockup = (screenshot: Screenshot | null, loading: boolean) => {
    return (
      <div className="device-phone mx-auto" style={{ maxWidth: '120px' }}>
        <div 
          className="relative rounded-[20px] p-[12%_3%] bg-white"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        >
          <div 
            className="absolute left-0 right-0 top-0 mx-auto mt-[5.5%] w-[20%] h-[1%] rounded-[50px] bg-white"
            style={{
              boxShadow: 'inset 0 0 3px 1px rgba(0, 0, 0, .12)'
            }}
          />
          
          {loading ? (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[9/16]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : screenshot ? (
            <img
              src={screenshot.url}
              alt={`${siteName} - mobile`}
              className="w-full rounded border border-black/25"
            />
          ) : (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[9/16]">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          
          <div 
            className="absolute left-0 right-0 bottom-0 mx-auto mb-[2%] w-[10%] h-0 pt-[10%] rounded-full bg-white"
            style={{
              boxShadow: 'inset 0 0 5px 1px rgba(0, 0, 0, .12)'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-3 shadow-default dark:border-dark-3 dark:bg-dark-2">
      {/* ヘッダー */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
          </svg>
          <a 
            href={siteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-medium text-dark hover:text-primary dark:text-white"
          >
            {siteName || siteUrl}
          </a>
        </div>
        
        <button
          onClick={handleRefreshAll}
          disabled={loadingDesktop || loadingMobile}
          className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white hover:bg-opacity-90 disabled:opacity-50"
          title="更新"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3 w-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          更新
        </button>
      </div>
      
      {/* スクリーンショット表示 */}
      <div className="flex gap-4">
        {/* PC版 */}
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-3.5 w-3.5 text-body-color">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
            </svg>
            <span className="text-xs font-medium text-body-color dark:text-dark-6">PC</span>
          </div>
          {renderDesktopMockup(desktopScreenshot, loadingDesktop)}
        </div>

        {/* スマホ版 */}
        <div className="w-[120px]">
          <div className="mb-1.5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-3.5 w-3.5 text-body-color">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            <span className="text-xs font-medium text-body-color dark:text-dark-6">スマホ</span>
          </div>
          {renderMobileMockup(mobileScreenshot, loadingMobile)}
        </div>
      </div>
    </div>
  );
}

