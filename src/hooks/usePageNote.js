import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * ページメモ管理用カスタムフック
 * @param {string} userId - ユーザーID
 * @param {string} siteId - サイトID
 * @param {string} pageType - ページタイプ（例: "dashboard", "analysis/day"）
 * @param {object} dateRange - 対象期間 { from, to }
 */
export function usePageNote(userId, siteId, pageType, dateRange) {
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // メモを取得（無効化：入力エリアは常に空の状態）
  useEffect(() => {
    // 既存メモは読み込まない（各メモは独立した投稿として履歴に表示）
    setNote(null);
    setIsLoading(false);
  }, [userId, siteId, pageType, dateRange?.from, dateRange?.to]);

  // メモを保存
  const saveNote = async (content, userInfo) => {
    if (!userId || !siteId || !pageType || !dateRange?.from || !dateRange?.to) {
      throw new Error('必要な情報が不足しています');
    }

    try {
      setIsSaving(true);
      setError(null);

      const noteData = {
        userId,
        siteId,
        pageType,
        dateRange: {
          from: dateRange.from,
          to: dateRange.to
        },
        content,
        updatedAt: serverTimestamp()
      };

      // ユーザー情報を追加（存在する場合）
      if (userInfo) {
        if (userInfo.firstName) noteData.userFirstName = userInfo.firstName;
        if (userInfo.lastName) noteData.userLastName = userInfo.lastName;
        if (userInfo.displayName) noteData.userDisplayName = userInfo.displayName;
        if (userInfo.photoURL) noteData.userPhotoURL = userInfo.photoURL;
      }

      // 常に新規メモとして作成（上書きしない）
      noteData.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, 'sites', siteId, 'pageNotes'), noteData);
      
      // note 状態は更新しない（入力エリアは常に空の状態を保つ）
      // setNote({ id: docRef.id, ...noteData });

      return true;
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // メモを削除
  const deleteNote = async () => {
    if (!note?.id) return;

    try {
      setIsSaving(true);
      await deleteDoc(doc(db, 'sites', siteId, 'pageNotes', note.id));
      setNote(null);
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    note,
    isLoading,
    isSaving,
    error,
    saveNote,
    deleteNote
  };
}
