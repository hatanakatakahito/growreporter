import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
} from 'firebase/firestore';

/**
 * 全サイトのアラート通知を集約するカスタムフック
 * @param {string} currentUserId - 現在のユーザーID
 * @param {Array} sites - サイト一覧 [{id, siteName, ...}]
 * @param {boolean} isAdminViewing - 管理者として他人のサイトを閲覧中か
 */
export function useGlobalAlertNotifications(currentUserId, sites, isAdminViewing = false) {
  const [unreadAlerts, setUnreadAlerts] = useState([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const alertsRef = useRef({});
  const readIdsRef = useRef(new Set());
  const unsubscribersRef = useRef([]);

  const recalcUnread = useCallback(() => {
    const siteNameMap = {};
    for (const site of (sites || [])) {
      siteNameMap[site.id] = site.siteName || site.id;
    }

    const allUnread = [];
    for (const siteId of Object.keys(alertsRef.current)) {
      const alerts = alertsRef.current[siteId] || [];
      for (const alert of alerts) {
        const readDocId = `${currentUserId}_${siteId}_${alert.id}`;
        if (readIdsRef.current.has(readDocId)) continue;
        allUnread.push({
          ...alert,
          siteName: siteNameMap[siteId] || siteId,
          siteId,
        });
      }
    }

    allUnread.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    setUnreadAlerts(allUnread);
    setUnreadAlertCount(allUnread.length);
  }, [currentUserId, sites]);

  useEffect(() => {
    const cleanup = () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };

    if (!currentUserId || !sites || sites.length === 0 || isAdminViewing) {
      cleanup();
      alertsRef.current = {};
      readIdsRef.current = new Set();
      setUnreadAlerts([]);
      setUnreadAlertCount(0);
      return cleanup;
    }

    cleanup();

    // 1. userAlertReads を監視
    const unsubReads = onSnapshot(
      collection(db, 'users', currentUserId, 'userAlertReads'),
      (snap) => {
        const newSet = new Set();
        snap.docs.forEach((d) => newSet.add(d.id));
        readIdsRef.current = newSet;
        recalcUnread();
      },
      (err) => console.error('[useGlobalAlertNotifications] userAlertReads error', err)
    );
    unsubscribersRef.current.push(unsubReads);

    // 2. 各サイトの alerts を監視
    for (const site of sites) {
      const siteId = site.id;
      const unsubAlerts = onSnapshot(
        query(
          collection(db, 'sites', siteId, 'alerts'),
          orderBy('createdAt', 'desc')
        ),
        (snap) => {
          alertsRef.current[siteId] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAtMs: d.data().createdAt?.toDate?.()?.getTime() ?? 0,
          }));
          recalcUnread();
        },
        (err) => console.error(`[useGlobalAlertNotifications] alerts error site=${siteId}`, err)
      );
      unsubscribersRef.current.push(unsubAlerts);
    }

    return () => {
      cleanup();
    };
  }, [currentUserId, sites, isAdminViewing, recalcUnread]);

  // すべて既読にする
  const markAllAlertsAsRead = useCallback(async () => {
    if (!currentUserId || !sites) return;

    const promises = [];
    for (const alert of unreadAlerts) {
      const readDocId = `${currentUserId}_${alert.siteId}_${alert.id}`;
      promises.push(
        setDoc(doc(db, 'users', currentUserId, 'userAlertReads', readDocId), {
          userId: currentUserId,
          siteId: alert.siteId,
          alertId: alert.id,
          readAt: new Date(),
        })
      );
    }

    await Promise.all(promises);

    // ローカル状態を即座に更新
    for (const alert of unreadAlerts) {
      const readDocId = `${currentUserId}_${alert.siteId}_${alert.id}`;
      readIdsRef.current.add(readDocId);
    }
    setUnreadAlerts([]);
    setUnreadAlertCount(0);
  }, [currentUserId, sites, unreadAlerts]);

  return {
    unreadAlerts,
    unreadAlertCount,
    markAllAlertsAsRead,
  };
}
