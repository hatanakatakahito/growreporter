import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { useSite } from '../../contexts/SiteContext';
import { Globe, CheckCircle, Circle } from 'lucide-react';

/**
 * 閲覧者のサイト割当モーダル
 *
 * オーナーが viewer の閲覧可能サイトを後から追加・削除する
 *
 * @param {Object} props.member - 対象 viewer のメンバー情報（id, email, displayName, allowedSiteIds）
 * @param {Function} props.onClose - モーダル閉じる
 * @param {Function} props.onSuccess - 保存成功時のコールバック
 */
export default function AssignSitesModal({ member, onClose, onSuccess }) {
  const { allSites = [] } = useSite();
  const [selectedSiteIds, setSelectedSiteIds] = useState(
    Array.isArray(member?.allowedSiteIds) ? member.allowedSiteIds : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const memberName = member?.displayName || member?.email || 'メンバー';

  const toggleSite = (siteId) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (selectedSiteIds.length === 0) {
      if (!confirm('閲覧可能なサイトをすべて外します。閲覧者は何も見られなくなりますがよろしいですか？')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updateViewerAllowedSites = httpsCallable(functions, 'updateViewerAllowedSites');
      const result = await updateViewerAllowedSites({
        targetUserId: member.id || member.userId,
        allowedSiteIds: selectedSiteIds,
      });

      if (result.data.success) {
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Error updating allowed sites:', err);
      setError(err.message || 'サイトの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="md">
      <DialogTitle>閲覧サイトの割当</DialogTitle>
      <DialogBody>
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-body-color dark:bg-dark-3">
          <span className="font-medium text-dark dark:text-white">{memberName}</span>{' '}
          が閲覧できるサイトを選択してください。
          <span className="ml-2 text-xs">
            （{selectedSiteIds.length} / {allSites.length} 選択中）
          </span>
        </div>

        {allSites.length === 0 ? (
          <div className="rounded-lg border border-stroke bg-gray-50 p-3 text-sm text-body-color dark:border-dark-3 dark:bg-dark-3">
            サイトが登録されていません。
          </div>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-stroke bg-white p-2 dark:border-dark-3 dark:bg-dark">
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

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
