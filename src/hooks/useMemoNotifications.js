import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * メモ通知管理用カスタムフック
 * @param {string} currentUserId - 現在のユーザーID
 * @param {string} siteId - サイトID
 * @param {boolean} isAdminViewing - 管理者として他人のサイトを閲覧中か
 */
export function useMemoNotifications(currentUserId, siteId, isAdminViewing = false) {
  const [unreadMemos, setUnreadMemos] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastReadAt, setLastReadAt] = useState(null);

  useEffect(() => {
    // 管理者として他人のサイトを閲覧中は通知を表示しない
    if (!currentUserId || !siteId || isAdminViewing) {
      setUnreadMemos([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    let unsubscribeMemos = null;
    let unsubscribeStatus = null;

    const setupListeners = async () => {
      try {
        // 1. 既読状態を取得または初期化
        const statusDocId = `${currentUserId}_${siteId}`;
        const statusRef = doc(db, 'users', currentUserId, 'memoReadStatus', statusDocId);
        const statusDoc = await getDoc(statusRef);

        let currentLastReadAt;
        
        if (!statusDoc.exists()) {
          // 初回の場合は現在時刻を設定（過去のメモは未読としない）
          currentLastReadAt = new Date();
          await setDoc(statusRef, {
            userId: currentUserId,
            siteId: siteId,
            lastReadAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          currentLastReadAt = statusDoc.data().lastReadAt?.toDate() || new Date();
        }

        setLastReadAt(currentLastReadAt);

        // 2. 既読状態のリアルタイム監視
        unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setLastReadAt(data.lastReadAt?.toDate() || new Date());
          }
        });

        // 3. サイト内の全メモをリアルタイム監視
        const memosQuery = query(collection(db, 'sites', siteId, 'pageNotes'));

        unsubscribeMemos = onSnapshot(memosQuery, (snapshot) => {
          const memos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // 未読メモをフィルタリング
          const unread = memos.filter(memo => {
            // 自分が投稿したメモは除外
            if (memo.userId === currentUserId) return false;
            
            // updatedAt または createdAt を取得
            const memoTime = memo.updatedAt?.toDate() || memo.createdAt?.toDate();
            if (!memoTime) return false;

            // lastReadAt より後に更新されたメモ
            return memoTime > currentLastReadAt;
          });

          // updatedAt の降順でソート
          unread.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0;
            const bTime = b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });

          setUnreadMemos(unread);
          setUnreadCount(unread.length);
          setIsLoading(false);
        });

      } catch (error) {
        console.error('[useMemoNotifications] エラー:', error);
        setIsLoading(false);
      }
    };

    setupListeners();

    // クリーンアップ
    return () => {
      if (unsubscribeMemos) unsubscribeMemos();
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [currentUserId, siteId, isAdminViewing]);

  // 既読マークをつける
  const markAsRead = async () => {
    if (!currentUserId || !siteId) return;

    try {
      const statusDocId = `${currentUserId}_${siteId}`;
      const statusRef = doc(db, 'users', currentUserId, 'memoReadStatus', statusDocId);
      
      await setDoc(statusRef, {
        userId: currentUserId,
        siteId: siteId,
        lastReadAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // ローカル状態を即座に更新
      setUnreadMemos([]);
      setUnreadCount(0);
      setLastReadAt(new Date());
    } catch (error) {
      console.error('[useMemoNotifications] 既読マークエラー:', error);
      throw error;
    }
  };

  return {
    unreadMemos,
    unreadCount,
    isLoading,
    markAsRead,
  };
}
