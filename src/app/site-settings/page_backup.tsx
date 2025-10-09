'use client';

/**
 * サイト設定ページ
 * 新規ユーザー登録後の初回設定画面
 * ステップ1: データソース接続 (GA4・Search Console)
 * ステップ2: サイト情報の入力
 * ステップ3: コンバージョン定義（任意）
 * ステップ4: KPI設定（任意）
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserProfileService } from '@/lib/user/userProfileService';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';
import { GA4DataService } from '@/lib/api/ga4DataService';
import Select from 'react-select';

export default function SiteSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [ga4Count, setGa4Count] = useState(0);
  const [gscCount, setGscCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // トークン状態
  const [tokenStatus, setTokenStatus] = useState<{
    hasRefreshToken: boolean;
    isExpired: boolean;
    expiresAt: string | null;
  } | null>(null);

  // ステップ2: サイト情報フィールド
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteName, setSiteName] = useState('');

  // GA4プロパティとGSCサイトのリスト
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [gscSites, setGscSites] = useState<any[]>([]);

  // ステップ3: コンバージョン定義
  const [ga4Events, setGa4Events] = useState<Array<{ eventName: string; eventCount: number }>>([]);
  const [selectedConversions, setSelectedConversions] = useState<ConversionEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // ユーザープロフィールからサイト情報を読み込み
  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const profile = await UserProfileService.getUserProfile(user.uid);
        
        // 保存されているサイト情報を復元
        if (profile.profile?.siteUrl) {
          setSiteUrl(profile.profile.siteUrl);
        }
        if (profile.profile?.siteName) {
          setSiteName(profile.profile.siteName);
        }
      } catch (err) {
        console.error('プロフィール読み込みエラー:', err);
      }
    };

    loadUserProfile();
  }, [user]);

  // 接続状態を確認し、データソースリストと選択情報を取得
  useEffect(() => {
    if (!user) return;

    const checkConnection = async () => {
      try {
        setIsLoading(true);
        
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
        
        // トークン状態を確認
        if (data.isConnected) {
          const tokenResponse = await fetch('/api/debug/check-tokens', {
            headers: {
              'x-user-id': user.uid
            }
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            if (tokenData.status === 'ok') {
              setTokenStatus({
                hasRefreshToken: tokenData.tokenInfo.hasRefreshToken,
                isExpired: tokenData.tokenInfo.isExpired,
                expiresAt: tokenData.tokenInfo.expiresAtDate
              });
            }
          }
        }

        // 接続済みの場合、データソースリストと選択情報を取得
        if (data.isConnected && (data.ga4Count > 0 || data.gscCount > 0)) {
          const listResponse = await fetch('/api/datasources/list', {
            headers: {
              'x-user-id': user.uid
            }
          });
          
          if (listResponse.ok) {
            const listData = await listResponse.json();
            setGa4Properties(listData.ga4Properties || []);
            setGscSites(listData.gscSites || []);
            
            // 選択されたプロパティとサイトを復元
            if (listData.selectedGA4PropertyId) {
              setSelectedAccount(listData.selectedGA4PropertyId);
            }
            if (listData.selectedGSCSiteUrl) {
              setSelectedSite(listData.selectedGSCSiteUrl);
            }
          }
        }
        
      } catch (err) {
        console.error('接続状態の確認エラー:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [user]);

  // OAuth成功後にGA4プロパティとGSCサイトを取得
  useEffect(() => {
    const oauthSuccess = searchParams.get('unified_oauth_success');
    
    if (oauthSuccess === 'true' && user) {
      const fetchDataSources = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/datasources/list', {
            headers: {
              'x-user-id': user.uid
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch datasources');
          }
          
          const data = await response.json();
          setGa4Properties(data.ga4Properties || []);
          setGscSites(data.gscSites || []);
          setIsConnected(true);
          
          // 選択されたプロパティとサイトを復元
          if (data.selectedGA4PropertyId) {
            setSelectedAccount(data.selectedGA4PropertyId);
          }
          if (data.selectedGSCSiteUrl) {
            setSelectedSite(data.selectedGSCSiteUrl);
          }
          
          setSuccess('データソースの接続に成功しました！');
        } catch (err) {
          console.error('データソース取得エラー:', err);
          setError('データソースの取得に失敗しました');
        } finally {
          setIsLoading(false);
        }
      };

      fetchDataSources();
    }
  }, [searchParams, user]);

  // STEP3に進んだ時にGA4イベントを取得
  useEffect(() => {
    if (currentStep === 3 && user && selectedAccount) {
      fetchGA4Events();
    }
  }, [currentStep, user, selectedAccount]);

  // GA4イベント一覧を取得
  const fetchGA4Events = async () => {
    if (!user || !selectedAccount) return;

    try {
      setIsLoadingEvents(true);
      setError(null);

      // 過去30日間のイベントを取得
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const startDate = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '');
      const endDate = now.toISOString().split('T')[0].replace(/-/g, '');

      const propertyId = selectedAccount.replace('properties/', '');
      const events = await GA4DataService.getEvents(user.uid, propertyId, startDate, endDate);
      
      setGa4Events(events);

      // 既存のコンバージョン設定を読み込み
      const existingConversions = await ConversionService.getConversions(user.uid);
      setSelectedConversions(existingConversions);

    } catch (err: any) {
      console.error('GA4イベント取得エラー:', err);
      setError('GA4イベントの取得に失敗しました: ' + err.message);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // コンバージョンの追加/削除
  const toggleConversion = (eventName: string, eventCount: number) => {
    const exists = selectedConversions.find(c => c.eventName === eventName);
    
    if (exists) {
      setSelectedConversions(prev => prev.filter(c => c.eventName !== eventName));
    } else {
      setSelectedConversions(prev => [
        ...prev,
        {
          eventName,
          displayName: eventName,
          eventCount,
          isActive: true,
          createdAt: new Date()
        }
      ]);
    }
  };

  // OAuth接続を開始
  const handleConnect = () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    try {
      const { url } = UnifiedOAuthManager.generateOAuthURL({
        userId: user.uid,
        returnUrl: '/site-settings'
      });
      
      window.location.href = url;
    } catch (err) {
      console.error('OAuth URL生成エラー:', err);
      setError('接続の開始に失敗しました。環境変数を確認してください。');
    }
  };

  // データソース接続を解除
  const handleDisconnect = async () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    if (!confirm('データソースの接続を解除しますか？\n※ 保存されているGA4とSearch Consoleのデータが削除されます。')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/datasources/disconnect', {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect datasources');
      }

      setIsConnected(false);
      setGa4Count(0);
      setGscCount(0);
      setGa4Properties([]);
      setGscSites([]);
      setSelectedAccount('');
      setSelectedSite('');
      
      setSuccess('データソースの接続を解除しました');
      
    } catch (err) {
      console.error('接続解除エラー:', err);
      setError('接続解除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ステップ1→2へ進む
  const handleStep1Next = () => {
    if (!isConnected) {
      setError('データソースを接続してください');
      return;
    }

    setCurrentStep(2);
    setError(null);
    setSuccess(null);
  };

  // ステップ2→3へ進む
  const handleStep2Next = async () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    if (!selectedAccount || !selectedSite || !siteUrl || !siteName) {
      setError('すべてのフィールドを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // サイト情報をプロフィールに保存
      await UserProfileService.updateUserProfile(user.uid, {
        profile: {
          siteUrl: siteUrl,
          siteName: siteName,
        }
      });

      // 選択したGA4プロパティとGSCサイトを保存
      const response = await fetch('/api/datasources/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          ga4PropertyId: selectedAccount,
          gscSiteUrl: selectedSite
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('サイト情報を保存しました！');
      setCurrentStep(3);

    } catch (err) {
      console.error('サイト設定保存エラー:', err);
      setError('サイト設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ステップ3→4へ進む（コンバージョン保存）
  const handleStep3Next = async () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // コンバージョン設定を保存
      for (const conversion of selectedConversions) {
        const existingConversions = await ConversionService.getConversions(user.uid);
        const exists = existingConversions.find(c => c.eventName === conversion.eventName);
        
        if (!exists) {
          await ConversionService.addConversion(user.uid, {
            eventName: conversion.eventName,
            displayName: conversion.displayName,
            description: conversion.description,
            eventCount: conversion.eventCount,
            isActive: conversion.isActive
          });
        }
      }

      setSuccess('コンバージョン設定を保存しました！');
      setCurrentStep(4);

    } catch (err) {
      console.error('コンバージョン設定保存エラー:', err);
      setError('コンバージョン設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // スキップして完了
  const handleComplete = async () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    try {
      setIsLoading(true);

      // プロフィールに初回設定完了フラグを保存
      await UserProfileService.updateUserProfile(user.uid, {
        metadata: {
          hasCompletedOnboarding: true
        }
      });

      setSuccess('設定を完了しました！ダッシュボードへ移動します...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err) {
      console.error('完了処理エラー:', err);
      setError('完了処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            サイト設定
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            データソース接続、サイト情報の入力、コンバージョン定義を行います
          </p>
        </div>

        {/* Step Indicator */}
        <section className="mb-0 overflow-hidden py-4 dark:bg-dark">
          <div className="container mx-auto">
            <div className="flex w-full flex-wrap items-center justify-center">
              <SingleStep 
                done={currentStep > 1} 
                number="1" 
                name="データソース接続" 
                onClick={() => setCurrentStep(1)}
              />
              <SingleStep 
                done={currentStep > 2} 
                number="2" 
                name="サイト情報入力" 
                onClick={() => currentStep >= 2 && setCurrentStep(2)}
              />
              <SingleStep 
                done={currentStep > 3} 
                number="3" 
                name="コンバージョン定義（任意）" 
                onClick={() => currentStep >= 3 && setCurrentStep(3)}
              />
              <SingleStep 
                done={currentStep > 4} 
                number="4" 
                name="KPI設定（任意）" 
                onClick={() => currentStep >= 4 && setCurrentStep(4)}
              />
            </div>
          </div>
        </section>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 rounded-md border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

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

        {/* Main Content */}
        <div className="space-y-6">
          {/* ステップ1: データソース接続 */}
          <div className={`rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 ${currentStep !== 1 ? 'opacity-50' : ''}`}>
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${currentStep >= 1 ? 'bg-primary' : 'bg-gray-400'}`}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <h4 className="text-lg font-semibold text-dark dark:text-white">
                  データソース接続 {isConnected && <span className="text-sm text-green-500">✓ 完了</span>}
                </h4>
              </div>
              <p className="ml-11 text-sm text-body-color dark:text-dark-6">
                GoogleでログインしてGA4とSearch Consoleを連携してください
              </p>
            </div>

            {isConnected ? (
              <div className="ml-11 space-y-3">
                <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          接続完了
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          GA4: {ga4Count}件 / Search Console: {gscCount}件
                        </p>
                        {tokenStatus && (
                          <div className="mt-2 text-xs">
                            {!tokenStatus.hasRefreshToken ? (
                              <p className="text-red-600 dark:text-red-400">
                                ⚠️ リフレッシュトークンがありません。再接続が必要です。
                              </p>
                            ) : tokenStatus.isExpired ? (
                              <p className="text-orange-600 dark:text-orange-400">
                                ⚠️ トークンが期限切れです。再接続してください。
                              </p>
                            ) : (
                              <p className="text-green-700 dark:text-green-400">
                                ✓ 接続正常
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {currentStep === 1 && (
                      <button
                        onClick={handleDisconnect}
                        disabled={isLoading}
                        className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-dark-2 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        接続解除
                      </button>
                    )}
                  </div>
                </div>
                {currentStep === 1 && (
                  <button
                    onClick={handleStep1Next}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3.5 text-base font-medium text-white hover:bg-opacity-90"
                  >
                    次へ
                  </button>
                )}
              </div>
            ) : currentStep === 1 ? (
              <div className="ml-11">
                <button 
                  onClick={handleConnect}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-stroke bg-white px-6 py-3 text-base font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Googleでログイン
                </button>
              </div>
            ) : null}
          </div>

          {/* ステップ2: サイト情報入力 */}
          {currentStep >= 2 && (
            <div className={`rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 ${currentStep !== 2 ? 'opacity-50' : ''}`}>
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-400'}`}>
                    {currentStep > 2 ? '✓' : '2'}
                  </div>
                  <h4 className="text-lg font-semibold text-dark dark:text-white">
                    サイト情報の入力 {currentStep > 2 && <span className="text-sm text-green-500">✓ 完了</span>}
                  </h4>
                </div>
                <p className="ml-11 text-sm text-body-color dark:text-dark-6">
                  分析対象のサイト情報を入力してください
                </p>
              </div>

              <div className="ml-11 space-y-5">
                {/* アカウント（GA4プロパティ）選択 */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    Googleアナリティクス
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <Select
                    value={ga4Properties.find(prop => prop.name === selectedAccount) ? {
                      value: ga4Properties.find(prop => prop.name === selectedAccount)!.name,
                      label: `${ga4Properties.find(prop => prop.name === selectedAccount)!.displayName} (${ga4Properties.find(prop => prop.name === selectedAccount)!.name?.replace('properties/', '') || ''})`
                    } : null}
                    onChange={(option) => setSelectedAccount(option?.value || '')}
                    options={ga4Properties.map((prop) => {
                      const propertyId = prop.name?.replace('properties/', '') || '';
                      return {
                        value: prop.name,
                        label: `${prop.displayName} (${propertyId})`
                      };
                    })}
                    placeholder="選択してください"
                    isDisabled={!isConnected || isLoading || currentStep !== 2}
                    isClearable
                    isSearchable
                    className="text-sm"
                    classNamePrefix="select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#3C50E0' : '#E2E8F0',
                        boxShadow: state.isFocused ? '0 0 0 1px #3C50E0' : 'none',
                        '&:hover': {
                          borderColor: '#3C50E0'
                        },
                        padding: '0.5rem 0.75rem',
                        minHeight: '48px'
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999
                      })
                    }}
                  />
                </div>

                {/* サイト（GSCサイト）選択 */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    サーチコンソール
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <Select
                    value={gscSites.find(site => site.siteUrl === selectedSite) ? {
                      value: gscSites.find(site => site.siteUrl === selectedSite)!.siteUrl,
                      label: gscSites.find(site => site.siteUrl === selectedSite)!.siteUrl
                    } : null}
                    onChange={(option) => setSelectedSite(option?.value || '')}
                    options={gscSites.map((site) => ({
                      value: site.siteUrl,
                      label: site.siteUrl
                    }))}
                    placeholder="選択してください"
                    isDisabled={!isConnected || isLoading || currentStep !== 2}
                    isClearable
                    isSearchable
                    className="text-sm"
                    classNamePrefix="select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#3C50E0' : '#E2E8F0',
                        boxShadow: state.isFocused ? '0 0 0 1px #3C50E0' : 'none',
                        '&:hover': {
                          borderColor: '#3C50E0'
                        },
                        padding: '0.5rem 0.75rem',
                        minHeight: '48px'
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999
                      })
                    }}
                  />
                </div>

                {/* サイトURL */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    サイトURL
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="url"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                    disabled={isLoading || currentStep !== 2}
                  />
                </div>

                {/* サイト名 */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    サイト名
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="マイサイト"
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                    disabled={isLoading || currentStep !== 2}
                  />
                </div>

                {currentStep === 2 && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 rounded-md border border-stroke px-6 py-3 text-base font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      戻る
                    </button>
                    <button
                      onClick={handleStep2Next}
                      disabled={!selectedAccount || !selectedSite || !siteUrl || !siteName || isLoading}
                      className="flex-1 rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {isLoading ? '保存中...' : '次へ'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ステップ3: コンバージョン定義（任意） */}
          {currentStep >= 3 && (
            <div className={`rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 ${currentStep !== 3 ? 'opacity-50' : ''}`}>
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-400'}`}>
                    {currentStep > 3 ? '✓' : '3'}
                  </div>
                  <h4 className="text-lg font-semibold text-dark dark:text-white">
                    コンバージョン定義（任意） {currentStep > 3 && <span className="text-sm text-green-500">✓ 完了</span>}
                  </h4>
                </div>
                <p className="ml-11 text-sm text-body-color dark:text-dark-6">
                  GA4のイベントからコンバージョンとして追跡するイベントを選択してください
                </p>
              </div>

              <div className="ml-11 space-y-5">
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
                    <p className="ml-3 text-sm text-body-color">GA4イベントを読み込み中...</p>
                  </div>
                ) : ga4Events.length === 0 ? (
                  <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-sm text-body-color dark:text-dark-6">
                      GA4イベントが見つかりませんでした。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-dark dark:text-white">
                      過去30日間のイベント一覧（上位{ga4Events.length}件）
                    </p>
                    <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-stroke p-4 dark:border-dark-3">
                      {ga4Events.map((event) => {
                        const isSelected = selectedConversions.some(c => c.eventName === event.eventName);
                        return (
                          <label
                            key={event.eventName}
                            className="flex cursor-pointer items-center justify-between rounded-md border border-stroke bg-white p-3 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleConversion(event.eventName, event.eventCount)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                disabled={currentStep !== 3}
                              />
                              <div>
                                <p className="text-sm font-medium text-dark dark:text-white">
                                  {event.eventName}
                                </p>
                                <p className="text-xs text-body-color dark:text-dark-6">
                                  発生回数: {event.eventCount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-body-color dark:text-dark-6">
                      選択済み: {selectedConversions.length}件
                    </p>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 rounded-md border border-stroke px-6 py-3 text-base font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      戻る
                    </button>
                    <button
                      onClick={() => {
                        setCurrentStep(4);
                        setSuccess('STEP3をスキップしました');
                      }}
                      className="flex-1 rounded-md border border-stroke px-6 py-3 text-base font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      スキップ
                    </button>
                    <button
                      onClick={handleStep3Next}
                      disabled={isLoading}
                      className="flex-1 rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {isLoading ? '保存中...' : '次へ'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ステップ4: KPI設定（任意） */}
          {currentStep >= 4 && (
            <div className={`rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2`}>
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${currentStep >= 4 ? 'bg-primary' : 'bg-gray-400'}`}>
                    {currentStep > 4 ? '✓' : '4'}
                  </div>
                  <h4 className="text-lg font-semibold text-dark dark:text-white">
                    KPI設定（任意）
                  </h4>
                </div>
                <p className="ml-11 text-sm text-body-color dark:text-dark-6">
                  目標とするKPIを設定してください（後からでも設定可能です）
                </p>
              </div>

              <div className="ml-11 space-y-5">
                <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🚧 KPI設定機能は近日実装予定です
                  </p>
                </div>

                {currentStep === 4 && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 rounded-md border border-stroke px-6 py-3 text-base font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      戻る
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={isLoading}
                      className="flex-1 rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {isLoading ? '完了処理中...' : '設定完了'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// SingleStep Component
interface SingleStepProps {
  number: string;
  name: string;
  done?: boolean;
  onClick?: () => void;
}

const SingleStep: React.FC<SingleStepProps> = ({ number, name, done, onClick }) => {
  return (
    <div className="group flex cursor-pointer items-center" onClick={onClick}>
      <div className="mb-5 inline-flex items-center pr-4 lg:pr-0">
        <span
          className={`${
            done
              ? "border-primary dark:bg-primary/10"
              : "border-[#E7E7E7] dark:border-dark-3"
          } mr-3 flex h-[34px] w-[34px] items-center justify-center rounded-full border bg-gray-2 text-base font-medium text-dark dark:bg-dark-2 dark:text-white`}
        >
          {number}
        </span>
        <p className="text-base text-dark dark:text-white">{name}</p>
      </div>
      <div className="mb-5 hidden px-8 group-last:hidden lg:block">
        <svg
          width={32}
          height={16}
          viewBox="0 0 32 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M25.3431 0.929612L31.7071 7.29357C32.0976 7.6841 32.0976 8.31726 31.7071 8.70779L25.3431 15.0717C24.9526 15.4623 24.3195 15.4623 23.9289 15.0717C23.5384 14.6812 23.5384 14.0481 23.9289 13.6575L28.5858 9.00068H1C0.447715 9.00068 0 8.55296 0 8.00068C0 7.4484 0.447715 7.00068 1 7.00068H28.5858L23.9289 2.34383C23.5384 1.9533 23.5384 1.32014 23.9289 0.929612C24.3195 0.539088 24.9526 0.539088 25.3431 0.929612Z"
            fill="#E7E7E7"
          />
        </svg>
      </div>
    </div>
  );
};
