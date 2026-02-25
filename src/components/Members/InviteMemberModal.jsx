import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Link } from 'react-router-dom';

/**
 * メンバー招待モーダル
 */
export default function InviteMemberModal({ onClose, currentMemberCount, maxMembers }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canInvite = currentMemberCount < maxMembers;

  /**
   * 招待を送信
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!canInvite) {
      setError(`プランの上限（${maxMembers}人）に達しています`);
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteMember = httpsCallable(functions, 'inviteMember');
      const result = await inviteMember({ email, role });

      if (result.data.success) {
        alert('招待メールを送信しました');
        onClose();
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      setError(error.message || '招待の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">メンバーを招待</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* メンバー数表示 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              現在のメンバー数: <span className="font-semibold">{currentMemberCount} / {maxMembers}人</span>
            </div>
            {!canInvite && (
              <div className="mt-2 text-sm text-red-600">
                プランの上限に達しています。
                <Link to="/account/plan" className="underline ml-1">
                  プランをアップグレード
                </Link>
              </div>
            )}
          </div>

          {/* メールアドレス */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="example@example.com"
              required
              disabled={!canInvite || isSubmitting}
            />
          </div>

          {/* 権限選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              権限
            </label>
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === 'editor'}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                  disabled={!canInvite || isSubmitting}
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">編集者</div>
                  <div className="text-xs text-gray-500">サイトの作成・編集・削除、データ閲覧が可能</div>
                </div>
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
              type="submit"
              disabled={!canInvite || isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                canInvite && !isSubmitting
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '送信中...' : '招待を送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
