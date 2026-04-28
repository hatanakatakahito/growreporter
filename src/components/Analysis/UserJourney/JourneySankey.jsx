import React, { useMemo, useState, useRef, useEffect } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/**
 * 5層サンキー図コンポーネント
 *
 * 列構造: 流入元(0) → KW/参照元(1) → LP(2) → 中間(3) → 結果(4)
 * - 直接アクセスは KW 列をスキップして LP に直結（点線）
 * - ノードクリックで onNodeClick コールバック発火
 * - ズーム機能（拡大・縮小・フィット）
 */
const NODE_COLORS = {
  source: { organic: '#3758F9', paid: '#A78BFA', sns: '#F59E0B', direct: '#94A3B8', referral: '#10B981' },
  keyword: { gsc: '#3758F9', ad: '#A78BFA', sns: '#F59E0B', referral: '#10B981', mix: '#94A3B8' },
  lp: '#A78BFA',
  lpOther: '#C4B5FD',
  middle: '#13C296',
  middleBounce: '#94A3B8',
  cv: '#10B981',
  exit: '#94A3B8',
};

function getNodeColor(node) {
  if (node.type === 'source') return NODE_COLORS.source[node.id.replace('src-', '')] || '#3758F9';
  if (node.type === 'keyword') return NODE_COLORS.keyword[node.subtype] || '#94A3B8';
  if (node.type === 'lp') return node.id === 'lp-other' ? NODE_COLORS.lpOther : NODE_COLORS.lp;
  if (node.type === 'middle') return node.id === 'mid-bounce' ? NODE_COLORS.middleBounce : NODE_COLORS.middle;
  if (node.type === 'cv') return NODE_COLORS.cv;
  if (node.type === 'exit') return NODE_COLORS.exit;
  return '#94A3B8';
}

const COLUMN_LABELS = ['流入元', 'KW / 参照元', 'ランディングページ', '中間ページ (2P目)', '最終結果'];

