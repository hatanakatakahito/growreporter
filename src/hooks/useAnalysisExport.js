import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
import { useSite } from '../contexts/SiteContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from './usePlan';
import { downloadAnalysisExcel } from '../utils/exportAnalysisToExcel';
import { downloadAnalysisPptx } from '../utils/exportAnalysisToPptx';
import { format, sub, startOfMonth } from 'date-fns';

const incrementExportUsageFn = httpsCallable(functions, 'incrementExportUsage');

/**
 * 分析レポートExcel/PowerPointダウンロード用フック
 * 全分析ページのデータを取得し、各形式で生成・ダウンロードを実行する
 */
export function useAnalysisExport() {
  const { selectedSite, selectedSiteId, dateRange } = useSite();
  const { currentUser } = useAuth();
  const { checkCanGenerate } = usePlan();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const canExportExcel = checkCanGenerate('excelExport');
  const canExportPptx = checkCanGenerate('pptxExport');

  const handleExportExcel = useCallback(async () => {
    if (!selectedSiteId || !dateRange?.from || !dateRange?.to) return;
    if (!canExportExcel) {
      throw new Error('今月のExcelエクスポート上限に達しました。');
    }

    setIsExporting(true);
    setExportProgress('データ取得中...');

    try {
      const allData = await fetchAllData(selectedSiteId, selectedSite, dateRange, currentUser);
      const startDate = typeof dateRange.from === 'string' ? dateRange.from : format(dateRange.from, 'yyyy-MM-dd');
      const endDate = typeof dateRange.to === 'string' ? dateRange.to : format(dateRange.to, 'yyyy-MM-dd');

      setExportProgress('Excel生成中...');
      downloadAnalysisExcel(allData, selectedSite?.siteName || '', { from: startDate, to: endDate });

      // 成功後にカウントをインクリメント
      await incrementExportUsageFn({ type: 'excel' }).catch(e => console.error('[useAnalysisExport] increment failed:', e));

      setExportProgress('');
      return true;
    } catch (error) {
      console.error('[useAnalysisExport] Excel export failed:', error);
      setExportProgress('');
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [selectedSiteId, selectedSite, dateRange, currentUser, canExportExcel]);

  const handleExportPptx = useCallback(async () => {
    if (!selectedSiteId || !dateRange?.from || !dateRange?.to) return;
    if (!canExportPptx) {
      throw new Error('今月のPowerPointエクスポート上限に達しました。');
    }

    setIsExporting(true);
    setExportProgress('データ取得中...');

    try {
      const allData = await fetchAllData(selectedSiteId, selectedSite, dateRange, currentUser);
      const startDate = typeof dateRange.from === 'string' ? dateRange.from : format(dateRange.from, 'yyyy-MM-dd');
      const endDate = typeof dateRange.to === 'string' ? dateRange.to : format(dateRange.to, 'yyyy-MM-dd');

      setExportProgress('PowerPoint生成中...');
      await downloadAnalysisPptx(allData, selectedSite?.siteName || '', { from: startDate, to: endDate });

      // 成功後にカウントをインクリメント
      await incrementExportUsageFn({ type: 'pptx' }).catch(e => console.error('[useAnalysisExport] increment failed:', e));

      setExportProgress('');
      return true;
    } catch (error) {
      console.error('[useAnalysisExport] PPTX export failed:', error);
      setExportProgress('');
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [selectedSiteId, selectedSite, dateRange, currentUser, canExportPptx]);

  return {
    isExporting,
    exportProgress,
    handleExportExcel,
    handleExportPptx,
    canExportExcel,
    canExportPptx,
  };
}

// ─── 全データ並列取得（Excel/PPTX共通） ─────────────────────
async function fetchAllData(selectedSiteId, selectedSite, dateRange, currentUser) {
  const startDate = typeof dateRange.from === 'string' ? dateRange.from : format(dateRange.from, 'yyyy-MM-dd');
  const endDate = typeof dateRange.to === 'string' ? dateRange.to : format(dateRange.to, 'yyyy-MM-dd');

  // 13ヶ月の月次データ用期間
  const endDateObj = new Date(endDate);
  const monthlyStart = format(startOfMonth(sub(startOfMonth(endDateObj), { months: 12 })), 'yyyy-MM-dd');
  const monthlyEnd = endDate;

  // GSC接続の有無
  const hasGSC = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  // 逆算フロー設定
  const reverseFlowSettings = selectedSite?.reverse_flow_settings || [];

  // pageType一覧（AI分析・メモ取得用）
  const pageTypes = [
    'analysis/summary', 'analysis/month', 'analysis/day', 'analysis/week',
    'analysis/hour', 'analysis/users', 'analysis/channels', 'analysis/keywords',
    'analysis/referrals', 'analysis/pages', 'analysis/page-categories',
    'analysis/landing-pages', 'analysis/file-downloads', 'analysis/external-links',
    'analysis/conversions', 'analysis/reverse-flow',
  ];

  // ─── 全データを並列取得 ─────────────────────────────
  const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
  const fetchGSC = httpsCallable(functions, 'fetchGSCData');
  const fetchMonthly = httpsCallable(functions, 'fetchGA4MonthlyData');
  const fetchDaily = httpsCallable(functions, 'fetchGA4DailyConversionData');
  const fetchWeekly = httpsCallable(functions, 'fetchGA4WeeklyConversionData');
  const fetchHourly = httpsCallable(functions, 'fetchGA4HourlyConversionData');
  const fetchDemographics = httpsCallable(functions, 'fetchGA4UserDemographics');
  const fetchChannels = httpsCallable(functions, 'fetchGA4ChannelConversionData');
  const fetchReferrals = httpsCallable(functions, 'fetchGA4ReferralConversionData');
  const fetchLandingPages = httpsCallable(functions, 'fetchGA4LandingPageConversionData');
  const fetchConversions = httpsCallable(functions, 'fetchGA4MonthlyConversionData');
  const fetchReverseFlow = httpsCallable(functions, 'fetchGA4ReverseFlowData');

  const promises = {
    // 全体サマリー: GA4基本メトリクス（主要指標・KPI・CV内訳用）
    summaryGA4: fetchGA4({
      siteId: selectedSiteId, startDate, endDate,
      metrics: ['sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'engagementRate'],
      dimensions: [],
    }).then(r => r.data).catch(e => { console.error('[Export] summaryGA4:', e.message); return null; }),

    // 全体サマリー: GSCメトリクス
    summaryGSC: hasGSC
      ? fetchGSC({ siteId: selectedSiteId, startDate, endDate }).then(r => r.data).catch(e => { console.error('[Export] summaryGSC:', e.message); return null; })
      : Promise.resolve(null),

    // 月別: 13ヶ月月次データ
    monthly: fetchMonthly({ siteId: selectedSiteId, startDate: monthlyStart, endDate: monthlyEnd })
      .then(r => r.data).catch(e => { console.error('[Export] monthly:', e.message); return null; }),

    // ユーザー属性
    demographics: fetchDemographics({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] demographics:', e.message); return null; }),

    // 日別
    daily: fetchDaily({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] daily:', e.message); return null; }),

    // 曜日別
    weekly: fetchWeekly({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] weekly:', e.message); return null; }),

    // 時間帯別
    hourly: fetchHourly({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] hourly:', e.message); return null; }),

    // 集客チャネル
    channels: fetchChannels({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] channels:', e.message); return null; }),

    // 流入キーワード（GSC接続時のみ）
    keywords: hasGSC
      ? fetchGSC({ siteId: selectedSiteId, startDate, endDate }).then(r => r.data).catch(e => { console.error('[Export] keywords:', e.message); return null; })
      : Promise.resolve(null),

    // 被リンク元
    referrals: fetchReferrals({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] referrals:', e.message); return null; }),

    // ページ別
    pages: fetchGA4({
      siteId: selectedSiteId, startDate, endDate,
      metrics: ['screenPageViews', 'sessions', 'activeUsers', 'averageSessionDuration', 'engagementRate'],
      dimensions: ['pagePath', 'pageTitle'],
    }).then(r => r.data).catch(e => { console.error('[Export] pages:', e.message); return null; }),

    // ページ分類別（ページ別と同じデータからクライアント側で集計）
    pageCategories: fetchGA4({
      siteId: selectedSiteId, startDate, endDate,
      metrics: ['screenPageViews', 'activeUsers', 'engagementRate'],
      dimensions: ['pagePath'],
    }).then(r => r.data).catch(e => { console.error('[Export] pageCategories:', e.message); return null; }),

    // ランディングページ
    landingPages: fetchLandingPages({ siteId: selectedSiteId, startDate, endDate })
      .then(r => r.data).catch(e => { console.error('[Export] landingPages:', e.message); return null; }),

    // ファイルDL
    fileDownloads: fetchGA4({
      siteId: selectedSiteId, startDate, endDate,
      metrics: ['eventCount', 'activeUsers'],
      dimensions: ['eventName', 'linkUrl'],
      dimensionFilter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'file_download' } },
    }).then(r => r.data).catch(e => { console.error('[Export] fileDownloads:', e.message); return null; }),

    // 外部リンク
    externalLinks: fetchGA4({
      siteId: selectedSiteId, startDate, endDate,
      metrics: ['eventCount', 'activeUsers'],
      dimensions: ['eventName', 'linkUrl'],
      dimensionFilter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'click' } },
    }).then(r => r.data).catch(e => { console.error('[Export] externalLinks:', e.message); return null; }),

    // コンバージョン一覧（13ヶ月）
    conversions: fetchConversions({ siteId: selectedSiteId, startDate: monthlyStart, endDate: monthlyEnd })
      .then(r => r.data).catch(e => { console.error('[Export] conversions:', e.message); return null; }),

    // AI分析キャッシュ取得（全pageType分）
    aiAnalysis: fetchAllAIAnalysis(selectedSiteId, currentUser?.uid, pageTypes, startDate, endDate),

    // メモ取得（全pageType分）
    allMemos: fetchAllMemos(selectedSiteId),
  };

  // 逆算フロー（設定がある場合のみ）
  if (reverseFlowSettings.length > 0) {
    promises.reverseFlows = Promise.all(
      reverseFlowSettings.map(async (flow) => {
        try {
          const result = await fetchReverseFlow({
            siteId: selectedSiteId,
            startDate: monthlyStart,
            endDate: monthlyEnd,
            formPagePath: flow.form_page_path,
            targetCvEvent: flow.target_cv_event,
          });
          return {
            flowName: flow.flow_name,
            formPagePath: flow.form_page_path,
            targetCvEvent: flow.target_cv_event,
            summary: result.data?.summary || null,
            monthlyTable: result.data?.monthlyTable || [],
          };
        } catch (e) {
          console.error(`[Export] reverseFlow(${flow.flow_name}):`, e.message);
          return null;
        }
      })
    ).then(results => results.filter(Boolean));
  }

  // 全並列取得
  const keys = Object.keys(promises);
  const values = await Promise.all(Object.values(promises));
  const results = {};
  keys.forEach((key, i) => { results[key] = values[i]; });

  // 全体サマリー用データの統合（主要指標 + KPI + CV内訳）
  const summaryMetrics = results.summaryGA4 || results.summaryGSC ? {
    metrics: {
      sessions: results.summaryGA4?.metrics?.sessions || 0,
      totalUsers: results.summaryGA4?.metrics?.totalUsers || 0,
      newUsers: results.summaryGA4?.metrics?.newUsers || 0,
      pageViews: results.summaryGA4?.metrics?.screenPageViews || 0,
      engagementRate: results.summaryGA4?.metrics?.engagementRate || 0,
      conversions: results.summaryGA4?.metrics?.totalConversions || 0,
      clicks: results.summaryGSC?.metrics?.clicks || 0,
      impressions: results.summaryGSC?.metrics?.impressions || 0,
      ctr: results.summaryGSC?.metrics?.ctr || 0,
      position: results.summaryGSC?.metrics?.position || 0,
    },
    conversions: results.summaryGA4?.metrics?.conversions || {},
  } : null;

  // allData組み立て
  return {
    siteUrl: selectedSite?.siteUrl || '',
    kpiSettings: selectedSite?.kpiSettings || null,
    conversionEvents: selectedSite?.conversionEvents || [],
    summaryMetrics: summaryMetrics,
    monthlyData: results.monthly?.monthlyData || null,
    demographics: results.demographics,
    daily: results.daily,
    weekly: results.weekly,
    hourly: results.hourly,
    channels: results.channels,
    keywords: results.keywords,
    referrals: results.referrals,
    pages: results.pages,
    pageCategories: results.pageCategories,
    landingPages: results.landingPages,
    fileDownloads: results.fileDownloads,
    externalLinks: results.externalLinks,
    conversions: results.conversions,
    reverseFlows: results.reverseFlows || [],
    aiAnalysis: results.aiAnalysis || {},
    memos: results.allMemos || {},
  };
}

// ─── AI分析キャッシュ取得 ──────────────────────────────────
async function fetchAllAIAnalysis(siteId, userId, pageTypes, startDate, endDate) {
  const result = {};
  if (!siteId || !userId) return result;

  try {
    // 全pageTypeを並列クエリ
    const queries = pageTypes.map(async (pageType) => {
      try {
        const q = query(
          collection(db, 'sites', siteId, 'aiAnalysisCache'),
          where('userId', '==', userId),
          where('pageType', '==', pageType),
          where('period.startDate', '==', startDate),
          where('period.endDate', '==', endDate),
          orderBy('generatedAt', 'desc'),
          firestoreLimit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          result[pageType] = snapshot.docs[0].data();
        }
      } catch (e) {
        // インデックスが無い場合等はスキップ
        console.warn(`[Export] AI analysis for ${pageType}:`, e.message);
      }
    });

    await Promise.all(queries);
  } catch (e) {
    console.error('[Export] fetchAllAIAnalysis:', e.message);
  }

  return result;
}

// ─── メモ一括取得 ─────────────────────────────────────────
async function fetchAllMemos(siteId) {
  const result = {};
  if (!siteId) return result;

  try {
    // 全メモを一括取得してpageTypeごとにグループ化
    const snapshot = await getDocs(collection(db, 'sites', siteId, 'pageNotes'));
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const pageType = data.pageType;
      if (!pageType) continue;
      if (!result[pageType]) result[pageType] = [];
      result[pageType].push({ id: doc.id, ...data });
    }

    // 各pageType内をupdatedAt降順でソート
    for (const pageType of Object.keys(result)) {
      result[pageType].sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
    }
  } catch (e) {
    console.error('[Export] fetchAllMemos:', e.message);
  }

  return result;
}
