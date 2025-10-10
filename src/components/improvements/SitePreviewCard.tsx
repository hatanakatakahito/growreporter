'use client';

import React, { useState } from 'react';

interface SitePreviewCardProps {
  siteUrl: string;
  siteName: string;
  userId: string;
}

export default function SitePreviewCard({ siteUrl, siteName, userId }: SitePreviewCardProps) {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  
  // TODO: 実際のキャプチャ機能は後で実装
  const captureScreenshot = async () => {
    setLoading(true);
    try {
      // キャプチャAPIを呼び出し
      console.log('キャプチャ実行:', siteUrl, activeTab);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 仮実装
      alert('キャプチャ機能は後で実装されます');
    } catch (error) {
      console.error('キャプチャエラー:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            {siteName}
          </h3>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {siteUrl}
          </a>
        </div>
        
        <button
          onClick={captureScreenshot}
          disabled={loading}
          className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        >
          {loading ? '更新中...' : '🔄 更新'}
        </button>
      </div>
      
      {/* タブ */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab('desktop')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'desktop'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-dark hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
          }`}
        >
          🖥️ デスクトップ
        </button>
        <button
          onClick={() => setActiveTab('mobile')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'mobile'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-dark hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
          }`}
        >
          📱 モバイル
        </button>
      </div>
      
      {/* プレビュー */}
      <div className="rounded-md border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-gray-900">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-body-color">
              サイトプレビュー
            </p>
            <p className="mt-2 text-sm text-body-color">
              （キャプチャ機能は後で実装されます）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

