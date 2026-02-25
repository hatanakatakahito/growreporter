import React, { useState, useMemo, useEffect } from 'react';
import { useSite } from '../contexts/SiteContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Sparkles, Trash2, Download, Mail, ChevronUp, ChevronDown, ExternalLink, Edit } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, limit, getDocs, updateDoc, doc, deleteDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImprovementDialog from '../components/Improve/ImprovementDialog';
import EvaluationModal from '../components/Improve/EvaluationModal';
import AIGenerationModal from '../components/Improve/AIGenerationModal';
import ImprovementFocusModal from '../components/Improve/ImprovementFocusModal';
import ConsultationFormModal from '../components/Improve/ConsultationFormModal';
import { usePlan } from '../hooks/usePlan';
import { useAuth } from '../contexts/AuthContext';
import { generateAndAddImprovements } from '../utils/generateAndAddImprovements';
import { downloadImprovementsExcel } from '../utils/exportImprovementsToExcel';
import { formatEstimatedPriceLabel, formatEstimatedDeliveryLabel } from '../utils/improvementEstimate';
import toast from 'react-hot-toast';

const categoryLabels = {
  acquisition: '集客',
  content: 'コンテンツ',
  design: 'デザイン',
  feature: '機能',
  other: 'その他',
};
const categoryColors = {
  acquisition: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  content: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
};
const priorityLabels = { high: '高', medium: '中', low: '低' };
const statusLabels = { draft: '起案', in_progress: '対応中', completed: '完了' };
const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-300',
};

