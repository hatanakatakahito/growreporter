'use client';

/**
 * サイト設定ページ（新仕様）
 * STEP1: サイト情報入力
 * STEP2: Google Analytics接続
 * STEP3: Search Console接続
 * 
 * コンバージョン設定とKPI設定は別画面（/goal-settings）へ移動
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserProfileService } from '@/lib/user/userProfileService';

// サイト種類の選択肢
const SITE_TYPES = [
  { value: 'corporate', label: 'コーポレートサイト' },
  { value: 'product', label: '製品サイト' },
  { value: 'service', label: 'サービスサイト' },
  { value: 'lp', label: 'LP' },
  { value: 'media', label: 'オウンドメディア' },
  { value: 'ec', label: 'ECサイト' },
  { value: 'other', label: 'その他' }
];

// ビジネス形態の選択肢
const BUSINESS_TYPES = [
  { value: 'btob', label: 'BtoB' },
  { value: 'btoc', label: 'BtoC' },
  { value: 'btobtoc', label: 'BtoBtoC' },
  { value: 'personal', label: '個人' }
];

export default function SiteSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // STEP1: サイト情報
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteType, setSiteType] = useState('');
  const [businessType, setBusinessType] = useState('');

  // STEP2: GA4接続状態
  const [isGA4Connected, setIsGA4Connected] = useState(false);
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [selectedGA4Property, setSelectedGA4Property] = useState('');

  // STEP3: GSC接続状態
  const [isGSCConnected, setIsGSCConnected] = useState(false);
  const [gscSites, setGscSites] = useState<any[]>([]);
  const [selectedGSCSite, setSelectedGSCSite] = useState('');

  // ユーザープロフィールからサイト情報を読み込み
  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const profile = await UserProfileService.getUserProfile(user.uid);
        
        // 保存されているサイト情報を復元
        if (profile.profile?.siteName) setSiteName(profile.profile.siteName);
        if (profile.profile?.siteUrl) setSiteUrl(profile.profile.siteUrl);
        if (profile.profile?.siteType) setSiteType(profile.profile.siteType);
        if (profile.profile?.businessType) setBusinessType(profile.profile.businessType);
      } catch (err) {
        console.error('プロフィール読み込みエラー:', err);
      }
    };

    loadUserProfile();
  }, [user]);

  // GA4接続状態を確認
  useEffect(() => {
    if (!user) return;

    const checkGA4Connection = async () => {
      try {
        const response = await fetch('/api/datasources/status', {
          headers: { 'x-user-id': user.uid }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsGA4Connected(data.ga4Count > 0);
        }
      } catch (err) {
        console.error('GA4接続状態確認エラー:', err);
      }
    };

    checkGA4Connection();
  }, [user]);

  // GSC接続状態を確認
  useEffect(() => {
    if (!user) return;

    const checkGSCConnection = async () => {
      try {
        const response = await fetch('/api/datasources/status', {
          headers: { 'x-user-id': user.uid }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsGSCConnected(data.gscCount > 0);
        }
      } catch (err) {
        console.error('GSC接続状態確認エラー:', err);
      }
    };

    checkGSCConnection();
  }, [user]);

  // OAuth認証結果を処理
  useEffect(() => {
    const status = searchParams?.get('status');
    const errorMsg = searchParams?.get('error');

    if (status === 'success') {
      setSuccess('認証が完了しました！');
      // URLパラメータをクリア
      router.replace('/site-settings');
      
      // 接続状態を再確認
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (status === 'error') {
      setError(errorMsg || '認証に失敗しました。');
    }
  }, [searchParams, router]);

  // STEP1: サイト情報を保存
  const handleSaveStep1 = async () => {
    if (!user) return;

    // バリデーション
    if (!siteName.trim()) {
      setError('サイト名を入力してください。');
      return;
    }
    if (!siteUrl.trim()) {
      setError('対象URLを入力してください。');
      return;
    }
    if (!siteType) {
      setError('サイト種類を選択してください。');
      return;
    }
    if (!businessType) {
      setError('ビジネス形態を選択してください。');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await UserProfileService.updateUserProfile(user.uid, {
        siteName: siteName.trim(),
        siteUrl: siteUrl.trim(),
        siteType,
        businessType
      });

      setSuccess('サイト情報を保存しました！');
      setTimeout(() => {
        setSuccess(null);
        setCurrentStep(2);
      }, 1500);
    } catch (err: any) {
      console.error('サイト情報保存エラー:', err);
      setError('サイト情報の保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP2: GA4接続
  const handleConnectGA4 = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const oauthManager = new UnifiedOAuthManager();
      const authUrl = oauthManager.getAuthUrl(user.uid, '/site-settings');
      
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('GA4接続エラー:', err);
      setError('Google Analytics接続に失敗しました。');
      setIsLoading(false);
    }
  };

  // STEP3: GSC接続
  const handleConnectGSC = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const oauthManager = new UnifiedOAuthManager();
      const authUrl = oauthManager.getAuthUrl(user.uid, '/site-settings');
      
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('GSC接続エラー:', err);
      setError('Search Console接続に失敗しました。');
      setIsLoading(false);
    }
  };

  // 完了して目標KPI設定画面へ
  const handleComplete = () => {
    router.push('/goal-settings');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl p-4 md:p-6 2xl:p-10">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-dark dark:text-white">
            サイト設定
          </h1>
          <p className="text-body-color dark:text-dark-6">
            サイト情報とデータソースを設定します
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="mb-8 flex items-center justify-center">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  currentStep >= step
                    ? 'bg-primary text-white'
                    : 'bg-gray-3 text-body-color dark:bg-dark-3 dark:text-dark-6'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`mx-2 h-1 w-16 ${
                    currentStep > step
                      ? 'bg-primary'
                      : 'bg-gray-3 dark:bg-dark-3'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* STEP1: サイト情報 */}
        {currentStep === 1 && (
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              STEP1：サイト情報
            </h2>

            <div className="space-y-4">
              {/* サイト名 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  サイト名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="例: 株式会社サンプル"
                />
              </div>

              {/* 対象URL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  対象URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>

              {/* サイト種類 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  サイト種類 <span className="text-red-500">*</span>
                </label>
                <select
                  value={siteType}
                  onChange={(e) => setSiteType(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">選択してください</option>
                  {SITE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ビジネス形態 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  ビジネス形態 <span className="text-red-500">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">選択してください</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveStep1}
                  disabled={isLoading}
                  className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : '次へ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP2: Google Analytics */}
        {currentStep === 2 && (
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              STEP2：Google Analytics
            </h2>

            {isGA4Connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Google Analyticsに接続済みです
                  </p>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90"
                  >
                    次へ
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-color dark:text-dark-6">
                  Google Analyticsと連携して、サイトのアクセス解析データを取得します。
                </p>

                <button
                  onClick={handleConnectGA4}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-stroke bg-white px-6 py-4 hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-dark dark:text-white">
                    {isLoading ? '接続中...' : 'Googleアカウントで認証'}
                  </span>
                </button>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP3: Search Console */}
        {currentStep === 3 && (
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              STEP3：Search Console
            </h2>

            {isGSCConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Search Consoleに接続済みです
                  </p>
                </div>

                <div className="mt-6 rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                    基本設定が完了しました！
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    引き続き、目標KPI設定（コンバージョン・KPI）を行うことができます。
                  </p>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleComplete}
                    className="rounded-md bg-primary px-6 py-3 text-white hover:bg-opacity-90"
                  >
                    目標KPI設定へ
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-body-color dark:text-dark-6">
                  Search Consoleと連携して、検索キーワードやクリック数などのデータを取得します。
                </p>
                <p className="text-sm text-body-color dark:text-dark-6">
                  ※ Search ConsoleのアカウントがGoogle Analyticsと異なる場合は、別途認証を行ってください。
                </p>

                <button
                  onClick={handleConnectGSC}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-stroke bg-white px-6 py-4 hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-dark dark:text-white">
                    {isLoading ? '接続中...' : 'Googleアカウントで認証'}
                  </span>
                </button>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="rounded-md border border-stroke px-6 py-3 text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleComplete}
                    className="rounded-md bg-gray-3 px-6 py-3 text-body-color dark:bg-dark-3 dark:text-dark-6"
                  >
                    スキップ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

