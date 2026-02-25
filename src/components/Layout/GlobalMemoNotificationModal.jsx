import React from 'react';
import { X, FileText, Globe } from 'lucide-react';
import { getPageTypeLabel } from '../../constants/pageTypes';

/**
 * グローバルメモ通知モーダル
 * 全サイトの未読メモを表示し、サイト名付きで一覧表示
 */
export default function GlobalMemoNotificationModal({ isOpen, onClose, unreadMemos, onMarkAllAsRead }) {
  if (!isOpen) return null;

  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead();
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
            メモ通知
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="max-h-[500px] overflow-y-auto p-4">
          {unreadMemos.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-2 h-12 w-12 text-body-color/30" />
              <p className="text-sm text-body-color">新しい通知はありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unreadMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-dark"
                >
                  {/* サイト名 */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {memo.siteName}
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
          {unreadMemos.length > 0 && (
            <div className="mb-3 text-center text-xs text-body-color">
              {unreadMemos.length}件の未読メモ
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              閉じる
            </button>
            {unreadMemos.length > 0 && (
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
