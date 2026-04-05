import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useSiteMetrics } from '../../hooks/useSiteMetrics';
import { useGA4MonthlyData } from '../../hooks/useGA4MonthlyData';
import { useGA4UserDemographics } from '../../hooks/useGA4UserDemographics';
import { useGSCData } from '../../hooks/useGSCData';
import { PAGE_TYPES } from '../../constants/plans';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import UpgradeModal from '../../components/common/UpgradeModal';
import { setPageTitle } from '../../utils/pageTitle';
import { format, sub, startOfMonth } from 'date-fns';
import {
  Sparkles,
  RefreshCw,
  BarChart3,
  Users,
  TrendingUp,
  FileText,
  Target,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
  AlertTriangle,
  Smile,
  Crown,
} from 'lucide-react';

// セクションメタデータ（素人向けタイトル）
const SECTION_META = {
  'アクセス概況': {
    icon: BarChart3,
    color: 'blue',
    title: 'アクセスの状況',
    links: [
      { label: '全体サマリー', path: '/analysis/summary' },
      { label: '月別', path: '/analysis/month' },
      { label: '日別', path: '/analysis/day' },
      { label: '曜日別', path: '/analysis/week' },
      { label: '時間帯別', path: '/analysis/hour' },
    ],
  },
  'ユーザー分析': {
    icon: Users,
    color: 'violet',
    title: '訪問者の傾向',
    links: [
      { label: 'ユーザー属性', path: '/analysis/users' },
    ],
  },
  '集客分析': {
    icon: TrendingUp,
    color: 'emerald',
    title: 'どこから来ているか',
    links: [
      { label: '集客チャネル', path: '/analysis/channels' },
      { label: 'キーワード', path: '/analysis/keywords' },
      { label: '被リンク元', path: '/analysis/referrals' },
    ],
  },
  'コンテンツ分析': {
    icon: FileText,
    color: 'amber',
    title: 'どのページが見られているか',
    links: [
      { label: 'ページ別', path: '/analysis/pages' },
      { label: 'ランディング', path: '/analysis/landing-pages' },
      { label: 'ページフロー', path: '/analysis/page-flow' },
    ],
  },
  'コンバージョン分析': {
    icon: Target,
    color: 'rose',
    title: '成果はどれくらいか',
    links: [
      { label: 'コンバージョン', path: '/analysis/conversions' },
      { label: '逆算フロー', path: '/analysis/reverse-flow' },
    ],
  },
};

const COLOR_MAP = {
  blue: { text: 'text-primary', iconBg: 'bg-primary/10' },
  violet: { text: 'text-primary', iconBg: 'bg-primary/10' },
  emerald: { text: 'text-primary', iconBg: 'bg-primary/10' },
  amber: { text: 'text-primary', iconBg: 'bg-primary/10' },
  rose: { text: 'text-primary', iconBg: 'bg-primary/10' },
};

/**
 * AI総合分析ページ
 * 全データを横断してAIが1画面で総合分析
 */
