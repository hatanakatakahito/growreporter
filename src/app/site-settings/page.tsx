'use client';

/**
 * サイト設定ページ
 * 新規ユーザー登録後の初回設定画面
 * ステップ1: データソース接続 (GA4・Search Console)
 * ステップ2: サイト情報の入力
 * ステップ3: KPI作成
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserProfileService } from '@/lib/user/userProfileService';
import { KPIService } from '@/lib/kpi/kpiService';
import {
  CreateKPIRequest,
  KPI_METRIC_DEFINITIONS,
} from '@/types/kpi';

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

  // ステップ2: サイト情報フィールド
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteName, setSiteName] = useState('');

  // GA4プロパティとGSCサイトのリスト
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [gscSites, setGscSites] = useState<any[]>([]);

  // ステップ3: KPI作成
  const [newKPI, setNewKPI] = useState<Partial<CreateKPIRequest>>({
    name: '',
    description: '',
    category: 'トラフィック',
    metricType: 'ga4_sessions',
    targetValue: undefined,
    operator: 'greater_than',
    periodType: 'monthly',
  });

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

  // ステップ3: KPI作成
  const handleCreateKPI = async () => {
    if (!user || !newKPI.name || !newKPI.targetValue) {
      setError('KPI名と目標値は必須です');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      await KPIService.createKPI(user.uid, newKPI as CreateKPIRequest);
      
      setSuccess('KPIを作成しました！');
      
      // KPI作成成功後、新しいKPIフォームをリセット
      setNewKPI({
        name: '',
        description: '',
        category: 'トラフィック',
        metricType: 'ga4_sessions',
        targetValue: undefined,
        operator: 'greater_than',
        periodType: 'monthly',
      });

    } catch (error) {
      console.error('KPI作成エラー:', error);
      setError('KPI作成に失敗しました');
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
            データソース接続、サイト情報の入力、KPI作成を行います
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
                onClick={() => setCurrentStep(2)}
              />
              <SingleStep 
                done={currentStep > 3} 
                number="3" 
                name="KPI作成" 
                onClick={() => setCurrentStep(3)}
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
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                    disabled={!isConnected || isLoading || currentStep !== 2}
                  >
                    <option value="">選択してください</option>
                    {ga4Properties.map((prop, index) => {
                      // nameから Property ID を抽出 ("properties/123456789" -> "123456789")
                      const propertyId = prop.name?.replace('properties/', '') || '';
                      return (
                        <option key={`${prop.name}-${index}`} value={prop.name}>
                          {prop.displayName} ({propertyId})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* サイト（GSCサイト）選択 */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    サーチコンソール
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                    disabled={!isConnected || isLoading || currentStep !== 2}
                  >
                    <option value="">選択してください</option>
                    {gscSites.map((site, index) => (
                      <option key={`${site.siteUrl}-${index}`} value={site.siteUrl}>
                        {site.siteUrl}
                      </option>
                    ))}
                  </select>
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

          {/* ステップ3: KPI作成 */}
          {currentStep >= 3 && (
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-400'}`}>
                    3
                  </div>
                  <h4 className="text-lg font-semibold text-dark dark:text-white">
                    KPI作成 <span className="text-sm text-body-color dark:text-dark-6">(任意)</span>
                  </h4>
                </div>
                <p className="ml-11 text-sm text-body-color dark:text-dark-6">
                  測定したいKPIを作成してください（後から追加・編集も可能です）
                </p>
              </div>

              <div className="ml-11 space-y-5">
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    KPI名
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="text"
                    value={newKPI.name || ''}
                    onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                    placeholder="例: 月間セッション数"
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                    説明
                  </label>
                  <textarea
                    value={newKPI.description || ''}
                    onChange={(e) => setNewKPI({ ...newKPI, description: e.target.value })}
                    placeholder="KPIの説明"
                    rows={3}
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      カテゴリ
                    </label>
                    <select
                      value={newKPI.category || 'トラフィック'}
                      onChange={(e) => setNewKPI({ ...newKPI, category: e.target.value as any })}
                      className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                    >
                      <option value="トラフィック">トラフィック</option>
                      <option value="エンゲージメント">エンゲージメント</option>
                      <option value="コンバージョン">コンバージョン</option>
                      <option value="SEO">SEO</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      メトリクス
                    </label>
                    <select
                      value={newKPI.metricType || 'ga4_sessions'}
                      onChange={(e) => setNewKPI({ ...newKPI, metricType: e.target.value as any })}
                      className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                    >
                      {Object.entries(KPI_METRIC_DEFINITIONS).map(([key, def]) => (
                        <option key={key} value={key}>{def.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    目標値
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">必須</span>
                  </label>
                  <input
                    type="number"
                    value={newKPI.targetValue || ''}
                    onChange={(e) => setNewKPI({ ...newKPI, targetValue: parseFloat(e.target.value) })}
                    placeholder="例: 10000"
                    className="w-full rounded-md border border-stroke bg-transparent px-6 py-3.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateKPI}
                    disabled={!newKPI.name || !newKPI.targetValue || isLoading}
                    className="flex-1 rounded-md bg-secondary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? '作成中...' : 'KPIを作成'}
                  </button>
                </div>

                <div className="border-t border-stroke pt-5 dark:border-dark-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="rounded-md border border-stroke px-6 py-3 text-base font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      戻る
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={isLoading}
                      className="flex-1 rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {isLoading ? '完了中...' : '後で設定する'}
                    </button>
                  </div>
                </div>
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
