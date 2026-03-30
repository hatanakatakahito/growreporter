import { useState, useMemo } from 'react';
import { useSite } from '../../contexts/SiteContext';
import { db, functions } from '../../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function useReportsData() {
  const { selectedSite, selectedSiteId } = useSite();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: completedImprovements = [], isLoading } = useQuery({
    queryKey: ['completed-improvements', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const q = query(
        collection(db, 'sites', selectedSiteId, 'improvements'),
        where('status', '==', 'completed')
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return items.sort((a, b) => {
        const aDate = a.completedAt ? new Date(a.completedAt) : new Date(0);
        const bDate = b.completedAt ? new Date(b.completedAt) : new Date(0);
        return bDate - aDate;
      });
    },
    enabled: !!selectedSiteId,
  });

  const summary = useMemo(() => {
    const total = completedImprovements.length;
    const measured = completedImprovements.filter(i => i.effectMeasurement?.status === 'completed').length;
    const exceeded = completedImprovements.filter(i => i.effectMeasurement?.aiEvaluation?.achievementLevel === 'exceeded').length;
    const met = completedImprovements.filter(i => i.effectMeasurement?.aiEvaluation?.achievementLevel === 'met').length;
    const partial = completedImprovements.filter(i => i.effectMeasurement?.aiEvaluation?.achievementLevel === 'partial').length;
    const pending = completedImprovements.filter(i => ['pending', 'measuring'].includes(i.effectMeasurement?.status)).length;
    const errors = completedImprovements.filter(i => i.effectMeasurement?.status === 'error').length;
    const scored = completedImprovements.filter(i => i.effectMeasurement?.overallScore != null);
    const avgScore = scored.length > 0
      ? scored.reduce((sum, i) => sum + i.effectMeasurement.overallScore, 0) / scored.length
      : null;
    return { total, measured, exceeded, met, partial, pending, errors, avgScore };
  }, [completedImprovements]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return completedImprovements;
    if (statusFilter === 'no_measurement') return completedImprovements.filter(i => !i.effectMeasurement);
    return completedImprovements.filter(i => i.effectMeasurement?.status === statusFilter);
  }, [completedImprovements, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, 'sites', selectedSiteId, 'improvements', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
  };

  return {
    selectedSite, selectedSiteId, isLoading,
    completedImprovements, filteredItems, summary,
    statusFilter, setStatusFilter,
    deleteMutation, refresh,
  };
}

export function useItemActions(siteId, onRefresh) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleRetry = async (improvementId, action) => {
    setIsRetrying(true);
    try {
      const retryFn = httpsCallable(functions, 'retryEffectMeasurement');
      await retryFn({ siteId, improvementId, action });
      toast.success(action === 'retry' ? '再計測をスケジュールしました' : '再計測を開始しました');
      onRefresh?.();
    } catch { toast.error('操作に失敗しました'); }
    finally { setIsRetrying(false); }
  };

  const handleSchedule = async (improvementId, days) => {
    setIsScheduling(true);
    try {
      const fn = httpsCallable(functions, 'scheduleRemeasurement');
      await fn({ siteId, improvementId, remeasureDays: days });
      toast.success(days ? `${days}日後の再計測をスケジュールしました` : '再計測をキャンセルしました');
      onRefresh?.();
    } catch { toast.error('操作に失敗しました'); }
    finally { setIsScheduling(false); }
  };

  return { isRetrying, isScheduling, handleRetry, handleSchedule };
}

// --- 共通ユーティリティ ---
export const categoryLabels = {
  acquisition: '集客', content: 'コンテンツ', design: 'デザイン', feature: '機能', other: 'その他',
};
export const categoryColors = {
  acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
};

export const achievementLabels = {
  exceeded: '期待以上', met: '達成', partial: '一部達成', not_met: '未達成',
};

export function getScoreLabel(score) {
  if (score >= 30) return { label: '大幅改善', description: '非常に高い効果が出ています' };
  if (score >= 10) return { label: '改善傾向', description: '良い効果が確認できます' };
  if (score >= -5) return { label: '変化なし', description: '顕著な変化は見られません' };
  if (score >= -20) return { label: '要注意', description: '一部指標が悪化しています' };
  return { label: '悪化', description: '指標が全体的に悪化しています' };
}

export function getPrimaryMetrics(category) {
  const fmt = {
    num: (v) => (v ?? 0).toLocaleString(),
    pct: (v) => `${((v ?? 0) * 100).toFixed(1)}%`,
    sec: (v) => { const s = Math.round(v ?? 0); return s >= 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s}秒`; },
    pos: (v) => (v ?? 0).toFixed(1),
  };
  const all = {
    sessions: { key: 'sessions', label: 'セッション', format: fmt.num },
    totalUsers: { key: 'totalUsers', label: 'ユーザー', format: fmt.num },
    newUsers: { key: 'newUsers', label: '新規ユーザー', format: fmt.num },
    pageViews: { key: 'pageViews', label: 'ページビュー', format: fmt.num },
    engagementRate: { key: 'engagementRate', label: 'エンゲージメント率', format: fmt.pct },
    bounceRate: { key: 'bounceRate', label: '直帰率', format: fmt.pct, invertColor: true },
    avgSessionDuration: { key: 'avgSessionDuration', label: '平均セッション時間', format: fmt.sec },
    conversions: { key: 'conversions', label: 'コンバージョン', format: fmt.num },
    conversionRate: { key: 'conversionRate', label: 'CVR', format: fmt.pct },
  };
  const byCategory = {
    acquisition: ['sessions', 'totalUsers', 'newUsers', 'engagementRate'],
    content: ['engagementRate', 'avgSessionDuration', 'bounceRate', 'pageViews', 'sessions'],
    design: ['engagementRate', 'bounceRate', 'avgSessionDuration', 'conversions', 'conversionRate'],
    feature: ['conversions', 'conversionRate', 'engagementRate', 'sessions', 'bounceRate'],
    other: ['sessions', 'engagementRate', 'bounceRate', 'conversions', 'conversionRate', 'pageViews'],
  };
  return (byCategory[category] || byCategory.other).map(k => all[k]).filter(Boolean);
}

export function formatPeriod(periodStr) {
  if (!periodStr) return '—';
  const [start, end] = periodStr.split('_to_');
  if (!start || !end) return periodStr;
  const fmtDate = (d) => { const [, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}`; };
  return `${fmtDate(start)} 〜 ${fmtDate(end)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  } catch { return '—'; }
}
