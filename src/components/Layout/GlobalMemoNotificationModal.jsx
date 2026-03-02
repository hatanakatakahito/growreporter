import React, { useState } from 'react';
import { X, FileText, Globe, Bell, AlertTriangle } from 'lucide-react';
import { getPageTypeLabel } from '../../constants/pageTypes';

/**
 * グローバル通知モーダル
 * メモ通知とアラート通知をタブ切り替えで表示
 */
export default function GlobalMemoNotificationModal({
  isOpen,
  onClose,
  unreadMemos = [],
  onMarkAllAsRead,
  unreadAlerts = [],
  onMarkAllAlertsAsRead,
}) {
  const [activeTab, setActiveTab] = useState('all');

  if (!isOpen) return null;

  const handleMarkAllAsRead = async () => {
    try {
      const promises = [];
      if (onMarkAllAsRead && unreadMemos.length > 0) promises.push(onMarkAllAsRead());
      if (onMarkAllAlertsAsRead && unreadAlerts.length > 0) promises.push(onMarkAllAlertsAsRead());
      await Promise.all(promises);
      onClose();
    } catch (error) {
      console.error('既読マーク失敗:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateRange = (dateRange) => {
    if (!dateRange?.from || !dateRange?.to) return '';
    return `${dateRange.from} 〜 ${dateRange.to}`;
  };

  const getUserName = (memo) => {
    if (memo.userLastName && memo.userFirstName) {
      return `${memo.userLastName} ${memo.userFirstName}`;
    }
    return memo.userDisplayName || 'ユーザー';
  };

  const truncateContent = (content, maxLength = 100) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // フィルタリング
  const displayMemos = activeTab === 'all' || activeTab === 'memo' ? unreadMemos : [];
  const displayAlerts = activeTab === 'all' || activeTab === 'alert' ? unreadAlerts : [];
  const totalCount = unreadMemos.length + unreadAlerts.length;
  const hasItems = displayMemos.length > 0 || displayAlerts.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-stroke p-4 dark:border-dark-3">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            通知
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-stroke dark:border-dark-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'all'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-dark dark:hover:text-white'
            }`}
          >
            すべて ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('alert')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'alert'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-dark dark:hover:text-white'
            }`}
          >
            アラート ({unreadAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab('memo')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition ${
              activeTab === 'memo'
                ? 'border-b-2 border-primary text-primary'
                : 'text-body-color hover:text-dark dark:hover:text-white'
            }`}
          >
            メモ ({unreadMemos.length})
          </button>
        </div>

        {/* コンテンツ */}
        <div className="max-h-[500px] overflow-y-auto p-4">
          {!hasItems ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-12 w-12 text-body-color/30" />
              <p className="text-sm text-body-color">新しい通知はありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* アラート通知 */}
              {displayAlerts.map((alert) => (
                <div
                  key={`alert-${alert.id}`}
                  className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10"
                >
                  {/* サイト名 + アラートバッジ */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {alert.siteName}
                    </span>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      アラート
                    </span>
                  </div>

                  {/* アラートタイトル */}
                  <div className="mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="text-sm font-medium text-dark dark:text-white">
                      {alert.title || alert.type || 'アラート'}
                    </span>
                  </div>

                  {/* アラート内容 */}
                  {alert.message && (
                    <p className="text-xs leading-relaxed text-body-color">
                      {truncateContent(alert.message, 100)}
                    </p>
                  )}

                  {/* 日時 */}
                  <p className="mt-1 text-[10px] text-body-color/60">
                    {formatDate(alert.createdAt)}
                  </p>
                </div>
              ))}

              {/* メモ通知 */}
              {displayMemos.map((memo) => (
                <div
                  key={`memo-${memo.id}`}
                  className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-dark"
                >
                  {/* サイト名 */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {memo.siteName}
                    </span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      メモ
                    </span>
                  </div>

                  {/* ユーザー情報 */}
                  <div className="mb-2 flex items-center gap-2">
                    {memo.userPhotoURL ? (
                      <img
                        src={memo.userPhotoURL}
                        alt={getUserName(memo)}
                        className="h-6 w-6 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {memo.userLastName?.charAt(0) || memo.userDisplayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-dark dark:text-white">
                        {getUserName(memo)}
                      </span>
                      <span className="ml-2 text-xs text-body-color">
                        {formatDate(memo.updatedAt || memo.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* ページ情報 */}
                  <div className="mb-1 flex items-center gap-2 text-xs text-body-color">
                    <FileText className="h-3 w-3" />
                    <span className="font-medium">{getPageTypeLabel(memo.pageType)}</span>
                    {formatDateRange(memo.dateRange) && (
                      <>
                        <span>•</span>
                        <span>{formatDateRange(memo.dateRange)}</span>
                      </>
                    )}
                  </div>

                  {/* メモ内容 */}
                  <p className="text-xs leading-relaxed text-body-color">
                    {truncateContent(memo.content, 100)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-stroke p-4 dark:border-dark-3">
          {totalCount > 0 && (
            <div className="mb-3 text-center text-xs text-body-color">
              {totalCount}件の未読通知
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              閉じる
            </button>
            {totalCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
              >
                すべて既読にする
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
