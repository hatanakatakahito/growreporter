import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Zap, ExternalLink, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

// 信号機 + クール（KeywordsFunnel と統一）
const LAYER_COLORS = {
  branded: '#10b981',  // emerald
  intent: '#f43f5e',   // rose（顕在=要注目）
  pureIntent: '#f59e0b', // amber（純顕在=action）
  latent: '#3b82f6',   // blue
  noise: '#94a3b8',    // slate
};
const LAYER_LABELS_JA = {
  branded: '指名',
  pureIntent: '純顕在',
  intent: '顕在',
  latent: '潜在',
  noise: '無関係',
};

/**
 * キーワード関係図
 *  クラスタを放射状に配置 → 各クラスタの中央に AI 命名ラベル
 *  メンバー KW はクラスタ周辺に螺旋配置
 *  バブルクリックで右側パネルに詳細表示
 */
export default function KeywordsRelationGraph({ data, onAction }) {
  const clusters = data?.clusters || [];
  const keywords = data?.keywords || [];
  const [selectedKw, setSelectedKw] = useState(null);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSize, setFullscreenSize] = useState({ w: 0, h: 0 });

  // クラスタごとのレイアウト計算（メモ化）
  const layout = useMemo(() => buildLayout(clusters, keywords), [clusters, keywords]);

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

  // マウスホイールで 5% 刻みズーム
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
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
      console.warn('[KeywordsRelationGraph] fullscreen toggle failed:', e);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(Math.round((z + 0.05) * 100) / 100, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(Math.round((z - 0.05) * 100) / 100, 0.5));
  const handleZoomReset = () => setZoom(1);

  if (clusters.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
        <p className="text-body-color">クラスタリングのためのキーワードデータが不足しています。</p>
      </div>
    );
  }

  const { clusterPositions, kwPositions, lines, viewBox, viewBoxW, viewBoxH } = layout;

  // SVG 表示サイズ: zoom × ベースサイズ。フルスクリーン時はビューポートに合わせて拡大
  const baseW = isFullscreen ? fullscreenSize.w - 32 : viewBoxW;
  const baseH = isFullscreen ? fullscreenSize.h - 32 : 600;
  const svgWidth = baseW * zoom;
  const svgHeight = baseH * zoom;

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">キーワード関係図</h3>
        <div className="text-xs text-body-color">バブルサイズ = クリック数 / 色 = ファネル層</div>
      </div>

      <div
        ref={containerRef}
        className={`relative rounded-lg overflow-auto ${isFullscreen ? 'bg-white' : 'bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-dark-3 dark:to-dark-3'}`}
        style={{ height: isFullscreen ? '100vh' : 600 }}
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

        <svg
          viewBox={viewBox}
          width={svgWidth}
          height={svgHeight}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', margin: '0 auto', transition: 'width 0.15s ease-out, height 0.15s ease-out' }}
        >
          {/* リンク線 */}
          <g>
            {lines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={l.color}
                strokeOpacity={0.25}
                strokeWidth={l.width}
              />
            ))}
          </g>

          {/* クラスタ中央バブル（AI 命名）— クリックでクラスタ詳細パネル表示 */}
          {clusterPositions.map((c) => {
            const isSelected = selectedClusterId === c.id;
            return (
              <g
                key={c.id}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedClusterId(c.id);
                  setSelectedKw(null);
                }}
              >
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.r}
                  fill={c.color}
                  opacity={0.95}
                  stroke={isSelected ? '#111928' : 'transparent'}
                  strokeWidth={isSelected ? 3 : 0}
                />
                <text x={c.x} y={c.y - 4} textAnchor="middle" fill="white" fontSize={c.fontSize} fontWeight="bold" pointerEvents="none">
                  {c.name}
                </text>
                <text x={c.x} y={c.y + c.fontSize} textAnchor="middle" fill="white" fontSize={c.fontSize - 2} opacity={0.85} pointerEvents="none">
                  {c.clicks.toLocaleString()} clicks
                </text>
              </g>
            );
          })}

          {/* メンバー KW バブル */}
          {kwPositions.map((k) => (
            <g
              key={k.idx}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedKw(k.kw);
                setSelectedClusterId(null);
              }}
            >
              <circle
                cx={k.x}
                cy={k.y}
                r={k.r}
                fill={k.color}
                opacity={0.85}
                stroke={selectedKw?.query === k.kw.query ? '#111928' : 'transparent'}
                strokeWidth={selectedKw?.query === k.kw.query ? 2 : 0}
              />
              <text
                x={k.x}
                y={k.y + 3}
                textAnchor="middle"
                fill="white"
                fontSize={k.fontSize}
                fontWeight="600"
                pointerEvents="none"
              >
                {truncate(k.kw.query, k.r)}
              </text>
            </g>
          ))}
        </svg>

        {/* 凡例 */}
        <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 backdrop-blur-sm border border-stroke px-3 py-2 text-xs dark:bg-dark-2/90 dark:border-dark-3">
          <div className="font-semibold text-dark dark:text-white mb-1">クラスタ（AI 命名）</div>
          {clusterPositions.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: c.color }}></span>
              {c.name}
            </div>
          ))}
        </div>

        <div className="absolute top-3 left-3 rounded-lg bg-white/90 backdrop-blur-sm border border-stroke px-3 py-2 text-xs dark:bg-dark-2/90 dark:border-dark-3">
          <div className="font-semibold text-dark dark:text-white mb-1">バブル色 = ファネル層</div>
          {Object.entries(LAYER_LABELS_JA).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: LAYER_COLORS[k] }}></span>
              {v}
            </div>
          ))}
        </div>

        {/* KW 詳細パネル */}
        {selectedKw && (
          <DetailPanel
            kw={selectedKw}
            onClose={() => setSelectedKw(null)}
            onAction={(action) => {
              onAction?.(action, selectedKw);
              setSelectedKw(null);
            }}
          />
        )}

        {/* クラスタ詳細パネル */}
        {selectedClusterId && (() => {
          const cluster = clusters.find((c) => c.id === selectedClusterId);
          const clusterKws = keywords
            .filter((kw) => kw.clusterId === selectedClusterId)
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
          if (!cluster) return null;
          return (
            <ClusterPanel
              cluster={cluster}
              keywords={clusterKws}
              onClose={() => setSelectedClusterId(null)}
              onSelectKw={(kw) => {
                setSelectedKw(kw);
                setSelectedClusterId(null);
              }}
              onAction={(action) => {
                onAction?.(action);
                setSelectedClusterId(null);
              }}
            />
          );
        })()}
      </div>

      <p className="mt-3 text-xs text-center text-body-color">
        バブルをクリックすると右側パネルに詳細が表示されます
      </p>
    </div>
  );
}

