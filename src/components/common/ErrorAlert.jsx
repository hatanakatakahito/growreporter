import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * エラーアラートコンポーネント
 */
export default function ErrorAlert({ message = 'エラーが発生しました', onRetry }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <p className="mt-4 text-sm font-medium text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          再試行
        </button>
      )}
    </div>
  );
}