export default function Improve() {
  const { selectedSite, selectedSiteId } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getRemainingByType } = usePlan();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const memberRole = userProfile?.memberRole || 'owner';
  const isViewer = memberRole === 'viewer';
  const [editingItem, setEditingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [evaluatingItem, setEvaluatingItem] = useState(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  
  // 方針選択モーダル（AI生成の前に表示）
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  // AI生成モーダルの状態
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('loading');
  const [generationCount, setGenerationCount] = useState(0);
  const [generationError, setGenerationError] = useState('');
  
  // スクレイピング状況
  const [scrapingStatus, setScrapingStatus] = useState(null);
  
  const [selectedForIframe, setSelectedForIframe] = useState(null);
  // 表のソート
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  
  // テーブルでの選択ID
  const [detailViewSelectedIds, setDetailViewSelectedIds] = useState(new Set());
  // 改善内容セルの「続きを読む」で展開している行のID（このセル内クリックではドロワーを開かない）
  const [expandedDetailIds, setExpandedDetailIds] = useState(new Set());
  
  const queryClient = useQueryClient();
  const siteUrl = (selectedSite?.siteUrl || '').trim().replace(/\/+$/, '');

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('改善する');
  }, []);

  // スクレイピング状況を取得
  useEffect(() => {
    if (selectedSiteId) {
      fetchScrapingStatus();
    }
  }, [selectedSiteId]);

  const fetchScrapingStatus = async () => {
    try {
      const metaDoc = await getDoc(doc(db, 'sites', selectedSiteId, 'pageScrapingMeta', 'default'));
      if (metaDoc.exists()) {
        setScrapingStatus(metaDoc.data());
        return;
      }
      // pageScrapingMeta がなくても pageScrapingData に1件以上あれば、初回登録時のスクレイピング等で取得済みとみなす
      const dataSnap = await getDocs(
        query(collection(db, 'sites', selectedSiteId, 'pageScrapingData'), limit(1))
      );
      if (!dataSnap.empty) {
        setScrapingStatus({ hasDataOnly: true });
        return;
      }
      setScrapingStatus(null);
    } catch (err) {
      console.error('[fetchScrapingStatus] エラー:', err);
    }
  };

  // URLパラメータからタスク追加を処理
  useEffect(() => {
    const action = searchParams.get('action');
    
    // AI提案からの一括タスク追加
    if (action === 'add-from-ai') {
      const tasksParam = searchParams.get('tasks');
      if (tasksParam && selectedSiteId) {
        try {
          const tasks = JSON.parse(decodeURIComponent(tasksParam));
          handleAddTasksFromAI(tasks);
        } catch (error) {
          console.error('[Improve] AI提案の解析エラー:', error);
        }
      }
      // URLパラメータをクリア
      setSearchParams({});
      return;
    }
    
    // 単一タスク追加（既存機能）
    if (action === 'add') {
      const title = searchParams.get('title');
      const description = searchParams.get('description');
      
      if (title) {
        // 編集アイテムを設定してダイアログを開く
        setEditingItem({
          title: decodeURIComponent(title),
          description: description ? decodeURIComponent(description) : '',
          expectedImpact: '',
        });
        setIsDialogOpen(true);
        
        // URLパラメータをクリア
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams, selectedSiteId]);

  // 改善課題データの取得
  const { data: improvements = [], isLoading: improvementsLoading } = useQuery({
    queryKey: ['improvements', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      
      const q = query(
        collection(db, 'sites', selectedSiteId, 'improvements'),
        where('status', 'in', ['draft', 'in_progress', 'completed'])
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    enabled: !!selectedSiteId,
  });

  // 更新mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const improvementRef = doc(db, 'sites', selectedSiteId, 'improvements', id);
      await updateDoc(improvementRef, {
        ...data,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // 「改善する」画面と「評価する」画面の両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  // 削除mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await deleteDoc(doc(db, 'sites', selectedSiteId, 'improvements', id));
    },
    onSuccess: () => {
      // 「改善する」画面と「評価する」画面の両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
    },
  });

  // AI提案からの一括タスク追加
  const addTasksFromAIMutation = useMutation({
    mutationFn: async (tasks) => {
      const promises = tasks.map(task => {
        return addDoc(collection(db, 'sites', selectedSiteId, 'improvements'), {
          title: task.title || task.recommendation || 'AI提案タスク',
          description: task.description || task.detail || '',
          status: 'draft',
          expectedImpact: task.expectedImpact || '',
          order: Date.now(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'ai-analysis', // AI分析由来であることを記録
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
      console.log('[Improve] AI提案からのタスク追加完了');
    },
  });

  const handleAddTasksFromAI = (tasks) => {
    if (!tasks || tasks.length === 0) return;
    console.log('[Improve] AI提案からタスク追加:', tasks);
    addTasksFromAIMutation.mutate(tasks);
  };

  const handleEvaluationSave = (evaluationData) => {
    if (evaluatingItem) {
      updateMutation.mutate(
        { id: evaluatingItem.id, data: evaluationData },
        {
          onSuccess: () => {
            setIsEvaluationOpen(false);
            setEvaluatingItem(null);
          }
        }
      );
    }
  };

  const handleStatusChange = (item, newStatus) => {
    if (item.status === newStatus) return;
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completedAt = new Date().toISOString();
      updateMutation.mutate(
        { id: item.id, data: updateData },
        {
          onSuccess: () => {
            setEvaluatingItem({ ...item, ...updateData });
            setIsEvaluationOpen(true);
          }
        }
      );
    } else {
      updateMutation.mutate({ id: item.id, data: updateData });
    }
  };

  const filteredImprovements = useMemo(() => improvements, [improvements]);

  const categoryOrder = ['acquisition', 'content', 'design', 'feature', 'other'];
  const priorityOrder = ['high', 'medium', 'low'];
  const statusOrder = ['draft', 'in_progress', 'completed'];

  const sortedImprovements = useMemo(() => {
    const list = [...filteredImprovements];
    if (!sortKey) return list;
    list.sort((a, b) => {
      let va, vb;
      if (sortKey === 'category') {
        va = categoryOrder.indexOf(a.category || '') >= 0 ? categoryOrder.indexOf(a.category) : 999;
        vb = categoryOrder.indexOf(b.category || '') >= 0 ? categoryOrder.indexOf(b.category) : 999;
      } else if (sortKey === 'priority') {
        va = priorityOrder.indexOf(a.priority || '') >= 0 ? priorityOrder.indexOf(a.priority) : 999;
        vb = priorityOrder.indexOf(b.priority || '') >= 0 ? priorityOrder.indexOf(b.priority) : 999;
      } else if (sortKey === 'estimatedLaborHours') {
        va = a.estimatedLaborHours != null ? Number(a.estimatedLaborHours) : 1e9;
        vb = b.estimatedLaborHours != null ? Number(b.estimatedLaborHours) : 1e9;
      } else if (sortKey === 'status') {
        va = statusOrder.indexOf(a.status || '') >= 0 ? statusOrder.indexOf(a.status) : 999;
        vb = statusOrder.indexOf(b.status || '') >= 0 ? statusOrder.indexOf(b.status) : 999;
      } else return 0;
      if (va === vb) return 0;
      const dir = sortOrder === 'asc' ? 1 : -1;
      return va < vb ? -dir : dir;
    });
    return list;
  }, [filteredImprovements, sortKey, sortOrder]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const toggleDetailViewSelection = (id) => {
    setDetailViewSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleDetailViewSelectAll = () => {
    if (detailViewSelectedIds.size >= sortedImprovements.length) {
      setDetailViewSelectedIds(new Set());
    } else {
      setDetailViewSelectedIds(new Set(sortedImprovements.map(i => i.id)));
    }
  };
  const clearDetailViewSelection = () => setDetailViewSelectedIds(new Set());

  const toggleDetailExpand = (id) => {
    setExpandedDetailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteDetailView = () => {
    const count = detailViewSelectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`選択した${count}件の改善案を削除しますか？`)) return;
    const ids = Array.from(detailViewSelectedIds);
    Promise.all(ids.map(id => deleteDoc(doc(db, 'sites', selectedSiteId, 'improvements', id))))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        setDetailViewSelectedIds(new Set());
        toast.success(`${count}件を削除しました`);
      })
      .catch(err => {
        toast.error(err?.message || '削除に失敗しました');
      });
  };

  const handleBulkStatusChangeDetailView = (newStatus) => {
    const ids = Array.from(detailViewSelectedIds);
    if (ids.length === 0) return;
    const updateData = { status: newStatus };
    if (newStatus === 'completed') updateData.completedAt = new Date().toISOString();
    Promise.all(ids.map(id => updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', id), { ...updateData, updatedAt: new Date() })))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
        setDetailViewSelectedIds(new Set());
        toast.success(`${ids.length}件のステータスを更新しました`);
      })
      .catch(err => {
        toast.error(err?.message || '更新に失敗しました');
      });
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={null}
          setDateRange={null}
          showDateRange={false}
          showSiteInfo={false}
          improveActions={
            !isViewer && (
              <>
                <button
                  onClick={() => {
                    if (!selectedSiteId) return;
                    setIsFocusModalOpen(true);
                  }}
                  className="relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600"
                >
                  <Sparkles className="h-4 w-4" />
                  AI改善案生成
                  {/* 残り回数バッジ */}
                  {(() => {
                    const remaining = getRemainingByType('improvement');
                    if (remaining === null) return null;
                    return (
                      <span className={`absolute -top-2 -right-2 flex h-5 ${remaining === -1 ? 'w-6' : 'w-5'} items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md`}>
                        {remaining === -1 ? '∞' : remaining}
                      </span>
                    );
                  })()}
                </button>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                >
                  手動で追加
                </button>
              </>
            )
          }
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
                改善する
              </h2>
              {/* サイトマップ状況表示（AI改善案生成でこのデータを反映） */}
              {scrapingStatus && scrapingStatus.lastScrapedAt && (
                <p className="mt-1 text-xs text-body-color">
                  サイトマップデータ: 最終更新{' '}
                  {new Date(scrapingStatus.lastScrapedAt.toDate ? scrapingStatus.lastScrapedAt.toDate() : scrapingStatus.lastScrapedAt).toLocaleDateString('ja-JP')}{' '}
                  （{scrapingStatus.totalPagesScraped || 0}ページ取得済み・AI改善案に反映）
                </p>
              )}
              {scrapingStatus && scrapingStatus.hasDataOnly && (
                <p className="mt-1 text-xs text-body-color">
                  サイトマップデータ: 取得済み（初回登録時などのスクレイピング・AI改善案に反映）
                </p>
              )}
              {!scrapingStatus && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ サイトマップデータ未取得。管理画面から「スクレイピング開始」を実行すると、AI改善案の精度が向上します。
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {improvements.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await downloadImprovementsExcel(improvements, selectedSite?.siteName);
                      toast.success('ダウンロードしました');
                    } catch (e) {
                      toast.error(e?.message || 'ダウンロードに失敗しました');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                >
                  <Download className="h-4 w-4" />
                  改善内容をダウンロード
                </button>
              )}
            </div>
          </div>

          <ImprovementFocusModal
            isOpen={isFocusModalOpen}
            onClose={() => setIsFocusModalOpen(false)}
            onConfirm={async (improvementFocus) => {
              setIsGenerationModalOpen(true);
              setGenerationStatus('loading');
              setGenerationError('');
              try {
                await generateAndAddImprovements(
                  selectedSiteId,
                  currentUser?.email,
                  async (status, count, error) => {
                    setGenerationStatus(status);
                    if (status === 'success') {
                      setGenerationCount(count);
                      await queryClient.refetchQueries({ queryKey: ['improvements', selectedSiteId] });
                      const list = queryClient.getQueryData(['improvements', selectedSiteId]) || [];
                      const withUrl = list.filter((imp) => imp.targetPageUrl);
                      const captureScreenshot = httpsCallable(functions, 'captureScreenshot');
                      for (const item of withUrl) {
                        try {
                          const pcRes = await captureScreenshot({ siteUrl: item.targetPageUrl, deviceType: 'pc' });
                          if (pcRes?.data?.imageUrl) {
                            await updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', item.id), { targetPageScreenshotUrlPc: pcRes.data.imageUrl, updatedAt: new Date() });
                          }
                        } catch (e) {
                          console.warn('[Improve] PCスクショ取得スキップ:', item.id, e?.message);
                        }
                        try {
                          const mobileRes = await captureScreenshot({ siteUrl: item.targetPageUrl, deviceType: 'mobile' });
                          if (mobileRes?.data?.imageUrl) {
                            await updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', item.id), { targetPageScreenshotUrlMobile: mobileRes.data.imageUrl, updatedAt: new Date() });
                          }
                        } catch (e) {
                          console.warn('[Improve] モバイルスクショ取得スキップ:', item.id, e?.message);
                        }
                      }
                      if (withUrl.length > 0) {
                        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
                      }
                    } else if (status === 'error') {
                      setGenerationError(error);
                    }
                  },
                  { improvementFocus }
                );
              } catch (err) {
                setGenerationStatus('error');
                setGenerationError(err?.message || '生成に失敗しました');
              }
            }}
          />

          {improvementsLoading ? (
            <LoadingSpinner message="改善課題を読み込んでいます..." />
          ) : (
            <>
              <div className="max-w-[1400px] mx-auto">
                {detailViewSelectedIds.size > 0 && !isViewer && (
                  <div className="mb-3 rounded-lg border border-primary/30 bg-blue-50 px-4 py-3 dark:bg-blue-900/20 dark:border-primary/30">
                    <div className="mb-2 text-sm font-medium text-dark dark:text-white">
                      選択中 {detailViewSelectedIds.size} 件 — 操作を選んでください
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">編集</span>
                        <button
                          type="button"
                          onClick={() => {
                            const firstId = Array.from(detailViewSelectedIds)[0];
                            const item = sortedImprovements.find((i) => i.id === firstId);
                            if (item) {
                              setEditingItem(item);
                              setIsDialogOpen(true);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                        >
                          <Edit className="h-4 w-4" />
                          選択した1件を編集
                        </button>
                        <button
                          type="button"
                          onClick={clearDetailViewSelection}
                          className="rounded border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                        >
                          選択解除
                        </button>
                      </div>
                      <div className="h-6 w-px bg-stroke dark:bg-dark-3" aria-hidden />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">削除</span>
                        <button
                          type="button"
                          onClick={handleBulkDeleteDetailView}
                          className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-dark-2 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                          選択した{detailViewSelectedIds.size}件を削除
                        </button>
                      </div>
                      <div className="h-6 w-px bg-stroke dark:bg-dark-3" aria-hidden />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">ステータス</span>
                        <select
                          id="bulk-status-detail"
                          className="rounded border border-stroke bg-white px-2 py-1.5 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                        >
                          <option value="draft">{statusLabels.draft}</option>
                          <option value="in_progress">{statusLabels.in_progress}</option>
                          <option value="completed">{statusLabels.completed}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const sel = document.getElementById('bulk-status-detail');
                            if (sel) handleBulkStatusChangeDetailView(sel.value);
                          }}
                          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
                        >
                          変更
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-stroke dark:border-dark-3 overflow-x-auto overflow-y-visible bg-white dark:bg-dark-2">
                  <table className="w-full min-w-[900px] border-collapse text-sm table-fixed">
                    <thead>
                      <tr>
                        {!isViewer && (
                          <th className="w-[40px] py-3 px-2 bg-gray-50 dark:bg-dark-3 border-b border-stroke dark:border-dark-3 text-center">
                            {sortedImprovements.length > 0 && (
                              <input
                                type="checkbox"
                                checked={detailViewSelectedIds.size === sortedImprovements.length && sortedImprovements.length > 0}
                                onChange={toggleDetailViewSelectAll}
                                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                title="すべて選択"
                              />
                            )}
                          </th>
                        )}
                        <th className="w-[8%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={() => handleSort('category')} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            カテゴリ
                            {sortKey === 'category' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="w-[8%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('priority'); }} className="inline-flex items-center gap-0.5 hover:opacity-80 whitespace-nowrap" title="クリックで並び替え">
                            優先度
                            {sortKey === 'priority' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="min-w-[200px] w-[52%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 font-semibold text-body-color border-b border-stroke dark:border-dark-3">改善内容</th>
                        <th className="w-[100px] min-w-[100px] py-3 px-2 bg-gray-50 dark:bg-dark-3 font-semibold text-body-color border-b border-stroke dark:border-dark-3 text-center whitespace-nowrap">プレビュー</th>
                        <th className="w-[14%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('estimatedLaborHours'); }} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            目安料金・納期
                            {sortKey === 'estimatedLaborHours' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="w-[10%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('status'); }} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            ステータス
                            {sortKey === 'status' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedImprovements.length === 0 ? (
                        <tr><td colSpan={isViewer ? 6 : 7} className="py-6 px-4 text-body-color text-sm text-center">改善案がありません</td></tr>
                      ) : (
                        sortedImprovements.map((item) => {
                          const isSelected = selectedForIframe === item.id;
                          const isChecked = detailViewSelectedIds.has(item.id);
                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-gray-100 dark:border-dark-3 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                            >
                              {!isViewer && (
                                <td className="py-3 px-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleDetailViewSelection(item.id)}
                                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                    title="選択"
                                  />
                                </td>
                              )}
                              <td className="py-3 px-4 align-middle">
                                {item.category && categoryLabels[item.category] && (
                                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${categoryColors[item.category] || categoryColors.other}`}>
                                    {categoryLabels[item.category]}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 align-middle">
                                {item.priority && priorityLabels[item.priority] && (
                                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${priorityColors[item.priority] || ''}`}>
                                    {priorityLabels[item.priority]}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 align-middle break-words align-top" onClick={(e) => e.stopPropagation()}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => toggleDetailExpand(item.id)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(item.id); } }}
                                  className="font-medium text-dark dark:text-white leading-snug cursor-pointer hover:opacity-80"
                                >
                                  {item.title}
                                </div>
                                {expandedDetailIds.has(item.id) ? (
                                  <>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => toggleDetailExpand(item.id)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(item.id); } }}
                                      className="text-xs text-body-color mt-1 leading-relaxed pr-1 cursor-pointer hover:opacity-80"
                                    >
                                      {item.description || '—'}
                                      {item.expectedImpact && (
                                        <p className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-3 text-body-color">
                                          <span className="font-medium text-dark dark:text-white">期待する効果:</span> {item.expectedImpact}
                                        </p>
                                      )}
                                    </div>
                                    <button type="button" onClick={() => toggleDetailExpand(item.id)} className="text-xs text-primary hover:underline mt-1">閉じる</button>
                                  </>
                                ) : (
                                  <>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => toggleDetailExpand(item.id)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(item.id); } }}
                                      className="text-xs text-body-color mt-1 leading-relaxed line-clamp-2 pr-1 cursor-pointer hover:opacity-80"
                                    >
                                      {item.description || '—'}
                                    </div>
                                    <button type="button" onClick={() => toggleDetailExpand(item.id)} className="text-xs text-primary hover:underline mt-1">続きを読む</button>
                                  </>
                                )}
                              </td>
                              <td className="py-3 px-2 align-middle text-center w-[100px] min-w-[100px]">
                                {(item.targetPageUrl || '').trim() ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedForIframe(item.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 whitespace-nowrap"
                                    title="対象ページをプレビュー"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                    プレビュー
                                  </button>
                                ) : (
                                  <span className="text-body-color text-xs">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 align-middle text-green-600 dark:text-green-400 font-medium">
                                {formatEstimatedPriceLabel(item.estimatedLaborHours)}
                                <span className="block text-xs text-body-color mt-0.5">{formatEstimatedDeliveryLabel(item.estimatedLaborHours)}</span>
                              </td>
                              <td className="py-3 px-4 align-middle text-body-color text-sm" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={item.status || 'draft'}
                                  onChange={(e) => handleStatusChange(item, e.target.value)}
                                  className="rounded border border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 px-2 py-1.5 text-sm text-dark dark:text-white focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                                >
                                  <option value="draft">{statusLabels.draft}</option>
                                  <option value="in_progress">{statusLabels.in_progress}</option>
                                  <option value="completed">{statusLabels.completed}</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* オーバーレイ: ドロワー表示時 */}
              {selectedForIframe && (
                <div
                  className="fixed inset-0 bg-black/30 z-[100] transition-opacity"
                  aria-hidden
                  onClick={() => setSelectedForIframe(null)}
                />
              )}

              {/* 右スライドドロワー: iframeのみ表示（70%縮小） */}
              {selectedForIframe && (() => {
                const selectedItem = improvements.find((i) => i.id === selectedForIframe);
                if (!selectedItem) return null;
                const targetUrlRaw = (selectedItem.targetPageUrl || '').trim();
                const hasTargetUrl = Boolean(targetUrlRaw);
                const iframeSrc = targetUrlRaw || siteUrl;
                const linkHref = targetUrlRaw
                  ? (targetUrlRaw.startsWith('http') ? targetUrlRaw : `${siteUrl}${targetUrlRaw.startsWith('/') ? '' : '/'}${targetUrlRaw}`)
                  : siteUrl;
                return (
                  <div
                    className="fixed top-0 right-0 w-[1280px] max-w-[95vw] h-full bg-white dark:bg-dark-2 shadow-xl z-[101] flex flex-col transform transition-transform duration-200 ease-out"
                    style={{ transform: 'translateX(0)' }}
                  >
                    <div className="flex-shrink-0 flex justify-between items-center gap-3 py-2 px-3 border-b border-stroke dark:border-dark-3">
                      {hasTargetUrl ? (
                        <a
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 min-w-0 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="truncate" title={selectedItem.title}>{selectedItem.title}</span>
                          <span className="text-body-color text-xs shrink-0 truncate max-w-[200px]" title={linkHref}>{linkHref}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-body-color truncate flex-1 min-w-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedForIframe(null)}
                        className="rounded p-1.5 text-body-color hover:bg-gray-100 dark:hover:bg-dark-3 text-xl leading-none shrink-0"
                        aria-label="閉じる"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      {iframeSrc ? (
                        <div className="flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-dark-3">
                          <div
                            className="w-full h-full overflow-auto"
                            style={{
                              width: '142.86%',
                              height: '142.86%',
                              transform: 'scale(0.7)',
                              transformOrigin: 'top left',
                            }}
                          >
                            <iframe
                              title="対象サイト"
                              src={iframeSrc}
                              className="w-full h-full min-h-[500px] border-0 block"
                              sandbox="allow-same-origin allow-scripts allow-popups"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-body-color text-sm">URL未設定</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </main>

      <ImprovementDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
        }}
        onDeleted={() => setSelectedForIframe(null)}
        siteId={selectedSiteId}
        editingItem={editingItem}
      />

      <EvaluationModal
        isOpen={isEvaluationOpen}
        onClose={() => {
          setIsEvaluationOpen(false);
          setEvaluatingItem(null);
        }}
        item={evaluatingItem}
        onSave={handleEvaluationSave}
      />

      {/* AI生成モーダル */}
      <AIGenerationModal
        isOpen={isGenerationModalOpen}
        status={generationStatus}
        count={generationCount}
        error={generationError}
        onClose={() => {
          setIsGenerationModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        }}
      />

      {/* 修正を相談する（右下フロート・円形・分析画面と同様のサイズ・グラデーション） */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={() => {
            if (improvements.length === 0) {
              toast.error('改善案がありません');
              return;
            }
            setIsConsultationModalOpen(true);
          }}
          className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          aria-label="修正を相談する"
          title="修正を相談する"
        >
          <div className="flex flex-col items-center">
            <Mail className="h-9 w-9" aria-hidden="true" />
            <span className="mt-1 text-center text-sm font-medium leading-tight">修正を<br />相談する</span>
          </div>
        </button>
      </div>

      {/* 相談フォームモーダル */}
      <ConsultationFormModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        siteName={selectedSite?.siteName}
        siteUrl={siteUrl}
        improvements={improvements}
        onSuccess={() => {
          setIsConsultationModalOpen(false);
          navigate('/improve/consultation/thanks');
        }}
      />
    </div>
  );
}

