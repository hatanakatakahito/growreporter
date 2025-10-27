import React from 'react';

/**
 * ローディングスピナーコンポーネント
 */
export default function LoadingSpinner({ message = '読み込み中...' }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary"></div>
      <p className="mt-4 text-sm text-body-color">{message}</p>
    </div>
  );
}
