import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';

/**
 * メモ履歴取得用カスタムフック
 * @param {string} userId - ユーザーID（未使用、互換性のため保持）
 * @param {string} siteId - サイトID
 * @param {string} pageType - ページタイプ
 * @param {number} limit - 取得件数（デフォルト: 5）
 */
export function useNoteHistory(userId, siteId, pageType, limit = 5) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!siteId || !pageType) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // 全ユーザーのメモを取得（siteId と pageType でフィルタ）
        const q = query(
          collection(db, 'sites', siteId, 'pageNotes'),
          where('pageType', '==', pageType)
        );
        
        const snapshot = await getDocs(q);
        let notes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // クライアント側で updatedAt の降順でソート
        notes.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
          return bTime - aTime; // 降順（新しい順）
        });
        
        if (limit) {
          notes = notes.slice(0, limit);
        }
        
        setHistory(notes);
      } catch (err) {
        console.error('Error fetching note history:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [siteId, pageType, limit]);

  // 履歴を再読み込み
  const reloadHistory = async () => {
    if (!siteId || !pageType) return;

    try {
      // 全ユーザーのメモを取得（siteId と pageType でフィルタ）
      const q = query(
        collection(db, 'sites', siteId, 'pageNotes'),
        where('pageType', '==', pageType)
      );
      
      const snapshot = await getDocs(q);
      let notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // クライアント側で updatedAt の降順でソート
      notes.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return bTime - aTime; // 降順（新しい順）
      });
      
      if (limit) {
        notes = notes.slice(0, limit);
      }
      
      setHistory(notes);
    } catch (err) {
      console.error('Error reloading history:', err);
      setError(err.message);
    }
  };

  return {
    history,
    isLoading,
    error,
    reloadHistory
  };
}
