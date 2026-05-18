import { useMemo } from 'react';
import { AlertTriangle, Clock, Download, Link2Off, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { STATUS_LABEL, STATUS_BADGE, formatDate } from '../../pages/Admin/Inquiries/inquiryConstants';

/**
 * `/admin/inquiries` サマリータブの内容
 *
 * 業務オペレーション集計:
 *  - ステータス別件数 (一覧タブにジャンプ可能)
 *  - 要フォロー (estimate_created で 14 日以上停滞)
 *  - 契約終了 2 ヶ月以内 (renewal 候補)
 *  - 直近 30 日 board 取込件数
 *  - uid 未紐付け件数
 *
 * @param {Array} inquiries - 現在ページの inquiries (詳細リスト用)
 * @param {Object} stats - 全件集計値 ({ statusCounts, recentImportCount, unlinkedCount, needsAction, renewalSoon })
 * @param {(filter: string) => void} onJumpToList - statusFilter を指定して一覧タブに遷移するコールバック
 * @param {() => void} onJumpToUnlinked - uid 未紐付け抽出表示
 * @param {(inquiry: Object) => void} onOpenDetail - inquiry 詳細モーダルを開く
 */
export default function InquirySummaryPanel({
  inquiries = [],
  stats = {},
  onJumpToList,
  onJumpToUnlinked,
  onOpenDetail,
}) {
  const statusCounts = stats.statusCounts || {};
  const recentImportCount = stats.recentImportCount || 0;
  const unlinkedCount = stats.unlinkedCount || 0;

  // 要フォロー: estimate_created で alertLevel が warning/danger の inquiry
  const needsActionList = useMemo(() => {
    return (inquiries || [])
      .filter(i => i.status === 'estimate_created' && (i.alertLevel === 'warning' || i.alertLevel === 'danger'))
      .slice(0, 5);
  }, [inquiries]);

  // 契約終了が近い: renewalAlert=true
  const renewalList = useMemo(() => {
    return (inquiries || [])
      .filter(i => i.renewalAlert)
      .slice(0, 5);
  }, [inquiries]);

  // statusFilter ボタンの定義
  const statusButtons = [
    { value: 'new', label: '新規', count: statusCounts.new || 0 },
    { value: 'estimate_created', label: '見積作成済み', count: statusCounts.estimate_created || 0 },
    { value: 'contract_sent', label: '契約書送付済み', count: statusCounts.contract_sent || 0 },
    { value: 'active', label: '契約中', count: statusCounts.active || 0 },
    { value: 'cancelled', label: '解約', count: statusCounts.cancelled || 0 },
    { value: 'inquiry_cancelled', label: '申込キャンセル', count: statusCounts.inquiry_cancelled || 0 },
  ];

  function daysSince(isoString) {
    if (!isoString) return null;
    try {
      const updated = new Date(isoString);
      if (Number.isNaN(updated.getTime())) return null;
      return Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-4">
      {/* ステータス別件数 */}
      <div className="rounded-lg border border-stroke bg-white p-5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-3 text-sm font-semibold text-dark dark:text-white">
          ステータス別件数 (クリックで一覧へ)
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {statusButtons.map(btn => (
            <button
              key={btn.value}
              type="button"
              onClick={() => onJumpToList?.(btn.value)}
              className={`flex flex-col items-start rounded-lg border border-stroke px-3 py-3 text-left transition hover:border-primary hover:bg-primary/5 dark:border-dark-3 dark:hover:bg-dark-3 ${
                btn.count === 0 ? 'opacity-60' : ''
              }`}
            >
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[btn.value] || ''}`}>
                {STATUS_LABEL[btn.value] || btn.label}
              </span>
              <span className="mt-2 text-xl font-bold text-dark dark:text-white">
                {btn.count.toLocaleString()}
              </span>
              <span className="text-[10px] text-body-color dark:text-dark-6">件</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2 段組: 要フォロー / 契約終了が近い */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 要フォロー */}
        <div className="rounded-lg border border-stroke bg-white p-5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-dark dark:text-white">
                要フォロー (見積作成済から経過)
              </h3>
            </div>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {(stats.needsAction || 0).toLocaleString()} 件
            </span>
          </div>
          {needsActionList.length === 0 ? (
            <p className="text-xs text-body-color dark:text-dark-6">
              {(stats.needsAction || 0) > 0
                ? '※ 詳細は一覧タブの「見積作成済み」フィルタを参照'
                : '対象なし'}
            </p>
          ) : (
            <ul className="space-y-2">
              {needsActionList.map(i => {
                const days = daysSince(i.statusUpdatedAt || i.createdAt);
                return (
                  <li
                    key={i.id}
                    className="flex items-center justify-between rounded border border-stroke px-3 py-2 dark:border-dark-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-dark dark:text-white">
                        {i.companyName || '-'}
                      </div>
                      <div className="truncate text-xs text-body-color dark:text-dark-6">
                        {days !== null ? `${days} 日経過` : '-'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenDetail?.(i)}
                      className="ml-2 inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                    >
                      詳細 <ArrowRight className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {needsActionList.length > 0 && (
            <button
              type="button"
              onClick={() => onJumpToList?.('estimate_created')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              一覧で見る <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* 契約終了が近い (renewal 候補) */}
        <div className="rounded-lg border border-stroke bg-white p-5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-dark dark:text-white">
                契約終了 2 ヶ月以内 (renewal 候補)
              </h3>
            </div>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              {(stats.renewalSoon || 0).toLocaleString()} 件
            </span>
          </div>
          {renewalList.length === 0 ? (
            <p className="text-xs text-body-color dark:text-dark-6">
              {(stats.renewalSoon || 0) > 0
                ? '※ 詳細は一覧タブの「契約中」フィルタを参照'
                : '対象なし'}
            </p>
          ) : (
            <ul className="space-y-2">
              {renewalList.map(i => (
                <li
                  key={i.id}
                  className="flex items-center justify-between rounded border border-stroke px-3 py-2 dark:border-dark-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-dark dark:text-white">
                      {i.companyName || '-'}
                    </div>
                    <div className="truncate text-xs text-body-color dark:text-dark-6">
                      契約終了: {formatDate(i.contractEndDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDetail?.(i)}
                    className="ml-2 inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                  >
                    詳細 <ArrowRight className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {renewalList.length > 0 && (
            <button
              type="button"
              onClick={() => onJumpToList?.('active')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              一覧で見る <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 取込・整理 */}
      <div className="rounded-lg border border-stroke bg-white p-5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-3 text-sm font-semibold text-dark dark:text-white">
          board 取込・整理
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-stroke px-4 py-3 dark:border-dark-3">
            <div className="flex items-center gap-2 text-xs text-body-color dark:text-dark-6">
              <Download className="h-3.5 w-3.5" />
              直近 30 日 board 取込
            </div>
            <div className="mt-1 text-2xl font-bold text-dark dark:text-white">
              {recentImportCount.toLocaleString()} <span className="text-sm font-normal text-body-color">件</span>
            </div>
          </div>
          <div className="rounded border border-stroke px-4 py-3 dark:border-dark-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-body-color dark:text-dark-6">
                  <Link2Off className="h-3.5 w-3.5" />
                  uid 未紐付け
                </div>
                <div className="mt-1 text-2xl font-bold text-dark dark:text-white">
                  {unlinkedCount.toLocaleString()} <span className="text-sm font-normal text-body-color">件</span>
                </div>
              </div>
              {unlinkedCount > 0 && (
                <Button variant="secondary" size="sm" onClick={() => onJumpToUnlinked?.()}>
                  整理する
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
