import React from 'react';

export default function DataCollectionStatus({ status }) {
  const getStatusIcon = (state) => {
    switch (state) {
      case 'pending':
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-dark-3"></div>
        );
      case 'processing':
        return (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        );
      case 'completed':
        return (
          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (state) => {
    switch (state) {
      case 'pending':
        return '待機中';
      case 'processing':
        return '処理中...';
      case 'completed':
        return '完了';
      case 'error':
        return 'エラー';
      default:
        return '';
    }
  };

  return (
    <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
        データ収集状況
      </h2>

      <div className="space-y-4">
        {/* メタ情報収集 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(status.metadata)}
            <div className="flex-1">
              <div className="font-medium text-dark dark:text-white">
                メタ情報を収集中
              </div>
              <div className="text-sm text-body-color">
                Meta Title、Meta Description、スクリーンショット（PC/モバイル）
              </div>
            </div>
          </div>
          <div className="text-sm text-body-color">
            {getStatusText(status.metadata)}
          </div>
        </div>

        {/* GA4データ取得 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(status.ga4Data)}
            <div className="flex-1">
              <div className="font-medium text-dark dark:text-white">
                GA4データを取得中
              </div>
              <div className="text-sm text-body-color">
                過去30日間のデータ
              </div>
            </div>
          </div>
          <div className="text-sm text-body-color">
            {getStatusText(status.ga4Data)}
          </div>
        </div>

        {/* GSCデータ取得 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(status.gscData)}
            <div className="flex-1">
              <div className="font-medium text-dark dark:text-white">
                Search Consoleデータを取得中
              </div>
              <div className="text-sm text-body-color">
                過去30日間のデータ
              </div>
            </div>
          </div>
          <div className="text-sm text-body-color">
            {getStatusText(status.gscData)}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          データ収集には数分かかる場合があります。この画面を閉じても、バックグラウンドで処理は継続されます。
        </p>
      </div>
    </div>
  );
}

