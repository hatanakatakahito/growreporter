import React, { useState, useEffect } from 'react';
import { FileText, Save, ChevronDown, ChevronUp, UserCog } from 'lucide-react';
import { usePageNote } from '../../hooks/usePageNote';
import { useNoteHistory } from '../../hooks/useNoteHistory';
import { useConsultantNoteForUser } from '../../hooks/useConsultantNoteForUser';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import NoteHistoryCard from './NoteHistoryCard';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * ページメモセクションコンポーネント
 * @param {string} userId - ユーザーID
 * @param {string} siteId - サイトID
 * @param {string} pageType - ページタイプ
 * @param {object} dateRange - 対象期間
 */
export default function PageNoteSection({ userId, siteId, pageType, dateRange }) {
  const [content, setContent] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // 管理者権限チェック
  const { isAdminViewing, adminRole } = useSite();
  
  // 現在のユーザー情報を取得
  const { userProfile } = useAuth();
  
  // 閲覧者の場合は編集不可
  const memberRole = userProfile?.memberRole || 'owner';
  const canEdit = (!isAdminViewing || (isAdminViewing && adminRole !== 'viewer')) && memberRole !== 'viewer';

  const { note, isLoading, isSaving, error, saveNote } = usePageNote(
    userId,
    siteId,
    pageType,
    dateRange
  );

  const historyLimit = showAllHistory ? 50 : 5;
  const { history, isLoading: historyLoading, reloadHistory } = useNoteHistory(
    userId,
    siteId,
    pageType,
    historyLimit
  );
  
  // コンサルタントメモを取得（読み取り専用）
  const { consultantNote, isLoading: consultantNoteLoading } = useConsultantNoteForUser(
    userId,
    siteId,
    pageType,
    dateRange
  );

  // メモ入力エリアは常に空の状態（既存メモを読み込まない）
  // 各メモは独立した投稿として扱い、履歴に表示される

  // 保存処理
  const handleSave = async () => {
    if (!content.trim()) {
      alert('メモ内容を入力してください');
      return;
    }

    try {
      // ユーザー情報を渡す（常に新規メモとして作成）
      await saveNote(content, userProfile);
      // テキストフィールドをクリア
      setContent('');
      // 履歴を再読み込みして自動表示
      await reloadHistory();
      setShowHistory(true);
    } catch (err) {
      alert('メモの保存に失敗しました: ' + err.message);
    }
  };


  // 履歴からコピー
  const handleCopyFromHistory = (historyNote) => {
    setContent(historyNote.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 履歴の編集（別の期間のメモを編集）
  const handleEditHistory = (historyNote) => {
    if (!confirm('この履歴メモを編集しますか？\n※対象期間が異なる場合、その期間のメモが更新されます。')) return;
    
    const newContent = prompt('メモ内容を編集:', historyNote.content);
    if (newContent === null) return;
    
    // 履歴メモを更新
    updateHistoryNote(historyNote.id, newContent);
  };

  // 履歴メモの更新
  const updateHistoryNote = async (noteId, newContent) => {
    try {
      const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'sites', siteId, 'pageNotes', noteId), {
        content: newContent,
        updatedAt: serverTimestamp()
      });
      await reloadHistory();
      alert('履歴メモを更新しました');
    } catch (err) {
      alert('履歴メモの更新に失敗しました: ' + err.message);
    }
  };

  // 履歴の削除
  const handleDeleteHistory = async (historyNote) => {
    if (!confirm('この履歴メモを削除してもよろしいですか？')) return;

    try {
      await deleteDoc(doc(db, 'sites', siteId, 'pageNotes', historyNote.id));
      await reloadHistory();
    } catch (err) {
      alert('履歴メモの削除に失敗しました: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center justify-center py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="ml-2 text-xs text-body-color">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* メモ入力エリア */}
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-dark dark:text-white">
            あなたのメモ
          </h3>
          <span className="text-xs text-body-color">
            ({dateRange?.from} 〜 {dateRange?.to})
          </span>
          {isAdminViewing && adminRole === 'viewer' && (
            <span className="text-xs text-orange-600">（閲覧のみ）</span>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={canEdit ? "この期間に関するメモを入力してください..." : "閲覧専用モード"}
          className="mb-3 min-h-[80px] w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
          disabled={isSaving || !canEdit}
          readOnly={!canEdit}
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-body-color transition hover:text-primary"
          >
            {showHistory ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                履歴を非表示
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                履歴を表示
              </>
            )}
            {history.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                {history.length}
              </span>
            )}
          </button>

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? '保存中...' : '保存'}
            </button>
          )}
        </div>
      </div>

      {/* メモ履歴 */}
      {showHistory && (
        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
          <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
            メモ履歴
          </h4>

          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="ml-2 text-xs text-body-color">読み込み中...</span>
            </div>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-xs text-body-color">
              履歴はまだありません
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {history.map((historyNote) => (
                  <NoteHistoryCard
                    key={historyNote.id}
                    note={historyNote}
                    onCopy={handleCopyFromHistory}
                    onEdit={handleEditHistory}
                    onDelete={handleDeleteHistory}
                  />
                ))}
              </div>

              {history.length >= 5 && !showAllHistory && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowAllHistory(true)}
                    className="text-xs text-primary transition hover:underline"
                  >
                    すべての履歴を表示
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* コンサルタントメモ（読み取り専用） */}
      {consultantNoteLoading ? (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-900/20">
          <div className="flex items-center justify-center py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <span className="ml-2 text-xs text-purple-700 dark:text-purple-300">読み込み中...</span>
          </div>
        </div>
      ) : consultantNote ? (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-900/20">
          <div className="mb-3 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-semibold text-purple-900 dark:text-purple-100">
              コンサルタントメモ
            </h3>
            <span className="text-xs text-purple-600 dark:text-purple-400">
              （読み取り専用）
            </span>
          </div>
          
          <div className="mb-3 rounded-lg bg-white p-3 text-sm text-dark dark:bg-dark dark:text-white">
            {consultantNote.content}
          </div>
          
          <div className="flex items-center gap-2">
            {consultantNote.consultantPhotoURL ? (
              <img
                src={consultantNote.consultantPhotoURL}
                alt={consultantNote.consultantName}
                className="h-6 w-6 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs font-semibold text-purple-700 dark:bg-purple-800 dark:text-purple-200">
                {consultantNote.consultantName?.charAt(0) || 'C'}
              </div>
            )}
            <div className="text-xs text-purple-700 dark:text-purple-300">
              <span className="font-medium">{consultantNote.consultantName || 'コンサルタント'}</span>
              {consultantNote.updatedAt && (
                <span className="ml-2">
                  • {consultantNote.updatedAt?.toDate?.().toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
