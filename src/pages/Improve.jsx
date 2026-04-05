import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSite } from '../contexts/SiteContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Sparkles, Trash2, Download, Mail, ChevronUp, ChevronDown, ExternalLink, Edit, X, FileText, Clock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import DotWaveSpinner from '../components/common/DotWaveSpinner';
import { setPageTitle } from '../utils/pageTitle';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, limit, getDocs, updateDoc, doc, deleteDoc, addDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImprovementDialog from '../components/Improve/ImprovementDialog';
import EvaluationModal from '../components/Improve/EvaluationModal';
import CompletionDialog from '../components/Improve/CompletionDialog';
import EffectMeasurementPanel from '../components/Improve/EffectMeasurementPanel';
import AIGenerationModal from '../components/Improve/AIGenerationModal';
import ImprovementFocusModal from '../components/Improve/ImprovementFocusModal';
import ConsultationFormModal from '../components/Improve/ConsultationFormModal';
import UpgradeModal from '../components/common/UpgradeModal';
import BusinessPlanLockOverlay from '../components/common/BusinessPlanLockOverlay';
import { usePlan } from '../hooks/usePlan';
import { useAuth } from '../contexts/AuthContext';
import { generateAndAddImprovements } from '../utils/generateAndAddImprovements';
import { downloadImprovementsExcel } from '../utils/exportImprovementsToExcel';
import { formatEstimatedPriceLabel, formatEstimatedDeliveryLabel } from '../utils/improvementEstimate';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

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

const ExcelIcon = ({ className, disabled }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="14" height="14" rx="2" fill={disabled ? '#9CA3AF' : '#217346'} />
    <path d="M5.5 4.5L8 8L5.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 4.5L8 8L10.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const statusLabels = { draft: '起案', in_progress: '対応中', completed: '完了', archived: 'アーカイブ' };
const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-300',
};