function DetailPanel({ kw, onClose, onAction }) {
  return (
    <aside className="absolute top-3 right-3 w-72 bg-white border border-stroke rounded-lg shadow-lg p-4 z-20 dark:bg-dark-2 dark:border-dark-3">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-body-color font-semibold mb-1">
            キーワード
          </div>
          <h4 className="text-base font-bold text-dark dark:text-white truncate">{kw.query}</h4>
          <span
            className="mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
            style={{ backgroundColor: LAYER_COLORS[kw.layer] || '#94a3b8' }}
          >
            {LAYER_LABELS_JA[kw.layer] || kw.layer}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-body-color hover:bg-gray-100 shrink-0 dark:hover:bg-dark-3"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Metric label="表示回数" value={(kw.impressions || 0).toLocaleString()} />
        <Metric label="クリック" value={(kw.clicks || 0).toLocaleString()} />
        <Metric label="CTR" value={`${((kw.ctr || 0) * 100).toFixed(2)}%`} />
        <Metric label="順位" value={`${(kw.position || 0).toFixed(1)} 位`} />
      </div>
      <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2.5 mb-3 dark:bg-emerald-900/20 dark:border-emerald-800">
        <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wide mb-0.5">
          推定 CV
        </div>
        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
          {kw.estimatedCV || 0}
        </div>
      </div>
      {kw.topPage && (
        <>
          <div className="text-[10px] uppercase tracking-wide text-body-color font-semibold mb-1">
            主要 LP
          </div>
          <div className="text-xs font-mono text-primary mb-3 truncate" title={kw.topPage}>
            {kw.topPage}
          </div>
        </>
      )}
      {kw.ctrLossFlag && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 mb-3 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
          CTR 損失検出: 同順位帯平均から {kw.ctrLossDelta} pt
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onAction?.('improve')}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-stroke text-xs px-2 py-1.5 hover:border-primary hover:text-primary dark:border-dark-3"
        >
          <Zap className="h-3 w-3" />改善候補
        </button>
        <button
          onClick={() => onAction?.('detail')}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-stroke text-xs px-2 py-1.5 hover:border-primary hover:text-primary dark:border-dark-3"
        >
          <ExternalLink className="h-3 w-3" />詳細
        </button>
      </div>
    </aside>
  );
}

