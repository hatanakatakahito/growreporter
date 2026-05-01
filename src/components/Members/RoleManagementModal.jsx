import React, { useState, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { useSite } from '../../contexts/SiteContext';
import { Globe, CheckCircle, Circle, AlertTriangle } from 'lucide-react';

/**
 * メンバーの権限管理モーダル（統合版）
 *
 * 1つのモーダルで以下を選択・実行可能:
 * - 編集者にする / 閲覧者にする（updateMemberRole）
 * - 閲覧者の閲覧サイト割当（updateViewerAllowedSites）
 * - オーナー権限を譲渡する（transferOwnership）
 *
 * @param {Object} props.member - 対象メンバー（id, role, allowedSiteIds, displayName, email）
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess
 */
export default function RoleManagementModal({ member, onClose, onSuccess }) {
  const { allSites = [] } = useSite();
  const currentRole = member.role; // 'editor' or 'viewer'
  const memberName = member.displayName || member.email || 'メンバー';
  const initialSiteIds = useMemo(
    () => (Array.isArray(member.allowedSiteIds) ? [...member.allowedSiteIds] : []),
    [member.allowedSiteIds]
  );

  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedSiteIds, setSelectedSiteIds] = useState(initialSiteIds);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const willBecomeOwner = selectedRole === 'owner';
  const willChangeRoleEditorViewer = selectedRole !== currentRole && !willBecomeOwner;
  // editor / viewer どちらでもサイト選択 UI を表示
  const showSiteSelector = selectedRole === 'editor' || selectedRole === 'viewer';

  // 対象サイトの選択が変わったか
  const sitesChanged = useMemo(() => {
    if (initialSiteIds.length !== selectedSiteIds.length) return true;
    const set = new Set(initialSiteIds);
    return selectedSiteIds.some((id) => !set.has(id));
  }, [initialSiteIds, selectedSiteIds]);

  const hasAnyChange =
    willBecomeOwner ||
    willChangeRoleEditorViewer ||
    (showSiteSelector && currentRole === selectedRole && sitesChanged);

  const canSubmit = () => {
    if (isSubmitting) return false;
    if (!hasAnyChange) return false;
    if (willBecomeOwner && !confirmTransfer) return false;
    return true;
  };

  const toggleSite = (siteId) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const selectAllSites = () => setSelectedSiteIds(allSites.map((s) => s.id));
  const clearAllSites = () => setSelectedSiteIds([]);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      // 1. オーナー譲渡
      if (willBecomeOwner) {
        const transferOwnership = httpsCallable(functions, 'transferOwnership');
        await transferOwnership({ newOwnerId: member.id });
        // 譲渡完了後はオーナー側 UI が変わるため詳細処理は不要
      } else if (willChangeRoleEditorViewer) {
        // 2. editor ↔ viewer 切替
        const updateMemberRole = httpsCallable(functions, 'updateMemberRole');
        await updateMemberRole({ memberId: member.id, newRole: selectedRole });
        // 切替後の allowedSiteIds を設定（選択値が初期値と違う、または変更先で1件以上選択時）
        if (showSiteSelector && (sitesChanged || selectedSiteIds.length > 0)) {
          const updateAllowed = httpsCallable(functions, 'updateViewerAllowedSites');
          await updateAllowed({ targetUserId: member.id, allowedSiteIds: selectedSiteIds });
        }
      } else if (showSiteSelector && currentRole === selectedRole && sitesChanged) {
        // 3. ロール変更なしでサイト割当のみ変更
        const updateAllowed = httpsCallable(functions, 'updateViewerAllowedSites');
        await updateAllowed({ targetUserId: member.id, allowedSiteIds: selectedSiteIds });
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error in role management:', err);
      setError(err.message || '権限変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const RoleOption = ({ value, label, description }) => {
    const checked = selectedRole === value;
    return (
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
          checked
            ? 'border-primary bg-primary/5'
            : 'border-stroke hover:border-primary/40 dark:border-dark-3'
        }`}
      >
        <input
          type="radio"
          name="role"
          value={value}
          checked={checked}
          onChange={(e) => setSelectedRole(e.target.value)}
          disabled={isSubmitting}
          className="mt-1 h-4 w-4 text-primary"
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-dark dark:text-white">{label}</div>
          <div className="mt-0.5 text-xs text-body-color">{description}</div>
        </div>
      </label>
    );
  };

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle>権限を変更: {memberName}</DialogTitle>
      <DialogBody>
        {/* 現在の権限 */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-dark-3">
          <span className="text-body-color">現在の権限: </span>
          <strong className="text-dark dark:text-white">
            {currentRole === 'editor' ? '編集者' : currentRole === 'viewer' ? '閲覧者' : currentRole}
          </strong>
          {currentRole === 'viewer' && (
            <span className="ml-2 text-xs text-body-color">
              （閲覧サイト: {initialSiteIds.length} 件）
            </span>
          )}
        </div>

        {/* 権限選択 */}
        <div className="mb-5 space-y-2">
          <RoleOption
            value="editor"
            label="編集者"
            description="指定したサイトのみ作成・編集・削除可能。AI機能・エクスポートも利用可能"
          />
          <RoleOption
            value="viewer"
            label="閲覧者"
            description="指定したサイトのみ閲覧可能。AI機能・エクスポートは可能だが、編集や設定変更は不可"
          />
          <RoleOption
            value="owner"
            label="オーナーに譲渡"
            description="このメンバーが新しいオーナーになり、あなたは編集者になります"
          />
        </div>

        {/* editor / viewer 選択時のサイト割当 */}
        {showSiteSelector && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-dark dark:text-white">
                {selectedRole === 'editor' ? '編集を許可するサイト' : '閲覧を許可するサイト'}
                <span className="ml-2 text-xs font-normal text-body-color">
                  （{selectedSiteIds.length} / {allSites.length} 選択中）
                </span>
              </label>
              {allSites.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllSites}
                    className="text-primary hover:underline"
                    disabled={isSubmitting}
                  >
                    全選択
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllSites}
                    className="text-body-color hover:text-dark"
                    disabled={isSubmitting}
                  >
                    全解除
                  </button>
                </div>
              )}
            </div>
            {allSites.length === 0 ? (
              <div className="rounded-lg border border-stroke bg-gray-50 p-3 text-sm text-body-color dark:border-dark-3 dark:bg-dark-3">
                サイトが登録されていません。
              </div>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-stroke bg-white p-2 dark:border-dark-3 dark:bg-dark">
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
            {selectedSiteIds.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">
                ※ サイトを 1 件も選択しない場合、このメンバーは何も閲覧できなくなります。後から追加することも可能です。
              </p>
            )}
          </div>
        )}

        {/* オーナー譲渡時の警告 */}
        {willBecomeOwner && (
          <div className="mb-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
              <div className="text-sm text-yellow-900 dark:text-yellow-100">
                <p className="font-semibold">オーナー譲渡の確認</p>
                <ul className="mt-2 space-y-1 pl-4 text-xs leading-relaxed">
                  <li>・<strong>{memberName}</strong> さんが新しいオーナーになります</li>
                  <li>・あなたは自動的に <strong>編集者</strong> になります</li>
                  <li>・譲渡後はメンバー招待・プラン変更等のオーナー操作はできなくなります</li>
                  <li>・全サイトの所有権が新オーナーに移行します</li>
                </ul>
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmTransfer}
                onChange={(e) => setConfirmTransfer(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-yellow-900 dark:text-yellow-100">
                上記の内容を理解し、オーナー権限を譲渡します
              </span>
            </label>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20">
            {error}
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button
          variant={willBecomeOwner ? 'danger' : 'primary'}
          onClick={handleSubmit}
          disabled={!canSubmit()}
        >
          {isSubmitting ? '保存中...' : willBecomeOwner ? 'オーナーを譲渡する' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
