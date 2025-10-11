'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ImprovementService } from '@/lib/improvements/improvementService';
import { UserImprovement } from '@/lib/improvements/types';

export default function EvaluationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completedImprovements, setCompletedImprovements] = useState<UserImprovement[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const improvements = await ImprovementService.getUserImprovements(user.uid, 'completed');
      setCompletedImprovements(improvements);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 月別サマリーを計算
  const monthlySummary = () => {
    const summary: Record<string, {
      count: number;
      achievedCount: number;
      totalCVRChange: number;
      totalConversionChange: number;
    }> = {};
    
    completedImprovements.forEach(improvement => {
      if (improvement.completedAt) {
        const monthKey = new Date(improvement.completedAt).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long'
        });
        
        if (!summary[monthKey]) {
          summary[monthKey] = {
            count: 0,
            achievedCount: 0,
            totalCVRChange: 0,
            totalConversionChange: 0
          };
        }
        
        summary[monthKey].count++;
        
        if (improvement.result) {
          if (improvement.result.achievedExpectation) {
            summary[monthKey].achievedCount++;
          }
          
          // CVR変化をパース
          const cvrChange = parseFloat(improvement.result.change.cvr.replace('%', ''));
          if (!isNaN(cvrChange)) {
            summary[monthKey].totalCVRChange += cvrChange;
          }
          
          // CV数変化
          summary[monthKey].totalConversionChange += improvement.result.change.conversions;
        }
      }
    });
    
    return summary;
  };
  
  const summary = monthlySummary();
  const months = Object.keys(summary).sort().reverse();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-dark dark:text-white">
            評価する
          </h1>
          <p className="mt-2 text-sm text-body-color">
            実施した施策の振り返りと効果測定
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : completedImprovements.length === 0 ? (
          <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
            <p className="text-body-color">
              完了した施策はまだありません
            </p>
          </div>
        ) : (
          <>
            {/* 月次サマリー */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <div className="text-sm text-body-color">完了施策数</div>
                <div className="mt-2 text-3xl font-bold text-dark dark:text-white">
                  {completedImprovements.length}
                </div>
              </div>
              
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <div className="text-sm text-body-color">目標達成率</div>
                <div className="mt-2 text-3xl font-bold text-dark dark:text-white">
                  {completedImprovements.filter(i => i.result?.achievedExpectation).length > 0
                    ? Math.round(
                        (completedImprovements.filter(i => i.result?.achievedExpectation).length /
                          completedImprovements.filter(i => i.result).length) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
              
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <div className="text-sm text-body-color">累計CV数増加</div>
                <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                  +
                  {completedImprovements
                    .filter(i => i.result)
                    .reduce((sum, i) => sum + (i.result?.change.conversions || 0), 0)}
                </div>
              </div>
            </div>
            
            {/* 月別サマリー */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                月別サマリー
              </h3>
              
              <div className="space-y-4">
                {months.map(month => {
                  const data = summary[month];
                  return (
                    <div
                      key={month}
                      className="rounded-md border border-stroke p-4 dark:border-dark-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="font-medium text-dark dark:text-white">
                          {month}
                        </h5>
                        <span className="text-sm text-body-color">
                          {data.count}件完了
                        </span>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-xs text-body-color">目標達成</div>
                          <div className="mt-1 text-lg font-semibold text-dark dark:text-white">
                            {data.achievedCount} / {data.count}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-body-color">CVR変化</div>
                          <div className={`mt-1 text-lg font-semibold ${
                            data.totalCVRChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {data.totalCVRChange > 0 ? '+' : ''}{data.totalCVRChange.toFixed(2)}%
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-body-color">CV数変化</div>
                          <div className={`mt-1 text-lg font-semibold ${
                            data.totalConversionChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {data.totalConversionChange > 0 ? '+' : ''}{data.totalConversionChange}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 完了施策一覧 */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                完了施策一覧
              </h3>
              
              <div className="space-y-4">
                {completedImprovements.map(improvement => (
                  <div
                    key={improvement.id}
                    className="rounded-md border border-stroke p-4 dark:border-dark-3"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-dark dark:text-white">
                          {improvement.title}
                        </h5>
                        {improvement.completedAt && (
                          <p className="mt-1 text-xs text-body-color">
                            完了日: {new Date(improvement.completedAt).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                      
                      {improvement.result?.achievedExpectation && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                          目標達成
                        </span>
                      )}
                    </div>
                    
                    {improvement.result && (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                          <div className="text-xs text-body-color">CVR</div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-dark dark:text-white">
                              {(improvement.result.afterData.cvr * 100).toFixed(2)}%
                            </span>
                            <span className={`text-sm ${
                              improvement.result.change.cvr.startsWith('+')
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {improvement.result.change.cvr}
                            </span>
                          </div>
                        </div>
                        
                        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                          <div className="text-xs text-body-color">CV数</div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-dark dark:text-white">
                              {improvement.result.afterData.conversions}件
                            </span>
                            <span className={`text-sm ${
                              improvement.result.change.conversions > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {improvement.result.change.conversions > 0 ? '+' : ''}
                              {improvement.result.change.conversions}
                            </span>
                          </div>
                        </div>
                        
                        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                          <div className="text-xs text-body-color">セッション</div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-dark dark:text-white">
                              {improvement.result.afterData.sessions.toLocaleString()}
                            </span>
                            <span className={`text-sm ${
                              improvement.result.change.sessions.startsWith('+')
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {improvement.result.change.sessions}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {improvement.memo && (
                      <div className="mt-3 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          メモ
                        </div>
                        <p className="mt-1 text-sm text-dark dark:text-white whitespace-pre-wrap">
                          {improvement.memo}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

