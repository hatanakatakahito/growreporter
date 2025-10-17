'use client';

/**
 * オンボーディングフロー
 * ステップ1: ログイン/新規登録（page.tsx）
 * ステップ2: プロフィール確認（このページ）
 * ステップ3: GA4/GSC連携
 * ステップ4: サイト設定
 * ステップ5: ダッシュボードへ
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserProfileService } from '@/lib/user/userProfileService';
import Loading from '@/components/common/Loading';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(2); // ステップ2から開始
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ステップ2: プロフィール確認
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // ステップ4: サイト設定
  const [selectedGA4Property, setSelectedGA4Property] = useState('');
  const [selectedGSCSite, setSelectedGSCSite] = useState('');
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [gscSites, setGscSites] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // URLパラメータからステップを確認
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const oauthSuccess = searchParams.get('unified_oauth_success');
    
    if (stepParam) {
      setCurrentStep(parseInt(stepParam));
    } else if (oauthSuccess === 'true') {
      // OAuth認証成功後はステップ4へ
      setCurrentStep(4);
    }
  }, [searchParams]);

  // ステップ2: プロフィール確認を送信
  const handleProfileSubmit = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await UserProfileService.updateUserProfile(user.uid, {
        profile: {
          firstName,
          lastName,
          company,
          phoneNumber
        }
      });

      // ステップ3へ進む
      setCurrentStep(3);
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ステップ3: GA4/GSC連携を開始
  const handleDataSourceConnect = () => {
    if (!user) return;

    try {
      const { UnifiedOAuthManager } = require('@/lib/auth/unifiedOAuthManager');
      const { url } = UnifiedOAuthManager.generateOAuthURL({
        userId: user.uid,
        returnUrl: '/onboarding?step=4'
      });
      
      window.location.href = url;
    } catch (err) {
      console.error('OAuth URL生成エラー:', err);
      setError('データソース接続の開始に失敗しました');
    }
  };

  // ステップ3をスキップ
  const handleSkipDataSource = () => {
    setCurrentStep(5);
    router.push('/dashboard');
  };

  // ステップ4: サイト設定を取得
  useEffect(() => {
    if (currentStep === 4 && user) {
      const fetchDataSources = async () => {
        try {
          const response = await fetch('/api/datasources/list', {
            headers: {
              'x-user-id': user.uid
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setGa4Properties(data.ga4Properties || []);
            setGscSites(data.gscSites || []);
          }
        } catch (err) {
          console.error('データソース取得エラー:', err);
        }
      };

      fetchDataSources();
    }
  }, [currentStep, user]);

  // ステップ4: サイト設定を送信
  const handleSiteSettingsSubmit = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/datasources/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          ga4PropertyId: selectedGA4Property,
          gscSiteUrl: selectedGSCSite
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save datasource selection');
      }

      // ステップ5: ダッシュボードへ
      router.push('/dashboard?onboarding_complete=true');
    } catch (err) {
      console.error('サイト設定エラー:', err);
      setError('サイト設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <Loading size={64} />
          <p className="mt-4 text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-dark">
      {/* ヘッダー */}
      <header className="border-b border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="mr-2.5 h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xl font-semibold text-dark dark:text-white">GrowReporter</span>
            </div>
            <div className="text-sm font-medium text-body-color dark:text-dark-6">
              ステップ {currentStep} / 5
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* プログレスバー */}
        <div className="mx-auto mb-12 max-w-3xl">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex flex-1 items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step <= currentStep 
                    ? 'border-primary bg-primary text-white' 
                    : 'border-stroke bg-white text-body-color dark:border-dark-3 dark:bg-dark-2'
                }`}>
                  {step < currentStep ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{step}</span>
                  )}
                </div>
                {step < 5 && (
                  <div className={`mx-2 h-0.5 flex-1 ${
                    step < currentStep ? 'bg-primary' : 'bg-stroke dark:bg-dark-3'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-xs font-medium text-body-color dark:text-dark-6">
            <span>ログイン</span>
            <span>プロフィール</span>
            <span>データ連携</span>
            <span>サイト設定</span>
            <span>完了</span>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mx-auto mb-6 max-w-2xl rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ステップ2: プロフィール確認 */}
        {currentStep === 2 && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-stroke bg-white p-8 dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
                  プロフィール情報を入力
                </h2>
                <p className="text-sm font-medium text-body-color dark:text-dark-6">
                  あなたの情報を教えてください
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      姓
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="山田"
                      className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                      名
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="太郎"
                      className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                    会社名
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="株式会社サンプル"
                    className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                    電話番号（任意）
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="090-1234-5678"
                    className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 rounded-md border border-stroke bg-white px-5 py-3 text-base font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    スキップ
                  </button>
                  <button
                    onClick={handleProfileSubmit}
                    disabled={isLoading}
                    className="flex-1 rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? '保存中...' : '次へ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ステップ3: GA4/GSC連携 */}
        {currentStep === 3 && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-stroke bg-white p-8 dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
                  データソースを連携
                </h2>
                <p className="text-sm font-medium text-body-color dark:text-dark-6">
                  Google Analytics 4とSearch Consoleを接続して分析を開始
                </p>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-4 rounded-md border border-stroke p-4 dark:border-dark-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-dark dark:text-white">Google Analytics 4</h4>
                    <p className="text-sm text-body-color dark:text-dark-6">
                      ウェブサイトのトラフィックとユーザー行動を分析
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-md border border-stroke p-4 dark:border-dark-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-dark dark:text-white">Search Console</h4>
                    <p className="text-sm text-body-color dark:text-dark-6">
                      検索パフォーマンスとSEO状況を把握
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-md border-l-4 border-primary bg-primary/5 p-4">
                <p className="text-sm text-body-color dark:text-dark-6">
                  <strong className="text-dark dark:text-white">セキュリティについて：</strong> すべての認証データはAES-256-GCMで暗号化され、安全に保存されます。
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipDataSource}
                  className="flex-1 rounded-md border border-stroke bg-white px-5 py-3 text-base font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                >
                  後で設定
                </button>
                <button
                  onClick={handleDataSourceConnect}
                  className="flex-1 rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90"
                >
                  Googleで連携
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ステップ4: サイト設定 */}
        {currentStep === 4 && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-stroke bg-white p-8 dark:border-dark-3 dark:bg-dark-2">
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
                  分析するサイトを選択
                </h2>
                <p className="text-sm font-medium text-body-color dark:text-dark-6">
                  メインで分析するプロパティとサイトを選んでください
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                    GA4プロパティ
                  </label>
                  <select
                    value={selectedGA4Property}
                    onChange={(e) => setSelectedGA4Property(e.target.value)}
                    className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="">プロパティを選択してください</option>
                    {ga4Properties.map((prop) => (
                      <option key={prop.name} value={prop.name}>
                        {prop.displayName}
                      </option>
                    ))}
                  </select>
                  {ga4Properties.length === 0 && (
                    <p className="mt-2 text-sm text-body-color dark:text-dark-6">
                      プロパティが見つかりませんでした。データソース連携を確認してください。
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                    Search Consoleサイト
                  </label>
                  <select
                    value={selectedGSCSite}
                    onChange={(e) => setSelectedGSCSite(e.target.value)}
                    className="w-full rounded-md border border-stroke bg-transparent px-4.5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    <option value="">サイトを選択してください</option>
                    {gscSites.map((site) => (
                      <option key={site.siteUrl} value={site.siteUrl}>
                        {site.siteUrl}
                      </option>
                    ))}
                  </select>
                  {gscSites.length === 0 && (
                    <p className="mt-2 text-sm text-body-color dark:text-dark-6">
                      サイトが見つかりませんでした。データソース連携を確認してください。
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 rounded-md border border-stroke bg-white px-5 py-3 text-base font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleSiteSettingsSubmit}
                    disabled={isLoading || (!selectedGA4Property && !selectedGSCSite)}
                    className="flex-1 rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? '保存中...' : '完了'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
