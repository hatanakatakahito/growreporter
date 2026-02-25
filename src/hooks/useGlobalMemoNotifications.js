import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * 全サイトのメモ通知を集約するカスタムフック
 * @param {string} currentUserId - 現在のユーザーID
 * @param {Array} sites - サイト一覧 [{id, siteName, ...}]
 * @param {boolean} isAdminViewing - 管理者として他人のサイトを閲覧中か
 */
export function useGlobalMemoNotifications(currentUserId, sites, isAdminViewing = false) {
  const [unreadMemos, setUnreadMemos] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // サイトごとの lastReadAt と memos を保持
  const lastReadAtRef = useRef({});
  const memosRef = useRef({});
  const unsubscribersRef = useRef([]);

  // 未読メモを再計算
  const recalcUnread = useCallback(() => {
    const allUnread = [];
    const siteNameMap = {};
    for (const site of (sites || [])) {
      siteNameMap[site.id] = site.siteName || site.id;
    }

    for (const siteId of Object.keys(memosRef.current)) {
      const memos = memosRef.current[siteId] || [];
      const lastRead = lastReadAtRef.current[siteId];
      if (!lastRead) continue;

      for (const memo of memos) {
        if (memo.userId === currentUserId) continue;
        const memoTime = memo.updatedAt?.toDate?.() || memo.createdAt?.toDate?.();
        if (!memoTime) continue;
        if (memoTime > lastRead) {
          allUnread.push({
            ...memo,
            siteName: siteNameMap[siteId] || siteId,
            siteId,
          });
        }
      }
    }

    // 時系列降順ソート
    allUnread.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    setUnreadMemos(allUnread);
    setUnreadCount(allUnread.length);
  }, [currentUserId, sites]);

  useEffect(() => {
    // クリーンアップ
    const cleanup = () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };

    if (!currentUserId || !sites || sites.length === 0 || isAdminViewing) {
      cleanup();
      memosRef.current = {};
      lastReadAtRef.current = {};
      setUnreadMemos([]);
      setUnreadCount(0);
      setIsLoading(false);
      return cleanup;
    }

    cleanup();
    let loadingCount = sites.length;
    let isMounted = true;

    const setupSiteListeners = async (site) => {
      const siteId = site.id;

      try {
        // 1. memoReadStatus を取得/初期化
        const statusDocId = `${currentUserId}_${siteId}`;
        const statusRef = doc(db, 'users', currentUserId, 'memoReadStatus', statusDocId);
        const statusDoc = await getDoc(statusRef);

        if (!statusDoc.exists()) {
          // 初回: 現在時刻を設定（過去のメモは未読としない）
          lastReadAtRef.current[siteId] = new Date();
          await setDoc(statusRef, {
            userId: currentUserId,
            siteId,
            lastReadAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          lastReadAtRef.current[siteId] = statusDoc.data().lastReadAt?.toDate() || new Date();
        }

        // 2. memoReadStatus のリアルタイム監視
        const unsubStatus = onSnapshot(statusRef, (snapshot) => {
          if (!isMounted) return;
          if (snapshot.exists()) {
            lastReadAtRef.current[siteId] = snapshot.data().lastReadAt?.toDate() || new Date();
            recalcUnread();
          }
        });
        unsubscribersRef.current.push(unsubStatus);

        // 3. pageNotes のリアルタイム監視
        const memosQuery = query(collection(db, 'sites', siteId, 'pageNotes'));
        const unsubMemos = onSnapshot(memosQuery, (snapshot) => {
          if (!isMounted) return;
          memosRef.current[siteId] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          recalcUnread();

          loadingCount--;
          if (loadingCount <= 0) {
            setIsLoading(false);
          }
        });
        unsubscribersRef.current.push(unsubMemos);
      } catch (error) {
        console.error(`[useGlobalMemoNotifications] サイト ${siteId} のリスナー設定エラー:`, error);
        loadingCount--;
        if (loadingCount <= 0 && isMounted) {
          setIsLoading(false);
        }
      }
    };

    // 全サイトのリスナーを設定
    for (const site of sites) {
      setupSiteListeners(site);
    }

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [currentUserId, sites, isAdminViewing, recalcUnread]);

  // すべて既読にする
  const markAllAsRead = useCallback(async () => {
    if (!currentUserId || !sites) return;

    try {
      const siteIdsWithUnread = new Set(unreadMemos.map((m) => m.siteId));

      const promises = Array.from(siteIdsWithUnread).map((siteId) => {
        const statusDocId = `${currentUserId}_${siteId}`;
        const statusRef = doc(db, 'users', currentUserId, 'memoReadStatus', statusDocId);
        return setDoc(
          statusRef,
          {
            userId: currentUserId,
            siteId,
            lastReadAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      await Promise.all(promises);

      // ローカル状態を即座に更新
      const now = new Date();
      for (const siteId of siteIdsWithUnread) {
        lastReadAtRef.current[siteId] = now;
      }
      setUnreadMemos([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('[useGlobalMemoNotifications] 全既読エラー:', error);
      throw error;
    }
  }, [currentUserId, sites, unreadMemos]);

  return {
    unreadMemos,
    unreadCount,
    isLoading,
    markAllAsRead,
  };
}
