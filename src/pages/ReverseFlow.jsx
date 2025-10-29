import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import CreatableSelect from 'react-select/creatable';
import { useSite } from '../contexts/SiteContext';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import AISummarySheet from '../components/Analysis/AISummarySheet';
import { Sparkles, Plus, Edit, Trash2, GitMerge, Settings, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * 逆算フロー画面
 * フォームページからのコンバージョンフローを分析
 */

const FlowCard = ({ title, value, isFinal = false }) => (
  <div className="flex-1">
    <div className="rounded-xl bg-primary p-6 text-center text-white shadow-lg flex flex-col justify-center h-full">
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
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [flowForm, setFlowForm] = useState({
    flow_name: '',
    form_page_path: '',
    target_cv_event: '',
  });

  const queryClient = useQueryClient();

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('逆算フロー');
  }, []);


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
    return pagePathsData.map(path => ({
      value: path,
      label: path,
    }));
  }, [pagePathsData]);

  // 初回表示時に最初のフローを選択
  useEffect(() => {
    if (flowSettings.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flowSettings[0].id);
    }
  }, [flowSettings, selectedFlowId]);

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
    queryKey: ['ga4-reverse-flow-summary', selectedSiteId, dateRange, selectedFlow?.form_page_path, selectedFlow?.target_cv_event],
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
    queryKey: ['ga4-reverse-flow-monthly', selectedSiteId, monthlyDateRange, selectedFlow?.form_page_path, selectedFlow?.target_cv_event],
    queryFn: async () => {
      if (!selectedSiteId || !monthlyDateRange.start || !selectedFlow?.form_page_path || !selectedFlow?.target_cv_event) {
        return null;
      }
      
      const fetchReverseFlowData = httpsCallable(functions, 'fetchGA4ReverseFlowData');
      const result = await fetchReverseFlowData({
        siteId: selectedSiteId,
        startDate: monthlyDateRange.start,
        endDate: monthlyDateRange.end,
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
    mutationFn: async ({ reverse_flow_settings, newFlowId }) => {
      console.log('[ReverseFlow] Firestore更新開始', { reverse_flow_settings, newFlowId });
      const siteRef = doc(db, 'sites', selectedSiteId);
      await updateDoc(siteRef, { reverse_flow_settings });
      console.log('[ReverseFlow] Firestore更新完了');
      return { newFlowId };
    },
    onSuccess: async (data) => {
      console.log('[ReverseFlow] Mutation成功', { newFlowId: data.newFlowId });
      
      // サイトデータを再取得して完全に更新されるまで待つ
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      await queryClient.refetchQueries({ queryKey: ['sites'] });
      
      console.log('[ReverseFlow] サイトデータ再取得完了');
      
      // 新規フロー追加の場合、そのフローを選択
      if (data.newFlowId) {
        console.log('[ReverseFlow] 新規フロー選択', { newFlowId: data.newFlowId });
        setSelectedFlowId(data.newFlowId);
      }
      
      setIsDialogOpen(false);
      setEditingFlow(null);
      setFlowForm({ flow_name: '', form_page_path: '', target_cv_event: '' });
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
        form_page_path: flow.form_page_path,
        target_cv_event: flow.target_cv_event,
      });
    } else {
      setEditingFlow(null);
      setFlowForm({ flow_name: '', form_page_path: '', target_cv_event: '' });
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
    }
    
    console.log('[ReverseFlow] 保存するフロー設定', { newFlowSettings, newFlowId });
    updateSiteMutation.mutate({ reverse_flow_settings: newFlowSettings, newFlowId });
  };

  const handleDeleteFlow = (flowId) => {
    const newFlowSettings = flowSettings.filter(f => f.id !== flowId);
    if (selectedFlowId === flowId && newFlowSettings.length > 0) {
      setSelectedFlowId(newFlowSettings[0].id);
    } else if (newFlowSettings.length === 0) {
      setSelectedFlowId(null);
    }
    updateSiteMutation.mutate({ reverse_flow_settings: newFlowSettings });
  };

  const isLoading = summaryLoading || monthlyLoading;

  return (
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              逆算フロー
            </h2>
            <p className="text-body-color">
              フォームページからのコンバージョンフローを分析
            </p>
          </div>

          {!conversionEvents || conversionEvents.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <Info className="mx-auto mb-4 h-12 w-12 text-orange-500" />
              <p className="mb-4 text-body-color">
                コンバージョンイベントが設定されていません。
                <br />
                分析を開始するには設定が必要です。
              </p>
              <button className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3">
                <Settings className="h-4 w-4" />
                設定する
              </button>
            </div>
          ) : (
            <>
              {/* フロー設定カード */}
              <div className="mb-8 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                <div className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">フロー設定</h3>
                  <button
                    onClick={() => handleOpenDialog()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    新規フロー追加
                  </button>
                </div>
                
                <div className="p-6">
                  {flowSettings.length === 0 ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          フロー設定が登録されていません。「新規フロー追加」ボタンから設定を開始してください。
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center gap-4">
                        <label className="text-sm font-medium text-dark dark:text-white">表示するフロー:</label>
                        <select
                          value={selectedFlowId || ''}
                          onChange={(e) => setSelectedFlowId(e.target.value)}
                          className="w-64 rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
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
                                disabled={flowSettings.length === 1}
                                className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                削除
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4">
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
                      <div className="flex items-stretch justify-center">
                        <FlowCard title="全PV" value={summaryData.totalSiteViews} />
                        <Arrow rate={summaryData.totalSiteViews > 0 ? (summaryData.formPageViews / summaryData.totalSiteViews) * 100 : 0} />
                        <FlowCard title="フォームPV" value={summaryData.formPageViews} />
                        <Arrow rate={summaryData.formPageViews > 0 ? (summaryData.submissionComplete / summaryData.formPageViews) * 100 : 0} />
                        <FlowCard title="送信完了" value={summaryData.submissionComplete} isFinal={true} />
                      </div>
                      <div className="mt-6 text-center">
                        <div className="text-sm text-body-color">全体CVR</div>
                        <div className="text-3xl font-bold text-primary">
                          {(summaryData.totalSiteViews > 0 ? (summaryData.submissionComplete / summaryData.totalSiteViews) * 100 : 0).toFixed(2)}%
                        </div>
                      </div>
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
                          <thead className="border-b border-stroke dark:border-dark-3">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">年月</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">全PV</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">遷移率①</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">フォームPV</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">遷移率②</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">送信完了</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">全体CVR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...monthlyData].reverse().map((row) => {
                              const rate1 = row.totalSiteViews > 0 ? (row.formPageViews / row.totalSiteViews) * 100 : 0;
                              const rate2 = row.formPageViews > 0 ? (row.submissionComplete / row.formPageViews) * 100 : 0;
                              const overall = row.totalSiteViews > 0 ? (row.submissionComplete / row.totalSiteViews) * 100 : 0;
                              
                              return (
                                <tr key={row.yearMonth} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                  <td className="px-4 py-3 text-sm font-medium text-dark dark:text-white">
                                    {`${row.yearMonth.slice(0, 4)}年${row.yearMonth.slice(4)}月`}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {row.totalSiteViews.toLocaleString()}
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
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedFlow && !isLoading && summaryData && (
          <button
            onClick={() => setIsAISheetOpen(true)}
            className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            aria-label="AI分析を見る"
          >
            <div className="flex flex-col items-center">
              <Sparkles className="h-6 w-6" />
              <span className="mt-0.5 text-[10px] font-medium">AI分析</span>
            </div>
          </button>
        )}

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="reverseFlow"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            summary: summaryData,
            monthly: monthlyData,
            settings: selectedFlow,
          }}
        />
      </main>

      {/* ダイアログ（フロー設定） */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-dark-2">
            <h3 className="mb-4 text-xl font-semibold text-dark dark:text-white">
              {editingFlow ? 'フロー設定を編集' : '新規フロー追加'}
            </h3>
            <p className="mb-6 text-sm text-body-color">
              フロー名、フォームページパス、ターゲットCVイベントを入力してください。
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
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                />
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
                  placeholder="ページパスを選択または入力..."
                  noOptionsMessage={() => 'ページパスが見つかりません'}
                  loadingMessage={() => '読み込み中...'}
                  formatCreateLabel={(inputValue) => `"${inputValue}" を使用`}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: '#e5e7eb',
                      '&:hover': {
                        borderColor: '#3b82f6',
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
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
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateSiteMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
