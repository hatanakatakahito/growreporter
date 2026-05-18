import React, { useState, useMemo } from 'react';
import { Sparkles, RefreshCw, Settings, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import KeywordsClassifySettings from './KeywordsClassifySettings';

// 一般的なマーケティング階層: 顕在(広い興味) → その中で行動意思が強い純顕在 → 潜在 → 無関係
const LAYER_ORDER = ['branded', 'intent', 'pureIntent', 'latent', 'noise'];
// 緑(指名) → ローズ(顕在=要注目) → アンバー(純顕在=action) → 青(潜在) → グレー(無関係)
const LAYER_LABELS = {
  branded: { ja: '指名検索', sub: 'Brand', gradient: 'linear-gradient(90deg, #059669 0%, #10b981 100%)' },
  intent: { ja: '顕在', sub: 'Intent', gradient: 'linear-gradient(90deg, #fb7185 0%, #f43f5e 100%)' },
  pureIntent: { ja: '純顕在', sub: 'Pure Intent', gradient: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)' },
  latent: { ja: '潜在', sub: 'Latent', gradient: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)' },
  noise: { ja: '無関係', sub: 'Noise', gradient: 'linear-gradient(90deg, #94a3b8 0%, #64748b 100%)' },
};

// 各層の行スタイル（バー色と一致）— 通常時 / 選択時 でクラス分け
const LAYER_ROW_STYLES = {
  branded: {
    base: 'border-emerald-200/70 hover:bg-emerald-50/40 dark:border-emerald-900/30 dark:hover:bg-emerald-900/10',
    active: 'border-emerald-400 bg-emerald-50/60 shadow-sm dark:border-emerald-600 dark:bg-emerald-900/20',
  },
  intent: {
    base: 'border-rose-200/70 hover:bg-rose-50/40 dark:border-rose-900/30 dark:hover:bg-rose-900/10',
    active: 'border-rose-400 bg-rose-50/60 shadow-sm dark:border-rose-600 dark:bg-rose-900/20',
  },
  pureIntent: {
    base: 'border-amber-200/70 hover:bg-amber-50/40 dark:border-amber-900/30 dark:hover:bg-amber-900/10',
    active: 'border-amber-400 bg-amber-50/60 shadow-sm dark:border-amber-600 dark:bg-amber-900/20',
  },
  latent: {
    base: 'border-blue-200/70 hover:bg-blue-50/40 dark:border-blue-900/30 dark:hover:bg-blue-900/10',
    active: 'border-blue-400 bg-blue-50/60 shadow-sm dark:border-blue-600 dark:bg-blue-900/20',
  },
  noise: {
    base: 'border-slate-200/70 hover:bg-slate-50/40 dark:border-slate-700/30 dark:hover:bg-slate-800/20',
    active: 'border-slate-400 bg-slate-50/60 shadow-sm dark:border-slate-500 dark:bg-slate-800/30',
  },
};

/**
 * ファネル可視化 + 選択中の層の TOP 10 KW テーブル
 *
 * Props:
 *   data: fetchGSCKeywordsV2Data の返却値（funnel / keywords を持つ）
 *   onReclassify: 再分類ボタンクリック時のコールバック
 */
export default function KeywordsFunnel({ data, siteId, onReclassify, isReclassifying = false, isFetching = false }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const funnel = data?.funnel || {};
  const keywords = data?.keywords || [];
  const queryPagesMap = data?.queryPagesMap || {};

  const maxClicks = useMemo(() => {
    return Math.max(...LAYER_ORDER.map((k) => funnel[k]?.clicks || 0), 1);
  }, [funnel]);

  // 機会損失層（最大の改善余地） = clicks * (impressions / clicks 平均) で推定
  // 簡易判定: 顕在層が impressions 多 + 平均順位が低い時
  const warningLayers = useMemo(() => {
    return LAYER_ORDER.filter((k) => {
      const f = funnel[k];
      if (!f || k === 'noise' || k === 'branded') return false;
      return f.avgPosition >= 15 && f.impressions >= 1000;
    });
  }, [funnel]);

  const initialSelected = warningLayers[0] || 'branded';
  const [selectedLayer, setSelectedLayer] = useState(initialSelected);
  // バー指標の切替: clicks / impressions / estimatedCV
  const [metric, setMetric] = useState('clicks');

  // 選択中の層 KW を、現在の指標で降順ソート（メトリクストグルと連動）
  const layerKeywords = useMemo(() => {
    return keywords
      .filter((k) => k.layer === selectedLayer)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  }, [keywords, selectedLayer, metric]);

  // 各層の最大値（バー幅計算用）
  const maxValueByMetric = useMemo(() => {
    const all = LAYER_ORDER.map((k) => {
      const f = funnel[k];
      if (!f) return { clicks: 0, impressions: 0, estimatedCV: 0 };
      return { clicks: f.clicks || 0, impressions: f.impressions || 0, estimatedCV: f.estimatedCV || 0 };
    });
    return {
      clicks: Math.max(1, ...all.map((v) => v.clicks)),
      impressions: Math.max(1, ...all.map((v) => v.impressions)),
      estimatedCV: Math.max(1, ...all.map((v) => v.estimatedCV)),
    };
  }, [funnel]);

  const totalByMetric = useMemo(() => {
    return {
      clicks: data?.metrics?.totalClicks || 0,
      impressions: data?.metrics?.totalImpressions || 0,
      estimatedCV: data?.metrics?.estimatedCV || 0,
    };
  }, [data]);

  const metricLabels = { clicks: 'クリック', impressions: '表示回数', estimatedCV: '推定 CV' };

  return (
    <div className="space-y-6">
      {/* AI 自動分類サマリー */}
      <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-5 dark:border-dark-3 dark:from-dark-2 dark:to-dark-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-ai text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-purple-700 dark:text-purple-300 font-bold mb-1">
              AI 自動分類
            </div>
            <p className="text-sm text-dark dark:text-white leading-relaxed">
              全{(data?.metrics?.keywordCount || keywords.length).toLocaleString()} 件のキーワードのうち
              <span className="font-semibold"> {(data?.metrics?.aiClassifiedCount || 0).toLocaleString()} 件</span>
              を AI がこのサイトの業種・サービスに応じて 5 層に自動分類しました。
              層をクリックすると、その層の主要 KW 一覧が下に表示されます。
              {data?.classifyFromCache === false && (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold"> （今回分類を更新しました）</span>
              )}
            </p>
          </div>
          <button
            onClick={onReclassify}
            disabled={isReclassifying}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-white px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-dark-2 dark:border-dark-3 dark:text-purple-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReclassifying ? 'animate-spin' : ''}`} />
            {isReclassifying ? '再分類中...' : '再分類'}
          </button>
        </div>
      </div>

      {/* ファネル + 主要 KW を 2 カラムレイアウト（lg+ で横並び、それ以下では縦積み） */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左: ファネル本体 */}
        <div className="lg:col-span-7 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-dark dark:text-white">検索キーワード ファネル</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-body-color">バー指標:</span>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="appearance-none [background-image:none] rounded-md border border-stroke bg-transparent py-1.5 px-3 pr-8 text-sm text-dark outline-none transition-all duration-200 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:text-white dark:bg-dark-3"
              >
                <option value="clicks">クリック数</option>
                <option value="impressions">表示回数</option>
                <option value="estimatedCV">推定 CV</option>
              </select>
              <button
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition-all duration-200 hover:border-primary focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 dark:border-dark-3 dark:text-white"
              >
                <Settings className="h-4 w-4 text-body-color" />
                <span>分類設定</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {LAYER_ORDER.map((key) => {
              const f = funnel[key];
              if (!f) return null;
              const value = f[metric] || 0;
              const maxV = maxValueByMetric[metric] || 1;
              const totalV = totalByMetric[metric] || 1;
              const widthPct = Math.max(20, Math.round((value / maxV) * 100));
              const ratio = totalV > 0 ? Math.round((value / totalV) * 100) : 0;
              const isWarning = warningLayers.includes(key);
              const isSelected = selectedLayer === key;
              const meta = LAYER_LABELS[key];

              const rowStyle = LAYER_ROW_STYLES[key] || LAYER_ROW_STYLES.noise;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedLayer(key)}
                  className={`w-full block text-left rounded-lg transition-all border-2 ${
                    isSelected ? rowStyle.active : rowStyle.base
                  }`}
                >
                  <div className="flex items-stretch gap-3 p-3">
                    {/* 左: 層名 */}
                    <div className="w-24 shrink-0 flex flex-col justify-center">
                      <div className="text-sm font-bold text-dark dark:text-white">{meta.ja}</div>
                      <div className="text-[11px] text-body-color">{meta.sub}</div>
                      {isWarning && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          機会損失
                        </div>
                      )}
                    </div>

                    {/* 中央: バー + KW チップ */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="relative h-10 rounded-md overflow-hidden bg-gray-100 dark:bg-dark-3">
                        <div
                          className="h-full flex items-center px-3 transition-all duration-300"
                          style={{ width: `${widthPct}%`, background: meta.gradient }}
                        >
                          <span className="text-white font-bold text-base whitespace-nowrap">
                            {value.toLocaleString()}
                          </span>
                          <span className="text-white/90 text-xs font-medium ml-2 whitespace-nowrap">
                            {metricLabels[metric]} / {ratio}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-body-color flex-wrap">
                        <span className="text-xs font-semibold">主要 KW</span>
                        {f.topKeywords?.slice(0, 3).map((kw, i) => (
                          <span key={i} className={`rounded-full px-2 py-0.5 text-xs ${chipClass(key)}`}>
                            {kw}
                          </span>
                        ))}
                        {f.count > 3 && (
                          <span className="text-body-color">+ {f.count - 3} KW</span>
                        )}
                      </div>
                    </div>

                    {/* 右: メトリクス（縦並びコンパクト・前期比はデータがある時のみ表示） */}
                    <div className="shrink-0 flex flex-col gap-1.5 items-end justify-center text-xs text-body-color whitespace-nowrap">
                      <span>
                        推定 CV: <span className="font-bold text-sm text-dark dark:text-white font-mono">{f.estimatedCV || 0}</span>
                      </span>
                      <span>
                        平均順位: <span className="font-bold text-sm text-dark dark:text-white font-mono">{f.avgPosition} 位</span>
                      </span>
                      {f.change != null && (
                        <span className={changeAccent(f.change) ? `text-${changeAccent(f.change)}-600 dark:text-${changeAccent(f.change)}-400` : ''}>
                          前期比: <span className="font-bold text-sm font-mono">{changeText(f.change)}</span>
                        </span>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-body-color shrink-0 self-center" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右: 選択中の層の TOP 10 KW */}
        <div className="lg:col-span-5 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold whitespace-nowrap ${badgeClass(selectedLayer)}`}>
              {LAYER_LABELS[selectedLayer]?.ja}
              {warningLayers.includes(selectedLayer) && ' — 機会損失'}
            </span>
            <h3 className="text-base font-semibold text-dark dark:text-white">
              主要キーワード TOP 10
            </h3>
          </div>
          <span className="text-xs text-body-color shrink-0">該当 {layerKeywords.length} 件</span>
        </div>

        {layerKeywords.length === 0 ? (
          <div className="text-center py-8 text-sm text-body-color">この層にはキーワードがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3 text-xs text-body-color">
                  <th className="text-left py-2 px-2 font-semibold">キーワード</th>
                  <th className={`text-right py-2 px-2 font-semibold ${metric === 'impressions' ? 'text-primary' : ''}`}>
                    表示{metric === 'impressions' && ' ▼'}
                  </th>
                  <th className={`text-right py-2 px-2 font-semibold ${metric === 'clicks' ? 'text-primary' : ''}`}>
                    クリック{metric === 'clicks' && ' ▼'}
                  </th>
                  <th className="text-right py-2 px-2 font-semibold">順位</th>
                  <th className={`text-right py-2 px-2 font-semibold ${metric === 'estimatedCV' ? 'text-primary' : ''}`}>
                    推定 CV{metric === 'estimatedCV' && ' ▼'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-dark-3 text-sm">
                {layerKeywords.slice(0, 10).map((kw) => (
                  <tr
                    key={kw.query}
                    className="hover:bg-blue-50/30 dark:hover:bg-dark-3/30"
                    title={`CTR: ${((kw.ctr || 0) * 100).toFixed(1)}%${kw.topPage ? ` / LP: ${kw.topPage}` : ''}`}
                  >
                    <td className="py-2.5 px-2 font-medium text-dark dark:text-white truncate max-w-[180px]">{kw.query}</td>
                    <td className={`py-2.5 px-2 text-right font-mono ${metric === 'impressions' ? 'font-bold text-dark dark:text-white' : ''}`}>
                      {(kw.impressions || 0).toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-mono ${metric === 'clicks' ? 'font-bold text-dark dark:text-white' : ''}`}>
                      {(kw.clicks || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-dark dark:text-white">
                      {(kw.position || 0).toFixed(1)} 位
                    </td>
                    <td className={`py-2.5 px-2 text-right font-mono ${metric === 'estimatedCV' ? 'font-bold text-dark dark:text-white' : ''}`}>
                      {kw.estimatedCV || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] text-body-color">
              ※ バー指標で並び替え。行をホバーで CTR・LP の詳細表示
            </p>
          </div>
        )}
        </div>
      </div>

      {/* 分類設定モーダル */}
      <KeywordsClassifySettings
        siteId={siteId}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          // 保存後に自動で再分類を呼ぶ
          if (onReclassify) onReclassify();
        }}
      />
    </div>
  );
}

function MetricCell({ label, value, sub, accent, mono = true }) {
  const accentMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  const valueClass = accent ? accentMap[accent] : 'text-dark dark:text-white';
  return (
    <div className="text-center min-w-[88px]">
      <div className="text-xs text-body-color whitespace-nowrap">{label}</div>
      <div className={`mt-0.5 text-[17px] font-bold whitespace-nowrap leading-tight ${mono ? 'font-mono' : ''} ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-body-color whitespace-nowrap">{sub}</div>}
    </div>
  );
}

function rankAccent(position) {
  if (position == null || position === 0) return null;
  if (position <= 5) return 'emerald';
  if (position <= 15) return 'amber';
  return 'rose';
}

function changeText(change) {
  if (change == null) return '—';
  const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '→';
  return `${arrow} ${Math.abs(Math.round(change * 100))}%`;
}

function changeAccent(change) {
  if (change == null) return null;
  if (change > 0) return 'emerald';
  if (change < 0) return 'rose';
  return null;
}

function chipClass(layer) {
  const map = {
    branded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    intent: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    pureIntent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    latent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    noise: 'bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400',
  };
  return map[layer] || map.noise;
}

function badgeClass(layer) {
  const map = {
    branded: 'bg-emerald-100 text-emerald-800',
    intent: 'bg-rose-100 text-rose-800',
    pureIntent: 'bg-amber-100 text-amber-800',
    latent: 'bg-blue-100 text-blue-800',
    noise: 'bg-slate-100 text-slate-500',
  };
  return map[layer] || map.noise;
}

function rankColor(position) {
  if (position <= 3) return 'text-emerald-600';
  if (position <= 10) return 'text-amber-600';
  return 'text-rose-600';
}
