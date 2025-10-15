'use client';

import * as React from 'react';

/**
 * 統一されたローディングアニメーションコンポーネント
 * SVG-basedスピナー（灰色の円 + プライマリカラーの回転部分）
 */

interface LoadingProps {
  size?: number;
  className?: string;
}

export default function Loading({ 
  size = 40,
  className = ''
}: LoadingProps) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="text-gray-200 dark:text-gray-600"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="fill-primary"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}
