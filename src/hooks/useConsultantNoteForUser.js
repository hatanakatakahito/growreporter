import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';

/**
 * ユーザー向けコンサルタントメモ取得フック（読み取り専用）
 * @param {string} userId - サイト所有者のユーザーID
 * @param {string} siteId - サイトID
 * @param {string} pageType - ページタイプ
 * @param {object} dateRange - 対象期間 { from, to }
 */
export function useConsultantNoteForUser(userId, siteId, pageType, dateRange) {
  const [consultantNote, setConsultantNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConsultantNote = async () => {
      if (!userId || !siteId || !pageType || !dateRange?.from || !dateRange?.to) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // コンサルタントメモのみを取得
        const q = query(
          collection(db, 'sites', siteId, 'pageNotes'),
          where('userId', '==', userId),
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
          setConsultantNote({
            id: matchingNote.id,
            ...matchingNote.data()
          });
        } else {
          setConsultantNote(null);
        }
      } catch (err) {
        console.error('Error fetching consultant note:', err);
        setConsultantNote(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultantNote();
  }, [userId, siteId, pageType, dateRange?.from, dateRange?.to]);

  return {
    consultantNote,
    isLoading
  };
}
