import React from 'react';
import { SkeletonLoading } from './SkeletonLoading';
import DotWaveSpinner from './DotWaveSpinner';

/**
 * ローディングスピナーコンポーネント
 * @param {string} message - ローディングメッセージ
 * @param {string} skeleton - スケルトンタイプ ('table' | 'card' | 'dashboard' | 'chart' | null)
 * @param {object} skeletonProps - スケルトンローディングのprops
 */
export default function LoadingSpinner({
  message = '読み込み中...',
  skeleton = null,
  skeletonProps = {}
}) {
  // スケルトンローディングを使用する場合
  if (skeleton) {
    return (
      <div className="animate-fadeIn">
        <SkeletonLoading type={skeleton} {...skeletonProps} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <DotWaveSpinner size="lg" />
      <p className="mt-4 text-sm text-body-color">{message}</p>
    </div>
  );
}
