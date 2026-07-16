import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { Dialog, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';
import { RefreshCw, ExternalLink, User, Link2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { monthsUntilContractEnd } from '../../utils/effectiveMaxSites';

/**
 * §15 Phase 2: 未紐付け inquiry に対する警告 + 紐付け UI
 * email 検索で既存 grow-reporter ユーザーを見つけて inquiry と紐付ける。
 * 新規ユーザー作成は /admin/users で別途行うように案内する。
 */
function UnlinkedUserBanner({ inquiry, onLinked }) {
  const [searchEmail, setSearchEmail] = useState(inquiry.email || '');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleSearch = async () => {
    const trimmedEmail = searchEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error('メールアドレスを入力してください');
      return;
    }
    setIsSearching(true);
    setSearchResult(null);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', trimmedEmail),
        limit(2),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setSearchResult({ found: false });
      } else if (snap.size > 1) {
        setSearchResult({ found: true, multiple: true });
      } else {
        const d = snap.docs[0];
        setSearchResult({
          found: true,
          uid: d.id,
          email: d.data().email,
          name: d.data().name || `${d.data().lastName || ''} ${d.data().firstName || ''}`.trim(),
          plan: d.data().plan || 'free',
        });
      }
    } catch (err) {
      console.error('[UnlinkedUserBanner] search error:', err);
      toast.error('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async () => {
    if (!searchResult?.uid) return;
    if (!confirm(`inquiry ${inquiry.id} を ${searchResult.email}（${searchResult.name}）に紐付けます。よろしいですか？`)) {
      return;
    }
    setIsLinking(true);
    try {
      const fn = httpsCallable(functions, 'linkInquiryToUser');
      const result = await fn({ inquiryId: inquiry.id, uid: searchResult.uid });
      if (result.data?.success) {
        toast.success('inquiry をユーザーに紐付けました');
        if (onLinked) onLinked();
      } else {
        toast.error('紐付けに失敗しました');
      }
    } catch (err) {
      console.error('[UnlinkedUserBanner] link error:', err);
      toast.error(err?.message || '紐付けに失敗しました');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20">
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-shrink-0 rounded-full bg-orange-200 p-1.5 dark:bg-orange-800">
          <AlertTriangle className="h-4 w-4 text-orange-700 dark:text-orange-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">ユーザー未紐付け</p>
          <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
            grow-reporter ユーザーが紐付けされていません。「契約中」へのステータス変更ができません（プラン反映不可）。
          </p>
        </div>
      </div>

      {/* 既存ユーザー検索 + 紐付け */}
      <div className="rounded bg-white/70 p-3 dark:bg-dark-2/50">
        <p className="mb-2 text-xs font-medium text-dark dark:text-white">既存ユーザーを email で検索して紐付け</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="example@company.com"
            className="flex-1 min-w-[200px] rounded border border-stroke bg-white px-3 py-1.5 text-sm dark:border-dark-3 dark:bg-dark dark:text-white"
            disabled={isSearching || isLinking}
          />
          <Button variant="secondary" onClick={handleSearch} disabled={isSearching || !searchEmail.trim()}>
            {isSearching ? '検索中...' : '検索'}
          </Button>
        </div>
        {searchResult && !searchResult.found && (
          <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
            該当するユーザーが見つかりません。/admin/users で新規作成してから紐付けてください。
          </div>
        )}
        {searchResult?.found && searchResult.multiple && (
          <div className="mt-2 text-xs text-red-700 dark:text-red-300">
            複数のユーザーが該当しています。データ整合性を確認してください。
          </div>
        )}
        {searchResult?.found && !searchResult.multiple && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-green-50 p-2 dark:bg-green-900/20">
            <div className="flex-1 text-xs">
              <div className="font-medium text-dark dark:text-white">{searchResult.name}</div>
              <div className="text-body-color dark:text-dark-6">{searchResult.email}（plan: {searchResult.plan}）</div>
            </div>
            <Button variant="primary" size="sm" onClick={handleLink} disabled={isLinking}>
              <Link2 data-slot="icon" />
              {isLinking ? '紐付け中...' : 'このユーザーに紐付け'}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-orange-700 dark:text-orange-300">
        新規ユーザーが必要な場合は、別タブで <a href="/admin/users" target="_blank" rel="noopener noreferrer" className="underline">/admin/users</a> から作成 → このページに戻って email で検索 → 紐付け
      </p>
    </div>
  );
}

/**
 * addon_only の課金月数を返す。
 * - effectiveContractEndDate（自身 or fallback）と createdAt から再計算
 * - 計算不能なら stored extraSitesMonths にフォールバック
 */
function getAddonMonths(inquiry, fallbackContractEndDate = null) {
  const endDate = inquiry?.contractEndDate || fallbackContractEndDate || null;
  if (endDate) {
    const submitDate = inquiry?.createdAt ? new Date(inquiry.createdAt) : new Date();
    if (!Number.isNaN(submitDate.getTime())) {
      return monthsUntilContractEnd(endDate, submitDate);
    }
  }
  return Number(inquiry?.extraSitesMonths) || 1;
}

const STATUS_OPTIONS = [
  { value: 'new', label: '新規' },
  { value: 'estimate_created', label: '見積作成済み' },
  { value: 'contract_sent', label: '契約書送付済み' },
  { value: 'active', label: '契約中' },
  // completed は 2026-04-30 廃止（手動アーカイブ用途で実質未使用だったため）
  // 既存データには 'completed' が残る可能性があるが、UI からは新規選択不可
  { value: 'cancelled', label: '解約' },
  { value: 'inquiry_cancelled', label: '申込キャンセル' },
];

const PAYMENT_LABEL = { bulk: '一括請求', recurring: '定期請求' };

const INQUIRY_TYPE_LABEL = {
  new_business: '新規ビジネスプラン申込',
  addon_only: '追加サイトオプション申込（既存契約への追加）',
};

/**
 * inquiry の支払いタイミング・追加サイト数から表示用のサマリー文字列を組み立てる
 * 例: 「定期請求（月額¥49,800 + 追加3サイト ¥45,000 = ¥94,800/月 税別）」
 */
function buildPaymentSummary(inquiry, fallbackContractEndDate = null) {
  const timing = inquiry.paymentTiming;
  if (!timing) return '-';
  const inquiryType = inquiry.inquiryType || 'new_business';
  const extras = Number(inquiry.extraSitesCount) || 0;
  const isBulk = timing === 'bulk';

  if (inquiryType === 'addon_only') {
    const months = getAddonMonths(inquiry, fallbackContractEndDate);
    const monthly = 15000 * extras;
    const total = monthly * months;
    return `${PAYMENT_LABEL[timing]}（追加${extras}サイト × ¥${(15000).toLocaleString()} × ${months}ヶ月 = ¥${total.toLocaleString()} 税別）`;
  }

  const baseMonthly = 49800;
  const extraMonthly = 15000 * extras;
  const totalMonthly = baseMonthly + extraMonthly;
  const months = isBulk ? 12 : 1;
  const totalAmount = totalMonthly * months;
  if (extras > 0) {
    return `${PAYMENT_LABEL[timing]}（基本¥${baseMonthly.toLocaleString()} + 追加${extras}サイト ¥${extraMonthly.toLocaleString()} = ¥${totalMonthly.toLocaleString()}/月、${months}ヶ月分 ¥${totalAmount.toLocaleString()} 税別）`;
  }
  return `${PAYMENT_LABEL[timing]}（${isBulk ? '年額' : '月額'}¥${(isBulk ? totalAmount : totalMonthly).toLocaleString()} 税別）`;
}

function formatDate(isoString) {
  if (!isoString) return '-';
  try { return new Date(isoString).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '-'; }
}

export default function InquiryDetailModal({
  isOpen,
  onClose,
  inquiry,
  // addon_only など inquiry 自身に契約期間が無い場合の fallback
  // （InquiryList が同じ boardProjectId の他 inquiry から引き継ぎ用に渡す）
  fallbackContractStartDate = null,
  fallbackContractEndDate = null,
  onStatusUpdated,
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(inquiry.status || 'new');
  const [adminNote, setAdminNote] = useState(inquiry.adminNote || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 表示用の契約期間: 自身に無ければ fallback
  const displayContractStart = inquiry.contractStartDate || fallbackContractStartDate;
  const displayContractEnd = inquiry.contractEndDate || fallbackContractEndDate;
  const isInheritedDates = !inquiry.contractStartDate && !!fallbackContractStartDate;

  const handleUpdateStatus = async () => {
    if (status === inquiry.status && adminNote === (inquiry.adminNote || '')) return;
    // §15: uid 未紐付けで 'active' 化はブロック（プラン反映できないため）
    if (status === 'active' && !inquiry.uid) {
      toast.error('ユーザーが未紐付けの状態では「契約中」に変更できません。先にユーザー作成・紐付けを行ってください。');
      return;
    }
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

      <DialogBody className="!overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(85vh - 140px)' }}>
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

          {/* §15: ユーザー未紐付け警告バナー（最上部に大きく表示） */}
          {!inquiry.uid && (
            <UnlinkedUserBanner
              inquiry={inquiry}
              onLinked={() => {
                if (onStatusUpdated) onStatusUpdated();
                onClose();
              }}
            />
          )}

          {/* 申込種別バッジ（v5.8.0 + §15 board_import） */}
          {(inquiry.inquiryType || inquiry.source === 'board_import') && (
            <div className="flex flex-wrap items-center gap-2">
              {inquiry.inquiryType && (
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  inquiry.inquiryType === 'addon_only'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {INQUIRY_TYPE_LABEL[inquiry.inquiryType] || inquiry.inquiryType}
                </span>
              )}
              {/* §15: board 取り込みバッジ */}
              {inquiry.source === 'board_import' && (
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" title="board で先行作成された見積から取り込まれた inquiry">
                  board 取り込み
                </span>
              )}
              {(Number(inquiry.extraSitesCount) || 0) > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  追加サイト: {inquiry.extraSitesCount}件
                  {/* addon_only は contractEndDate から再計算、それ以外は stored 値 */}
                  {(() => {
                    const months = inquiry.inquiryType === 'addon_only'
                      ? getAddonMonths(inquiry, fallbackContractEndDate)
                      : Number(inquiry.extraSitesMonths) || 0;
                    return months > 0 ? ` × ${months}ヶ月` : '';
                  })()}
                </span>
              )}
              {/* §21-C: renewal バッジ */}
              {inquiry.renewedFrom && (
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" title={`元 inquiry: ${inquiry.renewedFrom}`}>
                  更新（renewal）
                </span>
              )}
            </div>
          )}

          {/* 契約条件 */}
          <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
            <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">ご契約条件</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={labelClass}>支払い方法</div>
                <div className={valueClass}>{buildPaymentSummary(inquiry, fallbackContractEndDate)}</div>
              </div>
              <div>
                <div className={labelClass}>利用開始希望月</div>
                <div className={valueClass}>
                  {inquiry.startDatePref === 'preferred' && inquiry.startMonth
                    ? (() => { const [y, m] = inquiry.startMonth.split('-'); return `${y}年${parseInt(m)}月`; })()
                    : '希望なし（翌月1日）'}
                </div>
              </div>
              {displayContractStart && (
                <>
                  <div>
                    <div className={labelClass}>
                      契約開始日
                      {isInheritedDates && (
                        <span className="ml-1 text-[10px] text-purple-600">（メイン契約から継承）</span>
                      )}
                    </div>
                    <div className={valueClass}>{displayContractStart}</div>
                  </div>
                  <div>
                    <div className={labelClass}>契約終了日</div>
                    <div className={`${valueClass} ${inquiry.renewalAlert ? 'text-orange-600 font-semibold' : ''}`}>
                      {displayContractEnd}
                      {inquiry.renewalAlert && '（更新間近）'}
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

                {/* 見積書明細リスト（同期済みの場合） */}
                {Array.isArray(inquiry.boardEstimateDetails) && inquiry.boardEstimateDetails.length > 0 && (
                  <div className="mb-3 rounded border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
                    <div className={`${labelClass} mb-2`}>明細</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-body-color dark:text-dark-6">
                          <th className="py-1">品目</th>
                          <th className="py-1 text-right">単価</th>
                          <th className="py-1 text-right">数量</th>
                          <th className="py-1 text-right">小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inquiry.boardEstimateDetails.map((d, i) => (
                          <tr key={i} className="border-t border-stroke dark:border-dark-3">
                            <td className="py-1 text-dark dark:text-white">{d.description || '-'}</td>
                            <td className="py-1 text-right text-dark dark:text-white">¥{Number(d.unit_price || 0).toLocaleString()}</td>
                            <td className="py-1 text-right text-dark dark:text-white">{Number(d.quantity || 0)} {d.unit || ''}</td>
                            <td className="py-1 text-right font-medium text-dark dark:text-white">
                              ¥{(Number(d.unit_price || 0) * Number(d.quantity || 0)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