export default function Improve() {
  const { selectedSite, selectedSiteId, isLoading: isSiteLoading } = useSite();
  const { isSidebarOpen } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plan, getRemainingByType, checkCanGenerate, isFree } = usePlan();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const memberRole = userProfile?.memberRole || 'owner';
  const isViewer = memberRole === 'viewer';
  const [editingItem, setEditingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [evaluatingItem, setEvaluatingItem] = useState(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [completionItem, setCompletionItem] = useState(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isCompletionLoading, setIsCompletionLoading] = useState(false);
  
  // 方針選択モーダル（AI生成の前に表示）
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const hasAutoOpenedFocusRef = useRef(false);
  // AI生成オーバーレイの状態
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('loading');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // ダウンロードメニュー
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const downloadMenuRef = useRef(null);

  // スクレイピング状況
  const [scrapingStatus, setScrapingStatus] = useState(null);
  
  // 表のソート
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  
  // テーブルでの選択ID
  const [detailViewSelectedIds, setDetailViewSelectedIds] = useState(new Set());
  // サイドドロワー
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerTab, setDrawerTab] = useState('compare');
  const [afterIframeHeight, setAfterIframeHeight] = useState(null);
  // モックアップ生成中のID管理
  const [mockupGeneratingIds, setMockupGeneratingIds] = useState(new Set());

  const queryClient = useQueryClient();
  const siteUrl = (selectedSite?.siteUrl || '').trim().replace(/\/+$/, '');

  // モックアップ生成ハンドラ
  const handleGenerateMockup = async (item) => {
    if (mockupGeneratingIds.has(item.id)) return;
    setMockupGeneratingIds(prev => new Set([...prev, item.id]));
    try {
      const generateMockup = httpsCallable(functions, 'generateImprovementMockup');
      await generateMockup({ siteId: selectedSiteId, improvementId: item.id });
      toast.success('モックアップを生成しました');
      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
    } catch (e) {
      toast.error(`モックアップ生成に失敗しました: ${e.message}`);
    } finally {
      setMockupGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('改善する');
  }, []);

  // ダウンロードメニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setIsDownloadMenuOpen(false);
      }
    };
    if (isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDownloadMenuOpen]);

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

  // ページスクリーンショット取得（Before表示用）
  const { data: pageScreenshotsMap = {} } = useQuery({
    queryKey: ['pageScreenshots', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return {};
      const map = {};
      // URLを正規化するヘルパー（末尾スラッシュ統一・小文字化）
      const normalizeUrl = (url) => {
        try {
          const u = new URL(url);
          u.hostname = u.hostname.toLowerCase();
          if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) u.pathname += '/';
          return u.toString();
        } catch { return url; }
      };
      // pageScreenshots コレクションから取得
      const ssSnap = await getDocs(collection(db, 'sites', selectedSiteId, 'pageScreenshots'));
      ssSnap.forEach(d => {
        if (d.id !== '_meta' && d.data().url && d.data().screenshotUrl) {
          map[normalizeUrl(d.data().url)] = d.data().screenshotUrl;
        }
      });
      // pageScrapingData からもスクショURLを取得（フォールバック）
      const scrapingSnap = await getDocs(collection(db, 'sites', selectedSiteId, 'pageScrapingData'));
      scrapingSnap.forEach(d => {
        const data = d.data();
        if (data.pageUrl && data.screenshotUrl) {
          const key = normalizeUrl(data.pageUrl);
          if (!map[key]) map[key] = data.screenshotUrl;
        }
      });
      return map;
    },
    enabled: !!selectedSiteId,
    staleTime: 5 * 60 * 1000,
  });

  // スクショ撮影完了をリアルタイム監視 → キャッシュ自動更新
  const lastCapturedAtRef = useRef(null);
  useEffect(() => {
    if (!selectedSiteId) return;
    const metaRef = doc(db, 'sites', selectedSiteId, 'pageScreenshots', '_meta');
    const unsubscribe = onSnapshot(metaRef, (snap) => {
      if (!snap.exists()) return;
      const ts = snap.data().lastCapturedAt?.toMillis?.() || null;
      // 初回は記録のみ、2回目以降（値が変わった時）にキャッシュ更新
      if (lastCapturedAtRef.current !== null && ts !== lastCapturedAtRef.current) {
        queryClient.invalidateQueries({ queryKey: ['pageScreenshots', selectedSiteId] });
      }
      lastCapturedAtRef.current = ts;
    });
    return () => { unsubscribe(); lastCapturedAtRef.current = null; };
  }, [selectedSiteId, queryClient]);

  // URLを正規化するヘルパー（Before照合用）
  const normalizeUrlForMatch = (url) => {
    try {
      const u = new URL(url);
      u.hostname = u.hostname.toLowerCase();
      if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) u.pathname += '/';
      return u.toString();
    } catch { return url; }
  };

  // Before スクリーンショットURLを解決する関数（表示時に呼び出し）
  const getBeforeScreenshotUrl = (targetPageUrl) => {
    if (!targetPageUrl) return null;
    const normalized = normalizeUrlForMatch(targetPageUrl);
    return pageScreenshotsMap[normalized] || pageScreenshotsMap[targetPageUrl] || null;
  };

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

  // 改善案が0件の場合、方針選択モーダルを自動表示（初回のみ）
  useEffect(() => {
    if (!improvementsLoading && improvements.length === 0 && !isViewer && !isGenerationModalOpen && !hasAutoOpenedFocusRef.current) {
      hasAutoOpenedFocusRef.current = true;
      setIsFocusModalOpen(true);
    }
  }, [improvementsLoading, improvements.length, isViewer, isGenerationModalOpen]);

  // ドロワーで表示中のアイテムをデータ更新に同期（モックアップ生成完了時など）
  useEffect(() => {
    if (drawerItem && improvements.length > 0) {
      const updated = improvements.find(i => i.id === drawerItem.id);
      if (updated && (updated.mockupHtml !== drawerItem.mockupHtml)) {
        setDrawerItem(updated);
        // モックアップ生成完了時はAfterタブに切り替え
        if (updated.mockupHtml && !drawerItem.mockupHtml) {
          setDrawerTab('after');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [improvements]);

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
      // 完了ダイアログを表示（改善反映日入力 + 効果計測開始）
      setCompletionItem(item);
      setIsCompletionDialogOpen(true);
    } else {
      // 完了→他ステータスへの差し戻し時: effectMeasurementをsuspendedに
      if (item.status === 'completed' && item.effectMeasurement) {
        updateData['effectMeasurement.status'] = 'suspended';
        updateData['emStatus'] = 'suspended';
      }
      updateMutation.mutate({ id: item.id, data: updateData });
    }
  };

  // 完了ダイアログの確認ハンドラー
  const handleCompletionConfirm = async ({ effectiveDate, generateNextStep }) => {
    if (!completionItem) return;
    setIsCompletionLoading(true);

    try {
      // 1. ステータスを完了に更新
      const updateData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        effectiveDate,
      };
      await updateMutation.mutateAsync({ id: completionItem.id, data: updateData });

      // 2. Before指標取得をバックグラウンドで実行
      const fetchBeforeMetricsFn = httpsCallable(functions, 'fetchBeforeMetrics');
      fetchBeforeMetricsFn({
        siteId: selectedSiteId,
        improvementId: completionItem.id,
        effectiveDate,
        category: completionItem.category || 'other',
        targetPageUrl: completionItem.targetPageUrl || null,
      }).then(() => {
        toast.success('効果計測のBefore指標を取得しました');
      }).catch((err) => {
        console.error('[CompletionConfirm] Before指標取得エラー:', err);
        toast.error('Before指標の取得に失敗しました。後で再取得できます。');
      });

      // 3. 次ステップ提案を生成（ユーザーが選択した場合）
      if (generateNextStep) {
        const generateFn = httpsCallable(functions, 'generateImprovements');
        generateFn({
          siteId: selectedSiteId,
          improvementFocus: 'auto',
          userNote: `前回完了した改善: 「${completionItem.title}」（カテゴリ: ${completionItem.category || 'other'}、期待効果: ${completionItem.expectedImpact || '不明'}）。この改善の次ステップとして最適な提案を1-2件生成してください。`,
          triggeredBy: 'completion',
          autoGenerated: true,
        }).then((result) => {
          const count = result.data?.count || 0;
          if (count > 0) {
            toast.success(`次ステップの改善提案を${count}件生成しました`);
            queryClient.invalidateQueries({ queryKey: ['improvements'] });
          }
        }).catch((err) => {
          console.error('[CompletionConfirm] 次ステップ提案生成エラー:', err);
          toast.error('次ステップ提案の生成に失敗しました');
        });
      }

      // 4. 完了ダイアログを閉じてEvaluationModalを表示
      setIsCompletionDialogOpen(false);
      setCompletionItem(null);
      setEvaluatingItem({ ...completionItem, ...updateData });
      setIsEvaluationOpen(true);
      toast.success('改善タスクを完了にしました');

    } catch (err) {
      console.error('[CompletionConfirm] Error:', err);
      toast.error('ステータスの更新に失敗しました');
    } finally {
      setIsCompletionLoading(false);
    }
  };

  // ステータス絞り込み
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredImprovements = useMemo(() => {
    if (statusFilter === 'all') return improvements;
    return improvements.filter(item => (item.status || 'draft') === statusFilter);
  }, [improvements, statusFilter]);

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

  const openDrawer = (item) => {
    setDrawerItem(item);
    setDrawerTab(item.mockupHtml ? 'after' : 'compare');
    setAfterIframeHeight(null);
  };
  const closeDrawer = () => setDrawerItem(null);
  const navigateDrawer = (direction) => {
    if (!drawerItem) return;
    const idx = sortedImprovements.findIndex(i => i.id === drawerItem.id);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < sortedImprovements.length) {
      const nextItem = sortedImprovements[nextIdx];
      setDrawerItem(nextItem);
      setDrawerTab(nextItem.mockupHtml ? 'after' : 'compare');
      setAfterIframeHeight(null);
    }
  };

  const handleBulkDeleteDetailView = () => {
    const count = detailViewSelectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`選択した${count}件の改善案を削除しますか？`)) return;
    const ids = Array.from(detailViewSelectedIds);
    Promise.allSettled(ids.map(id => deleteDoc(doc(db, 'sites', selectedSiteId, 'improvements', id))))
      .then((results) => {
        const failed = results.filter(r => r.status === 'rejected');
        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        setDetailViewSelectedIds(new Set());
        if (failed.length === 0) {
          toast.success(`${count}件を削除しました`);
        } else {
          toast.error(`${count - failed.length}件削除、${failed.length}件失敗しました`);
        }
      });
  };

  const handleBulkStatusChangeDetailView = (newStatus) => {
    const ids = Array.from(detailViewSelectedIds);
    if (ids.length === 0) return;
    // 一括完了は非対応（効果計測には個別の改善反映日入力が必要）
    if (newStatus === 'completed') {
      toast.error('一括での完了変更はできません。各タスクを個別に完了にしてください。');
      return;
    }
    const updateData = { status: newStatus };
    Promise.allSettled(ids.map(id => updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', id), { ...updateData, updatedAt: new Date() })))
      .then((results) => {
        const failed = results.filter(r => r.status === 'rejected');
        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
        queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
        setDetailViewSelectedIds(new Set());
        if (failed.length === 0) {
          toast.success(`${ids.length}件のステータスを更新しました`);
        } else {
          toast.error(`${ids.length - failed.length}件更新、${failed.length}件失敗しました`);
        }
      });
  };

  if (isSiteLoading || !selectedSiteId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="サイト情報を読み込んでいます..." />
        </div>
      </div>
    );
  }

  if (isFree) {
    return <UpgradeModal isOpen={true} onClose={() => navigate('/dashboard')} />;
  }

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={null}
          setDateRange={null}
          showDateRange={false}
          showSiteInfo={false}
          showExport={false}
          improveActions={
            !isViewer && (
              <>
                {(() => {
                  const remaining = getRemainingByType('improvement');
                  return (
                    <button
                      onClick={() => {
                        if (!selectedSiteId) return;
                        setIsFocusModalOpen(true);
                      }}
                      className="relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-pink-600"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI改善案生成
                      {remaining !== null && (
                        <span
                          className="absolute -top-2 -right-2 flex h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-md whitespace-nowrap"
                          title={`${plan?.displayName || 'プラン'}：AI改善案生成の今月の残り回数`}
                        >
                          {remaining === -1 ? '無制限' : `${remaining}回`}
                        </span>
                      )}
                    </button>
                  );
                })()}
                <Button
                  color="blue"
                  onClick={() => {
                    setEditingItem(null);
                    setIsDialogOpen(true);
                  }}
                >
                  手動で追加
                </Button>
              </>
            )
          }
          customDownload={
            improvements.length > 0 ? (() => {
              const canExport = checkCanGenerate('excelExport');
              return (
                <div className="relative" ref={downloadMenuRef}>
                  <button
                    onClick={() => !isExporting && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    disabled={isExporting}
                    className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="改善内容ダウンロード"
                  >
                    {isExporting ? (
                      <DotWaveSpinner size="xs" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>ダウンロード</span>
                  </button>
                  {isDownloadMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={async () => {
                          setIsDownloadMenuOpen(false);
                          if (!canExport) {
                            toast.error('今月のExcelエクスポート上限に達しました。');
                            return;
                          }
                          setIsExporting(true);
                          try {
                            await downloadImprovementsExcel(improvements, selectedSite?.siteName);
                            const incrementExportUsageFn = httpsCallable(functions, 'incrementExportUsage');
                            await incrementExportUsageFn({ type: 'excel' }).catch(() => {});
                            toast.success('Excelダウンロードが完了しました');
                          } catch (e) {
                            toast.error(e?.message || 'ダウンロードに失敗しました');
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={!canExport}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${!canExport ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <ExcelIcon className="h-4 w-4" disabled={!canExport} />
                        Excel
                        {!canExport && <span className="ml-auto text-xs text-gray-400">上限</span>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })() : null
          }
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
                改善する
              </h2>
              {/* サイトマップ状況表示（AI改善案生成でこのデータを反映） */}
              {scrapingStatus && scrapingStatus.lastScrapedAt && (
                <p className="mt-1 text-body-color">
                  サイトマップデータ: 最終更新{' '}
                  {new Date(scrapingStatus.lastScrapedAt.toDate ? scrapingStatus.lastScrapedAt.toDate() : scrapingStatus.lastScrapedAt).toLocaleDateString('ja-JP')}{' '}
                  （{scrapingStatus.totalPagesScraped || 0}ページ取得済み・AI改善案に反映）
                </p>
              )}
              {scrapingStatus && scrapingStatus.hasDataOnly && (
                <p className="mt-1 text-body-color">
                  サイトマップデータ: 取得済み（初回登録時などのスクレイピング・AI改善案に反映）
                </p>
              )}
              {!scrapingStatus && (
                <p className="mt-1 text-amber-600 dark:text-amber-400">
                  サイトマップデータ未取得。管理画面から「スクレイピング開始」を実行すると、AI改善案の精度が向上します。
                </p>
              )}
              {/* 自動生成トグル */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={async () => {
                    const newVal = !selectedSite?.autoImprovementEnabled;
                    try {
                      await updateDoc(doc(db, 'sites', selectedSiteId), { autoImprovementEnabled: newVal });
                      toast.success(newVal ? '月次自動生成を有効にしました' : '月次自動生成を無効にしました');
                    } catch { toast.error('設定の変更に失敗しました'); }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    selectedSite?.autoImprovementEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-3'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                    selectedSite?.autoImprovementEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-xs text-body-color">月次自動生成 {selectedSite?.autoImprovementEnabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* ステータス絞り込み */}
              {improvements.length > 0 && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">すべてのステータス</option>
                  <option value="draft">{statusLabels.draft}</option>
                  <option value="in_progress">{statusLabels.in_progress}</option>
                  <option value="completed">{statusLabels.completed}</option>
                  <option value="archived">{statusLabels.archived}</option>
                </select>
              )}
            </div>
          </div>

          <ImprovementFocusModal
            isOpen={isFocusModalOpen}
            onClose={() => setIsFocusModalOpen(false)}
            onConfirm={async (improvementFocus, userNote) => {
              // プラン上限チェック（生成前）
              const remaining = getRemainingByType('improvement');
              if (remaining === 0) {
                setIsFocusModalOpen(false);
                setIsUpgradeModalOpen(true);
                return;
              }
              setIsGenerationModalOpen(true);
              setGenerationStatus('loading');
              try {
                await generateAndAddImprovements(
                  selectedSiteId,
                  currentUser?.email,
                  async (status, count, error) => {
                    setGenerationStatus(status);
                    if (status === 'success') {
                      setIsGenerationModalOpen(false);
                      toast.success(`${count}件の改善案を追加しました`);
                      queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
                    } else if (status === 'error') {
                      setIsGenerationModalOpen(false);
                      if (error && error.includes('上限に達しました')) {
                        setIsUpgradeModalOpen(true);
                      } else {
                        toast.error(error || '改善案の生成に失敗しました');
                      }
                    }
                  },
                  { improvementFocus, userNote }
                );
              } catch (err) {
                const msg = err?.message || '生成に失敗しました';
                setIsGenerationModalOpen(false);
                if (msg.includes('上限に達しました')) {
                  setIsUpgradeModalOpen(true);
                } else {
                  toast.error(msg);
                }
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
                        <Button
                          outline
                          type="button"
                          onClick={() => {
                            const firstId = Array.from(detailViewSelectedIds)[0];
                            const item = sortedImprovements.find((i) => i.id === firstId);
                            if (item) {
                              setEditingItem(item);
                              setIsDialogOpen(true);
                            }
                          }}
                        >
                          <Edit data-slot="icon" className="h-4 w-4" />
                          選択した1件を編集
                        </Button>
                        <Button
                          outline
                          type="button"
                          onClick={clearDetailViewSelection}
                        >
                          選択解除
                        </Button>
                      </div>
                      <div className="h-6 w-px bg-stroke dark:bg-dark-3" aria-hidden />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-body-color shrink-0">削除</span>
                        <Button
                          color="red"
                          type="button"
                          onClick={handleBulkDeleteDetailView}
                        >
                          <Trash2 data-slot="icon" className="h-4 w-4" />
                          選択した{detailViewSelectedIds.size}件を削除
                        </Button>
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
                        <Button
                          color="blue"
                          type="button"
                          onClick={() => {
                            const sel = document.getElementById('bulk-status-detail');
                            if (sel) handleBulkStatusChangeDetailView(sel.value);
                          }}
                        >
                          変更
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-stroke dark:border-dark-3 overflow-x-auto overflow-y-visible bg-white dark:bg-dark-2">
                  <table className="w-full min-w-[900px] border-collapse text-sm table-fixed">
                    <thead>
                      <tr>
                        {!isViewer && (
                          <th className="w-[48px] py-3 pl-4 pr-2 bg-gray-50 dark:bg-dark-3 border-b border-stroke dark:border-dark-3 text-center">
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
                        <th className="w-[8%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={() => handleSort('category')} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            カテゴリ
                            {sortKey === 'category' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="w-[6%] text-left py-3 px-3 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('priority'); }} className="inline-flex items-center gap-0.5 hover:opacity-80 whitespace-nowrap" title="クリックで並び替え">
                            優先度
                            {sortKey === 'priority' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="min-w-[200px] w-[52%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">改善内容</th>
                        <th className="w-[100px] min-w-[100px] py-3 px-2 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3 text-center whitespace-nowrap">モック</th>
                        <th className="w-[14%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('estimatedLaborHours'); }} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            目安料金・納期
                            {sortKey === 'estimatedLaborHours' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                        <th className="w-[10%] text-left py-3 px-4 bg-gray-50 dark:bg-dark-3 text-sm font-semibold text-body-color border-b border-stroke dark:border-dark-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSort('status'); }} className="inline-flex items-center gap-0.5 hover:opacity-80" title="クリックで並び替え">
                            ステータス
                            {sortKey === 'status' && (sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedImprovements.length === 0 ? (
                        <tr><td colSpan={isViewer ? 6 : 7} className="py-6 px-4 text-body-color text-center">
                          改善案がありません
                        </td></tr>
                      ) : (
                        sortedImprovements.map((item) => {
                          const isChecked = detailViewSelectedIds.has(item.id);
                          const isDrawerActive = drawerItem?.id === item.id;
                          const isArchived = item.status === 'archived';
                          return (
                            <tr
                              key={item.id}
                              onClick={() => openDrawer(item)}
                              className={`border-b border-gray-100 dark:border-dark-3 cursor-pointer transition-colors ${isArchived ? 'opacity-50' : ''} ${isDrawerActive ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-3'}`}
                            >
                              {!isViewer && (
                                <td className="py-7 pl-4 pr-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleDetailViewSelection(item.id)}
                                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                    title="選択"
                                  />
                                </td>
                              )}
                              <td className="py-7 px-4 align-middle">
                                {item.category && categoryLabels[item.category] && (
                                  <span className={`inline-block rounded px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${categoryColors[item.category] || categoryColors.other}`}>
                                    {categoryLabels[item.category]}
                                  </span>
                                )}
                              </td>
                              <td className="py-7 px-3 align-middle">
                                {item.priority && priorityLabels[item.priority] && (
                                  <span className={`inline-block rounded px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${priorityColors[item.priority] || ''}`}>
                                    {priorityLabels[item.priority]}
                                  </span>
                                )}
                              </td>
                              <td className="py-7 px-4 align-middle">
                                <div className="text-sm font-medium text-dark dark:text-white leading-snug">{item.title}</div>
                                {(item.targetPageUrl || '').trim() && (
                                  <a
                                    href={item.targetPageUrl.startsWith('http') ? item.targetPageUrl : `${siteUrl}${item.targetPageUrl.startsWith('/') ? '' : '/'}${item.targetPageUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-0.5 text-xs text-primary/70 hover:text-primary hover:underline"
                                    title="対象ページを新しいタブで開く"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                    対象ページ
                                  </a>
                                )}
                                <div className="text-sm text-body-color mt-1 line-clamp-1">{item.description || '—'}</div>
                                {item.status === 'draft' && item.createdAt && (() => {
                                  const created = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                                  const days = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
                                  if (days > 0) return <span className={`text-xs ${days > 60 ? 'text-red-500' : days > 30 ? 'text-amber-600' : 'text-body-color'}`}>{days}日前に提案</span>;
                                  return null;
                                })()}
                              </td>
                              <td className="py-7 px-2 align-middle text-center w-[100px] min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                                {item.mockupHtml ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-1 text-[10px] font-bold text-green-600 dark:text-green-400" title="モックアップ生成済み">
                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m4.5 12.75 6 6 9-13.5" /></svg>
                                    モック
                                  </span>
                                ) : item.mockupSkipped ? (
                                  <span className="text-body-color text-sm">—</span>
                                ) : item.targetPageUrl ? (
                                  <button
                                    className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 hover:bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary transition cursor-pointer"
                                    title="モックアップを生成する"
                                    onClick={(e) => { e.stopPropagation(); handleGenerateMockup(item); }}
                                    disabled={mockupGeneratingIds.has(item.id)}
                                  >
                                    {mockupGeneratingIds.has(item.id) ? (
                                      <><DotWaveSpinner size="xs" />生成中</>
                                    ) : (
                                      <><Sparkles className="h-2.5 w-2.5" />モック</>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-body-color text-sm">—</span>
                                )}
                              </td>
                              <td className="py-7 px-4 align-middle">
                                <div className="text-sm font-semibold text-green-600 dark:text-green-400">{formatEstimatedPriceLabel(item.estimatedLaborHours)} <span className="text-sm font-normal text-body-color">（税別）</span></div>
                                <div className="text-sm text-body-color mt-0.5">{formatEstimatedDeliveryLabel(item.estimatedLaborHours)}</div>
                              </td>
                              <td className="py-7 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                <div className="relative inline-block">
                                  <select
                                    value={item.status || 'draft'}
                                    onChange={(e) => handleStatusChange(item, e.target.value)}
                                    className="appearance-none [background-image:none] rounded-lg border border-stroke dark:border-dark-3 bg-white dark:bg-dark-2 pl-3 pr-8 py-1.5 text-sm text-dark dark:text-white focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                                  >
                                    <option value="draft">{statusLabels.draft}</option>
                                    <option value="in_progress">{statusLabels.in_progress}</option>
                                    <option value="completed">{statusLabels.completed}</option>
                                  </select>
                                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 修正内容を制作会社に相談するボタン */}
                {improvements.length > 0 && !isViewer && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setIsConsultationModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-pink-600 hover:shadow-lg"
                    >
                      <Mail className="h-5 w-5" />
                      修正内容を制作会社に相談する
                    </button>
                  </div>
                )}
              </div>

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
        onDeleted={() => setDrawerItem(null)}
        siteId={selectedSiteId}
        editingItem={editingItem}
      />

      <CompletionDialog
        isOpen={isCompletionDialogOpen}
        onClose={() => {
          setIsCompletionDialogOpen(false);
          setCompletionItem(null);
        }}
        item={completionItem}
        onConfirm={handleCompletionConfirm}
        isLoading={isCompletionLoading}
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
        isOpen={isGenerationModalOpen && generationStatus === 'loading'}
        onCancel={() => {
          setIsGenerationModalOpen(false);
          setGenerationStatus('loading');
        }}
      />

      {/* 修正を相談するボタン（テーブル下・中央配置） */}

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

      {/* プランアップグレードモーダル（上限超過時） */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* サイドドロワー */}
      {drawerItem && (() => {
        const item = drawerItem;
        const currentIdx = sortedImprovements.findIndex(i => i.id === item.id);
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx < sortedImprovements.length - 1;
        const targetUrl = (item.targetPageUrl || '').trim();
        const fullTargetUrl = targetUrl ? (targetUrl.startsWith('http') ? targetUrl : `${siteUrl}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`) : '';

        return createPortal(
          <div className="fixed inset-0 z-[100]">
            {/* オーバーレイ（ドロワーの背面） */}
            <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />

            {/* ドロワー本体（オーバーレイの前面） */}
            <div className="absolute top-0 bottom-0 right-0 w-full sm:w-[85vw] max-w-[1400px] bg-white dark:bg-dark-2 shadow-2xl flex flex-col">

              {/* ドロワーヘッダー */}
              <div className="px-4 sm:px-10 py-5 border-b border-gray-200 dark:border-dark-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-dark dark:text-white flex-1 min-w-0 mr-4 line-clamp-2">{item.title}</h2>
                  <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-3 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {fullTargetUrl && (
                    <>
                      <a href={fullTargetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />
                        対象ページを開く
                      </a>
                      <span className="text-gray-300 dark:text-dark-3">|</span>
                    </>
                  )}
                  {item.category && categoryLabels[item.category] && (
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${categoryColors[item.category] || categoryColors.other}`}>
                      {categoryLabels[item.category]}
                    </span>
                  )}
                  {item.priority && priorityLabels[item.priority] && (
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${priorityColors[item.priority] || ''}`}>
                      優先度: {priorityLabels[item.priority]}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {item.status === 'archived' ? (
                      <button
                        onClick={async () => {
                          await updateDoc(doc(db, 'sites', selectedSiteId, 'improvements', item.id), {
                            status: 'draft', isStale: false, archivedAt: null, archivedReason: null,
                          });
                          setDrawerItem({ ...item, status: 'draft' });
                          queryClient.invalidateQueries({ queryKey: ['improvements'] });
                          toast.success('提案を復元しました');
                        }}
                        className="text-sm border border-gray-200 dark:border-dark-3 rounded-lg px-3 py-1.5 text-primary hover:bg-gray-50 dark:hover:bg-dark-3"
                      >
                        起案に復元
                      </button>
                    ) : (
                    <div className="relative inline-block">
                      <select
                        value={item.status || 'draft'}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          handleStatusChange(item, newStatus);
                          if (newStatus !== 'completed') {
                            setDrawerItem({ ...item, status: newStatus });
                          }
                        }}
                        className="appearance-none [background-image:none] text-sm border border-gray-200 dark:border-dark-3 rounded-lg pl-3 pr-8 py-1.5 cursor-pointer bg-white dark:bg-dark-2 text-dark dark:text-white"
                      >
                        <option value="draft">{statusLabels.draft}</option>
                        <option value="in_progress">{statusLabels.in_progress}</option>
                        <option value="completed">{statusLabels.completed}</option>
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </div>
                    )}
                    {!isViewer && (
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsDialogOpen(true);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-dark-3 rounded-lg px-3 py-1.5"
                      >
                        編集
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ドロワーコンテンツ */}
              <div className="flex-1 overflow-hidden flex">

                {/* 左カラム: テキスト情報 */}
                <div className={`shrink-0 border-r border-gray-100 dark:border-dark-3 overflow-y-auto p-8 ${item.mockupHtml || (item.targetPageUrl && !item.mockupSkipped) ? 'w-full sm:w-[400px]' : 'w-full border-r-0'}`}>
                  <div className={`${!item.mockupHtml && (!item.targetPageUrl || item.mockupSkipped) ? 'max-w-3xl mx-auto' : ''}`}>
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-primary" />
                        改善内容
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-7">{item.description || '—'}</p>
                    </div>

                    {item.expectedImpact && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6">
                        <div className="text-sm font-bold text-green-800 dark:text-green-300 mb-1.5 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          期待する効果
                        </div>
                        <p className="text-sm text-green-800 dark:text-green-300">{item.expectedImpact}</p>
                      </div>
                    )}

                    <hr className="border-gray-200 dark:border-dark-3 mb-6" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div className="bg-gray-50 dark:bg-dark-3 rounded-xl p-5">
                        <div className="text-sm font-bold text-gray-800 dark:text-white mb-1.5 flex items-center gap-1.5">
                          <span className="text-green-600 text-base font-bold">¥</span>
                          目安料金
                        </div>
                        <div className={`font-bold text-gray-900 dark:text-white ${item.mockupHtml || (item.targetPageUrl && !item.mockupSkipped) ? 'text-lg' : 'text-xl'}`}>
                          {formatEstimatedPriceLabel(item.estimatedLaborHours)}
                        </div>
                        <div className="text-xs text-body-color mt-0.5">（税別）</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-dark-3 rounded-xl p-5">
                        <div className="text-sm font-bold text-gray-800 dark:text-white mb-1.5 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-500" />
                          目安納期
                        </div>
                        <div className={`font-bold text-gray-900 dark:text-white ${item.mockupHtml || (item.targetPageUrl && !item.mockupSkipped) ? 'text-lg' : 'text-xl'}`}>
                          {formatEstimatedDeliveryLabel(item.estimatedLaborHours)}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-5">※目安料金・納期についてはAIが算出した目安となり実際の料金・納期とは異なる可能性があります。</p>

                    {/* 効果計測パネル（完了タスクのみ） */}
                    <EffectMeasurementPanel
                      item={item}
                      siteId={selectedSiteId}
                      onRefresh={() => {
                        queryClient.invalidateQueries({ queryKey: ['improvements', selectedSiteId] });
                        queryClient.invalidateQueries({ queryKey: ['completed-improvements', selectedSiteId] });
                      }}
                    />
                  </div>
                </div>

                {/* 右カラム: モックアップ（モックアップ対象の場合のみ表示） */}
                {(item.mockupHtml || (item.targetPageUrl && !item.mockupSkipped)) && (
                <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-dark">
                  {item.mockupHtml ? (
                    <>
                      {/* タブ（sticky） */}
                      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-dark/95 backdrop-blur px-4 sm:px-8 pt-5 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-800 dark:text-white">改善モックアップ</h3>
                          <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-400">AI生成</span>
                        </div>
                        <div className="flex gap-0.5 bg-gray-200/70 dark:bg-dark-3 rounded-lg p-0.5">
                          {[
                            { key: 'compare', label: '並べて比較' },
                            { key: 'before', label: 'Before' },
                            { key: 'after', label: 'After' },
                          ].map(tab => (
                            <button
                              key={tab.key}
                              onClick={() => setDrawerTab(tab.key)}
                              className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${drawerTab === tab.key ? 'bg-white dark:bg-dark-2 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'}`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 並べて比較 */}
                      {drawerTab === 'compare' && (
                        <div className="px-4 sm:px-8 pb-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-gray-400 mb-2">Before（現在）</div>
                              {/* ブラウザフレーム */}
                              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-3 shadow-lg">
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                  <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                  </div>
                                  <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                                </div>
                                <div className="bg-white dark:bg-dark-2">
                                  {(getBeforeScreenshotUrl(item.targetPageUrl)) ? (
                                    <img src={getBeforeScreenshotUrl(item.targetPageUrl)} alt="現在のページ" className="w-full h-auto" />
                                  ) : (
                                    <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-body-color">
                                      <svg className="h-5 w-5 animate-spin text-primary/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                      スクリーンショットを取得中...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-primary mb-2">After（改善案適用後）</div>
                              {/* ブラウザフレーム */}
                              <div className="rounded-xl overflow-hidden border border-primary/30 shadow-lg" style={{ height: afterIframeHeight ? `${afterIframeHeight * 0.5 + 44}px` : '844px' }}>
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                  <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                  </div>
                                  <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                                </div>
                                <div className="bg-white dark:bg-dark-2 relative pt-3" style={{ height: afterIframeHeight ? `${afterIframeHeight * 0.5 + 12}px` : '812px' }}>
                                  <iframe
                                    title="改善モックアップ"
                                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;}[data-changed]{outline:2px solid #3758F9;outline-offset:2px;border-radius:4px;position:relative;z-index:1;}[data-changed]::after{content:attr(data-changed);position:absolute;top:-10px;right:-4px;background:#3758F9;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;line-height:1.4;z-index:9999;pointer-events:none;white-space:nowrap;}${item.mockupCss || ''}</style></head><body>${item.mockupHtml}</body></html>`}
                                    className="absolute top-3 left-0 border-0 pointer-events-none"
                                    sandbox="allow-same-origin"
                                    onLoad={(e) => {
                                      try {
                                        const h = e.target.contentDocument?.documentElement?.scrollHeight;
                                        if (h) setAfterIframeHeight(h);
                                      } catch (_) {}
                                    }}
                                    style={{ height: afterIframeHeight ? `${afterIframeHeight}px` : '2000px', width: '200%', transform: 'scale(0.5)', transformOrigin: 'top left' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Before単体 */}
                      {drawerTab === 'before' && (
                        <div className="px-4 sm:px-8 pb-8">
                          <div className="text-xs font-semibold text-gray-400 mb-2">Before（現在）</div>
                          {/* ブラウザフレーム */}
                          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-3 shadow-lg">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                              <div className="flex gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                              </div>
                              <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                            </div>
                            <div className="bg-white dark:bg-dark-2">
                              {(getBeforeScreenshotUrl(item.targetPageUrl)) ? (
                                <img src={getBeforeScreenshotUrl(item.targetPageUrl)} alt="現在のページ" className="w-full h-auto" />
                              ) : (
                                <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-body-color">
                                  <svg className="h-5 w-5 animate-spin text-primary/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                  スクリーンショットを取得中...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* After単体 */}
                      {drawerTab === 'after' && (
                        <div className="px-4 sm:px-8 pb-8">
                          <div className="text-xs font-semibold text-primary mb-2">After（改善案適用後）</div>
                          {/* ブラウザフレーム */}
                          <div className="rounded-xl overflow-hidden border border-primary/30 shadow-lg">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                              <div className="flex gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                              </div>
                              <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl || 'https://example.com'}</div>
                            </div>
                            <div className="bg-white dark:bg-dark-2 pt-3">
                              <iframe
                                title="改善モックアップ"
                                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;}[data-changed]{outline:2px solid #3758F9;outline-offset:2px;border-radius:4px;position:relative;z-index:1;}[data-changed]::after{content:attr(data-changed);position:absolute;top:-10px;right:-4px;background:#3758F9;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;line-height:1.4;z-index:9999;pointer-events:none;white-space:nowrap;}${item.mockupCss || ''}</style></head><body>${item.mockupHtml}</body></html>`}
                                className="w-full border-0 pointer-events-none"
                                sandbox="allow-same-origin"
                                onLoad={(e) => {
                                  try {
                                    const h = e.target.contentDocument?.documentElement?.scrollHeight;
                                    if (h) setAfterIframeHeight(h);
                                  } catch (_) {}
                                }}
                                style={{ height: afterIframeHeight ? `${afterIframeHeight}px` : '2000px' }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : item.targetPageUrl && !item.mockupHtml && !item.mockupSkipped ? (
                    <>
                      {/* ヘッダー（sticky） */}
                      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-dark/95 backdrop-blur px-4 sm:px-8 pt-5 pb-3 flex items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-800 dark:text-white">改善モックアップ</h3>
                        </div>
                      </div>
                      {/* 並べて比較レイアウト: Before + After(未生成) */}
                      <div className="px-4 sm:px-8 pb-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Before */}
                          <div>
                            <div className="text-xs font-semibold text-gray-400 mb-2">Before（現在）</div>
                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-3 shadow-lg">
                              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                <div className="flex gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl}</div>
                              </div>
                              <div className="bg-white dark:bg-dark-2">
                                {getBeforeScreenshotUrl(item.targetPageUrl) ? (
                                  <img src={getBeforeScreenshotUrl(item.targetPageUrl)} alt="現在のページ" className="w-full h-auto" />
                                ) : (
                                  <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-body-color">
                                  <svg className="h-5 w-5 animate-spin text-primary/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                  スクリーンショットを取得中...
                                </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* After（未生成 / 生成中） */}
                          <div>
                            <div className="text-xs font-semibold text-primary mb-2">After（改善案適用後）</div>
                            <div className="rounded-xl overflow-hidden border border-primary/30 shadow-lg">
                              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-3 px-3 py-2 border-b border-gray-200 dark:border-dark-3">
                                <div className="flex gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="flex-1 mx-2 rounded bg-white dark:bg-dark-2 px-3 py-0.5 text-[10px] text-gray-400 truncate">{item.targetPageUrl}</div>
                              </div>
                              {/* 半透明スクショ背景 + 3ステップCTA */}
                              <div className="relative overflow-hidden bg-white dark:bg-dark-2" style={{ minHeight: '300px' }}>
                                {/* 背景: Beforeスクショ半透明 + グラデーション */}
                                {getBeforeScreenshotUrl(item.targetPageUrl) && (
                                  <img
                                    src={getBeforeScreenshotUrl(item.targetPageUrl)}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover opacity-[0.10]"
                                  />
                                )}
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(55,88,249,0.04) 0%, rgba(255,255,255,0.96) 35%, rgba(255,255,255,1) 100%)' }} />
                                {/* コンテンツ */}
                                <div className="relative z-10 flex flex-col items-center justify-center p-8" style={{ minHeight: '300px' }}>
                                  {mockupGeneratingIds.has(item.id) ? (
                                    <>
                                      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                                        <DotWaveSpinner size="md" />
                                      </div>
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">モックアップを生成しています</p>
                                      <p className="text-xs text-gray-400 dark:text-gray-500">AIがデザインを作成中です。しばらくお待ちください。</p>
                                    </>
                                  ) : (
                                    <>
                                      {/* 3ステップ */}
                                      <div className="w-full max-w-[260px] mb-7">
                                        {[
                                          { num: '1', main: 'ボタンをクリック', sub: 'ワンクリックで生成開始', active: true },
                                          { num: '2', main: 'AIがデザインを作成', sub: '改善内容をもとに自動生成', active: false },
                                          { num: '3', main: 'Before / After で比較', sub: '改善効果を視覚的に確認', active: false },
                                        ].map((step, i) => (
                                          <div key={i} className="flex items-start gap-3 mb-4 last:mb-0 relative">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.active ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-dark-3 text-gray-400'}`}>
                                              {step.num}
                                            </div>
                                            <div>
                                              <div className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">{step.main}</div>
                                              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{step.sub}</div>
                                            </div>
                                            {i < 2 && <div className="absolute left-[13px] top-[30px] w-0.5 h-3 bg-gray-200 dark:bg-dark-3" />}
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        onClick={() => handleGenerateMockup(item)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition cursor-pointer shadow-sm"
                                      >
                                        <Sparkles className="h-4 w-4" />
                                        モックアップを生成する
                                      </button>
                                      <div className="flex items-center gap-1 mt-4 text-[11px] text-gray-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        所要時間: 約30秒
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
                )}
              </div>

              {/* ドロワーフッター */}
              <div className="px-10 py-4 border-t border-gray-200 dark:border-dark-3 flex items-center justify-between shrink-0 bg-gray-50/80 dark:bg-dark-3">
                {!isViewer ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsConsultationModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-pink-600 hover:shadow-md"
                    >
                      <Mail className="h-4 w-4" />
                      制作会社に相談する
                    </button>
                    <Button
                      color="red"
                      outline
                      onClick={() => {
                        if (window.confirm('この改善案を削除しますか？')) {
                          deleteMutation.mutate(item.id);
                          closeDrawer();
                        }
                      }}
                    >
                      削除
                    </Button>
                  </div>
                ) : <div />}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigateDrawer(-1)}
                    disabled={!hasPrev}
                    className={`text-sm font-medium border rounded-lg px-5 py-2 transition ${hasPrev ? 'border-gray-300 dark:border-dark-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 shadow-sm' : 'border-gray-200 dark:border-dark-3 text-gray-300 dark:text-dark-3 cursor-not-allowed'}`}
                  >
                    <ChevronLeft className="h-4 w-4 inline -mt-0.5" /> 前
                  </button>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{currentIdx + 1} / {sortedImprovements.length}</span>
                  <button
                    onClick={() => navigateDrawer(1)}
                    disabled={!hasNext}
                    className={`text-sm font-medium border rounded-lg px-5 py-2 transition ${hasNext ? 'border-gray-300 dark:border-dark-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 shadow-sm' : 'border-gray-200 dark:border-dark-3 text-gray-300 dark:text-dark-3 cursor-not-allowed'}`}
                  >
                    次 <ChevronRight className="h-4 w-4 inline -mt-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

