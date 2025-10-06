'use client';

import { useAuth } from '@/lib/auth/authContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GA4Property } from '@/lib/api/googleAnalytics';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { KPIService } from '@/lib/kpi/kpiService';
import { CustomKPI } from '@/types/kpi';
import { AnalysisService } from '@/lib/analysis/analysisService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker.css';

interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

interface GA4Data {
  success: boolean;
  data: any;
  summary: any;
}

interface GSCData {
  success: boolean;
  data: any;
  summary: any;
}

export default function AnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedGA4Property, setSelectedGA4Property] = useState<GA4Property | null>(null);
  const [selectedGSCSite, setSelectedGSCSite] = useState<GSCSite | null>(null);
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null);
  const [gscData, setGSCData] = useState<GSCData | null>(null);
  const [isLoadingGA4, setIsLoadingGA4] = useState(false);
  const [isLoadingGSC, setIsLoadingGSC] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dateRangeType, setDateRangeType] = useState<'preset' | 'custom'>('preset');
  const [presetRange, setPresetRange] = useState<string>('30daysAgo');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  const [kpis, setKPIs] = useState<CustomKPI[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (!user) return;
    
    const loadSelections = async () => {
      const ga4Data = await FirestoreService.getGA4Properties(user.uid);
      if (ga4Data?.selectedPropertyId) {
        const selected = ga4Data.properties.find(p => p.name === ga4Data.selectedPropertyId);
        if (selected) setSelectedGA4Property(selected);
      }
      
      const gscData = await FirestoreService.getGSCSites(user.uid);
      if (gscData?.selectedSiteUrl) {
        const selected = gscData.sites.find(s => s.siteUrl === gscData.selectedSiteUrl);
        if (selected) setSelectedGSCSite(selected);
      }
    };
    
    loadSelections();
    
    const unsubscribeKPI = KPIService.subscribeToKPIs(user.uid, setKPIs);
    
    const initReport = async () => {
      const report = await AnalysisService.createAnalysisReport(user.uid, {
        title: `分析 ${new Date().toLocaleDateString('ja-JP')}`,
      });
      setCurrentReportId(report.id);
    };
    
    initReport();
    
    return () => {
      unsubscribeKPI();
    };
  }, [user, authLoading, router]);

  const fetchGA4Data = async () => {
    if (!user?.uid || !selectedGA4Property) {
      setError('GA4プロパティが選択されていません');
      return;
    }

    setIsLoadingGA4(true);
    setError(null);

    try {
      const tokens = await FirestoreService.getOAuthTokens(user.uid);
      if (!tokens) throw new Error('認証情報が見つかりません');
      
      let accessToken = tokens.accessToken;
      
      if (tokens.expiresAt * 1000 < Date.now()) {
        const refreshData = await FirestoreService.refreshAccessToken(user.uid, tokens.refreshToken);
        accessToken = refreshData.accessToken;
      }

      const today = new Date();
      let startDate: string, endDate: string;

      if (dateRangeType === 'preset') {
        endDate = today.toISOString().split('T')[0];
        const startDateObj = new Date();
        const days = presetRange === '7daysAgo' ? 7 : presetRange === '30daysAgo' ? 30 : 90;
        startDateObj.setDate(today.getDate() - days);
        startDate = startDateObj.toISOString().split('T')[0];
      } else {
        if (!customStartDate || !customEndDate) throw new Error('日付を選択してください');
        startDate = customStartDate.toISOString().split('T')[0];
        endDate = customEndDate.toISOString().split('T')[0];
      }

      const response = await fetch('/api/analytics/ga4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedGA4Property.name,
          accessToken,
          dateRange: { startDate, endDate },
          dimensions: ['date'],
          metrics: ['sessions', 'activeUsers', 'screenPageViews'],
        }),
      });

      if (!response.ok) throw new Error('GA4データ取得に失敗しました');

      const data = await response.json();
      setGA4Data(data);
      
      if (currentReportId) {
        await AnalysisService.saveGA4DataToReport(user.uid, currentReportId, data);
      }
    } catch (error: any) {
      console.error('GA4データ取得エラー:', error);
      setError(error.message);
    } finally {
      setIsLoadingGA4(false);
    }
  };

  const fetchGSCData = async () => {
    if (!user?.uid || !selectedGSCSite) {
      setError('GSCサイトが選択されていません');
      return;
    }

    setIsLoadingGSC(true);
    setError(null);

    try {
      const tokens = await FirestoreService.getOAuthTokens(user.uid);
      if (!tokens) throw new Error('認証情報が見つかりません');
      
      let accessToken = tokens.accessToken;
      
      if (tokens.expiresAt * 1000 < Date.now()) {
        const refreshData = await FirestoreService.refreshAccessToken(user.uid, tokens.refreshToken);
        accessToken = refreshData.accessToken;
      }

      const today = new Date();
      let startDate: string, endDate: string;

      if (dateRangeType === 'preset') {
        endDate = today.toISOString().split('T')[0];
        const startDateObj = new Date();
        const days = presetRange === '7daysAgo' ? 7 : presetRange === '30daysAgo' ? 30 : 90;
        startDateObj.setDate(today.getDate() - days);
        startDate = startDateObj.toISOString().split('T')[0];
      } else {
        if (!customStartDate || !customEndDate) throw new Error('日付を選択してください');
        startDate = customStartDate.toISOString().split('T')[0];
        endDate = customEndDate.toISOString().split('T')[0];
      }

      const response = await fetch('/api/analytics/gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: selectedGSCSite.siteUrl,
          accessToken,
          dateRange: { startDate, endDate },
          dimensions: ['date'],
        }),
      });

      if (!response.ok) throw new Error('GSCデータ取得に失敗しました');

      const data = await response.json();
      setGSCData(data);
      
      if (currentReportId) {
        await AnalysisService.saveGSCDataToReport(user.uid, currentReportId, data);
      }
    } catch (error: any) {
      console.error('GSCデータ取得エラー:', error);
      setError(error.message);
    } finally {
      setIsLoadingGSC(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!ga4Data && !gscData) {
      setError('分析するデータがありません');
      return;
    }

    setIsLoadingAI(true);
    setError(null);

    try {
      const prompt = `以下のデータを分析して、改善提案を3つ提示してください：\n\nGA4データ: ${JSON.stringify(ga4Data?.summary || {})}\nGSCデータ: ${JSON.stringify(gscData?.summary || {})}`;

      const response = await fetch('/api/analysis/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('AI分析に失敗しました');

      const data = await response.json();
      setAiAnalysis(data.analysis);
      
      if (currentReportId && user?.uid) {
        await AnalysisService.saveAIAnalysisToReport(user.uid, currentReportId, {
          result: data.analysis,
          model: data.model || 'gemini-pro',
        });
      }
    } catch (error: any) {
      console.error('AI分析エラー:', error);
      setError(error.message);
    } finally {
      setIsLoadingAI(false);
    }
  };
  
  if (authLoading) {
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
        {/* Page Header - Mega Template準拠 */}
        <div className="mb-9">
          <h2 className="mb-2 text-2xl font-semibold text-dark dark:text-white">
            データ分析
          </h2>
          <p className="text-sm font-medium text-body-color dark:text-dark-6">
            GA4とSearch Consoleのデータを取得してAI分析を実行
          </p>
        </div>

        {/* Error Alert - Mega Template準拠 */}
        {error && (
          <div className="mb-6 rounded-md border-l-4 border-red bg-red/10 p-5">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 fill-red" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-5h2v2H9v-2zm0-8h2v6H9V5z"/>
              </svg>
              <div>
                <h5 className="mb-1 text-sm font-semibold text-red">
                  エラーが発生しました
                </h5>
                <p className="text-sm text-body-color dark:text-dark-6">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Sources Card - Mega Template準拠 */}
        <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 xl:px-[30px]">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              分析対象
            </h4>
            <p className="text-sm text-body-color dark:text-dark-6">
              GA4とSearch Consoleのデータソース
            </p>
          </div>
          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4 md:w-1/2">
              <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/[0.06] text-primary dark:bg-primary/10">
                    <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H9v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-body-color dark:text-dark-6">
                    GA4 Property
                  </span>
                </div>
                <h5 className="text-base font-semibold text-dark dark:text-white">
                  {selectedGA4Property?.displayName || '選択されていません'}
                </h5>
                {selectedGA4Property && (
                  <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                    ID: {selectedGA4Property.name}
                  </p>
                )}
              </div>
            </div>
            <div className="w-full px-4 md:w-1/2">
              <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/[0.06] text-secondary dark:bg-secondary/10">
                    <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.7 8.3l-9-8c-.4-.3-.9-.3-1.3 0l-9 8c-.3.3-.4.7-.2 1.1.2.4.6.6 1 .6h1v9c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-9h1c.4 0 .8-.2 1-.6.2-.4.1-.8-.2-1.1z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-body-color dark:text-dark-6">
                    Search Console Site
                  </span>
                </div>
                <h5 className="text-base font-semibold text-dark dark:text-white">
                  {selectedGSCSite?.siteUrl || '選択されていません'}
                </h5>
                {selectedGSCSite && (
                  <p className="mt-1 text-xs text-body-color dark:text-dark-6">
                    Permission: {selectedGSCSite.permissionLevel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Selection Card - Mega Template準拠 */}
        <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 xl:px-[30px]">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              データ取得期間
            </h4>
            <div className="mb-5 flex gap-5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={dateRangeType === 'preset'}
                  onChange={() => setDateRangeType('preset')}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium text-dark dark:text-white">プリセット期間</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={dateRangeType === 'custom'}
                  onChange={() => setDateRangeType('custom')}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium text-dark dark:text-white">カスタム期間</span>
              </label>
            </div>
          </div>

          {dateRangeType === 'preset' ? (
            <div className="mb-6">
              <select
                value={presetRange}
                onChange={(e) => setPresetRange(e.target.value)}
                className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary sm:w-1/2"
              >
                <option value="7daysAgo">過去7日間</option>
                <option value="30daysAgo">過去30日間</option>
                <option value="90daysAgo">過去90日間</option>
              </select>
            </div>
          ) : (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                  開始日
                </label>
                <DatePicker
                  selected={customStartDate}
                  onChange={(date: Date | null) => setCustomStartDate(date)}
                  maxDate={customEndDate || new Date()}
                  dateFormat="yyyy-MM-dd"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  placeholderText="開始日を選択"
                />
              </div>
              <div>
                <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                  終了日
                </label>
                <DatePicker
                  selected={customEndDate}
                  onChange={(date: Date | null) => setCustomEndDate(date)}
                  minDate={customStartDate}
                  maxDate={new Date()}
                  dateFormat="yyyy-MM-dd"
                  className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  placeholderText="終了日を選択"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchGA4Data}
              disabled={!selectedGA4Property || isLoadingGA4}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-50"
            >
              {isLoadingGA4 ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>取得中...</span>
                </>
              ) : (
                <span>GA4データ取得</span>
              )}
            </button>
            <button
              onClick={fetchGSCData}
              disabled={!selectedGSCSite || isLoadingGSC}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-50"
            >
              {isLoadingGSC ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>取得中...</span>
                </>
              ) : (
                <span>GSCデータ取得</span>
              )}
            </button>
            <button
              onClick={runAIAnalysis}
              disabled={(!ga4Data && !gscData) || isLoadingAI}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#13C296] px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-50"
            >
              {isLoadingAI ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>分析中...</span>
                </>
              ) : (
                <span>AI分析実行</span>
              )}
            </button>
          </div>
        </div>

        {/* GA4 Data Card - Mega Template準拠 */}
        {ga4Data && (
          <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 xl:px-[30px]">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-dark dark:text-white">
                GA4データ
              </h4>
              <p className="text-sm text-body-color dark:text-dark-6">
                Google Analytics 4 取得結果
              </p>
            </div>
            <div className="-mx-4 flex flex-wrap">
              <div className="w-full px-4 sm:w-1/3">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    期間
                  </span>
                  <p className="text-base font-semibold text-dark dark:text-white">
                    {ga4Data.summary.dateRange?.startDate}
                    <span className="mx-1 text-body-color dark:text-dark-6">~</span>
                    {ga4Data.summary.dateRange?.endDate}
                  </p>
                </div>
              </div>
              <div className="w-full px-4 sm:w-1/3">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    取得行数
                  </span>
                  <p className="text-base font-semibold text-dark dark:text-white">
                    {ga4Data.summary.rowCount?.toLocaleString()} 行
                  </p>
                </div>
              </div>
              <div className="w-full px-4 sm:w-1/3">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    メトリクス
                  </span>
                  <p className="text-base font-semibold text-dark dark:text-white">
                    {ga4Data.summary.metrics?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GSC Data Card - Mega Template準拠 */}
        {gscData && (
          <div className="mb-6 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 xl:px-[30px]">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-dark dark:text-white">
                Search Consoleデータ
              </h4>
              <p className="text-sm text-body-color dark:text-dark-6">
                検索パフォーマンス指標
              </p>
            </div>
            <div className="-mx-4 flex flex-wrap">
              <div className="w-full px-4 sm:w-1/2 lg:w-1/4">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    クリック数
                  </span>
                  <p className="text-xl font-semibold text-dark dark:text-white">
                    {gscData.summary.totalClicks?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="w-full px-4 sm:w-1/2 lg:w-1/4">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    表示回数
                  </span>
                  <p className="text-xl font-semibold text-dark dark:text-white">
                    {gscData.summary.totalImpressions?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="w-full px-4 sm:w-1/2 lg:w-1/4">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    平均CTR
                  </span>
                  <p className="text-xl font-semibold text-dark dark:text-white">
                    {(gscData.summary.averageCTR * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="w-full px-4 sm:w-1/2 lg:w-1/4">
                <div className="mb-6 rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
                  <span className="mb-2 block text-sm text-body-color dark:text-dark-6">
                    平均掲載順位
                  </span>
                  <p className="text-xl font-semibold text-dark dark:text-white">
                    {gscData.summary.averagePosition?.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Results Card - Mega Template準拠 */}
        {aiAnalysis && (
          <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2 xl:px-[30px]">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-dark dark:text-white">
                AI分析結果
              </h4>
              <p className="text-sm text-body-color dark:text-dark-6">
                改善提案とインサイト
              </p>
            </div>
            <div className="rounded-lg border border-stroke bg-gray-2 p-5 dark:border-dark-3 dark:bg-dark">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-dark dark:text-white">
                {aiAnalysis}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
