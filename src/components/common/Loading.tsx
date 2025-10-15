'use client';

import * as React from 'react';
import './Loading.css';

/**
 * 統一されたローディングアニメーションコンポーネント
 * CSSアニメーションで実装
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
      <div
        className="loading-spinner rounded-full border-4 border-primary border-t-transparent"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      ></div>
    </div>
  );
}

