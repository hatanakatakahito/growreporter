import React from 'react';
import { createPortal } from 'react-dom';
import DotWaveSpinner from '../common/DotWaveSpinner';

/**
 * AI改善案生成ローディングオーバーレイ
 * @param {boolean} isOpen - 表示状態
 * @param {function} onCancel - キャンセル
 */
export default function AIGenerationModal({ isOpen, onCancel }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed left-0 top-0 z-[9999] flex h-screen w-screen items-center justify-center bg-white/60 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center">
        <DotWaveSpinner size="lg" />
        <h3 className="mb-2 mt-6 text-xl font-semibold text-dark">
          AI改善案を生成中...
        </h3>
        <p className="text-center text-sm text-gray-600">
          ただいまデータを分析しサイト改善を作成しています。<br />
          少々お待ちください。
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-8 text-xs text-gray-400 transition hover:text-gray-600"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
