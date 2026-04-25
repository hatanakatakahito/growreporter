import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

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
        <Button variant="primary" size="md" onClick={onRetry} className="mt-4">
          再試行
        </Button>
      )}
    </div>
  );
}
