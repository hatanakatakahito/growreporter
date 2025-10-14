'use client';

/**
 * ダッシュボードページ
 * サイトプレビュー、改善の気づき、KPI予実を表示
 */

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';
import { GA4DataService, GA4Metrics } from '@/lib/api/ga4DataService';
import { ConversionService, ConversionEvent } from '@/lib/conversion/conversionService';
import { KPIService, KPISetting } from '@/lib/kpi/kpiService';
import InsightsAlert from '@/components/insights/InsightsAlert';
import { DetectedIssue } from '@/lib/improvements/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // データ
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [conversions, setConversions] = useState<ConversionEvent[]>([]);
  const [kpiSettings, setKpiSettings] = useState<KPISetting[]>([]);
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);

  // 日付範囲を計算する関数（前月）
  const calculateDateRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  // 問題検出関数
  const detectIssues = async (monthlyDataArr: any[]) => {
    if (!user || monthlyDataArr.length < 2) return;
    
    try {
      const currentMonth = monthlyDataArr[0];
      const lastMonth = monthlyDataArr[1];
      
      const response = await fetch('/api/improvements/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          analyticsData: {
            currentMonth: {
              cvr: currentMonth.cvr || 0,
              conversions: currentMonth.conversions || 0,
              sessions: currentMonth.sessions || 0,
              screenPageViews: currentMonth.screenPageViews || 0,
              bounceRate: currentMonth.bounceRate || 0
            },
            lastMonth: {
              cvr: lastMonth?.cvr || 0,
              conversions: lastMonth?.conversions || 0,
              sessions: lastMonth?.sessions || 0
            },
            mobileCVR: 0,
            desktopCVR: 0,
            funnelData: null
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedIssues(data.issues || []);
        console.log('✅ 問題検出完了:', data.issues?.length || 0, '件');
      }
    } catch (error) {
      console.error('❌ 問題検出エラー:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (!user) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // コンバージョン定義を取得
        const conversionData = await ConversionService.getActiveConversions(user.uid);
        setConversions(conversionData);

        // KPI設定を取得
        const kpiData = await KPIService.getKPISettings(user.uid);
        setKpiSettings(kpiData);

        // 選択されたGA4プロパティを取得
        const response = await fetch('/api/datasources/list', {
          headers: {
            'x-user-id': user.uid
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch datasources');
        }

        const data = await response.json();
        let propertyId = data.selectedGA4PropertyId;

        if (!propertyId) {
          setError('GA4プロパティが選択されていません。サイト設定から接続してください。');
          setIsLoading(false);
          return;
        }

        // Property IDから数値部分のみを抽出
        if (typeof propertyId === 'string') {
          if (propertyId.startsWith('properties/')) {
            propertyId = propertyId.replace('properties/', '');
          }
          propertyId = propertyId.replace(/\D/g, '');
        }

        if (!propertyId || propertyId.length === 0) {
          setError('有効なGA4プロパティIDが見つかりません。サイト設定を確認してください。');
          setIsLoading(false);
          return;
        }

        setSelectedPropertyId(propertyId);

        // デフォルトの日付範囲を設定（前月）
        const range = calculateDateRange();

        // 月別データを取得（選択期間の終了月から遡って13ヶ月分）
        const monthlyResponse = await fetch('/api/ga4/monthly-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid
          },
          body: JSON.stringify({ 
            propertyId,
            endDate: range.endDate
          })
        });

        if (monthlyResponse.ok) {
          const monthlyResult = await monthlyResponse.json();
          setMonthlyData(monthlyResult.monthlyData || []);
          
          // 問題検出
          await detectIssues(monthlyResult.monthlyData);
        } else {
          const errorText = await monthlyResponse.text();
          console.error('❌ 月別データ取得エラー:', errorText);
        }
      } catch (err: any) {
        console.error('データ取得エラー:', err);
        
        let errorMessage = 'データの取得に失敗しました。';
        if (err.message?.includes('Please reconnect your Google account')) {
          errorMessage = 'OAuth認証の有効期限が切れています。サイト設定からGoogleアカウントを再接続してください。';
        } else if (err.message?.includes('UNAUTHENTICATED')) {
          errorMessage = 'OAuth認証エラーが発生しました。サイト設定からGoogleアカウントを再接続してください。';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
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

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            ダッシュボード
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            重要な指標と改善点を一目で確認
          </p>
        </div>

        {/* 気づきセクション */}
        {detectedIssues.length > 0 && (
          <InsightsAlert issues={detectedIssues} />
        )}

        {/* KPI予実セクション */}
        {monthlyData.length > 0 && kpiSettings.length > 0 && (() => {
          const currentMonth = monthlyData[0];

          // KPIメトリクスマッピング
          const getMetricValue = (metricName: string) => {
            const metricMap: Record<string, number> = {
              'sessions': currentMonth.sessions || 0,
              'pageviews': currentMonth.screenPageViews || 0,
              'users': currentMonth.totalUsers || 0,
              'conversions': currentMonth.conversions || 0,
              'engagementRate': currentMonth.engagementRate || 0,
            };
            
            // conversion_プレフィックスがある場合は除去
            if (metricName.startsWith('conversion_')) {
              const eventName = metricName.replace('conversion_', '');
              if (currentMonth.conversionBreakdown && currentMonth.conversionBreakdown[eventName]) {
                return currentMonth.conversionBreakdown[eventName];
              }
              return 0;
            }
            
            // コンバージョンイベント名の場合（プレフィックスなし）
            if (currentMonth.conversionBreakdown && currentMonth.conversionBreakdown[metricName]) {
              return currentMonth.conversionBreakdown[metricName];
            }
            
            return metricMap[metricName] || 0;
          };

          // 達成率計算
          const calculateAchievementRate = (current: number, target: number) => {
            if (target === 0) return 0;
            return (current / target) * 100;
          };

          // メトリクス名を表示用に変換
          const getMetricDisplayName = (metric: string) => {
            const displayNames: Record<string, string> = {
              'sessions': 'セッション',
              'pageviews': 'ページビュー',
              'users': 'ユーザー数',
              'conversions': 'コンバージョン',
              'engagementRate': 'エンゲージメント率',
            };
            
            // conversion_プレフィックスがある場合は除去して検索
            if (metric.startsWith('conversion_')) {
              const eventName = metric.replace('conversion_', '');
              const conversion = conversions.find(c => c.eventName === eventName);
              return conversion?.displayName || conversion?.eventName || eventName;
            }
            
            return displayNames[metric] || conversions.find(c => c.eventName === metric)?.displayName || metric;
          };

          return (
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-dark dark:text-white">KPI予実</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiSettings.map((kpi) => {
                  const currentValue = getMetricValue(kpi.metric);
                  const targetValue = parseFloat(kpi.targetValue);
                  const achievementRate = calculateAchievementRate(currentValue, targetValue);
                  const remaining = Math.max(0, targetValue - currentValue);

                  return (
                    <div key={kpi.id} className="analysis-card p-6">
                      <div className="mb-3">
                        <p className="text-sm font-medium text-body-color dark:text-dark-6">
                          {getMetricDisplayName(kpi.metric)}
                        </p>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-3xl font-bold text-dark dark:text-white">
                            {currentValue.toLocaleString()}
                          </h3>
                          <span className="text-sm text-body-color dark:text-dark-6">
                            / {targetValue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-body-color dark:text-dark-6">達成率</span>
                          <span 
                            className="font-semibold"
                            style={{ 
                              color: achievementRate >= 100 
                                ? 'rgb(22 163 74 / var(--tw-text-opacity, 1))' 
                                : 'rgb(220 38 38 / var(--tw-text-opacity, 1))' 
                            }}
                          >
                            {achievementRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-3">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(achievementRate, 100)}%`,
                              backgroundColor: achievementRate >= 100 
                                ? 'rgb(22 163 74 / var(--tw-bg-opacity, 1))' 
                                : 'rgb(220 38 38 / var(--tw-bg-opacity, 1))' 
                            }}
                          />
                        </div>
                        {achievementRate < 100 && (
                          <div className="text-xs text-body-color dark:text-dark-6">
                            残り: {remaining.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
