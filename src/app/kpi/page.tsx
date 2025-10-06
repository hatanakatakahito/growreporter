'use client';

/**
 * Custom KPI Management Page - TailGrids compliant
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { KPIService } from '@/lib/kpi/kpiService';
import { AlertService } from '@/lib/kpi/alertService';
import {
  CustomKPI,
  CreateKPIRequest,
  KPIAlert,
  KPI_METRIC_DEFINITIONS,
} from '@/types/kpi';

export default function KPIManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [kpis, setKPIs] = useState<CustomKPI[]>([]);
  const [alerts, setAlerts] = useState<KPIAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<CustomKPI | null>(null);
  
  const [newKPI, setNewKPI] = useState<Partial<CreateKPIRequest>>({
    name: '',
    description: '',
    category: 'トラフィック',
    metricType: 'ga4_sessions',
    targetValue: undefined,
    operator: 'greater_than',
    periodType: 'monthly',
  });
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    
    if (!user) return;
    
    const unsubscribeKPIs = KPIService.subscribeToKPIs(user.uid, (updatedKPIs) => {
      setKPIs(updatedKPIs);
      setLoading(false);
    });
    
    const unsubscribeAlerts = AlertService.subscribeToAlerts(user.uid, (updatedAlerts) => {
      setAlerts(updatedAlerts);
    });
    
    return () => {
      unsubscribeKPIs();
      unsubscribeAlerts();
    };
  }, [user, authLoading, router]);

  const handleCreateKPI = async () => {
    if (!user || !newKPI.name || !newKPI.targetValue) {
      alert('必須項目を入力してください');
      return;
    }
    
    try {
      await KPIService.createKPI(user.uid, newKPI as CreateKPIRequest);
      setShowCreateModal(false);
      setNewKPI({
        name: '',
        description: '',
        category: 'トラフィック',
        metricType: 'ga4_sessions',
        targetValue: undefined,
        operator: 'greater_than',
        periodType: 'monthly',
      });
      alert('KPIを作成しました');
    } catch (error) {
      console.error('KPI作成エラー:', error);
      alert('KPI作成に失敗しました');
    }
  };

  const handleDeleteKPI = async (kpiId: string) => {
    if (!user || !confirm('このKPIを削除しますか？')) return;
    
    try {
      await KPIService.deleteKPI(user.uid, kpiId);
      alert('KPIを削除しました');
    } catch (error) {
      console.error('KPI削除エラー:', error);
      alert('KPI削除に失敗しました');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!user) return;
    try {
      await AlertService.acknowledgeAlert(user.uid, alertId);
    } catch (error) {
      console.error('アラート確認エラー:', error);
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-dark">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-body-color dark:text-dark-6">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return null;

  const achievedKPIs = kpis.filter(k => k.current.status === 'achieved').length;
  const atRiskKPIs = kpis.filter(k => k.current.status === 'at_risk').length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* ヘッダー - Mega Template準拠 */}
        <div className="mb-9 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
              KPI一覧
            </h2>
            <p className="text-sm font-medium text-body-color dark:text-dark-6">
              カスタムKPIの作成・管理
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-center font-medium text-white hover:bg-opacity-90"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.625 3.125C10.625 2.77982 10.3452 2.5 10 2.5C9.65482 2.5 9.375 2.77982 9.375 3.125V9.375H3.125C2.77982 9.375 2.5 9.65482 2.5 10C2.5 10.3452 2.77982 10.625 3.125 10.625H9.375V16.875C9.375 17.2202 9.65482 17.5 10 17.5C10.3452 17.5 10.625 17.2202 10.625 16.875V10.625H16.875C17.2202 10.625 17.5 10.3452 17.5 10C17.5 9.65482 17.2202 9.375 16.875 9.375H10.625V3.125Z"
                fill=""
              />
            </svg>
            KPIを作成
          </button>
        </div>

        {/* 統計カード - Mega Template準拠 */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-primary/[0.06] text-primary dark:bg-primary/10">
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <h4 className="mb-1 text-2xl font-bold text-dark dark:text-white">{kpis.length}</h4>
                <span className="text-sm font-medium text-body-color dark:text-dark-6">総KPI数</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#13C296]/[0.06] text-[#13C296] dark:bg-[#13C296]/10">
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <h4 className="mb-1 text-2xl font-bold text-dark dark:text-white">{achievedKPIs}</h4>
                <span className="text-sm font-medium text-body-color dark:text-dark-6">達成済み</span>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-[#13C296]">
                {Math.round((achievedKPIs / Math.max(kpis.length, 1)) * 100)}%
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#FFA70B]/[0.06] text-[#FFA70B] dark:bg-[#FFA70B]/10">
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <h4 className="mb-1 text-2xl font-bold text-dark dark:text-white">{atRiskKPIs}</h4>
                <span className="text-sm font-medium text-body-color dark:text-dark-6">要注意</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-red/[0.06] text-red dark:bg-red/10">
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <h4 className="mb-1 text-2xl font-bold text-dark dark:text-white">{unacknowledgedAlerts}</h4>
                <span className="text-sm font-medium text-body-color dark:text-dark-6">未確認アラート</span>
              </div>
            </div>
          </div>
        </div>

        {/* アラート - Mega Template準拠 */}
        {unacknowledgedAlerts > 0 && (
          <div className="mb-6">
            <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="border-b border-stroke px-6 py-4 dark:border-dark-3 xl:px-[30px]">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  未確認アラート ({unacknowledgedAlerts})
                </h3>
              </div>
              <div className="p-6 xl:px-[30px]">
                <div className="flex flex-col gap-4">
                  {alerts.filter(a => !a.acknowledged).map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between rounded-lg border-l-4 p-4 ${
                        alert.type === 'danger' ? 'border-red bg-red/[0.08]' :
                        alert.type === 'warning' ? 'border-[#F2994A] bg-[#F2994A]/[0.08]' :
                        alert.type === 'success' ? 'border-secondary bg-secondary/[0.08]' :
                        'border-primary bg-primary/[0.08]'
                      }`}
                    >
                      <div>
                        <h5 className="font-semibold text-dark dark:text-white">{alert.message}</h5>
                        <p className="text-sm text-body-color dark:text-dark-6">
                          {alert.timestamp?.toDate().toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                      >
                        確認
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI一覧 - Mega Template準拠 */}
        <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
          <div className="border-b border-stroke px-6 py-4 dark:border-dark-3 xl:px-[30px]">
            <h3 className="text-lg font-semibold text-dark dark:text-white">KPI一覧</h3>
          </div>
          
          {kpis.length === 0 ? (
            <div className="p-6 xl:px-[30px]">
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-15 w-15 items-center justify-center rounded-full bg-primary/[0.08]">
                  <svg className="fill-primary" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M20 10H18V8C18 7.4 17.6 7 17 7C16.4 7 16 7.4 16 8V10H14C13.4 10 13 10.4 13 11C13 11.6 13.4 12 14 12H16V14C16 14.6 16.4 15 17 15C17.6 15 18 14.6 18 14V12H20C20.6 12 21 11.6 21 11C21 10.4 20.6 10 20 10Z" fill=""/>
                  </svg>
                </div>
                <h5 className="mb-2 text-lg font-semibold text-dark dark:text-white">
                  KPIがありません
                </h5>
                <p className="mb-5 text-sm text-body-color dark:text-dark-6">
                  新しいKPIを作成してください
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-7.5 py-2.5 text-center font-medium text-white hover:bg-opacity-90"
                >
                  KPIを作成
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 xl:px-[30px]">
              <div className="-mx-4 flex flex-wrap">
                {kpis.map((kpi) => (
                  <div key={kpi.id} className="w-full px-4 md:w-1/2 lg:w-1/3">
                    <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                      <div className="mb-4 flex items-start justify-between">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-2xl">{kpi.display.icon}</span>
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                              kpi.current.status === 'achieved' ? 'bg-secondary/[0.08] text-secondary' :
                              kpi.current.status === 'on_track' ? 'bg-primary/[0.08] text-primary' :
                              kpi.current.status === 'at_risk' ? 'bg-[#F2994A]/[0.08] text-[#F2994A]' :
                              'bg-red/[0.08] text-red'
                            }`}
                          >
                            {kpi.current.status === 'achieved' ? '達成' :
                             kpi.current.status === 'on_track' ? '順調' :
                             kpi.current.status === 'at_risk' ? '要注意' : '未達'}
                          </span>
                        </div>
                        <h4 className="mb-1 text-lg font-semibold text-dark dark:text-white">{kpi.name}</h4>
                        <p className="text-sm text-body-color dark:text-dark-6">{kpi.description}</p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-body-color dark:text-dark-6">現在値</span>
                        <span className="font-semibold text-dark dark:text-white">
                          {kpi.current.value.toLocaleString()} {kpi.metric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-body-color dark:text-dark-6">目標値</span>
                        <span className="font-semibold text-dark dark:text-white">
                          {kpi.goal.target.toLocaleString()} {kpi.metric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-body-color dark:text-dark-6">進捗率</span>
                        <span className="font-semibold text-dark dark:text-white">
                          {kpi.current.progress.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="relative h-2 w-full rounded-full bg-gray-2 dark:bg-dark-3">
                        <div
                          className={`absolute h-full rounded-full ${
                            kpi.current.status === 'achieved' ? 'bg-secondary' :
                            kpi.current.status === 'on_track' ? 'bg-primary' :
                            kpi.current.status === 'at_risk' ? 'bg-[#F2994A]' :
                            'bg-red'
                          }`}
                          style={{ width: `${Math.min(kpi.current.progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedKPI(kpi)}
                        className="flex-1 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white"
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => handleDeleteKPI(kpi.id)}
                        className="flex-1 rounded-md border border-red px-4 py-2 text-sm font-medium text-red hover:bg-red hover:text-white"
                      >
                        削除
                      </button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI作成モーダル - Mega Template準拠 */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          ></div>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3 xl:px-[30px]">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  新しいKPIを作成
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 xl:px-[30px]">

                <div className="space-y-5">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                      KPI名 <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={newKPI.name || ''}
                      onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                      placeholder="例: 月間セッション数"
                      className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                      説明
                    </label>
                    <textarea
                      value={newKPI.description || ''}
                      onChange={(e) => setNewKPI({ ...newKPI, description: e.target.value })}
                      placeholder="KPIの説明"
                      rows={3}
                      className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        カテゴリ
                      </label>
                      <select
                        value={newKPI.category || 'トラフィック'}
                        onChange={(e) => setNewKPI({ ...newKPI, category: e.target.value as any })}
                        className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      >
                        <option value="トラフィック">トラフィック</option>
                        <option value="エンゲージメント">エンゲージメント</option>
                        <option value="コンバージョン">コンバージョン</option>
                        <option value="SEO">SEO</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        メトリクス
                      </label>
                      <select
                        value={newKPI.metricType || 'ga4_sessions'}
                        onChange={(e) => setNewKPI({ ...newKPI, metricType: e.target.value as any })}
                        className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      >
                        {Object.entries(KPI_METRIC_DEFINITIONS).map(([key, def]) => (
                          <option key={key} value={key}>{def.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                      目標値 <span className="text-red">*</span>
                    </label>
                    <input
                      type="number"
                      value={newKPI.targetValue || ''}
                      onChange={(e) => setNewKPI({ ...newKPI, targetValue: parseFloat(e.target.value) })}
                      placeholder="例: 10000"
                      className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-stroke pt-5 dark:border-dark-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-md border border-stroke px-6 py-3 text-base font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCreateKPI}
                    className="flex-1 rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-opacity-90"
                  >
                    作成
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* KPI詳細モーダル */}
      {selectedKPI && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/80"
            onClick={() => setSelectedKPI(null)}
          ></div>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-dark-2 dark:shadow-card">
              <div className="mb-6 flex items-center justify-between border-b border-stroke pb-4 dark:border-dark-3">
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">
                  {selectedKPI.name}
                </h3>
                <button
                  onClick={() => setSelectedKPI(null)}
                  className="text-body-color hover:text-dark dark:text-dark-6 dark:hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-body-color dark:text-dark-6">{selectedKPI.description}</p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-body-color dark:text-dark-6">現在値</p>
                    <p className="text-2xl font-bold text-dark dark:text-white">
                      {selectedKPI.current.value.toLocaleString()} {selectedKPI.metric.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-body-color dark:text-dark-6">目標値</p>
                    <p className="text-2xl font-bold text-dark dark:text-white">
                      {selectedKPI.goal.target.toLocaleString()} {selectedKPI.metric.unit}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-body-color dark:text-dark-6">進捗率</p>
                  <p className="text-2xl font-bold text-dark dark:text-white">
                    {selectedKPI.current.progress.toFixed(1)}%
                  </p>
                </div>

                <button
                  onClick={() => setSelectedKPI(null)}
                  className="w-full rounded-md bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
