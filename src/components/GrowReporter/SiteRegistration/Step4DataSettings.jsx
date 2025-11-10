import React, { useState } from 'react';
import StepIndicator from './StepIndicator';
import logoImg from '../../../assets/img/logo.svg';

export default function Step4DataSettings({ onNext, onBack, initialData = {} }) {
  const [dataRetentionDays, setDataRetentionDays] = useState(initialData.dataRetentionDays || '90');
  const [reportFrequency, setReportFrequency] = useState(initialData.reportFrequency || 'weekly');
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(initialData.enableAIAnalysis !== false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 次のステップへデータを渡す
    onNext({
      dataRetentionDays: parseInt(dataRetentionDays),
      reportFrequency,
      enableAIAnalysis,
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
              データ取得と分析の設定を行います
            </p>
          </div>

          {/* ステップインジケーター */}
          <div className="mb-8 rounded-2xl bg-white p-6 dark:bg-dark-2">
            <StepIndicator currentStep={4} />
          </div>

          {/* フォーム */}
          <div className="rounded-2xl bg-white p-8 shadow dark:bg-dark-2">
            <h2 className="mb-6 text-xl font-semibold text-dark dark:text-white">
              STEP 4: データ取得設定
            </h2>

            <form onSubmit={handleSubmit}>
              {/* データ保持期間 */}
              <div className="mb-6">
                <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                  データ保持期間
                </label>
                <select
                  value={dataRetentionDays}
                  onChange={(e) => setDataRetentionDays(e.target.value)}
                  className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                >
                  <option value="30">30日間</option>
                  <option value="90">90日間（推奨）</option>
                  <option value="180">180日間</option>
                  <option value="365">365日間</option>
                </select>
                <p className="mt-1.5 text-xs text-body-color">
                  過去のデータをどの期間保持するかを設定します
                </p>
              </div>

              {/* レポート頻度 */}
              <div className="mb-6">
                <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                  レポート生成頻度
                </label>
                <select
                  value={reportFrequency}
                  onChange={(e) => setReportFrequency(e.target.value)}
                  className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
                >
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週（推奨）</option>
                  <option value="monthly">毎月</option>
                </select>
                <p className="mt-1.5 text-xs text-body-color">
                  自動レポートの生成頻度を設定します
                </p>
              </div>

              {/* AI分析の有効化 */}
              <div className="mb-8">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="enableAIAnalysis"
                    checked={enableAIAnalysis}
                    onChange={(e) => setEnableAIAnalysis(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3"
                  />
                  <div className="flex-1">
                    <label htmlFor="enableAIAnalysis" className="block text-sm font-medium text-dark dark:text-white">
                      AI分析を有効にする（推奨）
                    </label>
                    <p className="mt-1 text-xs text-body-color">
                      Google Gemini 2.5 Flash を使用した高度な分析とインサイトの自動抽出を有効にします
                    </p>
                  </div>
                </div>
              </div>

              {/* 情報ボックス */}
              <div className="mb-8 rounded-lg bg-primary/10 p-4">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                    <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-dark dark:text-white">
                      <strong>AI分析について</strong>
                    </p>
                    <p className="mt-1 text-xs text-body-color">
                      AI分析を有効にすると、データのトレンド分析、異常検知、改善提案などが自動的に生成されます。
                      Google Gemini APIキーの設定が必要です。
                    </p>
                  </div>
                </div>
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
                  次へ（確認）
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

