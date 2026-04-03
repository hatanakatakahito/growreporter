import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Link } from 'react-router-dom';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * メンバー招待モーダル
 */
export default function InviteMemberModal({ onClose, currentMemberCount, maxMembers }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canInvite = currentMemberCount < maxMembers;

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
    <Dialog open={true} onClose={onClose} size="md">
      <DialogTitle>メンバーを招待</DialogTitle>
      <DialogBody>
        <form id="invite-form" onSubmit={handleSubmit}>
          {/* メンバー数表示 */}
          <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              現在のメンバー数: <span className="font-semibold">{currentMemberCount} / {maxMembers >= 999999 ? '無制限' : `${maxMembers}人`}</span>
            </div>
            {!canInvite && (
              <div className="mt-2 text-sm text-red-600">
                プランの上限に達しています。
                <Link to="/account/plan" className="ml-1 underline">
                  プランをアップグレード
                </Link>
              </div>
            )}
          </div>

          {/* メールアドレス */}
          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-dark dark:text-white">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stroke px-3 py-2 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
              placeholder="example@example.com"
              required
              disabled={!canInvite || isSubmitting}
            />
          </div>

          {/* 権限選択 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              権限
            </label>
            <div className="rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === 'editor'}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-4 w-4 text-primary"
                  disabled={!canInvite || isSubmitting}
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-dark dark:text-white">編集者</div>
                  <div className="text-xs text-body-color">サイトの作成・編集・削除、データ閲覧が可能</div>
                </div>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </form>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button
          color="blue"
          type="submit"
          form="invite-form"
          disabled={!canInvite || isSubmitting}
        >
          {isSubmitting ? '送信中...' : '招待を送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
