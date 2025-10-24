import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepIndicator from './StepIndicator';

export default function Step5Confirm({ onBack, siteData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // TODO: Firestoreにサイト情報を保存
      console.log('Saving site data:', siteData);
      
      // 仮の保存処理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 保存成功後、ダッシュボードへリダイレクト
      navigate('/dashboard');
    } catch (err) {
      console.error('Site registration error:', err);
      setError('サイト登録に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4FE] py-12" style={{
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%23cbd5e1'%3e%3ccircle fill='%23cbd5e1' cx='16' cy='16' r='0.5'/%3e%3c/svg%3e")`,
      backgroundSize: '32px 32px'
    }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[800px]">
          {/* ヘッダー */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center">
              <img 
                src="/src/assets/img/logo.svg" 
                alt="GROW REPORTER" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-dark dark:text-white">
              サイト登録
            </h1>
            <p className="mt-2 text-body-color">
              入力内容を確認して登録を完了します
            </p>
          </div>

          {/* ステップインジケーター */}
          <div className="mb-8 rounded-2xl bg-white p-6 dark:bg-dark-2">
            <StepIndicator currentStep={5} />
          </div>

          {/* 確認内容 */}
          <div className="rounded-2xl bg-white p-8 shadow dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              STEP 5: 確認・完了
            </h2>

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg className="h-5 w-5 text-red" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red dark:text-red-light">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <h3 className="mb-3 text-sm font-semibold text-dark dark:text-white">
                  基本情報
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">サイト名</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.siteName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">サイトURL</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.siteUrl}
                    </dd>
                  </div>
                  {siteData.description && (
                    <div>
                      <dt className="text-sm text-body-color">説明</dt>
                      <dd className="mt-1 text-sm text-dark dark:text-white">
                        {siteData.description}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* GA4設定 */}
              <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <h3 className="mb-3 text-sm font-semibold text-dark dark:text-white">
                  Google Analytics 4
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">プロパティID</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.ga4PropertyId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">連携状態</dt>
                    <dd className="flex items-center gap-2">
                      {siteData.ga4Connected ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-secondary"></span>
                          <span className="text-sm font-medium text-secondary">連携済み</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                          <span className="text-sm font-medium text-gray-400">未連携</span>
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Search Console設定 */}
              <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <h3 className="mb-3 text-sm font-semibold text-dark dark:text-white">
                  Google Search Console
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">サイトURL</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.searchConsoleSiteUrl}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">連携状態</dt>
                    <dd className="flex items-center gap-2">
                      {siteData.searchConsoleConnected ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-secondary"></span>
                          <span className="text-sm font-medium text-secondary">連携済み</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                          <span className="text-sm font-medium text-gray-400">未連携</span>
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* データ設定 */}
              <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <h3 className="mb-3 text-sm font-semibold text-dark dark:text-white">
                  データ設定
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">データ保持期間</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.dataRetentionDays}日間
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">レポート頻度</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.reportFrequency === 'daily' ? '毎日' : 
                       siteData.reportFrequency === 'weekly' ? '毎週' : '毎月'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-body-color">AI分析</dt>
                    <dd className="text-sm font-medium text-dark dark:text-white">
                      {siteData.enableAIAnalysis ? '有効' : '無効'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* ボタン */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="rounded-md border border-stroke px-6 py-3 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? '登録中...' : 'サイトを登録'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

