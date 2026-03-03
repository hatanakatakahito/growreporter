import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Zap, FileEdit, PlayCircle, CheckCircle2 } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: '起案', icon: FileEdit, color: 'text-body-color', bg: 'bg-gray-100 dark:bg-dark-3' },
  in_progress: { label: '対応中', icon: PlayCircle, color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20' },
  completed: { label: '完了', icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20' },
};

/**
 * 改善タスク進捗サマリー
 */
export default function ImprovementSummary({ siteId }) {
  const [counts, setCounts] = useState({ draft: 0, in_progress: 0, completed: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'sites', siteId, 'improvements'));
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const c = { draft: 0, in_progress: 0, completed: 0 };
        items.forEach((item) => {
          if (c[item.status] !== undefined) c[item.status]++;
        });
        setCounts(c);

        // 下書き・対応中のタスク一覧（新しい順）
        const active = items
          .filter((i) => i.status !== 'completed')
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setRecentItems(active);
      } catch (err) {
        console.error('[ImprovementSummary] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">改善タスク</h3>
        <div className="animate-pulse space-y-3">
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 flex-1 rounded-lg bg-gray-200 dark:bg-dark-3" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const total = counts.draft + counts.in_progress + counts.completed;

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">改善タスク</h3>
        <Link
          to="/improve"
          className="text-xs font-medium text-primary hover:underline"
        >
          すべて見る →
        </Link>
      </div>

      {/* ステータスカウンター */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <div key={status} className={`flex flex-col items-center rounded-lg p-3 ${config.bg}`}>
              <Icon className={`mb-1 h-5 w-5 ${config.color}`} />
              <span className="text-2xl font-bold text-dark dark:text-white">
                {counts[status]}
              </span>
              <span className="text-xs text-body-color">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* 最近のタスク */}
      {recentItems.length > 0 ? (
        <div className="space-y-2">
          {recentItems.map((item) => {
            const conf = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
              >
                <span className={`text-xs font-medium ${conf.color}`}>{conf.label}</span>
                <span className="flex-1 truncate text-sm text-dark dark:text-white">
                  {item.title}
                </span>
              </div>
            );
          })}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Zap className="h-8 w-8 text-body-color/40" />
          <p className="text-sm text-body-color">改善タスクがありません</p>
          <Link
            to="/improve"
            className="text-xs font-medium text-primary hover:underline"
          >
            AIで改善案を生成する →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
