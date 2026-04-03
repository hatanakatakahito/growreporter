import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { Link } from 'react-router-dom';

/**
 * 現在選択中のサイトの未読アラートをカード形式で表示し、既読にできる
 */
export default function AlertCards({ siteId }) {
  const { currentUser } = useAuth();
  const { isFree } = usePlan();
  const [alerts, setAlerts] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid || !siteId) {
      setAlerts([]);
      setReadIds(new Set());
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;
    const readSet = new Set();

    const unsubReads = onSnapshot(
      collection(db, 'users', userId, 'userAlertReads'),
      (snap) => {
        snap.docs.forEach((d) => {
          const id = d.id;
          if (id.startsWith(`${userId}_${siteId}_`)) readSet.add(id);
        });
        setReadIds(new Set(readSet));
      },
      (err) => {
        console.error('[AlertCards] userAlertReads snapshot error', err);
      }
    );

    const unsubAlerts = onSnapshot(
      query(
        collection(db, 'sites', siteId, 'alerts'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.getTime() ?? 0 }));
        setAlerts(list);
        setLoading(false);
      },
      (err) => {
        console.error('[AlertCards] alerts snapshot error', err);
        setLoading(false);
      }
    );

    return () => {
      unsubReads();
      unsubAlerts();
    };
  }, [currentUser?.uid, siteId]);

  const markAsRead = async (alertId) => {
    if (!currentUser?.uid || !siteId) return;
    const readDocId = `${currentUser.uid}_${siteId}_${alertId}`;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'userAlertReads', readDocId), {
        userId: currentUser.uid,
        siteId,
        alertId,
        readAt: new Date(),
      });
    } catch (err) {
      console.error('[AlertCards] markAsRead error', err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.uid || !siteId) return;
    const unread = alerts.filter((a) => !readIds.has(`${currentUser.uid}_${siteId}_${a.id}`));
    for (const a of unread) {
      await markAsRead(a.id);
    }
  };

  const unreadAlerts = alerts.filter((a) => !readIds.has(`${currentUser.uid}_${siteId}_${a.id}`));

  if (!siteId || loading) return null;
  if (unreadAlerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          アラート（{unreadAlerts.length}件）
        </h3>
        {unreadAlerts.length > 1 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs text-primary hover:underline"
          >
            すべて既読にする
          </button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {unreadAlerts.map((alert) => {
          const isExpanded = expandedId === alert.id;
          const hypotheses = alert.hypotheses || [];
          return (
            <div
              key={alert.id}
              className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-dark dark:text-white">
                    {alert.message}
                  </p>
                  {alert.periodCurrent && (
                    <p className="mt-1 text-xs text-body-color">
                      {alert.periodCurrent}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => markAsRead(alert.id)}
                  className="shrink-0 rounded p-1 text-body-color hover:bg-white/50 dark:hover:bg-dark-3"
                  aria-label="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {hypotheses.length > 0 && (
                <div className="mt-3">
                  {isFree ? (
                    <Link to="/plan-info" className="text-xs font-medium text-primary hover:underline">
                      詳細な分析はBusinessプランで →
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            仮説を閉じる
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            仮説を見る
                          </>
                        )}
                      </button>
                      {isExpanded && (
                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-body-color">
                          {hypotheses.map((h, i) => (
                            <li key={i}>{typeof h === 'object' ? h.text : h}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