export default function ComprehensiveAI() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const { planId } = usePlan();
  const navigate = useNavigate();
  const isFree = planId === 'free';
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  useEffect(() => {
    setPageTitle('AI総合分析');
  }, []);

  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // === データ取得 ===
  const { data: currentData, isLoading: isLoadingCurrent } = useSiteMetrics(
    selectedSiteId, dateRange.from, dateRange.to, hasGSCConnection
  );

  const previousMonthRange = useMemo(() => {
    const from = dateRange.from ? new Date(dateRange.from) : new Date();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();
    const diff = to - from;
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - diff);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [dateRange]);

  const { data: previousMonthData } = useSiteMetrics(
    selectedSiteId, previousMonthRange.from, previousMonthRange.to, hasGSCConnection
  );

  const yearAgoRange = useMemo(() => {
    const from = dateRange.from ? sub(new Date(dateRange.from), { years: 1 }) : sub(new Date(), { years: 1 });
    const to = dateRange.to ? sub(new Date(dateRange.to), { years: 1 }) : sub(new Date(), { years: 1 });
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
  }, [dateRange]);

  const { data: yearAgoData } = useSiteMetrics(
    selectedSiteId, yearAgoRange.from, yearAgoRange.to, hasGSCConnection
  );

  const monthlyStartDate = useMemo(() => {
    if (!dateRange.to) return format(startOfMonth(sub(new Date(), { months: 12 })), 'yyyy-MM-dd');
    const endMonth = startOfMonth(new Date(dateRange.to));
    return format(startOfMonth(sub(endMonth, { months: 12 })), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const monthlyEndDate = useMemo(() => {
    return dateRange.to ? format(new Date(dateRange.to), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  }, [dateRange.to]);

  const { data: monthlyDataResponse } = useGA4MonthlyData(selectedSiteId, monthlyStartDate, monthlyEndDate);
  const monthlyData = monthlyDataResponse?.monthlyData || [];

  const { data: demographicsData } = useGA4UserDemographics(selectedSiteId, dateRange.from, dateRange.to);

  const { data: channelData } = useQuery({
    queryKey: ['ga4-channel-conversions-comp-ai', selectedSiteId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4ChannelConversionData');
      const result = await fn({ siteId: selectedSiteId, startDate: dateRange.from, endDate: dateRange.to });
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && !isFree,
    staleTime: 5 * 60 * 1000,
  });

  const { data: landingPageData } = useQuery({
    queryKey: ['ga4-lp-conversions-comp-ai', selectedSiteId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4LandingPageConversionData');
      const result = await fn({ siteId: selectedSiteId, startDate: dateRange.from, endDate: dateRange.to });
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && !isFree,
    staleTime: 5 * 60 * 1000,
  });

  const { data: referralData } = useQuery({
    queryKey: ['ga4-referral-conversions-comp-ai', selectedSiteId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4ReferralConversionData');
      const result = await fn({ siteId: selectedSiteId, startDate: dateRange.from, endDate: dateRange.to });
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && !isFree,
    staleTime: 5 * 60 * 1000,
  });

  const { data: pageData } = useQuery({
    queryKey: ['ga4-pages-comp-ai', selectedSiteId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const fn = httpsCallable(functions, 'fetchGA4Data');
      const result = await fn({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: ['screenPageViews', 'sessions', 'engagementRate', 'averageSessionDuration'],
        dimensions: ['pagePath', 'pageTitle'],
        orderBy: [{ metric: 'screenPageViews', desc: true }],
        limit: 20,
      });
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && !isFree,
    staleTime: 5 * 60 * 1000,
  });

  const { data: gscData } = useGSCData(
    selectedSiteId, dateRange.from, dateRange.to, hasGSCConnection && !isFree
  );

  const isLoading = isLoadingCurrent && !currentData;

  // === rawData構築 ===
  const rawData = useMemo(() => {
    if (!currentData || isFree) return null;

    const totalConversions = currentData.conversions
      ? Object.values(currentData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const previousMonthTotalConversions = previousMonthData?.conversions
      ? Object.values(previousMonthData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const yearAgoTotalConversions = yearAgoData?.conversions
      ? Object.values(yearAgoData.conversions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;

    const conversionBreakdown = {};
    if (selectedSite?.conversionEvents && currentData?.conversions) {
      selectedSite.conversionEvents.forEach(event => {
        const cur = currentData.conversions[event.eventName] || 0;
        const prev = previousMonthData?.conversions?.[event.eventName] || 0;
        conversionBreakdown[event.displayName] = {
          current: cur,
          previous: prev,
          monthChange: prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0),
        };
      });
    }

    const keywords = hasGSCConnection && gscData?.topQueries ? gscData.topQueries : null;

    return {
      current: {
        metrics: currentData.metrics,
        conversions: currentData.conversions,
        totalConversions,
        conversionBreakdown,
      },
      previousMonth: previousMonthData ? {
        metrics: previousMonthData.metrics,
        conversions: previousMonthData.conversions,
        totalConversions: previousMonthTotalConversions,
      } : null,
      yearAgo: yearAgoData ? {
        metrics: yearAgoData.metrics,
        conversions: yearAgoData.conversions,
        totalConversions: yearAgoTotalConversions,
      } : null,
      monthlyTrend: monthlyData,
      demographics: demographicsData || null,
      channels: channelData?.rows || [],
      landingPages: landingPageData?.rows || [],
      referrals: referralData?.rows || [],
      pages: pageData?.rows || [],
      keywords,
      hasConversionEvents: selectedSite?.conversionEvents?.length > 0,
      hasGSCConnection,
    };
  }, [currentData, previousMonthData, yearAgoData, monthlyData, demographicsData, channelData, landingPageData, referralData, pageData, gscData, selectedSite, hasGSCConnection, isFree]);

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader
        dateRange={dateRange}
        setDateRange={updateDateRange}
        showDateRange={true}
        showSiteInfo={false}
        hideComparison={true}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-dark dark:text-white">分析する - AI総合分析</h2>
            <p className="mt-0.5 text-sm text-body-color">
              全データを横断してAIが自動分析し、サイトの現状を明らかにします
            </p>
          </div>

          {isFree ? (
            <FreeUpgradePrompt />
          ) : isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <LoadingSpinner message="データを収集しています..." />
            </div>
          ) : (
            selectedSiteId && currentUser && (
              <div className="ai-gradient-border mt-8">
                <div className="rounded-lg bg-white/[0.92] p-6 dark:bg-dark-2" style={{ backdropFilter: 'blur(16px) saturate(180%)' }}>
                  {rawData ? (
                    <ComprehensiveAIContent
                      rawData={rawData}
                      dateRange={dateRange}
                      selectedSite={selectedSite}
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      データを読み込み中...
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {isLimitModalOpen && (
          <PlanLimitModal
            onClose={() => setIsLimitModalOpen(false)}
            type="summary"
          />
        )}
      </main>
    </div>
  );
}

function FreeUpgradePrompt() {
  return <UpgradeModal isOpen={true} onClose={() => window.location.href = '/dashboard'} />;
}

function parseSections(summary) {
  const lines = summary.split('\n');
  const sections = [];
  let currentSection = null;
  let overallSummary = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: stripMarkdown(line.replace(/^#{1,6}\s*/, '').trim()), content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    } else {
      overallSummary.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);
  return { overallSummary: overallSummary.join('\n').trim(), sections };
}

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function parseHighlights(section) {
  if (!section) return [];
  const highlights = [];
  const lines = section.content.join('\n').split('\n');
  for (const line of lines) {
    const match = line.match(/^-\s*(.+?):\s*(.+?)(?:\s*\((.+)\))?$/);
    if (match) {
      highlights.push({
        label: stripMarkdown(match[1].trim()),
        value: stripMarkdown(match[2].trim()),
        detail: stripMarkdown(match[3]?.trim() || ''),
      });
    }
  }
  return highlights;
}

// 注目ポイントカードのタイプとスタイル
const HIGHLIGHT_STYLES = {
  change: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    labelColor: 'text-blue-600',
    Icon: TrendingUp,
    label: '注目すべき変化',
  },
  risk: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    labelColor: 'text-rose-600',
    Icon: AlertTriangle,
    label: '気をつけたいこと',
  },
  chance: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    labelColor: 'text-emerald-600',
    Icon: Smile,
    label: 'チャンス',
  },
};

function getHighlightType(index) {
  return ['change', 'risk', 'chance'][index] || 'change';
}

/**
 * AI総合分析コンテンツ（スコア＋ミニKPI＋タブ切り替え型）
 */
function ComprehensiveAIContent({ rawData, dateRange, selectedSite, onLimitExceeded }) {
  const { selectedSiteId } = useSite();
  const { checkCanGenerate, planId } = usePlan();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const loadAnalysis = async (forceRegenerate = false) => {
    setIsLoading(true);
    setError(null);

    try {
      if (forceRegenerate && !checkCanGenerate('summary')) {
        if (onLimitExceeded) onLimitExceeded();
        setIsLoading(false);
        return;
      }

      const generateAISummary = httpsCallable(functions, 'generateAISummary');
      const result = await generateAISummary({
        siteId: selectedSiteId,
        pageType: PAGE_TYPES.COMPREHENSIVE_ANALYSIS,
        rawData,
        startDate: dateRange?.from || format(sub(new Date(), { months: 1 }), 'yyyy-MM-dd'),
        endDate: dateRange?.to || format(new Date(), 'yyyy-MM-dd'),
        forceRegenerate,
      });

      const data = result.data;
      setSummary(data.summary || null);
      setGeneratedAt(data.generatedAt || null);
      setFromCache(data.fromCache || false);
    } catch (err) {
      console.error('[ComprehensiveAI] AI分析エラー:', err);
      if (err.code === 'functions/resource-exhausted') {
        if (onLimitExceeded) onLimitExceeded();
      } else {
        setError(err.message || 'AI分析の生成に失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 比較期間ラベル - Hooksルールのため早期リターン前に配置
  const compPeriodLabel = '前期間比';

  useEffect(() => {
    if (selectedSiteId && rawData) {
      loadAnalysis(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-600">AI総合分析を生成中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={() => loadAnalysis(false)}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { overallSummary, sections } = parseSections(summary);
  const highlightSection = sections.find(s => s.title === '注目ポイント');
  const highlights = parseHighlights(highlightSection);
  const analysisSections = sections.filter(s => s.title !== '注目ポイント');
  const hasConversions = selectedSite?.conversionEvents?.length > 0;

  // タブ定義（SECTION_METAの順序に従う）
  const TAB_ORDER = ['アクセス概況', 'ユーザー分析', '集客分析', 'コンテンツ分析', 'コンバージョン分析'];
  const TAB_LABELS = ['アクセス', '訪問者の傾向', '集客', 'コンテンツ', '成果'];
  const TAB_ICONS = [BarChart3, Users, TrendingUp, FileText, Target];

  // タブに対応するセクションを取得（AIの出力タイトルが変わっても対応）
  const SECTION_TITLE_ALIASES = {
    'ユーザー分析': ['ユーザー分析', '訪問者の特徴', '訪問者の傾向', 'ユーザー属性'],
  };
  const tabSections = TAB_ORDER.map(key => {
    if (key === 'コンバージョン分析' && !hasConversions) return null;
    const aliases = SECTION_TITLE_ALIASES[key] || [key];
    const section = analysisSections.find(s => aliases.includes(s.title));
    const meta = SECTION_META[key];
    return section && meta ? { section, meta } : null;
  });

  // ミニKPIデータ
  const metrics = rawData.current?.metrics;
  const prevMetrics = rawData.previousMonth?.metrics;
  const miniKpis = buildMiniKpis(metrics, prevMetrics, rawData);

  return (
    <div className="space-y-5">
        {/* ヘッダー */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">AI総合分析結果</h3>
              {generatedAt && (
                <p className="text-xs text-gray-500">
                  {format(new Date(generatedAt), 'yyyy/MM/dd HH:mm')} 生成
                  {fromCache && ' (前回の分析結果)'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (planId === 'free') {
                setIsUpgradeModalOpen(true);
              } else {
                loadAnalysis(true);
              }
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            再分析
          </button>
        </div>

        {/* サイト健全性スコア＋サマリー */}
        {overallSummary && (
          <div className="flex items-center gap-5 rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px) saturate(180%)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)' }}>
            <HealthScoreRing rawData={rawData} />
            <div className="flex-1">
              <p className="mb-1.5 text-[14px] font-semibold text-gray-700">サイト健全性スコア</p>
              <p className="text-[15px] leading-[1.8] text-gray-900">{stripMarkdown(overallSummary)}</p>
            </div>
          </div>
        )}

        {/* 注目ポイント（3枚カード） */}
        {highlights.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {highlights.map((h, i) => {
              const type = getHighlightType(i);
              const style = HIGHLIGHT_STYLES[type];
              return (
                <div key={i} className={`rounded-[10px] border-2 p-4 ${style.border}`} style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px) saturate(180%)', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)' }}>
                  <p className={`text-[12px] font-semibold ${style.labelColor}`}>{style.label}</p>
                  <p className="mt-1.5 text-[14px] leading-[1.6] text-gray-900">{h.value}</p>
                  {h.detail && <p className="mt-1 text-[13px] leading-[1.6] text-gray-600">{h.detail}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ミニKPIサマリー（5枚カード） - クリックで対応セクションへスクロール */}
        {miniKpis.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {miniKpis.map((kpi, i) => {
              const sectionIds = ['section-access', 'section-visitor', 'section-channel', 'section-content', 'section-conversion'];
              return (
                <div
                  key={i}
                  className="cursor-pointer rounded-[10px] p-3 text-center transition hover:ring-2 hover:ring-primary/30"
                  style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.06)' }}
                  onClick={() => {
                    const el = document.getElementById(sectionIds[i]);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <p className="text-[18px] font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-[11px] text-gray-700">{kpi.label}</p>
                  {kpi.change != null && (
                    <p className={`inline-flex items-center justify-center gap-0.5 text-[11px] ${kpi.change > 0 ? 'text-emerald-600' : kpi.change < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                      {Math.abs(kpi.change) < 1
                        ? <><Minus className="h-3 w-3" /> {Math.abs(kpi.change).toFixed(1)}%</>
                        : kpi.change > 0
                          ? <><ArrowUpRight className="h-3 w-3" /> +{Math.abs(kpi.change).toFixed(1)}%</>
                          : <><ArrowDownRight className="h-3 w-3" /> -{Math.abs(kpi.change).toFixed(1)}%</>
                      }
                      <span className="ml-0.5 text-gray-400">{compPeriodLabel}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 全セクション（ページ内スクロール） */}
        {tabSections.map((tabData, i) => {
          if (!tabData) return null;
          if (i === 4 && !hasConversions) return null;
          const { section, meta } = tabData;
          const SectionIcon = TAB_ICONS[i];
          const sectionIds = ['section-access', 'section-visitor', 'section-channel', 'section-content', 'section-conversion'];
          return (
            <div
              key={i}
              id={sectionIds[i]}
              className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px) saturate(180%)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)', scrollMarginTop: '20px' }}
            >
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(55,88,249,0.08)' }}>
                  <SectionIcon className="h-[18px] w-[18px] text-primary" strokeWidth={1.8} />
                </div>
                <h4 className="text-[16px] font-bold text-gray-900">{meta.title}</h4>
              </div>
              <div className="mb-3.5">
                <SectionStructuredData
                  sectionTitle={section.title}
                  rawData={rawData}
                  selectedSite={selectedSite}
                  compPeriodLabel={compPeriodLabel}
                />
              </div>
              <p className="text-[14px] leading-[1.8] text-gray-900">
                {stripMarkdown(section.content.join('\n'))}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[13px] text-gray-500">詳細を見る:</span>
                {meta.links.map((link, j) => (
                  <Link
                    key={j}
                    to={link.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline"
                  >
                    {link.label}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* 「改善する」への導線 */}
        <div className="flex flex-col items-center pt-6" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: '8px' }}>
          <button
            onClick={() => navigate('/improve')}
            className="inline-flex items-center gap-2 rounded-[10px] px-7 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
          >
            <Sparkles className="h-4 w-4" />
            サイト改善案を生成する
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-2 text-xs text-gray-500">
            この分析結果をもとに、具体的な改善施策を生成します
          </p>
        </div>

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
    </div>
  );
}

/**
 * ミニKPIデータ構築
 */
function buildMiniKpis(metrics, prevMetrics, rawData) {
  if (!metrics) return [];
  const sessions = metrics.sessions || 0;
  const prevSessions = prevMetrics?.sessions;
  const sessionsChange = prevSessions && prevSessions > 0 ? ((sessions - prevSessions) / prevSessions) * 100 : null;

  // デバイス比率（最も多いデバイスを表示）
  const demographics = rawData.demographics;
  let deviceLabel = null;
  if (demographics?.device?.length > 0) {
    const sorted = [...demographics.device].sort((a, b) => (b.value || b.sessions || b.users || 0) - (a.value || a.sessions || a.users || 0));
    const top = sorted[0];
    if (top) {
      const total = sorted.reduce((sum, d) => sum + (d.value || d.sessions || d.users || 0), 0);
      const pct = total > 0 ? (((top.value || top.sessions || top.users || 0) / total) * 100).toFixed(0) : null;
      const name = (top.name || top.device || top.deviceCategory || '').toLowerCase();
      const label = name === 'mobile' || name === 'モバイル' ? 'スマホ'
        : name === 'desktop' || name === 'デスクトップ' ? 'PC'
        : name === 'tablet' || name === 'タブレット' ? 'タブレット' : top.name || name;
      deviceLabel = pct ? `${label} ${pct}%` : null;
    }
  }

  // 検索流入
  const channels = rawData.channels || [];
  const organicSearch = channels.find(ch => (ch.sessionDefaultChannelGroup || ch.channel || '') === 'Organic Search');
  const searchSessions = organicSearch?.sessions || 0;

  // PV
  const pv = metrics.pageViews || metrics.screenPageViews || 0;
  const prevPv = prevMetrics?.pageViews || prevMetrics?.screenPageViews;
  const pvChange = prevPv && prevPv > 0 ? ((pv - prevPv) / prevPv) * 100 : null;

  // CV
  const totalCV = rawData.current?.totalConversions || 0;
  const prevCV = rawData.previousMonth?.totalConversions;
  const cvChange = prevCV && prevCV > 0 ? ((totalCV - prevCV) / prevCV) * 100 : null;

  return [
    { label: '訪問数', value: sessions.toLocaleString(), change: sessionsChange },
    { label: '端末傾向', value: deviceLabel || '-', change: null },
    { label: '検索流入', value: searchSessions.toLocaleString(), change: null },
    { label: 'PV数', value: pv.toLocaleString(), change: pvChange },
    { label: 'CV数', value: `${totalCV}件`, change: cvChange },
  ];
}

/**
 * サイト健全性スコア（SVGリング）
 */
function HealthScoreRing({ rawData }) {
  const metrics = rawData.current?.metrics;
  const prevMetrics = rawData.previousMonth?.metrics;
  if (!metrics) return null;

  // 簡易スコア計算: セッション変化率 + エンゲージメント率 + CV変化率 などを加味
  let score = 50; // ベース
  const sessions = metrics.sessions || 0;
  const prevSessions = prevMetrics?.sessions;
  if (prevSessions && prevSessions > 0) {
    const sessionsGrowth = ((sessions - prevSessions) / prevSessions) * 100;
    score += Math.min(Math.max(sessionsGrowth * 0.5, -15), 15);
  }
  const engRate = metrics.engagementRate || 0;
  score += Math.min(engRate * 30, 20);
  const totalCV = rawData.current?.totalConversions || 0;
  const prevCV = rawData.previousMonth?.totalConversions;
  if (prevCV && prevCV > 0) {
    const cvGrowth = ((totalCV - prevCV) / prevCV) * 100;
    score += Math.min(Math.max(cvGrowth * 0.3, -10), 15);
  }
  score = Math.round(Math.min(Math.max(score, 0), 100));

  const circumference = 2 * Math.PI * 15.5; // ~97.4
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
      <svg viewBox="0 0 36 36" width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3758F9" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-extrabold text-primary leading-none">{score}</span>
        <span className="text-[9px] text-gray-500">/ 100</span>
      </div>
    </div>
  );
}


function SectionStructuredData({ sectionTitle, rawData, selectedSite, compPeriodLabel }) {
  const metrics = rawData.current?.metrics;
  const prevMetrics = rawData.previousMonth?.metrics;

  switch (sectionTitle) {
    case 'アクセス概況':
      return <AccessOverviewCards metrics={metrics} prevMetrics={prevMetrics} rawData={rawData} compPeriodLabel={compPeriodLabel} />;
    case 'ユーザー分析':
    case '訪問者の特徴':
    case '訪問者の傾向':
      return <UserAnalysisCards demographics={rawData.demographics} />;
    case '集客分析':
      return <ChannelBars channels={rawData.channels} />;
    case 'コンテンツ分析':
      return <ContentTable pages={rawData.pages} />;
    case 'コンバージョン分析':
      return <ConversionCards rawData={rawData} selectedSite={selectedSite} />;
    default:
      return null;
  }
}

/**
 * 変化率バッジ
 */
function ChangeBadge({ current, previous, periodLabel = '前期間比' }) {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 1;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-600">
        <Minus className="h-3 w-3" />
        {Math.abs(change).toFixed(1)}%
        <span className="ml-0.5 text-gray-400">{periodLabel}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? '+' : ''}{change.toFixed(1)}%
      <span className="ml-0.5 text-gray-400">{periodLabel}</span>
    </span>
  );
}

/**
 * アクセス概況 - KPIカード（素人向けラベル）
 */
function AccessOverviewCards({ metrics, prevMetrics, rawData, compPeriodLabel }) {
  if (!metrics) return null;

  const sessions = metrics.sessions || 0;
  const users = metrics.users || metrics.totalUsers || 0;
  const pv = metrics.pageViews || metrics.screenPageViews || 0;
  const engRate = metrics.engagementRate || 0;

  const kpis = [
    { label: '訪問数', sublabel: 'サイトに来た回数', value: sessions.toLocaleString(), current: sessions, prev: prevMetrics?.sessions },
    { label: '訪問者数', sublabel: '何人がサイトを見たか', value: users.toLocaleString(), current: users, prev: prevMetrics?.users || prevMetrics?.totalUsers },
    { label: 'ページ閲覧数', sublabel: '何ページ見られたか', value: pv.toLocaleString(), current: pv, prev: prevMetrics?.pageViews || prevMetrics?.screenPageViews },
    { label: '閲覧の質', sublabel: 'しっかり読まれた割合', value: `${(engRate * 100).toFixed(1)}%`, current: engRate, prev: prevMetrics?.engagementRate, isRate: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((kpi, i) => (
        <div key={i} className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
          <p className="text-[12px] font-medium text-gray-700">{kpi.label}</p>
          <p className="text-[10px] text-gray-500">{kpi.sublabel}</p>
          <p className="mt-1 text-[22px] font-bold text-gray-900">{kpi.value}</p>
          {kpi.prev != null && (
            <div className="mt-1">
              <ChangeBadge
                current={kpi.isRate ? kpi.current : parseFloat(String(kpi.value).replace(/,/g, ''))}
                previous={kpi.prev}
                periodLabel={compPeriodLabel}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * ユーザー分析 - 訪問者の特徴（性別・年齢・地域・デバイス・新規リピーター）
 */
function UserAnalysisCards({ demographics }) {
  if (!demographics) return null;

  // unknown/不明/undefinedを除外するフィルタ
  const isKnown = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower !== '不明' && lower !== 'unknown' && lower !== '(not set)' && lower !== 'undefined';
  };
  const filterKnown = (arr) => (arr || []).filter(d => isKnown(d.name));

  // --- KPIサマリーカード ---
  const summaryItems = [];

  // デバイス
  const knownDevices = filterKnown(demographics.device);
  if (knownDevices.length > 0) {
    const sorted = [...knownDevices].sort((a, b) => (b.value || 0) - (a.value || 0));
    const knownTotal = sorted.reduce((sum, d) => sum + (d.value || 0), 0);
    if (sorted[0] && knownTotal > 0) {
      const pct = ((sorted[0].value / knownTotal) * 100).toFixed(0);
      summaryItems.push({ label: '主な端末', sublabel: 'デバイス別', value: `${sorted[0].name} ${pct}%` });
    }
  }

  // 新規/リピーター
  if (demographics.newReturning && demographics.newReturning.length > 0) {
    const newUser = demographics.newReturning.find(n => n.name === '新規ユーザー');
    if (newUser && newUser.percentage) {
      summaryItems.push({ label: '新規の割合', sublabel: '新規/リピーター', value: `${newUser.percentage.toFixed(0)}%` });
    }
  }

  // 年齢
  const knownAge = filterKnown(demographics.age);
  if (knownAge.length > 0) {
    const sorted = [...knownAge].sort((a, b) => (b.value || 0) - (a.value || 0));
    summaryItems.push({ label: '多い年齢層', sublabel: '最も多い年代', value: sorted[0].name || '-' });
  }

  // 性別
  const knownGender = filterKnown(demographics.gender);
  if (knownGender.length > 0) {
    const sorted = [...knownGender].sort((a, b) => (b.value || 0) - (a.value || 0));
    const knownTotal = sorted.reduce((sum, d) => sum + (d.value || 0), 0);
    if (sorted[0] && knownTotal > 0) {
      const pct = ((sorted[0].value / knownTotal) * 100).toFixed(0);
      summaryItems.push({ label: '性別の傾向', sublabel: '最も多い性別', value: `${sorted[0].name} ${pct}%` });
    }
  }

  // 地域
  const rawRegions = demographics.location?.region || demographics.location?.regions || (Array.isArray(demographics.location) ? demographics.location : null);
  const knownRegions = filterKnown(rawRegions);
  if (knownRegions.length > 0) {
    const sorted = [...knownRegions].sort((a, b) => (b.value || 0) - (a.value || 0));
    summaryItems.push({ label: '多い地域', sublabel: '最も多い都道府県', value: sorted[0].name || '-' });
  }

  // --- 詳細セクション用ヘルパー（unknown含む全データ表示） ---
  const BarChart = ({ data, maxItems = 5 }) => {
    if (!data || data.length === 0) return <p className="text-[13px] text-gray-500">データがありません</p>;
    const sorted = [...data].sort((a, b) => (b.value || 0) - (a.value || 0));
    const items = sorted.slice(0, maxItems);
    const total = items.reduce((sum, d) => sum + (d.value || 0), 0);
    const maxVal = Math.max(...items.map(d => d.value || 0), 1);
    return (
      <div className="space-y-1.5">
        {items.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-[80px] flex-shrink-0 text-right text-[12px] text-gray-700">{d.name}</span>
            <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-black/[0.04]">
              <div
                className="h-full rounded-full"
                style={{ width: `${((d.value || 0) / maxVal) * 100}%`, background: 'linear-gradient(90deg, #3758F9, #6B8AFF)' }}
              />
            </div>
            <span className="w-[50px] flex-shrink-0 text-right text-[11px] tabular-nums text-gray-600">
              {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : d.value?.toLocaleString() || '-'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPIサマリーカード */}
      {summaryItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {summaryItems.map((item, i) => (
            <div key={i} className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
              <p className="text-[12px] font-medium text-gray-700">{item.label}</p>
              <p className="text-[10px] text-gray-500">{item.sublabel}</p>
              <p className="mt-1 text-[20px] font-bold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 詳細ブレイクダウン */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 性別 */}
        {demographics.gender && demographics.gender.length > 0 && (
          <div className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
            <p className="mb-2.5 text-[13px] font-semibold text-gray-800">性別の内訳</p>
            <BarChart data={demographics.gender} />
          </div>
        )}

        {/* 年齢 */}
        {demographics.age && demographics.age.length > 0 && (
          <div className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
            <p className="mb-2.5 text-[13px] font-semibold text-gray-800">年齢の内訳</p>
            <BarChart data={demographics.age} maxItems={7} />
          </div>
        )}

        {/* 地域 */}
        {rawRegions && rawRegions.length > 0 && (
          <div className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
            <p className="mb-2.5 text-[13px] font-semibold text-gray-800">地域の内訳（上位5）</p>
            <BarChart data={rawRegions} maxItems={5} />
          </div>
        )}

        {/* デバイス */}
        {demographics.device && demographics.device.length > 0 && (
          <div className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
            <p className="mb-2.5 text-[13px] font-semibold text-gray-800">デバイスの内訳</p>
            <BarChart data={demographics.device} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 集客分析 - チャネル別プログレスバー（素人向け名称）
 */
function ChannelBars({ channels }) {
  if (!channels || channels.length === 0) return null;

  const CHANNEL_LABELS = {
    'Organic Search': 'Google検索',
    'Direct': '直接アクセス',
    'Referral': '他サイトから',
    'Organic Social': 'SNS',
    'Paid Search': '広告（検索）',
    'Paid Social': '広告（SNS）',
    'Email': 'メール',
    'Display': 'ディスプレイ広告',
    'Affiliates': 'アフィリエイト',
    'Unassigned': 'その他',
  };

  const sorted = [...channels].sort((a, b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 4);
  const maxSessions = sorted[0]?.sessions || 1;

  return (
    <div className="space-y-2">
      {sorted.map((ch, i) => {
        const rawName = ch.sessionDefaultChannelGroup || ch.channel || '不明';
        const name = CHANNEL_LABELS[rawName] || rawName;
        const sessions = ch.sessions || 0;
        const pct = (sessions / maxSessions) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-[120px] flex-shrink-0 text-right text-[13px] text-gray-600">{name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-black/[0.04]">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}
              />
            </div>
            <span className="w-[60px] flex-shrink-0 text-[12px] tabular-nums text-gray-700">{sessions.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * コンテンツ分析 - テーブル
 */
function ContentTable({ pages }) {
  if (!pages || pages.length === 0) return null;

  const sorted = [...pages].sort((a, b) => (b.screenPageViews || 0) - (a.screenPageViews || 0)).slice(0, 4);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <th className="py-2 pr-3 text-left font-medium text-gray-700">ページ</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">閲覧数</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">閲覧の質</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((page, i) => (
            <tr key={i} className="hover:bg-primary/[0.03]" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
              <td className="max-w-[200px] truncate py-2 pr-3 text-gray-700" title={page.pagePath}>
                {page.pageTitle || page.pagePath}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                {(page.screenPageViews || 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                {((page.engagementRate || 0) * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * コンバージョン分析 - イベント別カード
 */
function ConversionCards({ rawData, selectedSite }) {
  const current = rawData.current;
  if (!current?.conversionBreakdown || Object.keys(current.conversionBreakdown).length === 0) {
    return null;
  }

  const entries = Object.entries(current.conversionBreakdown);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([name, data], i) => (
        <div key={i} className="rounded-[10px] p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(249,250,251,0.8)' }}>
          <p className="text-[12px] text-gray-700">{name}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-gray-900">{(data.current || 0).toLocaleString()}件</span>
            {data.previous > 0 && (
              <ChangeBadge current={data.current || 0} previous={data.previous} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
