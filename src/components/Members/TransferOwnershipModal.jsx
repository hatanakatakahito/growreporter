import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

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
    <Dialog open={true} onClose={onClose} size="md">
      <DialogTitle>オーナー権限の譲渡</DialogTitle>
      <DialogDescription>この操作は取り消せません。慎重に確認してください。</DialogDescription>

      <DialogBody>
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
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
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
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button color="red" onClick={handleTransfer} disabled={isSubmitting}>
          {isSubmitting ? '譲渡中...' : 'オーナー権限を譲渡'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
