'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ImprovementService } from '@/lib/improvements/improvementService';
import { UserImprovement, DetectedIssue, Category } from '@/lib/improvements/types';
import SuggestionCard from '@/components/improvements/SuggestionCard';
import InProgressCard from '@/components/improvements/InProgressCard';
import CompletedCard from '@/components/improvements/CompletedCard';
import SitePreviewCard from '@/components/improvements/SitePreviewCard';
import VendorRequestModal from '@/components/improvements/VendorRequestModal';

type Tab = 'suggestions' | 'in_progress' | 'completed';

export default function ImprovementsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('suggestions');
  const [loading, setLoading] = useState(true);
  
  // モーダル
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  
  // データ
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  const [aiSuggestions, setAISuggestions] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<UserImprovement[]>([]);
  
  // フィルター
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  // サイト情報
  const [siteInfo, setSiteInfo] = useState<any>(null);
  
  useEffect(() => {
    if (user) {
      loadData();
      loadSiteInfo();
    }
  }, [user]);
  
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 問題検出
      await detectIssues();
      
      // 改善施策を取得
      try {
        const allImprovements = await ImprovementService.getUserImprovements(user.uid);
        setImprovements(allImprovements);
      } catch (improvementError) {
        console.warn('⚠️ 改善施策取得エラー:', improvementError);
        // エラーが発生しても空配列で続行
        setImprovements([]);
      }
      
    } catch (error) {
      console.error('❌ データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadSiteInfo = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/site-info', {
        headers: {
          'x-user-id': user.uid
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSiteInfo(data.siteInfo);
      }
    } catch (error) {
      console.error('サイト情報取得エラー:', error);
    }
  };
  
  const detectIssues = async () => {
    if (!user) return;
    
    try {
      // GA4プロパティIDを取得
      const datasourcesResponse = await fetch('/api/datasources/list', {
        headers: { 'x-user-id': user.uid }
      });
      
      if (!datasourcesResponse.ok) {
        console.error('データソース取得エラー');
        return;
      }
      
      const datasourcesData = await datasourcesResponse.json();
      const propertyId = datasourcesData.selectedGA4PropertyId;
      
      if (!propertyId) {
        console.warn('⚠️ GA4プロパティIDが設定されていません');
        return;
      }
      
      // 前月の終了日を基準に月別データを取得
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const endDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
      
      console.log('📊 月別データ取得開始:', { propertyId, endDate });
      
      const monthlyResponse = await fetch('/api/ga4/monthly-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({ 
          propertyId,
          endDate
        })
      });
      
      if (!monthlyResponse.ok) {
        console.error('月別データ取得エラー');
        return;
      }
      
      const monthlyResult = await monthlyResponse.json();
      console.log('📊 月別データ取得結果:', monthlyResult);
      
      if (!monthlyResult.monthlyData || monthlyResult.monthlyData.length < 2) {
        console.warn('⚠️ 十分な月別データがありません');
        return;
      }
      
      // 最新月と前月のデータを取得
      const currentMonth = monthlyResult.monthlyData[0]; // 最新月
      const lastMonthData = monthlyResult.monthlyData[1]; // 前月
      
      // 分析データを準備
      const analyticsData = {
        currentMonth: {
          cvr: currentMonth.conversionRate || 0,
          conversions: currentMonth.conversions || 0,
          sessions: currentMonth.sessions || 0,
          screenPageViews: currentMonth.screenPageViews || 0,
          bounceRate: currentMonth.bounceRate || 0,
          conversionBreakdown: currentMonth.conversionBreakdown || {}
        },
        lastMonth: {
          cvr: lastMonthData.conversionRate || 0,
          conversions: lastMonthData.conversions || 0,
          sessions: lastMonthData.sessions || 0
        },
        mobileCVR: 0.015, // TODO: デバイス別CVRの取得
        desktopCVR: 0.03, // TODO: デバイス別CVRの取得
        funnelData: {
          formToConversionRate: 0.25, // TODO: ファネルデータの取得
          totalToFormRate: 0.08
        }
      };
      
      console.log('📊 分析データ準備完了:', analyticsData);
      
      const response = await fetch('/api/improvements/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({ analyticsData })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedIssues(data.issues || []);
        
        // 問題が検出されたらAI提案を生成
        if (data.issues && data.issues.length > 0) {
          await generateAISuggestions(data.issues[0]); // 最優先の問題に対して
        }
      }
    } catch (error) {
      console.error('問題検出エラー:', error);
    }
  };
  
  const generateAISuggestions = async (issue: DetectedIssue) => {
    if (!user) return;
    
    try {
      // サイト情報が取得されるまで待つ（最大2.5秒）
      let retries = 0;
      while (!siteInfo && retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      
      const response = await fetch('/api/improvements/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          issue,
          siteInfo: {
            siteName: siteInfo?.siteName || 'サンプルサイト',
            siteUrl: siteInfo?.siteUrl || 'https://example.com',
            businessType: siteInfo?.businessType || 'btob',
            siteType: siteInfo?.siteType || 'corporate'
          },
          analyticsData: {}
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAISuggestions(data.suggestions || []);
      } else {
        const errorData = await response.json();
        console.error('❌ AI提案生成エラー:', errorData);
      }
    } catch (error) {
      console.error('❌ AI提案生成エラー（例外）:', error);
      // エラーが発生してもUIは継続
    }
  };
  
  // フィルタリング済みの提案
  const filteredSuggestions = useMemo(() => {
    return aiSuggestions.filter(suggestion => {
      if (categoryFilter !== 'all' && suggestion.category !== categoryFilter) {
        return false;
      }
      // priorityFilterは今のところ未実装
      return true;
    });
  }, [aiSuggestions, categoryFilter]);
  
  // ステータス別の改善施策
  const inProgressImprovements = improvements.filter(i => i.status === 'in_progress');
  const completedImprovements = improvements.filter(i => i.status === 'completed');
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark dark:text-white">
              改善する
            </h1>
            <p className="mt-2 text-sm text-body-color">
              サイトの問題を検出し、具体的な改善案を提案します
            </p>
          </div>
          
          <button
            onClick={loadData}
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-opacity-90"
          >
            更新
          </button>
        </div>
        
        {/* サイトプレビュー */}
        {siteInfo && (
          <SitePreviewCard 
            siteUrl={siteInfo.siteUrl}
            siteName={siteInfo.siteName}
            userId={user?.uid || ''}
          />
        )}
        
        {/* タブ */}
        <div className="border-b border-stroke dark:border-dark-3">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'suggestions'
                  ? 'text-primary'
                  : 'text-body-color hover:text-dark dark:hover:text-white'
              }`}
            >
              提案
              {aiSuggestions.length > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                  {aiSuggestions.length}
                </span>
              )}
              {activeTab === 'suggestions' && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'in_progress'
                  ? 'text-primary'
                  : 'text-body-color hover:text-dark dark:hover:text-white'
              }`}
            >
              実行中
              {inProgressImprovements.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                  {inProgressImprovements.length}
                </span>
              )}
              {activeTab === 'in_progress' && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('completed')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'completed'
                  ? 'text-primary'
                  : 'text-body-color hover:text-dark dark:hover:text-white'
              }`}
            >
              完了
              {completedImprovements.length > 0 && (
                <span className="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                  {completedImprovements.length}
                </span>
              )}
              {activeTab === 'completed' && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />
              )}
            </button>
          </div>
        </div>
        
        {/* コンテンツ */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* 提案タブ */}
            {activeTab === 'suggestions' && (
              <div className="space-y-6">
                {detectedIssues.length > 0 && (
                  <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                    <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                      検出された問題
                    </h3>
                    <div className="space-y-3">
                      {detectedIssues.map((issue, index) => (
                        <div
                          key={index}
                          className={`rounded-md border p-4 ${
                            issue.priority === 'high'
                              ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                              : issue.priority === 'medium'
                              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950'
                              : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-dark dark:text-white">
                                {issue.title}
                              </h5>
                              <p className="mt-1 text-sm text-body-color">
                                {issue.description}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                issue.priority === 'high'
                                  ? 'bg-red-600 text-white'
                                  : issue.priority === 'medium'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {issue.priority === 'high' && '高'}
                              {issue.priority === 'medium' && '中'}
                              {issue.priority === 'low' && '低'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    AI提案
                  </h3>
                  
                  {filteredSuggestions.length === 0 ? (
                    <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
                      <p className="text-body-color">
                        現在提案はありません
                      </p>
                      <button
                        onClick={detectIssues}
                        className="mt-4 rounded-md bg-primary px-4 py-2 text-white hover:bg-opacity-90"
                      >
                        問題を検出
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {filteredSuggestions.map((suggestion, index) => (
                        <SuggestionCard
                          key={index}
                          suggestion={suggestion}
                          onAddToTodo={async () => {
                            if (!user) return;
                            try {
                              await ImprovementService.addImprovement(user.uid, {
                                templateId: suggestion.id || `ai_${Date.now()}`,
                                title: suggestion.title,
                                category: suggestion.category || 'cvr_optimization',
                                issueType: detectedIssues[0]?.type || 'kpi_not_achieved',
                                expectedEffect: suggestion.expectedEffect,
                                status: 'in_progress',
                                checklist: suggestion.actions.map((action: string) => ({
                                  text: action,
                                  checked: false
                                }))
                              });
                              alert('実行中に追加しました！');
                              await loadData();
                              setActiveTab('in_progress');
                            } catch (error) {
                              console.error('追加エラー:', error);
                              alert('追加に失敗しました');
                            }
                          }}
                          onRequestVendor={() => {
                            setSelectedSuggestion(suggestion);
                            setShowVendorModal(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 実行中タブ */}
            {activeTab === 'in_progress' && (
              <div className="space-y-4">
                {inProgressImprovements.length === 0 ? (
                  <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
                    <p className="text-body-color">
                      実行中の施策はありません
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inProgressImprovements.map((improvement) => (
                      <InProgressCard
                        key={improvement.id}
                        improvement={improvement}
                        onUpdate={loadData}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* 完了タブ */}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                {completedImprovements.length === 0 ? (
                  <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
                    <p className="text-body-color">
                      完了した施策はありません
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedImprovements.map((improvement) => (
                      <CompletedCard
                        key={improvement.id}
                        improvement={improvement}
                        onUpdate={loadData}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 依頼書モーダル */}
      {showVendorModal && selectedSuggestion && siteInfo && (
        <VendorRequestModal
          suggestion={selectedSuggestion}
          siteInfo={siteInfo}
          onClose={() => {
            setShowVendorModal(false);
            setSelectedSuggestion(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

