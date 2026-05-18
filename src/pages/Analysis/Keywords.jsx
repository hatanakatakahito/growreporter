import React, { useState, useEffect } from 'react';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGSCKeywordsV2, useReclassifyKeywordsV2 } from '../../hooks/useGSCKeywordsV2';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import TourHelpButton from '../../components/Onboarding/TourHelpButton';
import { Button } from '../../components/ui/button';
import { setPageTitle } from '../../utils/pageTitle';
import { PAGE_TYPES } from '../../constants/plans';
import { Lock } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import toast from 'react-hot-toast';

import KeywordsKpiSummary from '../../components/Analysis/KeywordsV2/KeywordsKpiSummary';
import KeywordsFunnel from '../../components/Analysis/KeywordsV2/KeywordsFunnel';
import KeywordsRelationGraph from '../../components/Analysis/KeywordsV2/KeywordsRelationGraph';
import KeywordsOpportunityQuadrant from '../../components/Analysis/KeywordsV2/KeywordsOpportunityQuadrant';
import KeywordsImproveCandidates from '../../components/Analysis/KeywordsV2/KeywordsImproveCandidates';
import KeywordsCVContribution from '../../components/Analysis/KeywordsV2/KeywordsCVContribution';
import KeywordsTableView from '../../components/Analysis/KeywordsV2/KeywordsTableView';
import KeywordsChartView from '../../components/Analysis/KeywordsV2/KeywordsChartView';

/**
 * 検索キーワード V2 — ファネル分類 + 関係図 + チャンス象限 + 改善候補 + CV 貢献 + 表/グラフ
 */

const TABS = [
  { key: 'funnel', label: 'ファネル', business: true },
  { key: 'graph', label: '関係図', business: true },
  { key: 'quadrant', label: 'チャンス象限', business: false },
  { key: 'improve', label: '改善候補', business: true },
  { key: 'cv', label: 'CV 貢献', business: true },
  { key: 'table', label: '表形式', business: false },
  { key: 'chart', label: 'グラフ形式', business: false },
];

export default function Keywords() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const { isFree } = usePlan();
  const [activeTab, setActiveTab] = useState('funnel');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);

  useEffect(() => {
    setPageTitle('検索キーワード');
  }, []);

  // localStorage で最後に開いていたタブを復元（リプレース時の既存ユーザー配慮）
  useEffect(() => {
    const stored = localStorage.getItem('analysis-keywords-v2-tab');
    if (stored && TABS.some((t) => t.key === stored)) {
      setActiveTab(stored);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('analysis-keywords-v2-tab', activeTab);
  }, [activeTab]);

  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);
  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange;

  const { data, isLoading, isFetching, isError, error } = useGSCKeywordsV2(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    isComparing ? { startDate: comparisonDateRange.from, endDate: comparisonDateRange.to } : null,
    hasGSCConnection
  );

  const reclassify = useReclassifyKeywordsV2(selectedSiteId);
  const handleReclassify = async () => {
    if (isReclassifying) return;
    setIsReclassifying(true);
    try {
      await reclassify();
      toast.success('再分類リクエストを受け付けました。次回データ取得時に反映されます');
    } catch (e) {
      toast.error('再分類に失敗しました: ' + (e?.message || ''));
    } finally {
      setIsReclassifying(false);
    }
  };

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const el = document.getElementById('ai-analysis-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">

          {/* ページタイトル */}
          <div className="mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-dark dark:text-white">集客 - 検索キーワード</h2>
              <TourHelpButton tourId="analysisKeywords" />
            </div>
            <p className="mt-1 text-sm text-body-color">
              Search Console のデータを AI でファネル分類・クラスタリングし、伸びしろを可視化します
            </p>
          </div>

          {!hasGSCConnection ? (
            <div className="rounded-lg border border-stroke bg-gray-50 p-12 text-center dark:border-dark-3 dark:bg-dark-3">
              <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
                Google Search Console に接続
              </h3>
              <p className="mb-6 text-sm text-body-color">
                Googleアカウントで認証し、Search Consoleサイトにアクセスします<br />
                <span className="text-gray-500">※ 検索キーワードデータを表示するには、Search Consoleとの連携が必要です</span>
              </p>
              <Button variant="primary" size="lg" href={`/sites/${selectedSiteId}/edit?step=3`}>
                Googleアカウントで接続
              </Button>
            </div>
          ) : isLoading ? (
            <LoadingSpinner message="キーワードデータを分析中... AI 分類で 30〜60 秒ほどかかります" />
          ) : isFetching && !data ? (
            <LoadingSpinner message="再分類中... 30〜60 秒ほどお待ちください" />
          ) : isError ? (
            <ErrorAlert message={error?.message || 'データの読み込みに失敗しました。'} />
          ) : !data || (data.keywords?.length || 0) === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* KPI サマリー */}
              <KeywordsKpiSummary metrics={data.metrics} comparison={data.comparisonMetrics} />

              {/* タブバー（他分析画面と同じスタイル: テキストのみ・flex-1 等分） */}
              <div className="mb-6 mt-4 flex gap-2 rounded-lg border border-stroke bg-white p-1 overflow-x-auto dark:border-dark-3 dark:bg-dark-2" data-tour="analysis-view-tabs">
                {TABS.map((t) => {
                  const active = activeTab === t.key;
                  const locked = t.business && isFree;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        if (locked) {
                          setIsLimitModalOpen(true);
                          return;
                        }
                        setActiveTab(t.key);
                      }}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-primary text-white transition hover:bg-opacity-90'
                          : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                      } ${locked ? 'opacity-60' : ''}`}
                    >
                      <span>{t.label}</span>
                      {locked && <Lock className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>

              {/* タブコンテンツ */}
              {activeTab === 'funnel' && (
                <KeywordsFunnel
                  data={data}
                  siteId={selectedSiteId}
                  onReclassify={handleReclassify}
                  isReclassifying={isReclassifying || isFetching}
                />
              )}
              {activeTab === 'graph' && (
                <KeywordsRelationGraph
                  data={data}
                  onAction={(action /* , kw */) => {
                    if (action === 'improve') setActiveTab('improve');
                    else if (action === 'detail') setActiveTab('table');
                  }}
                />
              )}
              {activeTab === 'quadrant' && <KeywordsOpportunityQuadrant data={data} />}
              {activeTab === 'improve' && (
                <KeywordsImproveCandidates siteId={selectedSiteId} data={data} />
              )}
              {activeTab === 'cv' && <KeywordsCVContribution data={data} />}
              {activeTab === 'table' && <KeywordsTableView data={data} />}
              {activeTab === 'chart' && <KeywordsChartView data={data} />}
            </>
          )}

          {/* メモ + AI タブ */}
          {selectedSiteId && currentUser && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="keywords"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="keywords"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  !isLoading && data ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.KEYWORDS}
                      rawData={data}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
                      comparisonRawData={null}
                      comparisonPeriod={
                        isComparing
                          ? { startDate: comparisonDateRange?.from, endDate: comparisonDateRange?.to }
                          : null
                      }
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">データを読み込み中...</div>
                  )
                }
              />
            </div>
          )}
        </div>

        {selectedSiteId && !isLoading && data && (
          <AIFloatingButton pageType={PAGE_TYPES.KEYWORDS} onScrollToAI={scrollToAIAnalysis} />
        )}

        {isLimitModalOpen && (
          <PlanLimitModal onClose={() => setIsLimitModalOpen(false)} type="summary" />
        )}
      </main>
    </div>
  );
}
