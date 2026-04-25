import { useState } from 'react';
import { useAdminInquiries } from '../../../hooks/useAdminInquiries';
import InquiryDetailModal from '../../../components/Admin/InquiryDetailModal';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Clock, Download, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';

const STATUS_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'new', label: '新規' },
  { value: 'estimate_created', label: '見積作成済み' },
  { value: 'contract_sent', label: '契約書送付済み' },
  { value: 'active', label: '契約中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: '解約' },
  { value: 'inquiry_cancelled', label: '申込キャンセル' },
];

const STATUS_BADGE = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  estimate_created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  contract_sent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  active: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-dark-3 dark:text-dark-6',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  inquiry_cancelled: 'bg-gray-100 text-gray-500 dark:bg-dark-3 dark:text-dark-6',
};

const STATUS_LABEL = {
  new: '新規',
  estimate_created: '見積作成済み',
  contract_sent: '契約書送付済み',
  active: '契約中',
  completed: '完了',
  cancelled: '解約',
  inquiry_cancelled: '申込キャンセル',
};

const PAYMENT_LABEL = {
  bulk: '一括請求',
  recurring: '定期請求',
};

function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return '-'; }
}

export default function InquiryList() {
  const { inquiries, pagination, stats, loading, error, refetch, setParams, currentParams } = useAdminInquiries();
  const [searchInput, setSearchInput] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  const handleSearch = () => {
    setParams({ searchQuery: searchInput, page: 1 });
  };

  const handleStatusFilter = (status) => {
    setParams({ statusFilter: status, page: 1 });
  };

  const handlePageChange = (page) => {
    setParams({ page });
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === inquiries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inquiries.map(i => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size}件の問い合わせを削除しますか？この操作は取り消せません。`)) return;
    setIsDeleting(true);
    try {
      const deleteFn = httpsCallable(functions, 'deleteUpgradeInquiries');
      await deleteFn({ inquiryIds: Array.from(selectedIds) });
      toast.success(`${selectedIds.size}件を削除しました`);
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      toast.error(err.message || '削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInlineStatusChange = async (e, inquiry) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (newStatus === inquiry.status) return;
    if (newStatus === 'active' && !window.confirm('「契約中」に変更するとプランが自動的にBusinessに切り替わります。よろしいですか？')) {
      e.target.value = inquiry.status;
      return;
    }
    if (newStatus === 'cancelled' && !window.confirm('「解約」に変更するとプランが自動的に無料プランにダウングレードされます。よろしいですか？')) {
      e.target.value = inquiry.status;
      return;
    }
    setUpdatingStatusId(inquiry.id);
    try {
      const updateFn = httpsCallable(functions, 'updateInquiryStatus');
      await updateFn({ inquiryId: inquiry.id, status: newStatus });
      toast.success('ステータスを更新しました');
      refetch();
    } catch (err) {
      toast.error(err.message || 'ステータス更新に失敗しました');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSyncBoard = async (e, inquiry) => {
    e.stopPropagation();
    if (!inquiry.boardProjectId) return;
    setSyncingId(inquiry.id);
    try {
      const syncFn = httpsCallable(functions, 'syncBoardInquiry');
      await syncFn({ inquiryId: inquiry.id });
      toast.success('boardから同期しました');
      refetch();
    } catch (err) {
      toast.error(err.message || 'board同期に失敗しました');
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenDetail = (inquiry) => {
    setSelectedInquiry(inquiry);
    setShowDetailModal(true);
  };

  const handleExportCSV = () => {
    const csvHeaders = ['問い合わせ日', '組織名', '担当者', 'メール', '電話番号', '支払い方法', 'ステータス', '利用開始月', '契約開始日', '契約終了日'];
    const csvRows = inquiries.map(i => [
      formatDate(i.createdAt),
      i.companyName || '',
      `${i.lastName || ''} ${i.firstName || ''}`.trim(),
      i.email || '',
      i.phone || '',
      PAYMENT_LABEL[i.paymentTiming] || '',
      STATUS_LABEL[i.status] || i.status,
      i.startMonth || '',
      i.contractStartDate || '',
      i.contractEndDate || '',
    ]);
    const csvContent = [csvHeaders, ...csvRows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inquiries_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && inquiries.length === 0) {
    return <div className="flex min-h-[400px] items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error) {
    return <div className="flex min-h-[400px] items-center justify-center"><ErrorAlert message={error} onRetry={refetch} /></div>;
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">問い合わせ管理</h2>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">プランアップグレードの問い合わせ一覧</p>
      </div>

      {/* サマリーバッジ */}
      {(stats.needsAction > 0 || stats.renewalSoon > 0) && (
        <div className="mb-4 flex gap-3">
          {stats.needsAction > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              未送付警告: {stats.needsAction}件
            </div>
          )}
          {stats.renewalSoon > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
              <Clock className="h-4 w-4" />
              更新間近: {stats.renewalSoon}件
            </div>
          )}
        </div>
      )}

      {/* 検索・フィルタ */}
      <div className="mb-6 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* 検索 */}
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-body-color" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="組織名・担当者名・メールで検索..."
                className="w-full rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 text-sm transition-all duration-200 focus:border-primary-mid focus:outline-none focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:bg-dark dark:text-white"
              />
            </div>
            <Button variant="primary" size="lg" onClick={handleSearch}>
              検索
            </Button>
          </div>

          {/* ステータスフィルタ */}
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={currentParams.statusFilter === opt.value ? 'primary' : 'ghost'}
                onClick={() => handleStatusFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            {/* 一括削除 */}
            {selectedIds.size > 0 && (
              <Button
                variant="danger-outline"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 data-slot="icon" />
                {isDeleting ? '削除中...' : `${selectedIds.size}件を削除`}
              </Button>
            )}
            {/* CSVエクスポート */}
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              disabled={!inquiries || inquiries.length === 0}
            >
              <Download data-slot="icon" />
              CSVエクスポート
            </Button>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-2 border-primary-mid/20 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5">
            <tr>
              <th className="w-12 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={inquiries.length > 0 && selectedIds.size === inquiries.length}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-stroke accent-primary"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">日時</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">組織名</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark dark:text-white">担当者</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">支払い方法</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">契約期間</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">ステータス</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">board</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark dark:text-white">操作</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-body-color">
                  問い合わせがありません
                </td>
              </tr>
            ) : (
              inquiries.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  onClick={() => handleOpenDetail(inquiry)}
                  className={`cursor-pointer border-b border-stroke transition hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3 ${
                    inquiry.alertLevel === 'danger' ? 'bg-red-50/50 dark:bg-red-900/10' :
                    inquiry.alertLevel === 'warning' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                  }`}
                >
                  <td className="w-12 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inquiry.id)}
                      onChange={(e) => handleToggleSelect(inquiry.id, e)}
                      className="h-4 w-4 rounded border-stroke accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-body-color dark:text-dark-6">
                    {formatDate(inquiry.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-dark dark:text-white">{inquiry.companyName || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-dark dark:text-white">{`${inquiry.lastName || ''} ${inquiry.firstName || ''}`.trim() || '-'}</div>
                    <div className="text-xs text-body-color dark:text-dark-6">{inquiry.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-dark dark:text-white">
                    {PAYMENT_LABEL[inquiry.paymentTiming] || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-body-color dark:text-dark-6">
                    {inquiry.contractStartDate && inquiry.contractEndDate ? (
                      <div>
                        <div>{inquiry.contractStartDate}</div>
                        <div>〜 {inquiry.contractEndDate}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleInlineStatusChange(e, inquiry)}
                      disabled={updatingStatusId === inquiry.id}
                      className={`rounded-lg border border-stroke bg-transparent px-2.5 py-1 text-xs font-medium text-dark outline-none transition focus:border-primary cursor-pointer dark:border-dark-3 dark:bg-dark dark:text-white ${updatingStatusId === inquiry.id ? 'opacity-50' : ''}`}
                    >
                      {STATUS_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {inquiry.renewalAlert && (
                      <span className="ml-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                        更新間近
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      {inquiry.boardProjectId ? (
                        <>
                          <a
                            href={`https://the-board.jp/projects/${inquiry.boardProjectId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline"
                          >
                            連携済み
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={(e) => handleSyncBoard(e, inquiry)}
                            disabled={syncingId === inquiry.id}
                            title="boardから同期"
                            className="rounded p-0.5 text-body-color hover:text-primary hover:bg-primary/5 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingId === inquiry.id ? 'animate-spin' : ''}`} />
                          </button>
                        </>
                      ) : inquiry.boardError ? (
                        <span className="text-red-500">エラー</span>
                      ) : (
                        <span className="text-body-color">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleOpenDetail(inquiry); }}
                    >
                      詳細
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ページネーション */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-body-color">
          <span>{pagination.totalCount}件中 {(pagination.currentPage - 1) * pagination.limit + 1}〜{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}件</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft data-slot="icon" /> 前へ
            </Button>
            <span className="text-xs">{pagination.currentPage} / {pagination.totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              次へ <ChevronRight data-slot="icon" />
            </Button>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {showDetailModal && selectedInquiry && (
        <InquiryDetailModal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedInquiry(null); }}
          inquiry={selectedInquiry}
          onStatusUpdated={refetch}
        />
      )}
    </div>
  );
}
