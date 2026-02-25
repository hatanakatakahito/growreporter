import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

/**
 * 管理者用コンサルタントメモ管理フック
 * @param {string} siteId - サイトID
 * @param {string} siteOwnerId - サイト所有者のユーザーID
 * @param {string} pageType - ページタイプ（例: "dashboard", "analysis/day"）
 * @param {object} dateRange - 対象期間 { from, to }
 */
export function useConsultantNote(siteId, siteOwnerId, pageType, dateRange) {
  const { currentUser } = useAuth();
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 管理者権限チェック
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
        if (adminDoc.exists()) {
          const role = adminDoc.data()?.role;
          setIsAdmin(role === 'admin' || role === 'editor');
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [currentUser]);

  // コンサルタントメモを取得
  useEffect(() => {
    const fetchNote = async () => {
      if (!siteId || !siteOwnerId || !pageType || !dateRange?.from || !dateRange?.to || !isAdmin) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // isConsultantNote=true のメモを取得
        const q = query(
          collection(db, 'sites', siteId, 'pageNotes'),
          where('userId', '==', siteOwnerId),
          where('pageType', '==', pageType),
          where('isConsultantNote', '==', true)
        );
        
        const snapshot = await getDocs(q);
        
        // クライアント側で期間でフィルタリング
        const matchingNote = snapshot.docs.find(doc => {
          const data = doc.data();
          return data.dateRange?.from === dateRange.from && 
                 data.dateRange?.to === dateRange.to;
        });
        
        if (matchingNote) {
          setNote({
            id: matchingNote.id,
            ...matchingNote.data()
          });
        } else {
          setNote(null);
        }
      } catch (err) {
        console.error('Error fetching consultant note:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [siteId, siteOwnerId, pageType, dateRange?.from, dateRange?.to, isAdmin]);

  // コンサルタントメモを保存
  const saveNote = async (content) => {
    if (!currentUser || !siteId || !siteOwnerId || !pageType || !dateRange?.from || !dateRange?.to || !isAdmin) {
      throw new Error('必要な情報が不足しています、または管理者権限がありません');
    }

    try {
      setIsSaving(true);
      setError(null);

      // 管理者情報を取得
      const adminDoc = await getDoc(doc(db, 'adminUsers', currentUser.uid));
      const adminData = adminDoc.exists() ? adminDoc.data() : {};
      
      const consultantName = (adminData.lastName && adminData.firstName) 
        ? `${adminData.lastName} ${adminData.firstName}` 
        : (adminData.displayName || currentUser.displayName || currentUser.email || '管理者');

      const noteData = {
        userId: siteOwnerId,  // サイト所有者のID
        siteId,
        pageType,
        dateRange: {
          from: dateRange.from,
          to: dateRange.to
        },
        content,
        isConsultantNote: true,  // コンサルタントメモフラグ
        consultantId: currentUser.uid,
        consultantName,
        consultantPhotoURL: currentUser.photoURL || adminData.photoURL || '',
        updatedAt: serverTimestamp()
      };

      if (note?.id) {
        // 既存のメモを更新
        await updateDoc(doc(db, 'sites', siteId, 'pageNotes', note.id), noteData);
        setNote({ ...note, ...noteData });
      } else {
        // 新規メモを作成
        noteData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'sites', siteId, 'pageNotes'), noteData);
        setNote({ id: docRef.id, ...noteData });
      }

      return true;
    } catch (err) {
      console.error('Error saving consultant note:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // コンサルタントメモを削除
  const deleteNote = async () => {
    if (!note?.id || !isAdmin) return;

    try {
      setIsSaving(true);
      await deleteDoc(doc(db, 'sites', siteId, 'pageNotes', note.id));
      setNote(null);
      return true;
    } catch (err) {
      console.error('Error deleting consultant note:', err);
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
    deleteNote,
    isAdmin
  };
}