function ClusterPanel({ cluster, keywords, onClose, onSelectKw, onAction }) {
  const totalClicks = keywords.reduce((s, k) => s + (k.clicks || 0), 0);
  const totalImpressions = keywords.reduce((s, k) => s + (k.impressions || 0), 0);
  const layerDist = keywords.reduce((acc, k) => {
    const l = k.layer || 'unknown';
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});
  const topKws = keywords.slice(0, 10);

  return (
    <aside className="absolute top-3 right-3 w-80 bg-white border border-stroke rounded-lg shadow-lg p-4 z-20 dark:bg-dark-2 dark:border-dark-3 max-h-[90%] overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-body-color font-semibold mb-1">
            クラスタ（AI 命名）
          </div>
          <h4 className="text-base font-bold text-dark dark:text-white truncate">{cluster.name}</h4>
          <div className="text-xs text-body-color mt-0.5">
            中心 KW: <span className="font-mono">{cluster.centerKeyword || '-'}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-body-color hover:bg-gray-100 shrink-0 dark:hover:bg-dark-3"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Metric label="KW 数" value={(cluster.keywordCount || keywords.length).toLocaleString()} />
        <Metric label="総クリック" value={totalClicks.toLocaleString()} />
        <Metric label="総表示" value={totalImpressions.toLocaleString()} />
        <Metric label="主要層" value={topLayer(layerDist) || '-'} />
      </div>

      <div className="text-[10px] uppercase tracking-wide text-body-color font-semibold mb-1">
        含まれる主要 KW（クリック順 TOP {topKws.length}）
      </div>
      <ul className="space-y-1 mb-3 max-h-56 overflow-y-auto">
        {topKws.map((kw) => (
          <li key={kw.query}>
            <button
              onClick={() => onSelectKw(kw)}
              className="w-full text-left flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-slate-50 dark:hover:bg-dark-3 text-xs"
            >
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  className="h-2 w-2 rounded-full inline-block shrink-0"
                  style={{ background: LAYER_COLORS[kw.layer] || '#94a3b8' }}
                />
                <span className="truncate text-dark dark:text-white">{kw.query}</span>
              </span>
              <span className="font-mono text-body-color shrink-0">{(kw.clicks || 0).toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          onClick={() => onAction?.('improve')}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-stroke text-xs px-2 py-1.5 hover:border-primary hover:text-primary dark:border-dark-3"
        >
          <Zap className="h-3 w-3" />改善候補
        </button>
        <button
          onClick={() => onAction?.('detail')}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-stroke text-xs px-2 py-1.5 hover:border-primary hover:text-primary dark:border-dark-3"
        >
          <ExternalLink className="h-3 w-3" />詳細
        </button>
      </div>
    </aside>
  );
}

function topLayer(dist) {
  const entries = Object.entries(dist);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return LAYER_LABELS_JA[entries[0][0]] || entries[0][0];
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-stroke p-2 dark:border-dark-3">
      <div className="text-[10px] text-body-color">{label}</div>
      <div className="text-sm font-bold text-dark dark:text-white mt-0.5 font-mono">{value}</div>
    </div>
  );
}

function truncate(str, r) {
  // バブル半径に応じて文字数を制限
  const maxLen = Math.max(2, Math.floor(r / 5));
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/**
 * クラスタの放射状配置（指名検索系を中央、それ以外を周辺の円周上に）
 * viewBox は実コンテンツの最小バウンディングボックス + 余白で動的計算 → 中央寄せ
 */
function buildLayout(clusters, keywords) {
  const cx = 500;
  const cy = 400;

  // 各クラスタの「branded 比率」を計算
  const kwByClusterIdx = {};
  keywords.forEach((kw, idx) => {
    if (kw.clusterId) {
      if (!kwByClusterIdx[kw.clusterId]) kwByClusterIdx[kw.clusterId] = [];
      kwByClusterIdx[kw.clusterId].push(kw);
    }
  });

  const clusterWithBrandRatio = clusters.map((c) => {
    const members = kwByClusterIdx[c.id] || [];
    const brandedCount = members.filter((m) => m.layer === 'branded').length;
    const brandedRatio = members.length > 0 ? brandedCount / members.length : 0;
    // クラスタ名に「指名」「ブランド」が含まれるかも考慮
    const nameMatch = /指名|ブランド|brand/i.test(c.name || '') ? 1 : 0;
    const score = brandedRatio + nameMatch * 0.5;
    return { c, brandedRatio, nameMatch, score };
  });

  // 中央クラスタ: branded 比率最大のもの。なければ最大クラスタ
  const sortedByBrand = [...clusterWithBrandRatio].sort((a, b) => b.score - a.score);
  const centerCluster = sortedByBrand[0]?.score > 0 ? sortedByBrand[0].c : null;

  // 中央クラスタを除いた周辺クラスタ（最大 8 個）
  const peripheralClusters = clusters
    .filter((c) => !centerCluster || c.id !== centerCluster.id)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 8);

  // 表示クラスタ全体（中央 + 周辺）
  const allDisplayClusters = centerCluster
    ? [centerCluster, ...peripheralClusters]
    : peripheralClusters;

  const maxClusterClicks = Math.max(...allDisplayClusters.map((c) => c.clicks || 1));
  const palette = ['#6366f1', '#3758F9', '#13C296', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#ec4899'];

  // 配置（クラスタ周辺の半径は控えめにして全体を中央寄せに）
  const peripheralRadius = 200;
  const clusterPositions = allDisplayClusters.map((c, i) => {
    const isCenter = i === 0 && centerCluster;
    let x, y, angle;
    if (isCenter) {
      x = cx;
      y = cy;
      angle = 0;
    } else {
      const peripheralIndex = centerCluster ? i - 1 : i;
      const peripheralCount = peripheralClusters.length;
      angle = (peripheralIndex / Math.max(peripheralCount, 1)) * Math.PI * 2 - Math.PI / 2;
      x = cx + Math.cos(angle) * peripheralRadius;
      y = cy + Math.sin(angle) * peripheralRadius;
    }
    const baseR = isCenter ? 50 : 30;
    const r = baseR + Math.round(((c.clicks || 0) / maxClusterClicks) * (isCenter ? 30 : 35));
    return {
      id: c.id,
      name: c.name,
      centerKeyword: c.centerKeyword,
      clicks: c.clicks,
      keywordCount: c.keywordCount,
      x,
      y,
      r,
      color: isCenter ? '#6366f1' : palette[(i + 1) % palette.length],
      angle,
      isCenter,
      fontSize: r >= 60 ? 14 : r >= 50 ? 13 : 11,
    };
  });

  // 各クラスタの所属 KW を抽出（query → cluster.id マップを作る）
  // バックエンドの clusters は { id, name, centerKeyword, keywordCount, clicks } のみだが
  // keywords[].clusterId が KW 単位で持っている前提
  const kwByCluster = {};
  keywords.forEach((kw, idx) => {
    if (!kw.clusterId) return;
    if (!kwByCluster[kw.clusterId]) kwByCluster[kw.clusterId] = [];
    kwByCluster[kw.clusterId].push({ kw, idx });
  });

  // クラスタ周辺の螺旋配置
  const kwPositions = [];
  const lines = [];

  clusterPositions.forEach((cluster) => {
    const members = (kwByCluster[cluster.id] || [])
      .sort((a, b) => b.kw.clicks - a.kw.clicks)
      .slice(0, 6); // 上位 6 KW のみ表示

    const maxKwClicks = Math.max(...members.map((m) => m.kw.clicks || 1), 1);

    members.forEach((m, mi) => {
      // クラスタ中心から外側に向けて配置（軌道半径を控えめに）
      const subAngle = cluster.angle + (mi - members.length / 2) * 0.4;
      const subRadius = cluster.r + 45 + (mi % 2) * 20;
      const x = cluster.x + Math.cos(subAngle) * subRadius;
      const y = cluster.y + Math.sin(subAngle) * subRadius;
      const r = 14 + Math.round((m.kw.clicks / maxKwClicks) * 22);
      const layerColor = LAYER_COLORS[m.kw.layer] || '#94a3b8';
      kwPositions.push({
        idx: m.idx,
        kw: m.kw,
        x,
        y,
        r,
        color: layerColor,
        fontSize: r >= 24 ? 10 : 9,
      });
      lines.push({ x1: cluster.x, y1: cluster.y, x2: x, y2: y, color: cluster.color, width: 1.5 });
    });
  });

  // 全要素の実バウンディングボックスを計算 → viewBox を最小限に絞って中央寄せ
  const allBubbles = [
    ...clusterPositions.map((c) => ({ x: c.x, y: c.y, r: c.r })),
    ...kwPositions.map((k) => ({ x: k.x, y: k.y, r: k.r })),
  ];
  const padding = 40;
  let minX = cx, maxX = cx, minY = cy, maxY = cy;
  if (allBubbles.length) {
    minX = Math.min(...allBubbles.map((b) => b.x - b.r));
    maxX = Math.max(...allBubbles.map((b) => b.x + b.r));
    minY = Math.min(...allBubbles.map((b) => b.y - b.r));
    maxY = Math.max(...allBubbles.map((b) => b.y + b.r));
  }
  const vbX = minX - padding;
  const vbY = minY - padding;
  const vbW = (maxX - minX) + padding * 2;
  const vbH = (maxY - minY) + padding * 2;

  return {
    clusterPositions,
    kwPositions,
    lines,
    viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    viewBoxW: vbW,
    viewBoxH: vbH,
  };
}
