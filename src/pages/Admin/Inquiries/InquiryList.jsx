import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminInquiries } from '../../../hooks/useAdminInquiries';
import InquiryDetailModal from '../../../components/Admin/InquiryDetailModal';
import BoardImportModal from '../../../components/Admin/BoardImportModal';
import InquirySummaryPanel from '../../../components/Admin/InquirySummaryPanel';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Clock, Download, Trash2, ExternalLink, RefreshCw, Plus, LayoutDashboard, List } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import {
  STATUS_OPTIONS,
  STATUS_LABEL,
  PAYMENT_LABEL,
  formatDate,
} from './inquiryConstants';

export default function InquiryList() {
  const { inquiries, pagination, stats, loading, error, refetch, setParams, currentParams } = useAdminInquiries();
  const [searchInput, setSearchInput] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [showBoardImportModal, setShowBoardImportModal] = useState(false);

  // タブ (URL パラメータと連動)
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'summary' ? 'summary' : 'list';
  const [activeTab, setActiveTab] = useState(initialTab);
  // タブ変更時に URL パラメータを反映 (履歴を汚さないため replace)
  useEffect(() => {
    const current = searchParams.get('tab');
    if (activeTab === 'summary' && current !== 'summary') {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'summary');
      setSearchParams(next, { replace: true });
    } else if (activeTab === 'list' && current === 'summary') {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleJumpToList = (statusFilter) => {
    setActiveTab('list');
    setParams({ statusFilter, page: 1 });
  };

  const handleJumpToUnlinked = () => {
    setActiveTab('list');
    setParams({ statusFilter: 'all', page: 1 });
    toast('未紐付けは「未紐付け」バッジで識別できます');
  };

  // boardProjectId → {start, end} の lookup を作成
  // addon_only など契約期間を持たない inquiry が、同じ案件の他 inquiry から
  // 契約期間を引き継いで表示できるようにするための fallback
  const contractDatesByProject = useMemo(() => {
    const map = new Map();
    for (const i of inquiries || []) {
      const pid = i.boardProjectId;
      if (!pid) continue;
      if (!i.contractStartDate && !i.contractEndDate) continue;
      const existing = map.get(pid);
      // 既に登録済みなら、より新しい (statusUpdatedAt) を優先
      if (existing) {
        const existingTime = existing._sortKey || 0;
        const currentTime = new Date(i.statusUpdatedAt || i.createdAt || 0).getTime();
        if (currentTime <= existingTime) continue;
      }
      map.set(pid, {
        contractStartDate: i.contractStartDate || null,
        contractEndDate: i.contractEndDate || null,
        _sortKey: new Date(i.statusUpdatedAt || i.createdAt || 0).getTime(),
      });
    }
    return map;
  }, [inquiries]);

  // inquiry の表示用契約期間を取得（自身に無ければ boardProjectId 経由でフォールバック）
  const getDisplayContractDates = (inquiry) => {
    if (inquiry.contractStartDate || inquiry.contractEndDate) {
      return {
        contractStartDate: inquiry.contractStartDate || null,
        contractEndDate: inquiry.contractEndDate || null,
      };
    }
    if (inquiry.boardProjectId) {
      const fallback = contractDatesByProject.get(inquiry.boardProjectId);
      if (fallback) {
        return {
          contractStartDate: fallback.contractStartDate,
          contractEndDate: fallback.contractEndDate,
        };
      }
    }
    return { contractStartDate: null, contractEndDate: null };
  };

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

      {/* タブ切替 (サマリー / 一覧) */}
      <div className="mb-4 inline-flex rounded-lg border border-stroke bg-white p-1 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
            activeTab === 'summary'
              ? 'bg-primary text-white shadow'
              : 'text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          サマリー
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
            activeTab === 'list'
              ? 'bg-primary text-white shadow'
              : 'text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white'
          }`}
        >
          <List className="h-4 w-4" />
          一覧
        </button>
      </div>

      {/* サマリータブ */}
      {activeTab === 'summary' && (
        <InquirySummaryPanel
          inquiries={inquiries}
          stats={stats}
          onJumpToList={handleJumpToList}
          onJumpToUnlinked={handleJumpToUnlinked}
          onOpenDetail={handleOpenDetail}
        />
      )}

      {/* 一覧タブ (既存 UI) */}
      {activeTab === 'list' && (
      <>
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
                className="min-w-[180px]"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 data-slot="icon" />
                {isDeleting ? '削除中...' : `${selectedIds.size}件を削除`}
              </Button>
            )}
            {/* §15: board 取り込みボタン */}
            <Button
              variant="primary"
              className="min-w-[180px]"
              onClick={() => setShowBoardImportModal(true)}
              title="board で先行作成された見積を grow-reporter に取り込みます"
            >
              <Plus data-slot="icon" />
              board から取り込み
            </Button>
            {/* CSVエクスポート */}
            <Button
              variant="secondary"
              className="min-w-[180px]"
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-dark dark:text-white">{inquiry.companyName || '-'}</span>
                      {(() => {
                        const type = inquiry.inquiryType || 'new_business';
                        if (type === 'addon_only') {
                          return (
                            <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" title="サイト追加オプション">
                              + 追加サイト{(Number(inquiry.extraSitesCount) || 0) > 0 ? ` ×${inquiry.extraSitesCount}` : ''}
                            </span>
                          );
                        }
                        // new_business: 追加サイト数があれば併記
                        const extras = Number(inquiry.extraSitesCount) || 0;
                        return (
                          <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" title="新規ビジネスプラン申込">
                            メイン契約{extras > 0 ? ` + 追加×${extras}` : ''}
                          </span>
                        );
                      })()}
                      {/* §15: board 取り込みバッジ */}
                      {inquiry.source === 'board_import' && (
                        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" title="board から取り込まれた inquiry">
                          board 取り込み
                        </span>
                      )}
                      {/* §15: ユーザー未紐付け警告 */}
                      {!inquiry.uid && (
                        <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" title="grow-reporter ユーザーが紐付けされていません">
                          未紐付け
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-dark dark:text-white">{`${inquiry.lastName || ''} ${inquiry.firstName || ''}`.trim() || '-'}</div>
                    <div className="text-xs text-body-color dark:text-dark-6">{inquiry.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-dark dark:text-white">
                    {PAYMENT_LABEL[inquiry.paymentTiming] || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-body-color dark:text-dark-6">
                    {(() => {
                      // addon_only など、自身に契約期間が無い場合は同じ boardProjectId の
                      // メイン契約 inquiry から fallback で表示
                      const { contractStartDate, contractEndDate } = getDisplayContractDates(inquiry);
                      if (contractStartDate && contractEndDate) {
                        return (
                          <div>
                            <div>{contractStartDate}</div>
                            <div>〜 {contractEndDate}</div>
                          </div>
                        );
                      }
                      return '-';
                    })()}
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
      </>
      )}

      {/* §15: board 取り込みモーダル */}
      <BoardImportModal
        isOpen={showBoardImportModal}
        onClose={() => setShowBoardImportModal(false)}
        onImported={() => {
          setShowBoardImportModal(false);
          refetch();
        }}
      />

      {/* 詳細モーダル */}
      {showDetailModal && selectedInquiry && (() => {
        // addon_only 等で契約期間が直接無くても、同じ boardProjectId の他 inquiry から
        // fallback で取得して詳細モーダルに渡す
        const fallback = getDisplayContractDates(selectedInquiry);
        return (
          <InquiryDetailModal
            isOpen={showDetailModal}
            onClose={() => { setShowDetailModal(false); setSelectedInquiry(null); }}
            inquiry={selectedInquiry}
            fallbackContractStartDate={fallback.contractStartDate}
            fallbackContractEndDate={fallback.contractEndDate}
            onStatusUpdated={refetch}
          />
        );
      })()}
    </div>
  );
}
