import React, { useState, useEffect, useRef, useCallback } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useHeatmapPages, useHeatmapPageData, useHeatmapDailyData, useCaptureHeatmapScreenshot } from '../../hooks/useHeatmapData';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import UpgradeModal from '../../components/common/UpgradeModal';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import { PAGE_TYPES } from '../../constants/plans';
import simpleheat from 'simpleheat';
import { Dialog, Transition } from '@headlessui/react';
import {
  MousePointerClick, Monitor, Smartphone, Copy, Check, Loader2,
  RefreshCw, ArrowDownWideNarrow, Image as ImageIcon, Code, X,
  ZoomIn, ZoomOut, Search, ChevronsUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Heatmap() {
  const { selectedSite, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const { planId, plan } = usePlan();
  const siteId = selectedSite?.id;

  const [device, setDevice] = useState('pc');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [viewMode, setViewMode] = useState('click'); // 'click' | 'scroll'
  const [copied, setCopied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(70);
  const [pageQuery, setPageQuery] = useState('');
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);

  const PC_MAX_WIDTH = 1208;
  const ZOOM_STEP = 10;
  const ZOOM_MIN = 50;
  const displayWidth = device === 'pc'
    ? Math.round(PC_MAX_WIDTH * zoomPercent / 100)
    : 375;

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const pageInputRef = useRef(null);
  const autoCaptureTriggered = useRef(null);

  useEffect(() => { setPageTitle('ヒートマップ'); }, []);

  // プラン制限チェック
  const heatmapEnabled = plan?.features?.heatmapEnabled !== false && planId !== 'free';
  // ページ一覧取得
  const { data: pages = [], isLoading: pagesLoading } = useHeatmapPages(
    heatmapEnabled ? siteId : null,
    device
  );

  // 最初のページを自動選択
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
      setPageQuery(pages[0].pageUrl);
    }
  }, [pages, selectedPageId]);

  // デバイス切り替え時にリセット
  useEffect(() => {
    setSelectedPageId('');
    setPageQuery('');
  }, [device]);

  // 選択ページのデータ取得（累積 + スクリーンショット情報）
  const { data: pageData, isLoading: pageDataLoading } = useHeatmapPageData(
    siteId,
    selectedPageId
  );

  // 日付範囲でフィルタリングしたデータ取得
  const { data: dailyData, isLoading: dailyDataLoading } = useHeatmapDailyData(
    siteId,
    selectedPageId,
    dateRange?.startDate,
    dateRange?.endDate
  );

  // 表示用データ: 日別データがあればそちらを優先、なければ累積データ
  const displayData = dailyData || pageData;
  const isUsingDailyData = !!dailyData;

  // スクリーンショットキャプチャ
  const captureScreenshot = useCaptureHeatmapScreenshot();

  const handleCaptureScreenshot = useCallback(() => {
    if (!pageData?.pageUrl || !siteId) return;
    captureScreenshot.mutate(
      { siteId, pageUrl: pageData.pageUrl, deviceType: device },
      {
        onSuccess: () => toast.success('スクリーンショットを更新しました'),
        onError: (err) => toast.error(err.message || 'スクリーンショットの取得に失敗しました'),
      }
    );
  }, [captureScreenshot, pageData, siteId, device]);

  // スクリーンショット未取得時に自動キャプチャ
  useEffect(() => {
    if (
      pageData &&
      !pageData.screenshotUrl &&
      !captureScreenshot.isPending &&
      autoCaptureTriggered.current !== selectedPageId
    ) {
      autoCaptureTriggered.current = selectedPageId;
      handleCaptureScreenshot();
    }
  }, [pageData, selectedPageId, captureScreenshot.isPending, handleCaptureScreenshot]);

  // ページ選択
  const filteredPages = pages.filter((p) =>
    !pageQuery || p.pageUrl.toLowerCase().includes(pageQuery.toLowerCase())
  );

  const handlePageSelect = useCallback((pageId) => {
    setSelectedPageId(pageId);
    const selected = pages.find((p) => p.id === pageId);
    setPageQuery(selected?.pageUrl || '');
    setPageDropdownOpen(false);
    pageInputRef.current?.blur();
  }, [pages]);

  // タグコピー
  const trackingCode = `<script src="https://grow-reporter.com/gr-heatmap.js" data-site-id="${siteId || 'YOUR_SITE_ID'}" async></script>`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(trackingCode).then(() => {
      setCopied(true);
      toast.success('コピーしました');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [trackingCode]);

  // AI分析セクションへスクロール
  const scrollToAIAnalysis = useCallback(() => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  // ── ヒートマップ描画 ──
  useEffect(() => {
    if (!canvasRef.current || !imgRef.current || !displayData) return;
    const img = imgRef.current;

    // 描画用データ: 日別データにはスクリーンショット情報がないので、
    // avgPageHeight は displayData から、screenshotUrl は pageData から取得
    const drawData = {
      ...displayData,
      avgPageHeight: displayData.avgPageHeight || pageData?.avgPageHeight,
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      if (viewMode === 'click' && drawData.clickGrid) {
        drawClickHeatmap(canvas, drawData);
      } else if (viewMode === 'scroll' && drawData.scrollReach) {
        drawScrollHeatmap(canvas, drawData);
      }
    };

    if (img.complete) {
      draw();
    } else {
      img.onload = draw;
    }
  }, [displayData, pageData, viewMode]);

  // Free プランはアップグレード誘導
  if (!heatmapEnabled) {
    return (
      <div className="flex h-full flex-col">
        <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={false} showSiteInfo={false} showExport={false} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
          <div className="mx-auto max-w-content px-6 py-10">
            <div className="mb-8">
              <h2 className="mb-2 text-3xl font-bold text-dark dark:text-white">ヒートマップ</h2>
              <p className="text-base text-body-color">クリック・スクロールの行動を可視化し、ページの改善ポイントを発見します。</p>
            </div>
            <div className="rounded-lg border border-stroke bg-white p-10 text-center dark:border-dark-3 dark:bg-dark-2">
              <MousePointerClick className="mx-auto mb-4 h-16 w-16 text-body-color/40" />
              <h3 className="mb-2 text-xl font-semibold text-dark dark:text-white">ヒートマップは有料プランでご利用いただけます</h3>
              <p className="mb-6 text-body-color">スタンダードプラン以上にアップグレードすると、クリック・スクロールヒートマップが利用できます。</p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
              >
                プランを確認する
              </button>
            </div>
          </div>
        </main>
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </div>
    );
  }

  const hasData = pages.length > 0;

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader dateRange={dateRange} setDateRange={updateDateRange} showDateRange={true} showSiteInfo={false} showExport={false} />

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
          {/* ヘッダー */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-dark dark:text-white">ヒートマップ</h2>
              <p className="text-base text-body-color">
                クリック・スクロールの行動を可視化し、ページの改善ポイントを発見します。
              </p>
            </div>
            <button
              onClick={() => setShowTagModal(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-body-color hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              <Code className="h-4 w-4" />
              タグ設置
            </button>
          </div>

          {pagesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasData ? (
            /* ── データ未受信: タグ設置案内 ── */
            <div className="rounded-lg border border-stroke bg-white p-10 text-center dark:border-dark-3 dark:bg-dark-2">
              <MousePointerClick className="mx-auto mb-4 h-16 w-16 text-body-color/40" />
              <h3 className="mb-2 text-xl font-semibold text-dark dark:text-white">トラッキングタグを設置してください</h3>
              <p className="mb-6 text-body-color">サイトにタグを設置すると、ヒートマップデータの収集が始まります。</p>
              <button
                onClick={() => setShowTagModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Code className="h-4 w-4" />
                タグを確認する
              </button>

              {/* 設置手順 */}
              <hr className="mx-auto mt-8 max-w-2xl border-stroke/50 dark:border-dark-3/50" />
              <div className="mx-auto mt-6 max-w-2xl text-left">
                <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">設置手順</h4>
                <ol className="space-y-4 text-sm text-body-color">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                    <div className="min-w-0 flex-1">
                      <p>以下のトラッキングコードをコピーしてください。</p>
                      <div className="relative mt-2 rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
                        <pre className="whitespace-pre-wrap break-all pr-10 text-xs text-dark dark:text-white"><code>{trackingCode}</code></pre>
                        <button
                          onClick={handleCopy}
                          className="absolute right-2 top-2 rounded-md border border-stroke bg-white p-1.5 text-body-color hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                    <div className="min-w-0 flex-1">
                      <p>サイトの HTML ファイルを開き、<code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-dark dark:bg-dark-3 dark:text-white">&lt;head&gt;</code> タグの中（<code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-dark dark:bg-dark-3 dark:text-white">&lt;/head&gt;</code> の直前）にコードを貼り付けてください。</p>
                      <div className="mt-2 rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-3">
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-body-color">{`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>サイトのタイトル</title>
  ...`}
  <span className="font-bold text-primary">{`${trackingCode}`}</span>
  <span className="text-body-color/60">{`  ← ここに貼り付け`}</span>{`
</head>
<body>
  ...
</body>
</html>`}</pre>
                      </div>
                      <p className="mt-2 text-xs text-body-color/70">※ WordPress の場合は「外観 → テーマエディター」または「ヘッダーにコード追加」系プラグインから設置できます。</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                    <p>タグを設置したページにユーザーがアクセスすると、クリック・スクロールデータの収集が自動的に開始されます。</p>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">4</span>
                    <p>データが受信されると、このページにヒートマップが表示されます。</p>
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            /* ── データ受信済み: ヒートマップ表示 ── */
            <>
              {/* コントロールバー */}
              <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
                {/* ページ選択（キーワード検索対応） */}
                <div className="relative min-w-[200px] flex-[3]">
                  <label className="mb-1 block text-xs text-body-color">ページ</label>
                  <div className="relative">
                    <input
                      ref={pageInputRef}
                      type="text"
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-9 pr-8 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      value={pageQuery}
                      onChange={(e) => { setPageQuery(e.target.value); setPageDropdownOpen(true); }}
                      onFocus={() => setPageDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setPageDropdownOpen(false), 150)}
                      placeholder="ページを検索..."
                    />
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body-color" />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-2"
                      onMouseDown={(e) => { e.preventDefault(); setPageDropdownOpen((v) => !v); pageInputRef.current?.focus(); }}
                    >
                      <ChevronsUpDown className="h-4 w-4 text-body-color" />
                    </button>
                  </div>
                  {pageDropdownOpen && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stroke bg-white py-1 text-sm shadow-lg dark:border-dark-3 dark:bg-dark-2">
                      {filteredPages.length > 0 ? filteredPages.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`w-full cursor-pointer select-none px-3 py-2 text-left hover:bg-primary/10 hover:text-primary ${selectedPageId === p.id ? 'font-semibold text-primary' : 'text-dark dark:text-white'}`}
                          onMouseDown={(e) => { e.preventDefault(); handlePageSelect(p.id); }}
                        >
                          {p.pageUrl}
                        </button>
                      )) : (
                        <div className="px-3 py-2 text-body-color">一致するページがありません</div>
                      )}
                    </div>
                  )}
                </div>

                {/* デバイス切替 */}
                <div>
                  <label className="mb-1 block text-xs text-body-color">デバイス</label>
                  <div className="flex rounded-lg border border-stroke dark:border-dark-3">
                    <button
                      onClick={() => setDevice('pc')}
                      className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm ${device === 'pc' ? 'bg-primary text-white' : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'}`}
                    >
                      <Monitor className="h-4 w-4" /> PC
                    </button>
                    <button
                      onClick={() => setDevice('mobile')}
                      className={`flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm ${device === 'mobile' ? 'bg-primary text-white' : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'}`}
                    >
                      <Smartphone className="h-4 w-4" /> Mobile
                    </button>
                  </div>
                </div>

                {/* 表示切替 */}
                <div>
                  <label className="mb-1 block text-xs text-body-color">表示</label>
                  <div className="flex rounded-lg border border-stroke dark:border-dark-3">
                    <button
                      onClick={() => setViewMode('click')}
                      className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm ${viewMode === 'click' ? 'bg-primary text-white' : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'}`}
                    >
                      <MousePointerClick className="h-4 w-4" /> クリック
                    </button>
                    <button
                      onClick={() => setViewMode('scroll')}
                      className={`flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm ${viewMode === 'scroll' ? 'bg-primary text-white' : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'}`}
                    >
                      <ArrowDownWideNarrow className="h-4 w-4" /> スクロール
                    </button>
                  </div>
                </div>

                {/* 統計 */}
                {displayData && (
                  <div className="flex gap-5">
                    <div className="min-w-[80px] text-center">
                      <p className="text-xs text-body-color">総クリック数</p>
                      <p className="text-lg font-bold tabular-nums text-dark dark:text-white">
                        {(displayData.totalClicks || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="min-w-[80px] text-center">
                      <p className="text-xs text-body-color">総PV</p>
                      <p className="text-lg font-bold tabular-nums text-dark dark:text-white">
                        {(displayData.totalSessions || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ヒートマップ表示エリア */}
              {(pageDataLoading || dailyDataLoading) ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pageData ? (
                <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                  {/* ヘッダー: キャプチャ情報 + 期間表示 + ズーム + 更新ボタン */}
                  <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-dark-3">
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-body-color">
                        {pageData.screenshotCapturedAt && (
                          <>最終キャプチャ: {new Date(pageData.screenshotCapturedAt.seconds * 1000).toLocaleString('ja-JP')}</>
                        )}
                      </p>
                      {!isUsingDailyData && dateRange?.startDate && (
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          全期間のデータを表示中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* ズームコントロール */}
                      {device === 'pc' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setZoomPercent((p) => Math.max(ZOOM_MIN, p - ZOOM_STEP))}
                            disabled={zoomPercent <= ZOOM_MIN}
                            className="rounded-md p-1.5 text-body-color hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-dark-3"
                            title="縮小"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </button>
                          <span className="min-w-[3rem] text-center text-xs text-body-color">{zoomPercent}%</span>
                          <button
                            onClick={() => setZoomPercent((p) => Math.min(100, p + ZOOM_STEP))}
                            disabled={zoomPercent >= 100}
                            className="rounded-md p-1.5 text-body-color hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-dark-3"
                            title="拡大"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleCaptureScreenshot}
                        disabled={captureScreenshot.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-body-color hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-dark-3"
                      >
                        {captureScreenshot.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        スクリーンショットを更新
                      </button>
                    </div>
                  </div>

                  {/* スクリーンショット + オーバーレイ */}
                  {pageData.screenshotUrl ? (
                    <div className="relative flex justify-center overflow-auto pt-4" ref={containerRef}>
                      <div className="relative inline-block" style={{ width: `${displayWidth}px` }}>
                        <img
                          ref={imgRef}
                          src={`${pageData.screenshotUrl}${pageData.screenshotCapturedAt ? '?t=' + pageData.screenshotCapturedAt.seconds : ''}`}
                          alt="ページスクリーンショット"
                          className="block w-full brightness-[0.55]"
                        />
                        <canvas
                          ref={canvasRef}
                          className="pointer-events-none absolute left-0 top-0 h-full w-full"
                          style={{ opacity: 0.75 }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                      <p className="mb-2 text-body-color">スクリーンショットを自動取得中...</p>
                      <p className="text-xs text-body-color/60">初回のみ時間がかかる場合があります</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-stroke bg-white p-10 text-center dark:border-dark-3 dark:bg-dark-2">
                  <p className="text-body-color">ページを選択してください</p>
                </div>
              )}

            </>
          )}

          {/* メモ & AI分析タブ */}
          {siteId && currentUser && hasData && displayData && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="heatmap"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={siteId}
                    pageType="heatmap"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.HEATMAP}
                    rawData={displayData}
                    metrics={{
                      totalClicks: displayData.totalClicks || 0,
                      totalSessions: displayData.totalSessions || 0,
                      clickGrid: displayData.clickGrid || {},
                      scrollReach: displayData.scrollReach || {},
                      avgPageHeight: displayData.avgPageHeight || pageData?.avgPageHeight || 0,
                      pageUrl: pageData?.pageUrl || '',
                      device,
                      sections: pageData?.sections || {},
                      sectionClicks: pageData?.sectionClicks || {},
                    }}
                    period={{
                      startDate: dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      endDate: dateRange?.to || new Date(),
                    }}
                    onLimitExceeded={() => setIsLimitModalOpen(true)}
                  />
                }
              />
            </div>
          )}
        </div>
      </main>

      {/* AI分析フローティングボタン */}
      {siteId && hasData && displayData && (
        <AIFloatingButton
          pageType={PAGE_TYPES.HEATMAP}
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

      {/* トラッキングタグモーダル */}
      <Transition show={showTagModal} as={React.Fragment}>
        <Dialog onClose={() => setShowTagModal(false)} className="relative z-50">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-dark-2">
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-dark dark:text-white">
                    トラッキングタグ
                  </Dialog.Title>
                  <button
                    onClick={() => setShowTagModal(false)}
                    className="rounded-md p-1 text-body-color hover:bg-gray-100 dark:hover:bg-dark-3"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mb-4 text-sm text-body-color">
                  以下のコードをサイトの &lt;head&gt; タグ内に設置してください。
                </p>
                <div className="relative rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-3">
                  <pre className="whitespace-pre-wrap break-all pr-10 text-sm text-dark dark:text-white">
                    <code>{trackingCode}</code>
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="absolute right-3 top-3 rounded-md border border-stroke bg-white p-2 text-body-color hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-4 text-xs text-body-color">
                  タグ設置後、ユーザーのアクセスに応じてデータが蓄積されます。
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

/**
 * クリックヒートマップを Canvas に描画（simpleheat 使用）
 */
function drawClickHeatmap(canvas, pageData) {
  const { clickGrid } = pageData;
  if (!clickGrid) return;

  const w = canvas.width;
  const h = canvas.height;
  const points = [];

  for (const [key, value] of Object.entries(clickGrid)) {
    const match = key.match(/^x(\d+)_y(\d+)$/);
    if (!match) continue;

    const xPercent = parseInt(match[1], 10);
    const yBucket = parseInt(match[2], 10);

    // グリッド座標 → ピクセル座標（スクリーンショットのサイズに合わせる）
    const x = Math.round((xPercent / 100) * w);
    // y バケットはページの実際の高さでの 100px 刻み → スクリーンショットの高さに比例変換
    const avgPageHeight = pageData.avgPageHeight || h;
    const y = Math.round((yBucket / avgPageHeight) * h);

    if (y <= h) {
      points.push([x, y, value]);
    }
  }

  if (points.length === 0) return;

  const heat = simpleheat(canvas);
  heat.data(points);
  heat.radius(Math.max(15, Math.round(w / 50)), Math.max(10, Math.round(w / 80)));
  heat.max(Math.max(...points.map((p) => p[2])));
  heat.draw();
}

/**
 * スクロールヒートマップを Canvas に描画（Canvas API 自作）
 * 到達率が高い上部 → 赤（暖色）、低い下部 → 青（寒色）
 */
function drawScrollHeatmap(canvas, pageData) {
  const { scrollReach, totalSessions } = pageData;
  if (!scrollReach || !totalSessions) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 10% 刻みの到達率を計算
  for (let pct = 10; pct <= 100; pct += 10) {
    const reached = scrollReach[String(pct)] || 0;
    const ratio = reached / totalSessions; // 0〜1

    const yStart = Math.round(((pct - 10) / 100) * h);
    const yEnd = Math.round((pct / 100) * h);

    // 到達率に応じた色: 高い(赤) → 低い(青)
    const r = Math.round(255 * ratio);
    const g = Math.round(100 * ratio);
    const b = Math.round(255 * (1 - ratio));
    const alpha = 0.3 + 0.4 * ratio;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillRect(0, yStart, w, yEnd - yStart);

    // 到達率ラベル
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `${Math.max(12, Math.round(w / 60))}px sans-serif`;
    ctx.fillText(`${Math.round(ratio * 100)}%`, 10, yStart + 20);
  }
}
