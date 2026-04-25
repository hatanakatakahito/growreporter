import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { RefreshCw, ExternalLink, User } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'new', label: '新規' },
  { value: 'estimate_created', label: '見積作成済み' },
  { value: 'contract_sent', label: '契約書送付済み' },
  { value: 'active', label: '契約中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: '解約' },
  { value: 'inquiry_cancelled', label: '申込キャンセル' },
];

const PAYMENT_LABEL = { bulk: '一括請求（年額597,600円 税別）', recurring: '定期請求（月額49,800円 税別）' };

function formatDate(isoString) {
  if (!isoString) return '-';
  try { return new Date(isoString).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '-'; }
}

export default function InquiryDetailModal({ isOpen, onClose, inquiry, onStatusUpdated }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(inquiry.status || 'new');
  const [adminNote, setAdminNote] = useState(inquiry.adminNote || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleUpdateStatus = async () => {
    if (status === inquiry.status && adminNote === (inquiry.adminNote || '')) return;
    setIsUpdating(true);
    try {
      const updateFn = httpsCallable(functions, 'updateInquiryStatus');
      await updateFn({ inquiryId: inquiry.id, status, adminNote });
      toast.success(status === 'active' ? 'ステータスを更新し、プランをBusinessに変更しました' : 'ステータスを更新しました');
      onStatusUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'ステータス更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetryBoard = async () => {
    setIsRetrying(true);
    try {
      const retryFn = httpsCallable(functions, 'retryBoardEstimate');
      await retryFn({ inquiryId: inquiry.id });
      toast.success('board見積の再作成に成功しました');
      onStatusUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'board見積の再作成に失敗しました');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSyncBoard = async () => {
    setIsSyncing(true);
    try {
      const syncFn = httpsCallable(functions, 'syncBoardInquiry');
      await syncFn({ inquiryId: inquiry.id });
      toast.success('boardから同期しました');
      onStatusUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'board同期に失敗しました');
    } finally {
      setIsSyncing(false);
    }
  };

  const labelClass = 'text-xs font-medium text-body-color dark:text-dark-6';
  const valueClass = 'text-sm text-dark dark:text-white';

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <div className="-mx-(--gutter) -mt-(--gutter) border-b border-stroke bg-gradient-to-r from-primary-blue/10 to-primary-purple/10 px-6 py-4 dark:border-dark-3 rounded-t-2xl">
        <h3 className="text-lg font-semibold text-dark dark:text-white">問い合わせ詳細</h3>
        <p className="mt-0.5 text-xs text-body-color dark:text-dark-6">ID: {inquiry.id}</p>
      </div>

      <DialogBody>
        <div className="space-y-5">
          {/* 組織・担当者情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={labelClass}>組織名</div>
              <div className={valueClass}>{inquiry.companyName || '-'}</div>
            </div>
            <div>
              <div className={labelClass}>部署名</div>
              <div className={valueClass}>{inquiry.department || '-'}</div>
            </div>
            <div>
              <div className={labelClass}>担当者名</div>
              <div className={valueClass}>{`${inquiry.lastName || ''} ${inquiry.firstName || ''}`.trim() || '-'}</div>
            </div>
            <div>
              <div className={labelClass}>電話番号</div>
              <div className={valueClass}>{inquiry.phone || '-'}</div>
            </div>
            <div>
              <div className={labelClass}>メールアドレス</div>
              <div className={valueClass}>{inquiry.email || '-'}</div>
            </div>
            <div>
              <div className={labelClass}>住所</div>
              <div className={valueClass}>
                {inquiry.zipCode ? `〒${inquiry.zipCode} ` : ''}
                {[inquiry.prefecture, inquiry.city, inquiry.building].filter(Boolean).join(' ') || '-'}
              </div>
            </div>
          </div>

          {/* 契約条件 */}
          <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">ご契約条件</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={labelClass}>支払い方法</div>
                <div className={valueClass}>{PAYMENT_LABEL[inquiry.paymentTiming] || '-'}</div>
              </div>
              <div>
                <div className={labelClass}>利用開始希望月</div>
                <div className={valueClass}>
                  {inquiry.startDatePref === 'preferred' && inquiry.startMonth
                    ? (() => { const [y, m] = inquiry.startMonth.split('-'); return `${y}年${parseInt(m)}月`; })()
                    : '希望なし（翌月1日）'}
                </div>
              </div>
              {inquiry.contractStartDate && (
                <>
                  <div>
                    <div className={labelClass}>契約開始日</div>
                    <div className={valueClass}>{inquiry.contractStartDate}</div>
                  </div>
                  <div>
                    <div className={labelClass}>契約終了日</div>
                    <div className={`${valueClass} ${inquiry.renewalAlert ? 'text-orange-600 font-semibold' : ''}`}>
                      {inquiry.contractEndDate}
                      {inquiry.renewalAlert && ' ⚠ 更新間近'}
                    </div>
                  </div>
                </>
              )}
            </div>
            {inquiry.message && (
              <div className="mt-3">
                <div className={labelClass}>ご質問・ご要望</div>
                <div className={`${valueClass} mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-dark-3`}>{inquiry.message}</div>
              </div>
            )}
          </div>

          {/* board連携情報 */}
          <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">board連携</h4>
            {inquiry.boardEstimateId ? (
              <div>
                <div className="mb-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className={labelClass}>顧客ID</div>
                    <div className={valueClass}>{inquiry.boardClientId}</div>
                  </div>
                  <div>
                    <div className={labelClass}>案件ID</div>
                    <div className={valueClass}>{inquiry.boardProjectId}</div>
                  </div>
                  <div>
                    <div className={labelClass}>見積書ID</div>
                    <div className={valueClass}>{inquiry.boardEstimateId}</div>
                  </div>
                </div>
                {inquiry.boardEstimateTotal != null && (
                  <div className="mb-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className={labelClass}>小計</div>
                      <div className={valueClass}>{Number(inquiry.boardEstimateTotal).toLocaleString()}円</div>
                    </div>
                    <div>
                      <div className={labelClass}>消費税</div>
                      <div className={valueClass}>{Number(inquiry.boardEstimateTax).toLocaleString()}円</div>
                    </div>
                    <div>
                      <div className={labelClass}>受注ステータス</div>
                      <div className={valueClass}>{inquiry.boardOrderStatusName || '-'}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    href={`https://the-board.jp/projects/${inquiry.boardProjectId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink data-slot="icon" />
                    boardで開く
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSyncBoard}
                    disabled={isSyncing}
                  >
                    <RefreshCw data-slot="icon" className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? '同期中...' : 'boardから同期'}
                  </Button>
                  {inquiry.boardSyncedAt && (
                    <span className="text-[10px] text-body-color">最終同期: {formatDate(inquiry.boardSyncedAt)}</span>
                  )}
                </div>
              </div>
            ) : inquiry.boardError ? (
              <div>
                <div className="mb-2 rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
                  {inquiry.boardError}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetryBoard}
                  disabled={isRetrying}
                >
                  <RefreshCw data-slot="icon" className={isRetrying ? 'animate-spin' : ''} />
                  {isRetrying ? '再作成中...' : '再試行'}
                </Button>
              </div>
            ) : (
              <div className="text-xs text-body-color">未連携</div>
            )}
            <p className="mt-3 text-[11px] text-body-color dark:text-dark-6">変更内容が生じた場合はboard側から変更し、同期してください。自動同期は毎日0時に自動更新されます。</p>
          </div>

          {/* ユーザーリンク */}
          {inquiry.uid && (
            <button
              onClick={() => navigate(`/admin/users/${inquiry.uid}`)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              ユーザー詳細を表示
              <ExternalLink className="h-3 w-3" />
            </button>
          )}

          {/* ステータス変更 */}
          <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">ステータス変更</h4>
            <div className="space-y-3">
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {status === 'active' && inquiry.status !== 'active' && (
                  <p className="mt-1.5 text-xs text-orange-600">
                    「契約中」に変更すると、ユーザーのプランが自動的にBusinessプランに切り替わります。
                  </p>
                )}
                {status === 'cancelled' && inquiry.status !== 'cancelled' && (
                  <p className="mt-1.5 text-xs text-red-600">
                    「解約」に変更すると、ユーザーのプランが自動的に無料プランにダウングレードされます。
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-body-color dark:text-dark-6">管理者メモ</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  placeholder="対応メモを記入"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button variant="ghost" onClick={onClose}>閉じる</Button>
        <Button
          variant="primary"
          onClick={handleUpdateStatus}
          disabled={isUpdating || (status === inquiry.status && adminNote === (inquiry.adminNote || ''))}
        >
          {isUpdating ? '更新中...' : 'ステータスを更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
