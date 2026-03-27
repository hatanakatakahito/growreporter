import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { Link, useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { Plus, Edit, Trash2, GitMerge, Settings, Info, TrendingUp, Target, BarChart3, ArrowRight } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 逆算フロー画面
 * フォームページからのコンバージョンフローを分析
 */

const FlowCard = ({ title, value, isFinal = false }) => (
  <div className="flex-1">
    <div className="rounded-xl bg-primary p-6 text-center text-white flex flex-col justify-center h-full transition hover:bg-opacity-90">
      <div className="text-sm uppercase tracking-wider opacity-80">{title}</div>
      <div className="my-2 text-4xl font-bold">{value.toLocaleString()}</div>
    </div>
  </div>
);

const Arrow = ({ rate }) => (
  <div className="flex flex-col items-center justify-center px-4 text-center">
    <div className="mb-1 text-xs text-body-color">遷移率</div>
    <div className="text-xl font-bold text-dark dark:text-white">{rate.toFixed(2)}%</div>
    <GitMerge className="w-10 h-10 text-gray-300 dark:text-gray-600 transform rotate-90" />
  </div>
);

export default function ReverseFlow() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isConversionAlertOpen, setIsConversionAlertOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [flowForm, setFlowForm] = useState({
    flow_name: '',
    entry_page_path: '',
    form_page_path: '',
    target_cv_event: '',
  });

  const queryClient = useQueryClient();

  // AI分析タブへスクロールする関数
  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('逆算フロー');
  }, []);

  // 初回のみコンバージョン未設定アラートを表示（サイトデータ読込完了後に判定）
  useEffect(() => {
    if (!selectedSite || !selectedSiteId) return;
    const conversionEvents = selectedSite.conversionEvents || [];
    if (conversionEvents.length === 0) {
      const hasSeenAlert = sessionStorage.getItem('conversionAlertSeen');
      if (!hasSeenAlert) {
        setIsConversionAlertOpen(true);
        sessionStorage.setItem('conversionAlertSeen', 'true');
      }
    }
  }, [selectedSite, selectedSiteId]);

  // AI分析ボタンのアニメーションは削除（パフォーマンス改善のため）
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIsAnimating(true);
  //     // アニメーション終了後にリセット
  //     setTimeout(() => setIsAnimating(false), 1500);
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, []);

  // コンバージョンイベントの取得
  const conversionEvents = useMemo(() => {
    return selectedSite?.conversionEvents || [];
  }, [selectedSite]);

  // フロー設定の取得（スネークケースに修正）
  const flowSettings = useMemo(() => {
    if (!selectedSite || !selectedSite.reverse_flow_settings) {
      console.log('[ReverseFlow] フロー設定なし', { selectedSite: !!selectedSite });
      return [];
    }
    const settings = Array.isArray(selectedSite.reverse_flow_settings) ? selectedSite.reverse_flow_settings : [];
    console.log('[ReverseFlow] フロー設定取得', { count: settings.length, settings });
    return settings;
  }, [selectedSite]);

  // リロード後に新規フローを自動選択
  useEffect(() => {
    if (!selectedSiteId) return;
    
    // 新規追加後のリロード処理
    const newFlowId = sessionStorage.getItem(`reverse_flow_new_id_${selectedSiteId}`);
    if (newFlowId && flowSettings.length > 0) {
      console.log('[ReverseFlow] リロード後の新規フロー自動選択', { newFlowId });
      setSelectedFlowId(newFlowId);
      
      // フラグとIDをクリア
      sessionStorage.removeItem(`reverse_flow_saved_${selectedSiteId}`);
      sessionStorage.removeItem(`reverse_flow_new_id_${selectedSiteId}`);
    }
    
    // 削除後のリロード処理
    const selectId = sessionStorage.getItem(`reverse_flow_select_id_${selectedSiteId}`);
    if (selectId && flowSettings.length > 0) {
      console.log('[ReverseFlow] 削除後のフロー自動選択', { selectId });
      setSelectedFlowId(selectId);
      
      // フラグとIDをクリア
      sessionStorage.removeItem(`reverse_flow_deleted_${selectedSiteId}`);
      sessionStorage.removeItem(`reverse_flow_select_id_${selectedSiteId}`);
    }
  }, [selectedSiteId, flowSettings]);

  // 選択されたフローの詳細
  const selectedFlow = useMemo(() => {
    const flow = flowSettings.find(f => f.id === selectedFlowId);
    console.log('[ReverseFlow] 選択フロー', { selectedFlowId, flow, flowSettingsCount: flowSettings.length });
    return flow;
  }, [flowSettings, selectedFlowId]);

  // ページパス一覧を取得
  const {
    data: pagePathsData,
    isLoading: pagePathsLoading,
    error: pagePathsError,
  } = useQuery({
    queryKey: ['ga4-page-paths', selectedSiteId, dateRange],
    queryFn: async () => {
      if (!selectedSiteId || !dateRange.from || !dateRange.to) {
        return [];
      }
      
      const formatDate = (date) => {
        if (typeof date === 'string') return date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      try {
        const fetchPagePaths = httpsCallable(functions, 'fetchGA4PagePaths');
        const result = await fetchPagePaths({
          siteId: selectedSiteId,
          startDate: formatDate(dateRange.from),
          endDate: formatDate(dateRange.to),
        });
        
        return result.data.data || [];
      } catch (error) {
        console.error('[ReverseFlow] ページパス取得エラー:', error);
        throw error;
      }
    },
    enabled: !!selectedSiteId && !!dateRange?.from && !!dateRange?.to,
    retry: false,
    initialData: [],
  });

  // React Select用のオプション
  const pagePathOptions = useMemo(() => {
    if (!pagePathsData || pagePathsData.length === 0) {
      return [];
    }
    return pagePathsData.map(item => {
      // 新しい形式（{ path, title }）と古い形式（文字列）の両方に対応
      if (typeof item === 'string') {
        return {
          value: item,
          label: item,
          title: item,
        };
      }
      return {
        value: item.path,
        label: item.path,
        title: item.title,
      };
    });
  }, [pagePathsData]);

  // 初回表示時に最初のフローを選択
  useEffect(() => {
    if (flowSettings.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flowSettings[0].id);
    }
  }, [flowSettings, selectedFlowId]);

  // リロード後の処理（作成・削除後の自動選択）
  useEffect(() => {
    const needsReload = sessionStorage.getItem('reverse_flow_needs_reload');
    
    if (needsReload === 'reloaded' && flowSettings.length > 0) {
      console.log('[ReverseFlow] リロード後の自動選択処理');
      sessionStorage.removeItem('reverse_flow_needs_reload');
      
      const nextId = sessionStorage.getItem('reverse_flow_next_id');
      if (nextId && flowSettings.some(f => f.id === nextId)) {
        console.log('[ReverseFlow] 指定されたフローを選択', { nextId });
        setSelectedFlowId(nextId);
        sessionStorage.removeItem('reverse_flow_next_id');
      }
    }
  }, [flowSettings]);

  // 13ヶ月分の期間を計算
  const monthlyDateRange = useMemo(() => {
    if (!dateRange.to) return { start: null, end: null };
    
    const endDate = new Date(dateRange.to);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 12);
    startDate.setDate(1);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
    };
  }, [dateRange.to]);

  // サマリーデータ取得
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErrorMessage,
  } = useQuery({
    queryKey: ['ga4-reverse-flow-summary', selectedSiteId, dateRange, selectedFlow?.entry_page_path, selectedFlow?.form_page_path, selectedFlow?.target_cv_event],
    queryFn: async () => {
      if (!selectedSiteId || !dateRange.from || !dateRange.to || !selectedFlow?.form_page_path || !selectedFlow?.target_cv_event) {
        return null;
      }
      
      const formatDate = (date) => {
        if (typeof date === 'string') return date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const fetchReverseFlowData = httpsCallable(functions, 'fetchGA4ReverseFlowData');
      const result = await fetchReverseFlowData({
        siteId: selectedSiteId,
        startDate: formatDate(dateRange.from),
        endDate: formatDate(dateRange.to),
        entryPagePath: selectedFlow.entry_page_path || '',
        formPagePath: selectedFlow.form_page_path,
        targetCvEvent: selectedFlow.target_cv_event,
      });

      return result.data.summary;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && !!selectedFlow?.form_page_path && !!selectedFlow?.target_cv_event,
    retry: false,
  });

  // 月次データ取得
  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    isError: monthlyError,
    error: monthlyErrorMessage,
  } = useQuery({
    queryKey: ['ga4-reverse-flow-monthly', selectedSiteId, monthlyDateRange, selectedFlow?.entry_page_path, selectedFlow?.form_page_path, selectedFlow?.target_cv_event],
    queryFn: async () => {
      if (!selectedSiteId || !monthlyDateRange.start || !selectedFlow?.form_page_path || !selectedFlow?.target_cv_event) {
        return null;
      }
      
      const fetchReverseFlowData = httpsCallable(functions, 'fetchGA4ReverseFlowData');
      const result = await fetchReverseFlowData({
        siteId: selectedSiteId,
        startDate: monthlyDateRange.start,
        endDate: monthlyDateRange.end,
        entryPagePath: selectedFlow.entry_page_path || '',
        formPagePath: selectedFlow.form_page_path,
        targetCvEvent: selectedFlow.target_cv_event,
      });

      return result.data.monthlyTable;
    },
    enabled: !!selectedSiteId && !!monthlyDateRange.start && !!selectedFlow?.form_page_path && !!selectedFlow?.target_cv_event,
    retry: false,
  });

  // サイト更新mutation（スネークケースに修正）
  const updateSiteMutation = useMutation({
    mutationFn: async ({ reverse_flow_settings, newFlowId, isDelete }) => {
      console.log('[ReverseFlow] Firestore更新開始', { reverse_flow_settings, newFlowId, isDelete });
      const siteRef = doc(db, 'sites', selectedSiteId);
      await updateDoc(siteRef, { reverse_flow_settings });
      console.log('[ReverseFlow] Firestore更新完了');
      return { newFlowId, isDelete };
    },
    onSuccess: async (data) => {
      console.log('[ReverseFlow] Mutation成功', { newFlowId: data.newFlowId, isDelete: data.isDelete });
      
      // サイトデータを再取得して完全に更新されるまで待つ
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      await queryClient.refetchQueries({ queryKey: ['sites'] });
      
      console.log('[ReverseFlow] サイトデータ再取得完了');
      
      // ダイアログを閉じる
      setIsDialogOpen(false);
      setEditingFlow(null);
      setFlowForm({ flow_name: '', entry_page_path: '', form_page_path: '', target_cv_event: '' });

      // 削除時の処理
      if (data.isDelete) {
        console.log('[ReverseFlow] 削除時の処理開始');
        
        const needsReload = sessionStorage.getItem('reverse_flow_needs_reload');
        
        if (needsReload === 'delete') {
          console.log('[ReverseFlow] 削除後リロード実行');
          sessionStorage.setItem('reverse_flow_needs_reload', 'reloaded');
          
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
        return;
      }
      
      // 新規追加時の処理
      if (data.newFlowId) {
        console.log('[ReverseFlow] 新規追加時の処理開始');
        
        const needsReload = sessionStorage.getItem('reverse_flow_needs_reload');
        
        if (needsReload === 'create') {
          console.log('[ReverseFlow] 作成後リロード実行');
          sessionStorage.setItem('reverse_flow_needs_reload', 'reloaded');
          
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    },
    onError: (error) => {
      console.error('[ReverseFlow] Mutation失敗', error);
    },
  });

  const handleOpenDialog = (flow = null) => {
    if (flow) {
      setEditingFlow(flow);
      setFlowForm({
        flow_name: flow.flow_name,
        entry_page_path: flow.entry_page_path || '',
        form_page_path: flow.form_page_path,
        target_cv_event: flow.target_cv_event,
      });
    } else {
      setEditingFlow(null);
      setFlowForm({ flow_name: '', entry_page_path: '', form_page_path: '', target_cv_event: '' });
    }
    setIsDialogOpen(true);
    
    // ダイアログを開いた時にページパスを再取得
    queryClient.invalidateQueries({ queryKey: ['ga4-page-paths', selectedSiteId, dateRange] });
  };

  const handleSaveFlow = () => {
    let newFlowSettings = [...flowSettings];
    let newFlowId = null;
    
    console.log('[ReverseFlow] 保存開始', {
      editingFlow,
      flowForm,
      currentFlowSettings: flowSettings,
    });
    
    if (editingFlow) {
      newFlowSettings = newFlowSettings.map(f => 
        f.id === editingFlow.id ? { ...f, ...flowForm } : f
      );
    } else {
      const newFlow = {
        id: `flow_${Date.now()}`,
        ...flowForm,
      };
      newFlowSettings.push(newFlow);
      newFlowId = newFlow.id;
      console.log('[ReverseFlow] 新規フロー作成', { newFlow, newFlowId });
      
      // リロードフラグを設定（作成後にリロード）
      sessionStorage.setItem('reverse_flow_needs_reload', 'create');
      sessionStorage.setItem('reverse_flow_next_id', newFlowId);
    }
    
    console.log('[ReverseFlow] 保存するフロー設定', { newFlowSettings, newFlowId });
    updateSiteMutation.mutate({ reverse_flow_settings: newFlowSettings, newFlowId });
  };

  const handleDeleteFlow = (flowId) => {
    // 削除確認
    const flowToDelete = flowSettings.find(f => f.id === flowId);
    if (!flowToDelete) return;
    
    if (!window.confirm(`フロー「${flowToDelete.flow_name}」を削除しますか？`)) {
      return;
    }
    
    console.log('[ReverseFlow] 削除開始', { flowId, flowToDelete });
    
    const newFlowSettings = flowSettings.filter(f => f.id !== flowId);
    
    // 選択中のフローを削除する場合
    let nextFlowId = null;
    if (selectedFlowId === flowId && newFlowSettings.length > 0) {
      nextFlowId = newFlowSettings[0].id;
    }
    
    console.log('[ReverseFlow] 削除後のフロー設定', { 
      newFlowSettingsCount: newFlowSettings.length, 
      nextFlowId 
    });
    
    // リロードフラグを設定（削除後にリロード）
    sessionStorage.setItem('reverse_flow_needs_reload', 'delete');
    if (nextFlowId) {
      sessionStorage.setItem('reverse_flow_next_id', nextFlowId);
    }
    
    updateSiteMutation.mutate({ reverse_flow_settings: newFlowSettings, isDelete: true });
  };

  const isLoading = summaryLoading || monthlyLoading;

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={false}
          hideComparison={true}
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-dark dark:text-white">
              逆算フロー
            </h2>
            <p className="mt-0.5 text-sm text-body-color">
              フォームページからのコンバージョンフローを分析
            </p>
          </div>

          {/* コンバージョン未設定時のガイド */}
          {(!conversionEvents || conversionEvents.length === 0) && (
            <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="border-b border-stroke p-6 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">逆算フローとは？</h3>
              </div>
              <div className="p-6">
                <p className="mb-6 text-sm leading-relaxed text-body-color">
                  「起点ページ → フォームページ → 送信完了（CV）」の各ステップを数値で可視化し、
                  どこでユーザーが離脱しているかを特定できるコンバージョン分析機能です。
                </p>

                {/* サンプルフロー図 */}
                <div className="mb-6 rounded-lg bg-gray-50 p-5 dark:bg-dark-3">
                  <p className="mb-3 text-xs font-semibold text-body-color">分析イメージ</p>
                  <div className="flex items-center justify-center gap-2 text-center">
                    <div className="flex-1 rounded-lg bg-primary/10 px-3 py-4">
                      <div className="text-xs text-body-color">サービスページ</div>
                      <div className="mt-1 text-xl font-bold text-dark dark:text-white">5,000 <span className="text-xs font-normal">PV</span></div>
                    </div>
                    <div className="flex flex-col items-center text-xs text-body-color">
                      <span>遷移率</span>
                      <span className="font-bold text-dark dark:text-white">8.0%</span>
                      <ArrowRight className="h-5 w-5 text-gray-300" />
                    </div>
                    <div className="flex-1 rounded-lg bg-primary/10 px-3 py-4">
                      <div className="text-xs text-body-color">お問い合わせフォーム</div>
                      <div className="mt-1 text-xl font-bold text-dark dark:text-white">400 <span className="text-xs font-normal">PV</span></div>
                    </div>
                    <div className="flex flex-col items-center text-xs text-body-color">
                      <span>遷移率</span>
                      <span className="font-bold text-dark dark:text-white">25.0%</span>
                      <ArrowRight className="h-5 w-5 text-gray-300" />
                    </div>
                    <div className="flex-1 rounded-lg bg-primary/10 px-3 py-4">
                      <div className="text-xs text-body-color">送信完了</div>
                      <div className="mt-1 text-xl font-bold text-primary">100 <span className="text-xs font-normal">件</span></div>
                    </div>
                  </div>
                </div>

                {/* 活用シーン */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
                    <Target className="mb-2 h-6 w-6 text-primary" />
                    <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">離脱ポイントの特定</h4>
                    <p className="text-xs leading-relaxed text-body-color">
                      フォームへの遷移率が低いのか、フォーム入力の完了率が低いのか、ボトルネックを数値で特定できます。
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/10">
                    <TrendingUp className="mb-2 h-6 w-6 text-secondary" />
                    <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">月次推移の追跡</h4>
                    <p className="text-xs leading-relaxed text-body-color">
                      各ステップの遷移率を月ごとに追跡し、改善施策の効果をCVR（コンバージョン率）で確認できます。
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/10">
                    <BarChart3 className="mb-2 h-6 w-6 text-purple-500" />
                    <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">複数フローの比較</h4>
                    <p className="text-xs leading-relaxed text-body-color">
                      お問い合わせ・資料請求・会員登録など、複数のコンバージョンフローを登録して比較分析できます。
                    </p>
                  </div>
                </div>

                {/* 設定への導線 */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <Settings className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                        利用するにはコンバージョン設定が必要です
                      </p>
                      <p className="mb-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                        サイト設定の「コンバージョン定義」でGA4のコンバージョンイベント（お問い合わせ送信、資料請求完了など）を登録してください。
                      </p>
                      <button
                        onClick={() => navigate(`/sites/${selectedSiteId}/edit?step=4`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                      >
                        <Settings className="h-4 w-4" />
                        コンバージョンを設定する
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {conversionEvents && conversionEvents.length > 0 && (
            <>
              {/* フロー設定カード */}
              <div className="mb-8 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">フロー設定</h3>
                  <button
                    onClick={() => handleOpenDialog()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    新規フロー追加
                  </button>
                </div>

                <div className="p-6">
                  {flowSettings.length === 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                          <div>
                            <p className="mb-1 text-sm font-semibold text-blue-800 dark:text-blue-200">
                              フロー設定が登録されていません
                            </p>
                            <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                              「新規フロー追加」ボタンから、分析したいコンバージョンフローを設定してください。
                              起点ページ・フォームページ・CVイベントを指定するだけで分析を開始できます。
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
                        <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">設定例</h4>
                        <ul className="space-y-2 text-xs leading-relaxed text-body-color">
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                            <span><strong>お問い合わせフロー:</strong> サービスページ → /contact → 送信完了イベント</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                            <span><strong>資料請求フロー:</strong> 全ページ → /download → ダウンロード完了イベント</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                            <span><strong>会員登録フロー:</strong> LP → /register → 登録完了イベント</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center gap-4">
                        <label className="text-sm font-medium text-dark dark:text-white">表示するフロー:</label>
                        <select
                          value={selectedFlowId || ''}
                          onChange={(e) => setSelectedFlowId(e.target.value)}
                          className="w-64 rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none transition-all duration-200 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          disabled={updateSiteMutation.isPending}
                        >
                          {flowSettings.map(flow => (
                            <option key={flow.id} value={flow.id}>
                              {flow.flow_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {updateSiteMutation.isPending || (selectedFlowId && !selectedFlow) ? (
                        <div className="py-8">
                          <LoadingSpinner message="フロー設定を読み込んでいます..." />
                        </div>
                      ) : selectedFlow ? (
                        <div className="rounded-lg bg-gray-50 p-4 space-y-2 dark:bg-dark-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-body-color">フロー名</p>
                              <p className="font-semibold text-dark dark:text-white">{selectedFlow.flow_name}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenDialog(selectedFlow)}
                                className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark"
                              >
                                <Edit className="h-4 w-4" />
                                編集
                              </button>
                              <button
                                onClick={() => handleDeleteFlow(selectedFlow.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-dark-3 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                削除
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-body-color">起点ページパス</p>
                              <p className="font-semibold text-dark dark:text-white">{selectedFlow.entry_page_path || '全ページ'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-body-color">フォームページパス</p>
                              <p className="font-semibold text-dark dark:text-white">{selectedFlow.form_page_path}</p>
                            </div>
                            <div>
                              <p className="text-sm text-body-color">送信完了 (CV)</p>
                              <p className="font-semibold text-dark dark:text-white">
                                {conversionEvents.find(e => e.eventName === selectedFlow.target_cv_event)?.displayName || selectedFlow.target_cv_event}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {/* データ表示 */}
              {selectedFlow && (
                <div className="space-y-8">
                  {/* フローサマリー */}
                  {summaryLoading || (selectedFlow && !summaryData && !summaryError) ? (
                    <LoadingSpinner message="フローデータを読み込んでいます..." />
                  ) : summaryError ? (
                    <ErrorAlert message={summaryErrorMessage?.message || 'データの読み込みに失敗しました。'} />
                  ) : summaryData ? (
                    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                      <h3 className="mb-6 text-lg font-semibold text-dark dark:text-white">コンバージョンフロー</h3>
                      {(() => {
                        const hasEntry = selectedFlow.entry_page_path && summaryData.entryPageViews != null;
                        const startViews = hasEntry ? summaryData.entryPageViews : summaryData.totalSiteViews;
                        const startLabel = hasEntry ? '起点PV' : '全PV';
                        return (
                          <>
                            <div className="flex items-stretch justify-center">
                              <FlowCard title={startLabel} value={startViews} />
                              <Arrow rate={startViews > 0 ? (summaryData.formPageViews / startViews) * 100 : 0} />
                              <FlowCard title="フォームPV" value={summaryData.formPageViews} />
                              <Arrow rate={summaryData.formPageViews > 0 ? (summaryData.submissionComplete / summaryData.formPageViews) * 100 : 0} />
                              <FlowCard title="送信完了" value={summaryData.submissionComplete} isFinal={true} />
                            </div>
                            <div className="mt-6 text-center">
                              <div className="text-sm text-body-color">全体CVR</div>
                              <div className="text-3xl font-bold text-primary">
                                {(startViews > 0 ? (summaryData.submissionComplete / startViews) * 100 : 0).toFixed(2)}%
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {/* 月次テーブル */}
                  {monthlyLoading || (selectedFlow && !monthlyData && !monthlyError) ? (
                    <LoadingSpinner message="月次データを読み込んでいます..." />
                  ) : monthlyError ? (
                    <ErrorAlert message={monthlyErrorMessage?.message || '月次データの読み込みに失敗しました。'} />
                  ) : monthlyData && monthlyData.length > 0 ? (
                    <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                      <div className="border-b border-stroke p-6 dark:border-dark-3">
                        <h3 className="text-lg font-semibold text-dark dark:text-white">月次推移</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          {(() => {
                            const hasEntry = selectedFlow.entry_page_path && monthlyData.some(r => r.entryPageViews != null);
                            const startLabel = hasEntry ? '起点PV' : '全PV';
                            return (
                          <>
                          <thead className="border-b border-stroke dark:border-dark-3">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">年月</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">{startLabel}</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">遷移率①</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">フォームPV</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">遷移率②</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">送信完了</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">全体CVR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...monthlyData].reverse().map((row) => {
                              const startViews = hasEntry ? (row.entryPageViews ?? 0) : row.totalSiteViews;
                              const rate1 = startViews > 0 ? (row.formPageViews / startViews) * 100 : 0;
                              const rate2 = row.formPageViews > 0 ? (row.submissionComplete / row.formPageViews) * 100 : 0;
                              const overall = startViews > 0 ? (row.submissionComplete / startViews) * 100 : 0;

                              return (
                                <tr key={row.yearMonth} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                  <td className="px-4 py-3 text-sm font-medium text-dark dark:text-white">
                                    {`${row.yearMonth.slice(0, 4)}年${row.yearMonth.slice(4)}月`}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {startViews.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {rate1.toFixed(2)}%
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {row.formPageViews.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {rate2.toFixed(2)}%
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {row.submissionComplete.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {overall.toFixed(2)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {(() => {
                            const allRows = [...monthlyData].reverse();
                            const totalStart = allRows.reduce((s, r) => s + (hasEntry ? (r.entryPageViews ?? 0) : r.totalSiteViews), 0);
                            const totalForm = allRows.reduce((s, r) => s + r.formPageViews, 0);
                            const totalSubmit = allRows.reduce((s, r) => s + r.submissionComplete, 0);
                            const avgRate1 = totalStart > 0 ? (totalForm / totalStart) * 100 : 0;
                            const avgRate2 = totalForm > 0 ? (totalSubmit / totalForm) * 100 : 0;
                            const avgOverall = totalStart > 0 ? (totalSubmit / totalStart) * 100 : 0;
                            return (
                              <tfoot>
                                <tr className="border-t-2 border-primary-mid/30 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5 font-semibold">
                                  <td className="px-4 py-3 text-sm text-dark dark:text-white">合計</td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">{totalStart.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">{avgRate1.toFixed(2)}%</td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">{totalForm.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">{avgRate2.toFixed(2)}%</td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">{totalSubmit.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">{avgOverall.toFixed(2)}%</td>
                                </tr>
                              </tfoot>
                            );
                          })()}
                          </>
                            );
                          })()}
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}

          {/* メモ & AI分析タブ（フロー設定済みの場合のみ表示） */}
          {currentUser && selectedSiteId && flowSettings.length > 0 && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="reverse-flow"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="reverse-flow"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  selectedFlow && !summaryLoading && summaryData ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.REVERSE_FLOW}
                      rawData={{
                        summary: summaryData,
                        monthly: monthlyData || [],
                        flow: {
                          flowName: selectedFlow?.flow_name || '',
                          entryPagePath: selectedFlow?.entry_page_path || '',
                          formPagePath: selectedFlow?.form_page_path || '',
                          targetCvEvent: selectedFlow?.target_cv_event || '',
                        },
                      }}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {!selectedFlow ? 'フローを選択してください。' : 'データを読み込み中...'}
                    </div>
                  )
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && selectedFlow && !summaryLoading && summaryData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.REVERSE_FLOW}
            onScrollToAI={scrollToAIAnalysis}
          />
        )}

        {/* 制限超過モーダル */}
        {isLimitModalOpen && (
          <PlanLimitModal
            onClose={() => setIsLimitModalOpen(false)}
            type="summary"
          />
        )}
      </main>

      {/* ダイアログ（フロー設定） */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-dark-2">
            <h3 className="mb-4 text-xl font-semibold text-dark dark:text-white">
              {editingFlow ? 'フロー設定を編集' : '新規フロー追加'}
            </h3>
            <p className="mb-6 text-sm text-body-color">
              フロー名、起点ページ（任意）、フォームページパス、CVイベントを設定してください。
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  フロー名
                </label>
                <input
                  type="text"
                  placeholder="例: お問い合わせフロー"
                  value={flowForm.flow_name}
                  onChange={(e) => setFlowForm({...flowForm, flow_name: e.target.value})}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition-all duration-200 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:text-white"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  起点ページパス <span className="text-xs text-body-color font-normal">（任意）</span>
                </label>
                <CreatableSelect
                  value={flowForm.entry_page_path ? { value: flowForm.entry_page_path, label: flowForm.entry_page_path } : null}
                  onChange={(option) => setFlowForm({...flowForm, entry_page_path: option?.value || ''})}
                  options={pagePathOptions}
                  isLoading={pagePathsLoading}
                  isSearchable={true}
                  isClearable={true}
                  menuPortalTarget={document.body}
                  placeholder="未入力の場合は全PVが起点になります"
                  noOptionsMessage={() => 'ページパスが見つかりません'}
                  loadingMessage={() => '読み込み中...'}
                  formatCreateLabel={(inputValue) => `"${inputValue}" を使用`}
                  formatOptionLabel={(option) => (
                    <div className="py-1">
                      <div className="font-medium text-dark dark:text-white">{option.label}</div>
                      {option.title && option.title !== option.label && (
                        <div className="text-xs text-body-color mt-0.5">{option.title}</div>
                      )}
                    </div>
                  )}
                  classNames={{
                    control: () => 'w-full rounded-md border border-stroke bg-transparent px-2 py-1 text-dark dark:border-dark-3 dark:text-white',
                    menu: () => 'mt-2 rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2',
                    option: ({ isFocused, isSelected }) =>
                      `px-4 py-2 cursor-pointer ${
                        isSelected ? 'bg-primary text-white' :
                        isFocused ? 'bg-gray-100 dark:bg-dark-3' : ''
                      }`,
                    placeholder: () => 'text-body-color',
                    input: () => 'text-dark dark:text-white',
                    singleValue: () => 'text-dark dark:text-white',
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: state.isFocused ? '#3C50E0' : '#E5E7EB',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#3C50E0' },
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
                <p className="mt-1 text-xs text-body-color">
                  LP・メルマガ等の起点ページパスを指定すると、より具体的なフロー分析が可能です
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  フォームページパス
                </label>
                <CreatableSelect
                  value={flowForm.form_page_path ? { value: flowForm.form_page_path, label: flowForm.form_page_path } : null}
                  onChange={(option) => setFlowForm({...flowForm, form_page_path: option?.value || ''})}
                  options={pagePathOptions}
                  isLoading={pagePathsLoading}
                  isSearchable={true}
                  isClearable={true}
                  menuPortalTarget={document.body}
                  placeholder="ページパスを選択または入力..."
                  noOptionsMessage={() => 'ページパスが見つかりません'}
                  loadingMessage={() => '読み込み中...'}
                  formatCreateLabel={(inputValue) => `"${inputValue}" を使用`}
                  formatOptionLabel={(option) => (
                    <div className="py-1">
                      <div className="font-medium text-dark dark:text-white">{option.label}</div>
                      {option.title && option.title !== option.label && (
                        <div className="text-xs text-body-color mt-0.5">{option.title}</div>
                      )}
                    </div>
                  )}
                  classNames={{
                    control: () => 'w-full rounded-md border border-stroke bg-transparent px-2 py-1 text-dark dark:border-dark-3 dark:text-white',
                    menu: () => 'mt-2 rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2',
                    option: ({ isFocused, isSelected }) =>
                      `px-4 py-2 cursor-pointer ${
                        isSelected ? 'bg-primary text-white' :
                        isFocused ? 'bg-gray-100 dark:bg-dark-3' : ''
                      }`,
                    placeholder: () => 'text-body-color',
                    input: () => 'text-dark dark:text-white',
                    singleValue: () => 'text-dark dark:text-white',
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: state.isFocused ? '#3C50E0' : '#E5E7EB',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#3C50E0' },
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
                <p className="mt-1 text-xs text-body-color">
                  候補から選択するか、カスタムパスを入力できます
                </p>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  送信完了 (CV)
                </label>
                <select
                  value={flowForm.target_cv_event}
                  onChange={(e) => setFlowForm({...flowForm, target_cv_event: e.target.value})}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition-all duration-200 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:text-white"
                >
                  <option value="">コンバージョンイベントを選択</option>
                  {conversionEvents.map(e => (
                    <option key={e.eventName} value={e.eventName}>
                      {e.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveFlow}
                disabled={!flowForm.flow_name || !flowForm.form_page_path || !flowForm.target_cv_event || updateSiteMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateSiteMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* コンバージョン未設定アラートモーダル */}
      {isConversionAlertOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsConversionAlertOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-stroke bg-white shadow-xl dark:border-dark-3 dark:bg-dark-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b border-stroke p-4 dark:border-dark-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                コンバージョン定義が未設定です
              </h3>
              <button
                onClick={() => setIsConversionAlertOpen(false)}
                className="rounded-lg p-1 text-body-color transition hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-body-color">
                    正確なコンバージョン分析を行うには、サイト設定でコンバージョンイベントを定義してください。
                  </p>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="border-t border-stroke p-4 dark:border-dark-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setIsConversionAlertOpen(false)}
                  className="flex-1 rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                >
                  閉じる
                </button>
                <button
                  onClick={() => navigate(`/sites/${selectedSiteId}/edit?step=4`)}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                >
                  設定する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
