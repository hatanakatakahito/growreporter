/**
 * サイトプレビューカード
 * サイトのスクリーンショットを表示するコンポーネント
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
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // スクリーンショットを読み込み
  useEffect(() => {
    loadScreenshot();
  }, [device, userId, siteUrl]);

  const loadScreenshot = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const latest = await ScreenshotService.getLatestScreenshot(userId, siteUrl, device);
      setScreenshot(latest);
    } catch (err) {
      console.error('スクリーンショット取得エラー:', err);
      setError('スクリーンショットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newScreenshot = await ScreenshotService.captureScreenshot(userId, siteUrl, device);
      setScreenshot(newScreenshot);
    } catch (err: any) {
      console.error('スクリーンショット撮影エラー:', err);
      setError(err?.message || 'スクリーンショットの撮影に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          サイトプレビュー
        </h3>
        
        <button
          onClick={handleCapture}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? '撮影中...' : '更新'}
        </button>
      </div>
      
      {/* デバイス切り替え */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setDevice('desktop')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            device === 'desktop'
              ? 'bg-primary text-white'
              : 'bg-gray-2 text-body-color hover:bg-gray-3 dark:bg-dark-3 dark:text-dark-6'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="inline-block w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
          </svg>
          PC
        </button>
        <button
          onClick={() => setDevice('mobile')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            device === 'mobile'
              ? 'bg-primary text-white'
              : 'bg-gray-2 text-body-color hover:bg-gray-3 dark:bg-dark-3 dark:text-dark-6'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="inline-block w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
          スマホ
        </button>
      </div>
      
      {/* エラー表示 */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* スクリーンショット表示 */}
      <div className="relative overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
        {loading ? (
          <div className="flex h-[400px] items-center justify-center bg-gray-2 dark:bg-dark-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : screenshot ? (
          <div className="bg-gray-2 dark:bg-dark-3">
            <img
              src={screenshot.url}
              alt={`${siteName} - ${device} preview`}
              className="w-full h-auto object-contain"
              style={{ maxHeight: device === 'mobile' ? '600px' : '400px' }}
            />
            <div className="px-4 py-2 text-xs text-body-color">
              撮影日時: {new Date(screenshot.capturedAt).toLocaleString('ja-JP')}
            </div>
          </div>
        ) : (
          <div className="flex h-[400px] flex-col items-center justify-center bg-gray-2 p-8 text-center dark:bg-dark-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mb-4 h-16 w-16 text-body-color">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="mb-2 text-body-color">スクリーンショットはまだありません</p>
            <p className="text-sm text-body-color">「更新」ボタンをクリックして撮影してください</p>
          </div>
        )}
      </div>
      
      {/* サイト情報 */}
      <div className="mt-4 space-y-2">
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
