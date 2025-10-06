'use client';

/**
 * Data Sources Connection Page
 * Manage GA4 and Search Console connections
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';

export default function DataSourcesPage() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [ga4Count, setGa4Count] = useState(0);
  const [gscCount, setGscCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('-');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 接続状態を確認（サーバーサイドAPIを使用）
  useEffect(() => {
    if (!user) return;

    const checkConnection = async () => {
      try {
        setIsLoading(true);
        
        // サーバーサイドAPIで接続状態を取得
        const response = await fetch('/api/datasources/status', {
          headers: {
            'x-user-id': user.uid
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch datasource status');
        }
        
        const data = await response.json();
        setIsConnected(data.isConnected);
        setGa4Count(data.ga4Count);
        setGscCount(data.gscCount);
        setLastUpdated(data.lastUpdated);
        
      } catch (err) {
        console.error('接続状態の確認エラー:', err);
        setError('接続状態の確認に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [user]);

  // OAuth接続を開始
  const handleConnect = () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    try {
      const { url } = UnifiedOAuthManager.generateOAuthURL({
        userId: user.uid,
        returnUrl: '/datasources'
      });
      
      // OAuth認証ページにリダイレクト
      window.location.href = url;
    } catch (err) {
      console.error('OAuth URL生成エラー:', err);
      setError('接続の開始に失敗しました。環境変数を確認してください。');
    }
  };

  // 接続解除
  const handleDisconnect = async () => {
    if (!user || !confirm('データソースの接続を解除しますか？')) return;

    try {
      setIsLoading(true);
      // TODO: 接続解除のAPI実装
      setError('接続解除機能は近日実装予定です');
    } catch (err) {
      console.error('接続解除エラー:', err);
      setError('接続解除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header - Mega Template準拠 */}
        <div className="mb-9">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            データソース接続
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            Google Analytics 4とSearch Consoleを接続してデータ分析を開始
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Connection Status Cards - Mega Template準拠 */}
        <div className="-mx-4 mb-8 flex flex-wrap">
          {/* GA4 Connection Card */}
          <div className="w-full px-4 md:w-1/2">
            <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 lg:px-4 xl:px-6">
              <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-primary/[0.06] text-primary dark:bg-primary/10">
                <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
              </div>
              
              <div className="mb-5">
                <h4 className="text-lg font-semibold text-dark dark:text-white">
                  Google Analytics 4
                </h4>
                <p className="text-sm text-body-color dark:text-dark-6">
                  ウェブサイトのトラフィック分析
                </p>
              </div>

              <div className="mb-5 space-y-3 border-t border-stroke pt-5 dark:border-dark-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body-color dark:text-dark-6">接続状態</span>
                  {isLoading ? (
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      確認中...
                    </span>
                  ) : isConnected ? (
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      接続済み
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-[#FFA70B]/10 px-3 py-1 text-sm font-medium text-[#FFA70B]">
                      未接続
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body-color dark:text-dark-6">最終更新</span>
                  <span className="text-sm font-medium text-dark dark:text-white">{lastUpdated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body-color dark:text-dark-6">プロパティ数</span>
                  <span className="text-sm font-medium text-dark dark:text-white">{ga4Count}</span>
                </div>
              </div>

              {isConnected ? (
                <div className="flex gap-2">
                  <button 
                    onClick={handleConnect}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    再接続
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-stroke bg-white px-5 py-3 text-base font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    解除
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnect}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                    <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                  </svg>
                  GA4に接続
                </button>
              )}
            </div>
          </div>

          {/* Search Console Connection Card */}
          <div className="w-full px-4 md:w-1/2">
            <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 lg:px-4 xl:px-6">
              <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-secondary/[0.06] text-secondary dark:bg-secondary/10">
                <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
              
              <div className="mb-5">
                <h4 className="text-lg font-semibold text-dark dark:text-white">
                  Search Console
                </h4>
                <p className="text-sm text-body-color dark:text-dark-6">
                  検索パフォーマンスの分析
                </p>
              </div>

              <div className="mb-5 space-y-3 border-t border-stroke pt-5 dark:border-dark-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body-color dark:text-dark-6">接続状態</span>
                  {isLoading ? (
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      確認中...
                    </span>
                  ) : isConnected ? (
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      接続済み
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-[#FFA70B]/10 px-3 py-1 text-sm font-medium text-[#FFA70B]">
                      未接続
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body-color dark:text-dark-6">最終更新</span>
                  <span className="text-sm font-medium text-dark dark:text-white">{lastUpdated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body-color dark:text-dark-6">サイト数</span>
                  <span className="text-sm font-medium text-dark dark:text-white">{gscCount}</span>
                </div>
              </div>

              {isConnected ? (
                <div className="flex gap-2">
                  <button 
                    onClick={handleConnect}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-secondary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    再接続
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-stroke bg-white px-5 py-3 text-base font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    解除
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnect}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-secondary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                    <path d="M19.7 8.3l-9-8c-.4-.3-.9-.3-1.3 0l-9 8c-.3.3-.4.7-.2 1.1.2.4.6.6 1 .6h1v9c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-9h1c.4 0 .8-.2 1-.6.2-.4.1-.8-.2-1.1z"/>
                  </svg>
                  Search Consoleに接続
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Instructions Card - Mega Template準拠 */}
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 xl:px-[30px]">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              接続手順
            </h4>
            <p className="text-sm text-body-color dark:text-dark-6">
              データソースを接続して分析を開始
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <h5 className="mb-1 font-medium text-dark dark:text-white">
                  Googleアカウントで認証
                </h5>
                <p className="text-sm text-body-color dark:text-dark-6">
                  上記のボタンをクリックして、GoogleアカウントでOAuth認証を行います。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                2
              </div>
              <div className="flex-1">
                <h5 className="mb-1 font-medium text-dark dark:text-white">
                  アクセス権限を付与
                </h5>
                <p className="text-sm text-body-color dark:text-dark-6">
                  GrowReporterにGA4とSearch Consoleデータへのアクセス権限を付与します。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                3
              </div>
              <div className="flex-1">
                <h5 className="mb-1 font-medium text-dark dark:text-white">
                  プロパティ/サイトを選択
                </h5>
                <p className="text-sm text-body-color dark:text-dark-6">
                  分析したいGA4プロパティとSearch Consoleサイトを選択します。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border-l-4 border-secondary bg-secondary/10 p-5">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 fill-secondary" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-5h2v2H9v-2zm0-8h2v6H9V5z"/>
              </svg>
              <div>
                <h5 className="mb-1 text-sm font-semibold text-secondary">
                  セキュリティについて
                </h5>
                <p className="text-sm text-body-color dark:text-dark-6">
                  すべての認証データはAES-256-GCMで暗号化され、安全に保存されます。必要最小限の権限のみをリクエストします。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
