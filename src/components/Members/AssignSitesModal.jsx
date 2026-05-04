import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { useSite } from '../../contexts/SiteContext';
import SiteCheckboxList from '../common/SiteCheckboxList';

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

        <SiteCheckboxList
          sites={allSites}
          selectedSiteIds={selectedSiteIds}
          onToggle={toggleSite}
          disabled={isSubmitting}
        />

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
