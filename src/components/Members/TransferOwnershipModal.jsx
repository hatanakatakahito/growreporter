import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

/**
 * オーナー権限譲渡モーダル
 */
export default function TransferOwnershipModal({ member, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * オーナー権限を譲渡
   */
  const handleTransfer = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const transferOwnership = httpsCallable(functions, 'transferOwnership');
      const result = await transferOwnership({ newOwnerId: member.userId });

      if (result.data.success) {
        alert('オーナー権限を譲渡しました。ページを再読み込みします。');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      setError(error.message || 'オーナー権限の譲渡に失敗しました');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">オーナー権限の譲渡</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4">
          {/* 警告メッセージ */}
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  重要な操作です
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>オーナー権限を譲渡すると、以下の変更が行われます：</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>あなたは「編集者」になります</li>
                    <li>{member.displayName} さんが新しいオーナーになります</li>
                    <li>全サイトの所有権が移転します</li>
                    <li>メンバー管理やプラン変更ができなくなります</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 譲渡先メンバー情報 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">譲渡先メンバー</div>
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-primary font-medium">
                  {member.displayName?.[0] || member.email?.[0] || '?'}
                </span>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{member.displayName}</div>
                <div className="text-sm text-gray-500">{member.email}</div>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                !isSubmitting
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '譲渡中...' : 'オーナー権限を譲渡'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
