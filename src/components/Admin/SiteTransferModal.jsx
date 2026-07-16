import { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { functions, db } from '../../config/firebase';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { ArrowRight, AlertTriangle, CheckCircle2, Globe, Mail, Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PLANS } from '../../constants/plans';
import AdminCreateUserModal from './AdminCreateUserModal';
import SiteCheckboxList from '../common/SiteCheckboxList';

/**
 * サイト所有権移管モーダル (1 モーダルで完結)
 *
 * ステップ:
 *   1. 移管先選択 (既存検索 / 新規作成タブ)
 *   2. 移管対象サイト選択 (チェックボックス)
 *   3. プレビュー + 警告
 *   4. 実行 + 完了
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} [props.initialNewOwnerUid] - /admin/users/{uid} から開いた場合プリセット
 * @param {Object} [props.initialNewOwnerData] - 既存ユーザーデータ (任意・初期化最適化用)
 * @param {string} props.adminUid - 実行 admin の uid (自身のサイト一覧をフィルタ)
 * @param {() => void} [props.onTransferred] - 完了コールバック
 */
export default function SiteTransferModal({
  isOpen,
  onClose,
  initialNewOwnerUid = null,
  initialNewOwnerData = null,
  adminUid,
  onTransferred,
}) {
  const [step, setStep] = useState('selectUser'); // selectUser | selectSites | preview | done
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminSites, setAdminSites] = useState([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  // 既存ユーザーへの引き継ぎ通知メールを送るか (新規作成ユーザーは sendAccountCredentialsEmail で別途案内されるため対象外)
  const [notifyExistingUser, setNotifyExistingUser] = useState(true);

  const reset = () => {
    setStep('selectUser');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedSiteIds(new Set());
    setTransferResult(null);
    setShowCreateUserModal(false);
    setNotifyExistingUser(true);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // 初期 props 反映 (既存ユーザー指定で開いた場合)
  useEffect(() => {
    if (!isOpen) return;
    if (initialNewOwnerUid && initialNewOwnerData) {
      setSelectedUser({
        uid: initialNewOwnerUid,
        ...initialNewOwnerData,
      });
      setStep('selectSites');
    }
  }, [isOpen, initialNewOwnerUid, initialNewOwnerData]);

  // admin 所有サイト取得 (selectSites ステップに入った時)
  useEffect(() => {
    if (!isOpen || step !== 'selectSites' || !adminUid) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const q = query(collection(db, 'sites'), where('userId', '==', adminUid));
        const snap = await getDocs(q);
        if (cancelled) return;
        const sites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAdminSites(sites);
      } catch (err) {
        toast.error(`サイト一覧の取得に失敗: ${err.message}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, step, adminUid]);

  // 既存ユーザー検索 (admin の getAdminUsers callable を流用、部分一致対応)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('検索キーワードを入力してください');
      return;
    }
    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'getAdminUsers');
      const result = await fn({
        searchQuery: searchQuery.trim(),
        memberRole: 'owner', // owner のみ
        page: 1,
        limit: 20,
      });
      const list = result.data?.users || result.data?.data?.users || [];
      // 自分自身 (admin) を除外
      const filtered = list.filter(u => u.uid !== adminUid);
      setSearchResults(filtered);
      if (filtered.length === 0) {
        toast('該当ユーザーが見つかりません (owner ロールのみ対象)');
      }
    } catch (err) {
      toast.error(`検索失敗: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExistingUser = (user) => {
    setSelectedUser(user);
    setStep('selectSites');
  };

  // 新規ユーザー作成 (AdminCreateUserModal を流用)
  const handleNewUserCreated = (newUserInfo) => {
    // AdminCreateUserModal の onProceedToSiteRegistration から { uid, name } を受け取る
    setSelectedUser({
      uid: newUserInfo.uid,
      name: newUserInfo.name,
      isNewlyCreated: true, // 完了画面でアカウント情報メール送信ボタンを表示するため
    });
    setShowCreateUserModal(false);
    setStep('selectSites');
  };

  // サイト全選択
  const handleToggleSelectAll = () => {
    if (selectedSiteIds.size === adminSites.length) {
      setSelectedSiteIds(new Set());
    } else {
      setSelectedSiteIds(new Set(adminSites.map(s => s.id)));
    }
  };

  const handleToggleSite = (siteId) => {
    setSelectedSiteIds(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  // 移管実行
  const handleExecute = async () => {
    if (selectedSiteIds.size === 0) {
      toast.error('移管対象のサイトを 1 件以上選択してください');
      return;
    }
    setIsLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminTransferSiteOwnership');
      const result = await fn({
        siteIds: Array.from(selectedSiteIds),
        newOwnerUid: selectedUser.uid,
        retainTokenOwner: true,
        // 新規作成ユーザーには sendAccountCredentialsEmail で別途案内するため強制 false。
        // 既存ユーザーは admin がチェックボックスで明示的に制御。
        notifyExistingUser: selectedUser.isNewlyCreated ? false : notifyExistingUser,
      });
      setTransferResult(result.data);
      setStep('done');
      onTransferred?.();
    } catch (err) {
      toast.error(`移管失敗: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 新規作成ユーザーへの「アカウント情報メール送信」
  const handleSendCredentialsEmail = async () => {
    if (!selectedUser?.uid) return;
    try {
      const fn = httpsCallable(functions, 'sendAccountCredentialsEmail');
      await fn({ targetUserId: selectedUser.uid });
      toast.success(`${selectedUser.email} にアカウント情報メールを送信しました`);
    } catch (err) {
      toast.error(`メール送信失敗: ${err.message}`);
    }
  };

  // プラン警告計算
  const planWarning = useMemo(() => {
    if (!selectedUser) return null;
    const plan = PLANS[selectedUser.plan || 'free'] || PLANS.free;
    const baseLimit = plan.features?.maxSites || 1;
    const transferCount = selectedSiteIds.size;
    if (transferCount > baseLimit) {
      return `移管先のプラン (${plan.name}) のサイト上限は ${baseLimit} 件です。${transferCount} 件移管すると上限超過になりますが、保有自体は許容されます。`;
    }
    return null;
  }, [selectedUser, selectedSiteIds.size]);

  return (
    <Dialog open={isOpen} onClose={handleClose} size="2xl">
      <DialogTitle>サイトを引き渡す</DialogTitle>

      <DialogBody className="!overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
        {/* ステップ 1: 移管先選択 */}
        {step === 'selectUser' && (
          <div>
            <p className="mb-4 text-sm text-body-color">
              当社が代行作成したサイトを引き渡す相手を選択してください。
            </p>

            {/* 既存ユーザー検索 */}
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">既存ユーザーから検索</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body-color" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="名前 / メール / UID で検索 (部分一致)"
                      className="w-full rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 text-sm dark:border-dark-3 dark:bg-dark"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button variant="primary" onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? '検索中...' : '検索'}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-body-color">候補 ({searchResults.length} 件):</p>
                  {searchResults.map(user => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => handleSelectExistingUser(user)}
                      className="flex w-full items-center justify-between rounded-lg border border-stroke px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5 dark:border-dark-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-dark dark:text-white">
                          {user.name || `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.displayName || user.email}
                        </div>
                        <div className="text-xs text-body-color">{user.email}</div>
                        {user.company && <div className="text-xs text-body-color">{user.company}</div>}
                      </div>
                      <ArrowRight className="h-4 w-4 text-body-color" />
                    </button>
                  ))}
                </div>
              )}

              {/* 区切り */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-dark-3"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-body-color dark:bg-dark-2">または</span></div>
              </div>

              {/* 新規ユーザー作成 (AdminCreateUserModal 流用) */}
              <Button
                variant="secondary"
                onClick={() => setShowCreateUserModal(true)}
                className="w-full"
              >
                <UserPlus data-slot="icon" />
                新規ユーザーを作成して引き渡す
              </Button>
              <p className="text-center text-xs text-body-color">
                通常のユーザー登録と同じフォームで作成 → そのまま引き渡しに進めます
              </p>
            </div>
          </div>
        )}

        {/* ステップ 2: サイト選択 */}
        {step === 'selectSites' && (
          <div>
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">移管先:</span>
                <span>
                  {selectedUser?.name
                    || `${selectedUser?.lastName || ''} ${selectedUser?.firstName || ''}`.trim()
                    || selectedUser?.displayName
                    || selectedUser?.email}
                </span>
                <span className="text-xs text-body-color">({selectedUser?.email})</span>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">移管対象のサイトを選択してください</p>
              <Button variant="secondary" size="sm" onClick={handleToggleSelectAll}>
                {selectedSiteIds.size === adminSites.length && adminSites.length > 0 ? '全解除' : '全選択'}
              </Button>
            </div>

            {isLoading ? (
              <p className="text-sm text-body-color">読み込み中...</p>
            ) : (
              <SiteCheckboxList
                sites={adminSites}
                selectedSiteIds={Array.from(selectedSiteIds)}
                onToggle={handleToggleSite}
                emptyMessage="移管可能なサイトがありません"
                maxHeight="max-h-80"
              />
            )}
          </div>
        )}

        {/* ステップ 3: プレビュー */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
              <p className="text-sm font-medium mb-2">移管内容の確認</p>
              <p className="text-sm">
                <strong>移管先:</strong>{' '}
                {selectedUser?.name
                  || `${selectedUser?.lastName || ''} ${selectedUser?.firstName || ''}`.trim()
                  || selectedUser?.email}{' '}
                <span className="text-xs text-body-color">({selectedUser?.email})</span>
              </p>
              <p className="text-sm mt-2"><strong>移管対象 ({selectedSiteIds.size} 件):</strong></p>
              <ul className="mt-1 ml-4 space-y-1 text-sm">
                {Array.from(selectedSiteIds).map(id => {
                  const site = adminSites.find(s => s.id === id);
                  return (
                    <li key={id} className="text-body-color">
                      • {site?.siteName || id} {site?.siteUrl && <span className="text-xs">({site.siteUrl})</span>}
                    </li>
                  );
                })}
              </ul>
            </div>

            {planWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">{planWarning}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>OAuth トークン:</strong> 当社 (admin) が引き続き保持します。GA4/GSC の連携は当社の Google アカウントで稼働し、移管先ユーザーの再連携は不要です。
              </p>
            </div>

            {/* 引き継ぎ通知メール: 既存ユーザーのときだけ選択可。新規作成ユーザーは sendAccountCredentialsEmail で別途案内 */}
            {!selectedUser?.isNewlyCreated && (
              <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={notifyExistingUser}
                    onChange={(e) => setNotifyExistingUser(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark dark:text-white">
                      引き継ぎ通知メールを送信する
                    </p>
                    <p className="mt-0.5 text-xs text-body-color">
                      {selectedUser?.email} 宛に「サイトがアカウントに追加されました」メールを送信します。
                      オフにすると、移管完了後の通知は行いません（口頭や別チャネルで連絡する場合に使用）。
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* ステップ 4: 完了 */}
        {step === 'done' && transferResult && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-semibold text-dark dark:text-white">
                {transferResult.transferredCount} 件のサイトを引き渡しました
              </p>
              {transferResult.failedSites?.length > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  {transferResult.failedSites.length} 件失敗 (詳細は ActivityLogs を確認)
                </p>
              )}
            </div>

            {selectedUser?.isNewlyCreated && (
              <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark dark:text-white">
                      アカウント情報を顧客にメール送信しますか?
                    </p>
                    <p className="text-xs text-body-color mt-1">
                      パスワードリセットリンクを {selectedUser.email} に送信します
                    </p>
                    <Button variant="primary" size="sm" onClick={handleSendCredentialsEmail} className="mt-2">
                      アカウント情報をメール送信
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogActions>
        {step === 'selectUser' && (
          <Button variant="ghost" onClick={handleClose}>キャンセル</Button>
        )}
        {step === 'selectSites' && (
          <>
            <Button variant="ghost" onClick={() => setStep('selectUser')}>戻る</Button>
            <Button
              variant="primary"
              onClick={() => setStep('preview')}
              disabled={selectedSiteIds.size === 0}
            >
              次へ ({selectedSiteIds.size} 件選択中)
            </Button>
          </>
        )}
        {step === 'preview' && (
          <>
            <Button variant="ghost" onClick={() => setStep('selectSites')}>戻る</Button>
            <Button variant="primary" onClick={handleExecute} disabled={isLoading}>
              {isLoading ? '実行中...' : '引き渡しを実行'}
            </Button>
          </>
        )}
        {step === 'done' && (
          <Button variant="primary" onClick={handleClose}>閉じる</Button>
        )}
      </DialogActions>

      {/* 新規ユーザー作成 (既存 AdminCreateUserModal を流用) */}
      {showCreateUserModal && (
        <AdminCreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => { /* 監査ログは callable 内で記録済 */ }}
          onProceedToSiteRegistration={handleNewUserCreated}
          proceedButtonLabel="続けてサイト引き渡しへ"
          proceedButtonIcon={ArrowRight}
        />
      )}
    </Dialog>
  );
}
