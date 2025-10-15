/**
 * サイトプレビューカード
 * サイトのスクリーンショットを表示するコンポーネント（PC大/スマホ小の並列表示）
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ScreenshotService, Screenshot } from '@/lib/screenshots/screenshotService';
import Loading from '@/components/common/Loading';

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
      <div className="device-desktop">
        {/* デスクトップモックアップ */}
        <div 
          className="relative mb-[11%] rounded-[1vw] p-[1.5%] bg-white"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[16/9]">
              <Loading size={32} />
            </div>
          ) : screenshot ? (
            <img
              src={screenshot.url}
              alt={`${siteName} - desktop preview`}
              className="w-full rounded border border-black/25"
            />
          ) : (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded aspect-[16/9] text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-2 h-10 w-10 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-xs text-gray-500">撮影中...</p>
            </div>
          )}
        </div>
        {/* デスクトップスタンド（アーム） */}
        <div 
          className="absolute left-0 right-0 bottom-[-18%] mx-auto w-[20%] h-[20%] bg-[#fafafa] -z-10"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        />
        {/* デスクトップスタンド（ベース） */}
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
      <div className="device-phone mx-auto" style={{ maxWidth: '240px' }}>
        {/* スマホモックアップ */}
        <div 
          className="relative rounded-[20px] p-[12%_3%] bg-white"
          style={{
            boxShadow: 'inset 0 4px 7px 1px #fff, inset 0 -5px 20px rgba(173, 186, 204, .25), 0 2px 6px rgba(0, 21, 64, .14), 0 10px 20px rgba(0, 21, 64, .05)'
          }}
        >
          {/* スピーカー */}
          <div 
            className="absolute left-0 right-0 top-0 mx-auto mt-[5.5%] w-[20%] h-[1%] rounded-[50px] bg-white"
            style={{
              boxShadow: 'inset 0 0 3px 1px rgba(0, 0, 0, .12)'
            }}
          />
          
          {/* コンテンツ */}
          {loading ? (
            <div className="flex items-center justify-center bg-gray-50 rounded aspect-[9/16]">
              <Loading size={32} />
            </div>
          ) : screenshot ? (
            <img
              src={screenshot.url}
              alt={`${siteName} - mobile preview`}
              className="w-full rounded border border-black/25"
            />
          ) : (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded aspect-[9/16] text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-2 h-8 w-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-xs text-gray-500">撮影中...</p>
            </div>
          )}
          
          {/* ホームボタン */}
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
          <div className="w-[240px] space-y-3">
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
