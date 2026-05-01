import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Link } from 'react-router-dom';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { useSite } from '../../contexts/SiteContext';
import { Globe, CheckCircle, Circle } from 'lucide-react';

/**
 * メンバー招待モーダル
 *
 * 編集者: アカウント全サイトの作成・編集・削除、データ閲覧が可能
 * 閲覧者: 指定したサイトのみ閲覧可能。編集や設定変更は不可
 */
export default function InviteMemberModal({ onClose, currentMemberCount, maxMembers }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { allSites = [] } = useSite();
  const canInvite = currentMemberCount < maxMembers;
  // editor / viewer ともに対象サイトを選択させる
  const requiresSiteSelection = role === 'editor' || role === 'viewer';
  const sitesAvailable = allSites.length > 0;

  const toggleSite = (siteId) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

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

    if (requiresSiteSelection && selectedSiteIds.length === 0) {
      setError('対象のサイトを 1 つ以上選択してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteMember = httpsCallable(functions, 'inviteMember');
      const payload = { email, role };
      if (requiresSiteSelection) payload.allowedSiteIds = selectedSiteIds;
      const result = await inviteMember(payload);

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
                <Link to="/account/settings?tab=plan" className="ml-1 underline">
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
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === 'editor'}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-0.5 h-4 w-4 text-primary"
                  disabled={!canInvite || isSubmitting}
                />
                <div>
                  <div className="text-sm font-medium text-dark dark:text-white">編集者</div>
                  <div className="text-xs text-body-color">指定したサイトのみ作成・編集・削除、データ閲覧が可能</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
                <input
                  type="radio"
                  name="role"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-0.5 h-4 w-4 text-primary"
                  disabled={!canInvite || isSubmitting}
                />
                <div>
                  <div className="text-sm font-medium text-dark dark:text-white">閲覧者</div>
                  <div className="text-xs text-body-color">指定したサイトのみ閲覧可能。編集や設定変更は不可</div>
                </div>
              </label>
            </div>
          </div>

          {/* editor / viewer: 対象サイト選択 */}
          {requiresSiteSelection && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                {role === 'editor' ? '編集を許可するサイト' : '閲覧を許可するサイト'}
                <span className="ml-2 text-xs font-normal text-body-color">
                  （{selectedSiteIds.length} / {allSites.length} 選択中）
                </span>
              </label>
              {!sitesAvailable ? (
                <div className="rounded-lg border border-stroke bg-gray-50 p-3 text-sm text-body-color dark:border-dark-3 dark:bg-dark-3">
                  サイトが登録されていません。先にサイトを登録してください。
                </div>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-stroke bg-white p-2 dark:border-dark-3 dark:bg-dark">
                  {allSites.map((site) => {
                    const checked = selectedSiteIds.includes(site.id);
                    return (
                      <button
                        type="button"
                        key={site.id}
                        onClick={() => toggleSite(site.id)}
                        disabled={isSubmitting}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                          checked ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-3'
                        }`}
                      >
                        {checked ? (
                          <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" />
                        )}
                        <Globe className="h-4 w-4 flex-shrink-0 text-body-color" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-dark dark:text-white">
                            {site.siteName || site.url || '(名称未設定)'}
                          </div>
                          {site.url && (
                            <div className="truncate text-xs text-body-color">{site.url}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </form>
      </DialogBody>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          type="submit"
          form="invite-form"
          disabled={!canInvite || isSubmitting || (requiresSiteSelection && selectedSiteIds.length === 0)}
        >
          {isSubmitting ? '送信中...' : '招待を送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
