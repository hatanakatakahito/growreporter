import React from 'react';
import { FileText } from 'lucide-react';
import { getPageTypeLabel } from '../../constants/pageTypes';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * メモ通知モーダルコンポーネント
 */
export default function MemoNotificationModal({ isOpen, onClose, unreadMemos, onMarkAsRead }) {
  const handleMarkAsRead = async () => {
    // 「既読にする」ボタンをクリックした時に既読マーク
    try {
      await onMarkAsRead();
      // 既読後はモーダルを閉じる
      onClose();
    } catch (error) {
      console.error('既読マーク失敗:', error);
      alert('既読マークに失敗しました');
    }
  };

  const handleClose = () => {
    // モーダルを閉じるだけ（既読マークはつけない）
    onClose();
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
    <Dialog open={isOpen} onClose={handleClose} size="md">
      <DialogTitle>メモ通知</DialogTitle>

      <DialogBody>
        <div className="max-h-[500px] overflow-y-auto">
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
                    <span>•</span>
                    <span>{formatDateRange(memo.dateRange)}</span>
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

        {unreadMemos.length > 0 && (
          <div className="mt-3 text-center text-xs text-body-color">
            {unreadMemos.length}件の未読メモ
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button plain onClick={handleClose}>閉じる</Button>
        {unreadMemos.length > 0 && (
          <Button color="blue" onClick={handleMarkAsRead}>
            すべて既読にする
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
