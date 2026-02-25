import React from 'react';
import { Calendar, Clock, Edit2, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * メモ履歴カードコンポーネント
 */
export default function NoteHistoryCard({ note, onEdit, onDelete, onCopy }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'yyyy/MM/dd HH:mm', { locale: ja });
  };

  const formatDateRange = (dateRange) => {
    if (!dateRange?.from || !dateRange?.to) return '';
    return `${dateRange.from} 〜 ${dateRange.to}`;
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-3 transition-shadow hover:shadow-sm dark:border-dark-3 dark:bg-dark-2">
      {/* 期間 */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-dark dark:text-white">
          {formatDateRange(note.dateRange)}
        </span>
      </div>

      {/* メモ内容 */}
      <p className="mb-2 text-xs leading-relaxed text-body-color line-clamp-2">
        {note.content}
      </p>

      {/* ユーザー情報と更新日時 */}
      <div className="mb-2 flex items-center gap-2">
        {note.userPhotoURL ? (
          <img
            src={note.userPhotoURL}
            alt={note.userLastName && note.userFirstName ? `${note.userLastName} ${note.userFirstName}` : note.userDisplayName || 'ユーザー'}
            className="h-5 w-5 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {note.userLastName?.charAt(0) || note.userDisplayName?.charAt(0) || 'U'}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-body-color">
          <span className="font-medium">
            {note.userLastName && note.userFirstName
              ? `${note.userLastName} ${note.userFirstName}`
              : note.userDisplayName || 'ユーザー'}
          </span>
          <span>•</span>
          <Clock className="h-3 w-3" />
          <span>{formatDate(note.updatedAt || note.createdAt)}</span>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-end gap-0.5">
        <button
          onClick={() => onCopy(note)}
          className="rounded p-1 text-body-color transition hover:bg-gray-100 hover:text-primary dark:hover:bg-dark-3"
          title="現在の期間にコピー"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onEdit(note)}
          className="rounded p-1 text-body-color transition hover:bg-gray-100 hover:text-primary dark:hover:bg-dark-3"
          title="編集"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(note)}
          className="rounded p-1 text-body-color transition hover:bg-gray-100 hover:text-red-600 dark:hover:bg-dark-3"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