export default function JourneySankey({ data, selectedNodeId, onNodeClick, height = 480 }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1100);
  const [zoom, setZoom] = useState(1);

  // ResizeObserver でコンテナ幅を追跡
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(800, containerRef.current.clientWidth));
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // d3-sankey でレイアウト計算
  const { nodes: layoutNodes, links: layoutLinks } = useMemo(() => {
    if (!data?.nodes?.length) return { nodes: [], links: [] };

    // d3-sankey は nodeId と link.source/target の型が一致する必要あり（文字列で統一）
    // 直接アクセス（skipKeyword）リンクも d3-sankey に渡し、isDirect で識別して破線描画
    const validIds = new Set(data.nodes.map((n) => n.id));
    const sankeyNodes = data.nodes.map((n) => ({ ...n }));
    const sankeyLinks = data.links
      .filter((l) => validIds.has(l.source) && validIds.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        value: l.value,
        isDirect: !!l.skipKeyword,
      }));

    const padding = 24;
    const width = containerWidth - padding * 2;
    const innerHeight = height - 60;

    const sankeyGen = sankey()
      .nodeId((d) => d.id)
      .nodeWidth(14)
      .nodePadding(14)
      .nodeAlign(sankeyLeft)
      .extent([[80, 50], [width - 100, innerHeight]]);

    try {
      const layout = sankeyGen({
        nodes: sankeyNodes.map((n) => ({ ...n })),
        links: sankeyLinks.map((l) => ({ ...l })),
      });
      return { nodes: layout.nodes, links: layout.links };
    } catch (e) {
      console.warn('[JourneySankey] sankey layout failed:', e);
      return { nodes: [], links: [] };
    }
  }, [data, containerWidth, height]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleZoomReset = () => setZoom(1);

  const linkPath = sankeyLinkHorizontal();

  return (
    <div ref={containerRef} className="rounded-md bg-slate-50/60 p-4 relative">
      {/* ズームコントロール（列ヘッダと重ならないよう右下に配置） */}
      <div className="absolute bottom-3 right-3 z-10 inline-flex items-center bg-white border border-stroke rounded-md shadow-sm">
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 rounded-l-md transition-colors"
          title="縮小"
          type="button"
        >
          <ZoomOut className="h-4 w-4 text-dark" />
        </button>
        <span className="px-2.5 text-xs font-medium text-dark border-l border-r border-stroke min-w-[52px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 transition-colors"
          title="拡大"
          type="button"
        >
          <ZoomIn className="h-4 w-4 text-dark" />
        </button>
        <button
          onClick={handleZoomReset}
          className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 border-l border-stroke rounded-r-md transition-colors"
          title="表示にフィット"
          type="button"
        >
          <Maximize2 className="h-4 w-4 text-dark" />
        </button>
      </div>

      <div style={{ overflow: 'auto' }}>
        <svg
          width={containerWidth - 48}
          height={height}
          style={{
            display: 'block',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-out',
          }}
        >
          {/* 列ヘッダー（y=24 で十分な上余白を確保） */}
          {COLUMN_LABELS.map((label, i) => {
            // 各列の x 位置を取得（その列のノードの x0 から）
            const colNode = layoutNodes.find((n) => n.column === i);
            if (!colNode) return null;
            const x = i === 0 ? 60 : colNode.x0 + 20;
            return (
              <text
                key={i}
                x={x}
                y={24}
                fontSize="13"
                fontWeight="700"
                fill="#637381"
                textAnchor={i === 0 ? 'end' : 'start'}
              >
                {label}
              </text>
            );
          })}

          {/* リンク（フロー） */}
          <g fill="none">
            {layoutLinks.map((l, i) => {
              const sourceColor = l.isDirect ? '#94A3B8' : getNodeColor(l.source);
              return (
                <path
                  key={i}
                  d={linkPath(l)}
                  stroke={sourceColor}
                  strokeWidth={Math.max(1, l.width)}
                  strokeOpacity={l.isDirect ? 0.5 : 0.35}
                  strokeDasharray={l.isDirect ? '4 3' : null}
                  className="sankey-link"
                />
              );
            })}
          </g>

          {/* ノード */}
          <g>
            {layoutNodes.map((n, i) => {
              const isSelected = selectedNodeId === n.id;
              const fill = getNodeColor(n);
              const nodeHeight = Math.max(1, n.y1 - n.y0);
              const isCompact = nodeHeight < 32; // 高さ < 32px は 1 行ラベルに集約

              const valueText = `${n.value.toLocaleString()}${n.share != null ? ` (${Math.round(n.share * 100)}%)` : ''}`;
              const changeIcon = n.change != null && n.change !== 0
                ? (n.change > 0 ? '▲' : '▼')
                : null;
              const changeText = changeIcon
                ? `${changeIcon} ${Math.abs(Math.round(n.change * 100))}%`
                : '';
              const changeColor = n.change > 0 ? '#10B981' : '#ef4444';

              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onNodeClick && onNodeClick(n)}
                >
                  <rect
                    x={n.x0}
                    y={n.y0}
                    width={n.x1 - n.x0}
                    height={nodeHeight}
                    fill={fill}
                    stroke={isSelected ? '#111928' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    style={{ filter: isSelected ? 'brightness(1.15)' : undefined }}
                  />
                  {/* 列0は右端揃え（左外側）、列1-4は左端揃え（右外側） */}
                  {n.column === 0 ? (
                    isCompact ? (
                      <text x={n.x0 - 6} y={n.y0 + nodeHeight / 2 + 4} fontSize="11" fontWeight="600" fill="#111928" textAnchor="end">
                        {n.name} <tspan fill="#637381" fontWeight="400">{valueText}</tspan>
                      </text>
                    ) : (
                      <>
                        <text x={n.x0 - 6} y={n.y0 + 12} fontSize="12" fontWeight="600" fill="#111928" textAnchor="end">{n.name}</text>
                        <text x={n.x0 - 6} y={n.y0 + 26} fontSize="11" fill="#637381" textAnchor="end">{valueText}</text>
                        {changeIcon && (
                          <text x={n.x0 - 6} y={n.y0 + 39} fontSize="11" fontWeight="600" textAnchor="end" fill={changeColor}>{changeText}</text>
                        )}
                      </>
                    )
                  ) : (
                    isCompact ? (
                      <text x={n.x1 + 6} y={n.y0 + nodeHeight / 2 + 4} fontSize="11" fontWeight="600" fill="#111928">
                        {n.name} <tspan fill="#637381" fontWeight="400">{valueText}</tspan>
                      </text>
                    ) : (
                      <>
                        <text x={n.x1 + 6} y={n.y0 + 12} fontSize="12" fontWeight="600" fill="#111928">{n.name}</text>
                        <text x={n.x1 + 6} y={n.y0 + 26} fontSize="11" fill="#637381">{valueText}</text>
                        {changeIcon && (
                          <text x={n.x1 + 6} y={n.y0 + 39} fontSize="11" fontWeight="600" fill={changeColor}>{changeText}</text>
                        )}
                      </>
                    )
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
