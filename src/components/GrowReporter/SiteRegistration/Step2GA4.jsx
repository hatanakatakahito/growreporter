import React, { useState } from 'react';
import StepIndicator from './StepIndicator';
import logoImg from '../../../assets/img/logo.svg';

export default function Step2GA4({ onNext, onBack, initialData = {} }) {
  const [propertyId, setPropertyId] = useState(initialData.ga4PropertyId || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    setIsConnecting(true);

    try {
      // TODO: Google OAuth認証の実装
      // Google Analytics Data API v1 のスコープを使用
      console.log('Initiating Google Analytics OAuth...');
      
      // 仮の成功処理（実際はOAuth後にプロパティIDを取得）
      setTimeout(() => {
        setIsConnected(true);
        setIsConnecting(false);
      }, 1500);
    } catch (err) {
      console.error('GA4 connection error:', err);
      setError('GA4との接続に失敗しました。もう一度お試しください。');
      setIsConnecting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!propertyId) {
      setError('GA4プロパティIDを入力してください');
      return;
    }

    // 次のステップへデータを渡す
    onNext({
      ga4PropertyId: propertyId,
      ga4Connected: isConnected,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12" style={{
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%23cbd5e1'%3e%3ccircle fill='%23cbd5e1' cx='16' cy='16' r='0.5'/%3e%3c/svg%3e")`,
      backgroundSize: '32px 32px'
    }}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[800px]">
          {/* ヘッダー */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center">
              <img 
                src={logoImg} 
                alt="GROW REPORTER" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-dark dark:text-white">
              サイト登録
            </h1>
            <p className="mt-2 text-body-color">
              Google Analytics 4 を連携します
            </p>
          </div>

          {/* ステップインジケーター */}
          <div className="mb-8 rounded-2xl bg-white p-6 dark:bg-dark-2">
            <StepIndicator currentStep={2} />
          </div>

          {/* フォーム */}
          <div className="rounded-2xl bg-white p-8 shadow dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              STEP 2: GA4連携
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

            {/* 接続状態 */}
            {isConnected && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-secondary/10 p-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
                  <svg className="h-5 w-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary">
                    Googleアカウントと連携済み
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Google認証ボタン */}
              <div className="mb-6">
                <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                  Googleアカウント連携
                </label>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isConnecting || isConnected}
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-stroke bg-transparent px-4 py-3 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_google)">
                      <path d="M19.9895 10.1871C19.9895 9.36767 19.9214 8.76973 19.7742 8.14966H10.1992V11.848H15.8195C15.7062 12.7671 15.0943 14.1512 13.7346 15.0813L13.7155 15.2051L16.7429 17.4969L16.9527 17.5174C18.879 15.7789 19.9895 13.221 19.9895 10.1871Z" fill="#4285F4"/>
                      <path d="M10.1993 19.9313C12.9527 19.9313 15.2643 19.0454 16.9527 17.5174L13.7346 15.0813C12.8734 15.6682 11.7176 16.0779 10.1993 16.0779C7.50243 16.0779 5.21352 14.3395 4.39759 11.9366L4.27799 11.9465L1.13003 14.3273L1.08887 14.4391C2.76588 17.6945 6.21061 19.9313 10.1993 19.9313Z" fill="#34A853"/>
                      <path d="M4.39748 11.9366C4.18219 11.3166 4.05759 10.6521 4.05759 9.96565C4.05759 9.27909 4.18219 8.61473 4.38615 7.99466L4.38045 7.8626L1.19304 5.44366L1.08875 5.49214C0.397576 6.84305 0.000976562 8.36008 0.000976562 9.96565C0.000976562 11.5712 0.397576 13.0882 1.08875 14.4391L4.39748 11.9366Z" fill="#FBBC05"/>
                      <path d="M10.1993 3.85336C12.1142 3.85336 13.406 4.66168 14.1425 5.33718L17.0207 2.59107C15.253 0.985496 12.9527 0 10.1993 0C6.2106 0 2.76588 2.23672 1.08887 5.49214L4.38626 7.99466C5.21352 5.59183 7.50242 3.85336 10.1993 3.85336Z" fill="#EB4335"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_google">
                        <rect width="20" height="20" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                  {isConnecting ? '接続中...' : isConnected ? '連携済み' : 'Googleアカウントで連携'}
                </button>
                <p className="mt-1.5 text-xs text-body-color">
                  GA4データにアクセスするためにGoogleアカウントとの連携が必要です
                </p>
              </div>

              {/* GA4プロパティID */}
              <div className="mb-8">
                <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                  GA4プロパティID <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  placeholder="例: 123456789"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                  required
                />
                <p className="mt-1.5 text-xs text-body-color">
                  GA4管理画面 → プロパティ設定 → プロパティの詳細 で確認できます
                </p>
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-md border border-stroke px-6 py-3 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-opacity-90"
                >
                  次へ（Search Console連携）
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

