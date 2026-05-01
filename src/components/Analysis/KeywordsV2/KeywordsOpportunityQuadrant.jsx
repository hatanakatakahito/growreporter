import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Info, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

// 信号機 + クール（KeywordsFunnel と統一）
const LAYER_COLORS = {
  branded: '#10b981',
  intent: '#f43f5e',   // rose（顕在=要注目）
  pureIntent: '#f59e0b', // amber（純顕在=action）
  latent: '#3b82f6',
  noise: '#94a3b8',
};

/**
 * チャンス象限マップ
 *  X = impressions（多いほど右）
 *  Y = position（数値が低いほど上 = 高順位）
 *  size = clicks
 *  color = funnel layer
 *
 *  象限:
 *   左上(高順位×少表示): 育成中 - 微妙
 *   右上(高順位×多表示): 主力
 *   左下(低順位×少表示): ニッチ
 *   右下(低順位×多表示): 機会損失（最重要）
 */
export default function KeywordsOpportunityQuadrant({ data }) {
  const keywords = data?.keywords || [];
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSize, setFullscreenSize] = useState({ w: 0, h: 0 });

  // フルスクリーン状態を追跡
  useEffect(() => {
    const handleChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      setFullscreenSize(active ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 });
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // マウスホイールで 20% 刻みズーム
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom((z) => Math.min(Math.max(Math.round((z + delta) * 100) / 100, 0.5), 3));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch (e) {
      console.warn('[KeywordsOpportunityQuadrant] fullscreen toggle failed:', e);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(Math.round((z + 0.2) * 100) / 100, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(Math.round((z - 0.2) * 100) / 100, 0.5));
  const handleZoomReset = () => setZoom(1);

  // 中央値計算（impressions と position の中央値）+ 対数スケール用 logImp フィールド付与
  const { medianImp, medianPos, scatterData, opportunityKws, xMin, xMax, xTicks, yTicks } = useMemo(() => {
    // 表示は impressions 上位 300 件に限定（読みやすさ）
    const filtered = keywords
      .filter((k) => (k.impressions || 0) >= 5 && (k.position || 0) > 0)
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 300);

    if (filtered.length === 0) {
      return { medianImp: 0, medianPos: 0, scatterData: [], opportunityKws: [], xMin: 1, xMax: 100, xTicks: [10, 100], yTicks: [1, 10, 50, 100] };
    }

    const imps = filtered.map((k) => k.impressions).sort((a, b) => a - b);
    const poss = filtered.map((k) => k.position).sort((a, b) => a - b);
    const mImp = imps[Math.floor(imps.length / 2)] || 0;
    const mPos = poss[Math.floor(poss.length / 2)] || 0;

    const data = filtered.map((k) => ({
      query: k.query,
      impressions: k.impressions,
      position: k.position,
      clicks: k.clicks,
      ctr: k.ctr,
      layer: k.layer,
      fill: LAYER_COLORS[k.layer] || '#94a3b8',
    }));

    // 機会損失象限: 表示多 × 順位低
    const opp = filtered
      .filter((k) => k.impressions >= mImp && k.position >= mPos)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);

    const minImp = Math.max(1, Math.min(...filtered.map((k) => k.impressions)));
    const maxImp = Math.max(...filtered.map((k) => k.impressions));

    // 対数スケール用のキレイな目盛り（10, 100, 1000, 10000 のうち範囲内のもの）
    const candidates = [10, 30, 100, 300, 1000, 3000, 10000, 30000, 100000];
    const xTicks = candidates.filter((t) => t >= minImp * 0.5 && t <= maxImp * 1.5);
    if (!xTicks.length) xTicks.push(Math.round(minImp), Math.round(maxImp));

    // Y 軸（順位）の目盛りもキレイな整数で
    const maxPos = Math.max(...filtered.map((k) => k.position));
    const yCandidates = [1, 10, 25, 50, 75, 100];
    const yTicks = yCandidates.filter((t) => t <= maxPos * 1.05);
    if (!yTicks.includes(1)) yTicks.unshift(1);

    return {
      medianImp: mImp,
      medianPos: mPos,
      scatterData: data,
      opportunityKws: opp,
      xMin: minImp,
      xMax: maxImp,
      xTicks,
      yTicks,
    };
  }, [keywords]);

  if (keywords.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color">表示するデータがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark dark:text-white">チャンス象限マップ</h3>
          <div className="text-xs text-body-color">バブル径 = クリック数 / 色 = ファネル層</div>
        </div>

        {/* 上段: 高順位ゾーンのラベル（グラフ直上）— サブ説明はホバーツールチップで表示 */}
        <div className="mb-1 flex items-center justify-between gap-4 px-2">
          <HoverInfo
            tooltip="少表示 × 高順位"
            colorClass="text-blue-600"
            sizeClass="text-sm"
            align="left"
            position="bottom"
          >
            育成中（順位向上余地）
          </HoverInfo>
          <HoverInfo
            tooltip="多表示 × 高順位"
            colorClass="text-emerald-600"
            sizeClass="text-sm"
            align="right"
            position="bottom"
          >
            主力（強化推奨）
          </HoverInfo>
        </div>

        <div
          ref={containerRef}
          className={`relative overflow-auto ${isFullscreen ? 'bg-white' : ''}`}
          style={{ height: isFullscreen ? '100vh' : 480 }}
        >
          {/* ズームコントロール（右下） */}
          <div className="absolute bottom-3 right-3 z-30 inline-flex items-center bg-white border border-stroke rounded-md shadow-sm">
            <button
              onClick={handleZoomOut}
              className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 rounded-l-md transition-colors"
              title="縮小"
              type="button"
            >
              <ZoomOut className="h-4 w-4 text-dark" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2.5 h-8 text-xs font-medium text-dark border-l border-r border-stroke min-w-[52px] text-center hover:bg-gray-50 transition-colors"
              title="等倍に戻す"
              type="button"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 transition-colors"
              title="拡大"
              type="button"
            >
              <ZoomIn className="h-4 w-4 text-dark" />
            </button>
            <button
              onClick={handleToggleFullscreen}
              className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 border-l border-stroke rounded-r-md transition-colors"
              title={isFullscreen ? '全画面解除' : '全画面表示'}
              type="button"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-dark" /> : <Maximize2 className="h-4 w-4 text-dark" />}
            </button>
          </div>

          <div
            style={{
              width: `${100 * zoom}%`,
              height: isFullscreen ? `${(fullscreenSize.h - 32) * zoom}px` : `${480 * zoom}px`,
              transition: 'width 0.15s ease-out, height 0.15s ease-out',
            }}
          >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 30, right: 30, bottom: 50, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="impressions"
                type="number"
                scale="log"
                domain={[xMin, xMax]}
                ticks={xTicks}
                allowDataOverflow
                name="表示回数"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  if (v >= 10000) return `${Math.round(v / 1000)}k`;
                  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
                  return String(v);
                }}
                label={{ value: '表示回数', position: 'bottom', offset: 25, style: { fontSize: 12 } }}
              />
              <YAxis
                dataKey="position"
                type="number"
                name="順位"
                reversed
                domain={[1, 'dataMax']}
                ticks={yTicks}
                tick={{ fontSize: 11 }}
                label={{ value: '高順位', angle: -90, position: 'left', style: { fontSize: 12 } }}
              />
              <ZAxis dataKey="clicks" range={[40, 800]} name="クリック" />

              {/* 象限分割線 */}
              <ReferenceLine x={medianImp} stroke="#cbd5e1" strokeDasharray="4 4" />
              <ReferenceLine y={medianPos} stroke="#cbd5e1" strokeDasharray="4 4" />

              {/* 機会損失象限の強調 */}
              <ReferenceArea
                x1={medianImp}
                y1={medianPos}
                y2={100}
                fill="#ef4444"
                fillOpacity={0.05}
              />

              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-md border border-stroke bg-white p-2 text-xs shadow-md dark:bg-dark-2 dark:border-dark-3">
                        <div className="font-semibold mb-1 text-dark dark:text-white">{d.query}</div>
                        <div>表示: {(d.impressions || 0).toLocaleString()}</div>
                        <div>クリック: {(d.clicks || 0).toLocaleString()}</div>
                        <div>順位: {(d.position || 0).toFixed(1)} 位</div>
                        <div>CTR: {((d.ctr || 0) * 100).toFixed(2)}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={scatterData} fill="#3758F9" />
            </ScatterChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* 下段: 低順位ゾーンのラベル（グラフ直下） — サブ説明はホバーツールチップで表示 */}
        <div className="mt-1 flex items-center justify-between gap-4 px-2">
          <HoverInfo
            tooltip="少表示 × 低順位"
            colorClass="text-slate-400"
            sizeClass="text-sm"
            align="left"
            position="top"
          >
            ニッチ（優先度低）
          </HoverInfo>
          <HoverInfo
            tooltip="多表示 × 低順位 → Title/Description 改善で巨大インパクト"
            colorClass="text-rose-600"
            sizeClass="text-base"
            align="right"
            position="top"
          >
            機会損失（最優先）
          </HoverInfo>
        </div>
      </div>

      {opportunityKws.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-white dark:border-rose-800 dark:bg-dark-2">
          <div className="border-b border-rose-200 bg-rose-50/60 px-5 py-3 dark:border-rose-800 dark:bg-rose-900/20">
            <h4 className="text-base font-bold text-rose-700 dark:text-rose-300">
              取りこぼしキーワード TOP {opportunityKws.length}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-dark/80 dark:text-white/80">
              検索結果にはよく出ているのに、順位が低くてクリックされていないキーワードです。
              Title / Description やページ内容を改善して順位を上げれば、アクセスを大きく伸ばせます。
            </p>
          </div>

          <div className="divide-y divide-stroke dark:divide-dark-3">
            {opportunityKws.map((kw, i) => {
              const imp = kw.impressions || 0;
              const pos = kw.position || 0;
              const ctr = kw.ctr || 0;
              const currentClicks = Math.round(imp * ctr);
              const targetCTR = pos > 10 ? 0.05 : 0.10;
              const potential = Math.max(0, Math.round(imp * targetCTR) - currentClicks);
              return (
                <div key={kw.query} className="grid grid-cols-12 items-center gap-3 px-5 py-3.5">
                  {/* 順位番号 + KW名 */}
                  <div className="col-span-12 flex items-center gap-3 lg:col-span-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-dark dark:text-white" title={kw.query}>
                      {kw.query}
                    </span>
                  </div>

                  {/* メトリクス 3 列 */}
                  <div className="col-span-4 lg:col-span-2">
                    <div className="text-[10px] uppercase tracking-wide text-body-color">表示回数</div>
                    <div className="font-mono text-sm font-bold text-dark dark:text-white">
                      {imp.toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-4 lg:col-span-2">
                    <div className="text-[10px] uppercase tracking-wide text-body-color">順位</div>
                    <div className="font-mono text-sm font-bold text-dark dark:text-white">
                      {pos.toFixed(1)} <span className="text-xs font-normal text-body-color">位</span>
                    </div>
                  </div>
                  <div className="col-span-4 lg:col-span-2">
                    <div className="text-[10px] uppercase tracking-wide text-body-color">現クリック</div>
                    <div className="font-mono text-sm font-bold text-dark dark:text-white">
                      {currentClicks.toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-body-color">
                        ({(ctr * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* 伸びしろ（強調） */}
                  <div className="col-span-12 lg:col-span-2">
                    <div className="rounded-md bg-rose-50 px-2.5 py-1.5 text-right dark:bg-rose-900/30">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">
                        伸びしろ
                      </div>
                      <div className="font-mono text-base font-bold text-rose-700 dark:text-rose-200">
                        +{potential.toLocaleString()}
                        <span className="ml-0.5 text-xs font-normal">クリック/月</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ホバー or クリックでツールチップ表示するインライン要素
 * - mouseenter/mouseleave で即時表示（native title の遅延を回避）
 * - クリックでも開閉
 */
function HoverInfo({ children, tooltip, colorClass = 'text-dark', sizeClass = 'text-sm', align = 'center', position = 'bottom' }) {
  const [show, setShow] = useState(false);
  const positionClass = position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
  const alignClass =
    align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span
      className={`relative inline-flex items-center gap-1 cursor-help font-bold ${sizeClass} ${colorClass}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
    >
      {children}
      <Info className="h-3.5 w-3.5 opacity-60" />
      {show && (
        <span
          className={`absolute ${positionClass} ${alignClass} z-30 whitespace-nowrap rounded-md bg-dark text-white text-xs font-normal px-2.5 py-1.5 shadow-lg pointer-events-none`}
          style={{ maxWidth: 'min(80vw, 480px)' }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
