import React, { useState, useMemo } from 'react';
import {
  Activity, ChevronDown, Smartphone, Monitor,
  AlertTriangle, CheckCircle2, XCircle, ExternalLink,
  RefreshCw, Loader2,
} from 'lucide-react';
import Tooltip from '../common/Tooltip';
import { getTooltip } from '../../constants/tooltips';

// コンテンツ品質の問題種別 → 参考リンク
const ISSUE_REFERENCE_LINKS = {
  'タイトルがない、または短すぎる': { url: 'https://developers.google.com/search/docs/appearance/title-link', label: 'Google: タイトルリンクの仕組み' },
  'meta descriptionがない、または短すぎる': { url: 'https://developers.google.com/search/docs/appearance/snippet', label: 'Google: スニペットの管理' },
  '画像の50%以上にalt属性がない': { url: 'https://web.dev/learn/accessibility/images', label: 'web.dev: 画像のアクセシビリティ' },
  'h1タグがない': { url: 'https://web.dev/learn/html/headings-and-sections', label: 'web.dev: 見出しとセクション' },
  'h1タグが複数ある': { url: 'https://web.dev/learn/html/headings-and-sections', label: 'web.dev: 見出しとセクション' },
  'h2タグがない': { url: 'https://web.dev/learn/html/headings-and-sections', label: 'web.dev: 見出しとセクション' },
  '本文テキストが少ない（500文字未満）': { url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content', label: 'Google: 有用なコンテンツの作成' },
  'コンテンツ品質スコアが低い（50点未満）': { url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content', label: 'Google: 有用なコンテンツの作成' },
  '高アクセスだがエンゲージメント率が低い（30%未満）': { url: 'https://support.google.com/analytics/answer/12195621', label: 'GA4: エンゲージメント率' },
  '流入が多いが直帰率が高い（70%以上）': { url: 'https://support.google.com/analytics/answer/12195621', label: 'GA4: エンゲージメント率' },
};

function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 80) return '良好';
  if (score >= 50) return '改善余地あり';
  return '要改善';
}

function getRatingColor(rating) {
  if (rating === 'good') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
  if (rating === 'needs-improvement') return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
  if (rating === 'poor') return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  return 'text-gray-500 bg-gray-50 dark:bg-gray-800';
}

function getRatingLabel(rating) {
  if (rating === 'good') return '良好';
  if (rating === 'needs-improvement') return '要改善';
  if (rating === 'poor') return '要対策';
  return '-';
}

/** 円形スコアゲージ */
function ScoreGauge({ score, size = 140, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="none" className="dark:stroke-dark-4" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-dark dark:text-white leading-none">{score}</span>
        <span className="text-xs text-body-color mt-0.5">/ 100</span>
        <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-body-color bg-[#f1f5f9] dark:bg-dark-3">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

/** 軸スコアアイテム（クリック可能） */
function AxisItem({ name, score, detail, isExpanded, onClick, hasDetail, tooltip }) {
  const fillClass = score >= 80 ? 'bg-primary' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <button
      type="button"
      onClick={hasDetail ? onClick : undefined}
      className={`w-full rounded-lg border p-3 text-left transition ${
        isExpanded ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-stroke dark:border-dark-3'
      } ${hasDetail ? 'cursor-pointer hover:border-primary/50' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-body-color flex items-center gap-1">
          {name}
          {tooltip && <Tooltip content={tooltip} />}
          {hasDetail && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
        </span>
        <span className="text-base font-bold text-dark dark:text-white">{score}</span>
      </div>
      <div className="h-[3px] rounded-full bg-dark-8 dark:bg-dark-4 overflow-hidden">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${score}%`, transition: 'width 0.8s ease' }} />
      </div>
      {detail && <div className="mt-1.5 text-xs text-body-color leading-tight">{detail}</div>}
    </button>
  );
}

// ================= 詳細セクション =================

/** 技術品質詳細: CWV + 失敗Audit */
function TechQualityDetail({ data }) {
  const [deviceTab, setDeviceTab] = useState('mobile');
  const psiData = data?.psi?.[deviceTab];
  if (!data?.psi?.mobile && !data?.psi?.desktop) return <p className="text-xs text-body-color">PSIデータがありません</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-dark dark:text-white">Core Web Vitals</span>
        <div className="flex rounded-lg border border-stroke dark:border-dark-3">
          <button onClick={() => setDeviceTab('mobile')} className={`flex items-center gap-1 rounded-l-lg px-2.5 py-1 text-xs font-medium transition ${deviceTab === 'mobile' ? 'bg-primary text-white' : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'}`}>
            <Smartphone className="h-3 w-3" /> モバイル
          </button>
          <button onClick={() => setDeviceTab('desktop')} className={`flex items-center gap-1 rounded-r-lg px-2.5 py-1 text-xs font-medium transition ${deviceTab === 'desktop' ? 'bg-primary text-white' : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'}`}>
            <Monitor className="h-3 w-3" /> PC
          </button>
        </div>
      </div>
      {psiData?.cwv ? (
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(psiData.cwv).map(([key, metric]) => (
            <div key={key} className="rounded border border-stroke p-2 dark:border-dark-3">
              <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-body-color">{key.toUpperCase()}{getTooltip(key) && <Tooltip content={getTooltip(key)} />}</div>
              <div className="text-base font-bold text-dark dark:text-white">{metric.value !== null ? `${metric.value}${metric.unit}` : '-'}</div>
              <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium ${getRatingColor(metric.rating)}`}>{getRatingLabel(metric.rating)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-body-color">{deviceTab === 'mobile' ? 'モバイル' : 'デスクトップ'}のデータがありません</p>
      )}
      {psiData?.topAudits?.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-dark dark:text-white">改善が必要な項目</div>
          <div className="max-h-60 space-y-1.5 overflow-y-auto">
            {psiData.topAudits.slice(0, 10).map((audit, i) => (
              <div key={i} className="flex items-start gap-2 rounded border border-stroke p-2 dark:border-dark-3">
                {audit.score !== null && audit.score < 0.5
                  ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-dark dark:text-white">{audit.title}</span>
                    {audit.displayValue && <span className="text-[10px] text-body-color">{audit.displayValue}</span>}
                  </div>
                  {audit.description && <p className="mt-0.5 text-[10px] text-body-color line-clamp-2">{audit.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** コンテンツ充実度詳細 */
function ContentQualityDetail({ data }) {
  const [expandedIssues, setExpandedIssues] = useState({});
  const cq = data?.contentQuality;
  if (!cq?.available) return <p className="text-xs text-body-color">スクレイピングデータがありません。「サイト管理」からスクレイピングを実行してください。</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center rounded border border-stroke p-2 dark:border-dark-3">
          <div className="text-lg font-bold text-dark dark:text-white">{cq.score}</div>
          <div className="text-[10px] text-body-color">平均スコア</div>
        </div>
        <div className="text-center rounded border border-stroke p-2 dark:border-dark-3">
          <div className="text-lg font-bold text-dark dark:text-white">{cq.totalPages}</div>
          <div className="text-[10px] text-body-color">分析ページ数</div>
        </div>
        <div className="text-center rounded border border-stroke p-2 dark:border-dark-3">
          <div className="text-lg font-bold text-red-500">{cq.problematicPages}</div>
          <div className="text-[10px] text-body-color">問題ページ数</div>
        </div>
      </div>
      {cq.topIssues?.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium text-dark dark:text-white">問題種別ランキング</div>
          <div className="space-y-1">
            {cq.topIssues.map((item, i) => {
              const ref = ISSUE_REFERENCE_LINKS[item.issue];
              const isExp = expandedIssues[i];
              return (
                <div key={i} className="overflow-hidden rounded border border-stroke dark:border-dark-3">
                  <button onClick={() => setExpandedIssues(p => ({ ...p, [i]: !p[i] }))} className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs transition hover:bg-gray-50 dark:hover:bg-dark-3">
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`h-3 w-3 shrink-0 text-body-color transition-transform ${isExp ? '' : '-rotate-90'}`} />
                      <span className="text-left text-dark dark:text-white">{item.issue}</span>
                      {ref && (
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" title={ref.label} onClick={e => e.stopPropagation()} className="text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-red-500">{item.count}ページ</span>
                  </button>
                  {isExp && item.pages?.length > 0 && (
                    <div className="border-t border-stroke bg-white px-2.5 py-1.5 dark:border-dark-3 dark:bg-dark-3">
                      <div className="max-h-36 space-y-0.5 overflow-y-auto">
                        {item.pages.map((pagePath, j) => {
                          const baseUrl = (data.siteUrl || '').replace(/\/+$/, '');
                          const fullUrl = pagePath.startsWith('http') ? pagePath : `${baseUrl}${pagePath || '/'}`;
                          return (
                            <a key={j} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-[10px] text-primary hover:underline">
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" /> {pagePath || '/'}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {cq.topPageDetails && (
        <div>
          <div className="mb-1.5 text-sm font-medium text-dark dark:text-white">トップページの詳細</div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="rounded border border-stroke px-2.5 py-1.5 dark:border-dark-3"><span className="text-body-color">テキスト量: </span><span className="font-medium text-dark dark:text-white">{cq.topPageDetails.textLength?.toLocaleString()}文字</span></div>
            <div className="rounded border border-stroke px-2.5 py-1.5 dark:border-dark-3"><span className="text-body-color">見出し: </span><span className="font-medium text-dark dark:text-white">h1:{cq.topPageDetails.headingStructure?.h1 || 0} h2:{cq.topPageDetails.headingStructure?.h2 || 0} h3:{cq.topPageDetails.headingStructure?.h3 || 0}</span></div>
            <div className="rounded border border-stroke px-2.5 py-1.5 dark:border-dark-3"><span className="text-body-color">画像alt: </span><span className="font-medium text-dark dark:text-white">{cq.topPageDetails.imagesWithAlt}/{cq.topPageDetails.imagesWithAlt + cq.topPageDetails.imagesWithoutAlt}</span></div>
            <div className="rounded border border-stroke px-2.5 py-1.5 dark:border-dark-3"><span className="text-body-color">title: </span><span className="font-medium text-dark dark:text-white">{cq.topPageDetails.titleLength}文字</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 集客力（SEO）詳細 */
function SeoDetail({ data }) {
  const seo = data?.seo;
  if (!seo) return <p className="text-xs text-body-color">SEOデータがありません</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-stroke p-2 dark:border-dark-3">
          <div className="flex items-center gap-1 text-[10px] text-body-color">PSI SEO（モバイル）<Tooltip content={getTooltip('psiSeoMobile')} /></div>
          <div className="text-lg font-bold" style={{ color: getScoreColor(seo.psiSeoScore?.mobile || 0) }}>{seo.psiSeoScore?.mobile ?? '-'}</div>
        </div>
        <div className="rounded border border-stroke p-2 dark:border-dark-3">
          <div className="flex items-center gap-1 text-[10px] text-body-color">PSI SEO（PC）<Tooltip content={getTooltip('psiSeoDesktop')} /></div>
          <div className="text-lg font-bold" style={{ color: getScoreColor(seo.psiSeoScore?.desktop || 0) }}>{seo.psiSeoScore?.desktop ?? '-'}</div>
        </div>
      </div>
      {seo.metaAnalysis && (
        <div>
          <div className="mb-1.5 text-sm font-medium text-dark dark:text-white">メタタグ分析</div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 rounded border border-stroke px-2.5 py-1.5 dark:border-dark-3">
              {seo.metaAnalysis.titleOptimal ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              <span className="text-dark dark:text-white">title: {seo.metaAnalysis.titleLength}文字{seo.metaAnalysis.titleOptimal ? '' : ' (推奨: 30-60文字)'}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded border border-stroke px-2.5 py-1.5 dark:border-dark-3">
              {seo.metaAnalysis.descOptimal ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              <span className="text-dark dark:text-white">description: {seo.metaAnalysis.descLength}文字{seo.metaAnalysis.descOptimal ? '' : ' (推奨: 50-160文字)'}</span>
            </div>
          </div>
        </div>
      )}
      {seo.gscConnected && seo.gscMetrics ? (
        <div>
          <div className="mb-1.5 text-sm font-medium text-dark dark:text-white">Google Search Console</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '平均順位', value: seo.gscMetrics.avgPosition },
              { label: 'クリック', value: seo.gscMetrics.totalClicks?.toLocaleString() },
              { label: '表示回数', value: seo.gscMetrics.totalImpressions?.toLocaleString() },
              { label: 'CTR', value: `${(seo.gscMetrics.avgCtr * 100).toFixed(1)}%` },
            ].map((m, i) => (
              <div key={i} className="rounded border border-stroke p-2 text-center dark:border-dark-3">
                <div className="text-base font-bold text-dark dark:text-white">{m.value}</div>
                <div className="text-[10px] text-body-color">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded bg-white px-3 py-2 text-[10px] text-body-color dark:bg-dark-3">Google Search Consoleが接続されていません。接続するとSEO分析の精度が向上します。</p>
      )}
      {seo.issues?.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium text-dark dark:text-white">SEOの問題点</div>
          <ul className="space-y-1">
            {seo.issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-body-color">
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" /> {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** CV導線（エンゲージメント）詳細 */
function EngagementDetail({ data }) {
  const eng = data?.engagement;
  if (!eng?.available) return <p className="text-xs text-body-color">エンゲージメントデータがありません。GA4を接続すると表示されます。</p>;
  return (
    <div className="space-y-4">
      <div className="rounded border border-stroke p-3 text-center dark:border-dark-3">
        <div className="text-2xl font-bold text-dark dark:text-white">{(eng.metrics.avgEngagementRate * 100).toFixed(1)}%</div>
        <div className="text-[10px] text-body-color">平均エンゲージメント率</div>
      </div>
      {eng.lowEngagementPages?.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium text-dark dark:text-white">低エンゲージメントページ（40%未満・50PV以上）{eng.lowEngagementPages.length > 1 ? ` Top ${eng.lowEngagementPages.length}` : ''}</div>
          <div className="space-y-1">
            {eng.lowEngagementPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-stroke px-2.5 py-1.5 text-xs dark:border-dark-3">
                <span className="truncate text-dark dark:text-white">{p.path}</span>
                <div className="flex gap-3 shrink-0 text-body-color">
                  <span>{p.pageViews?.toLocaleString()} PV</span>
                  <span className="text-red-500">{(p.engagementRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** ユーザビリティ詳細 */
function UsabilityDetail({ data }) {
  const psi = data?.psi;
  if (!psi?.mobile && !psi?.desktop) return <p className="text-xs text-body-color">データがありません</p>;
  const items = [
    { label: 'アクセシビリティ（モバイル）', value: psi?.mobile?.accessibility },
    { label: 'アクセシビリティ（PC）', value: psi?.desktop?.accessibility },
    { label: 'ベストプラクティス（モバイル）', value: psi?.mobile?.bestPractices },
    { label: 'ベストプラクティス（PC）', value: psi?.desktop?.bestPractices },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div key={i} className="rounded border border-stroke p-2 dark:border-dark-3">
          <div className="text-[10px] text-body-color">{item.label}</div>
          <div className="text-lg font-bold" style={{ color: item.value != null ? getScoreColor(item.value) : '#9ca3af' }}>
            {item.value ?? '-'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ================= スコア計算 =================

function computeScores(diagnosisData, improvements) {
  const axes = [];

  const psiMobile = diagnosisData?.psi?.mobile?.performance;
  const psiDesktop = diagnosisData?.psi?.desktop?.performance;
  if (psiMobile != null || psiDesktop != null) {
    const vals = [psiMobile, psiDesktop].filter(v => v != null);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    axes.push({ key: 'tech', name: '技術品質', score: avg, detail: `PSI ${psiMobile != null ? `モバイル${psiMobile}` : ''}${psiMobile != null && psiDesktop != null ? ' / ' : ''}${psiDesktop != null ? `PC${psiDesktop}` : ''}` });
  } else {
    axes.push({ key: 'tech', name: '技術品質', score: 0, detail: 'データなし' });
  }

  const contentScore = diagnosisData?.contentQuality?.score;
  axes.push({ key: 'content', name: 'コンテンツ充実度', score: contentScore ?? 0, detail: contentScore != null ? 'テキスト量・見出し構造' : 'データなし' });

  const seoScore = diagnosisData?.seo?.score;
  axes.push({ key: 'seo', name: '集客力', score: seoScore ?? 0, detail: seoScore != null ? 'SEO・メタ情報・構造' : 'データなし' });

  const engScore = diagnosisData?.engagement?.score;
  axes.push({ key: 'engagement', name: 'CV導線', score: engScore ?? 0, detail: engScore != null ? 'エンゲージメント・導線' : 'データなし' });

  const usabilityVals = [diagnosisData?.psi?.mobile?.accessibility, diagnosisData?.psi?.desktop?.accessibility, diagnosisData?.psi?.mobile?.bestPractices, diagnosisData?.psi?.desktop?.bestPractices].filter(v => v != null);
  if (usabilityVals.length > 0) {
    const avg = Math.round(usabilityVals.reduce((a, b) => a + b, 0) / usabilityVals.length);
    axes.push({ key: 'usability', name: 'ユーザビリティ', score: avg, detail: 'アクセシビリティ・ベストプラクティス' });
  } else {
    axes.push({ key: 'usability', name: 'ユーザビリティ', score: 0, detail: 'データなし' });
  }

  const total = improvements?.length || 0;
  const completed = improvements?.filter(i => i.status === 'completed').length || 0;
  const executionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  axes.push({ key: 'execution', name: '改善実行率', score: executionRate, detail: total > 0 ? `全${total}件中 完了${completed}件` : '改善案なし' });

  const weights = [0.2, 0.2, 0.15, 0.15, 0.15, 0.15];
  const overall = Math.round(axes.reduce((sum, ax, i) => sum + ax.score * weights[i], 0));
  return { overall, axes };
}

// 詳細パネルが展開可能な軸キー
const EXPANDABLE_KEYS = new Set(['tech', 'content', 'seo', 'engagement', 'usability']);

// 軸キー → tooltip定数キー
const AXIS_TOOLTIP_MAP = {
  tech: 'diagPerformance',
  content: 'diagContentQuality',
  seo: 'diagSeo',
  engagement: 'diagEngagement',
};

// ================= メインコンポーネント =================

export default function SiteImprovementScoreCard({ diagnosisData, improvements, onRunDiagnosis, isRunning }) {
  const [expandedKey, setExpandedKey] = useState(null);

  const { overall, axes } = useMemo(() => computeScores(diagnosisData, improvements), [diagnosisData, improvements]);

  const total = improvements?.length || 0;
  const completed = improvements?.filter(i => i.status === 'completed').length || 0;
  const inProgress = improvements?.filter(i => i.status === 'in_progress').length || 0;
  const draft = total - completed - inProgress;
  const donePercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const wipPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  const highPriorityPending = improvements?.filter(i => i.priority === 'high' && i.status !== 'completed').length || 0;
  const lowestAxis = axes.reduce((min, ax) => (ax.score < min.score ? ax : min), axes[0]);

  const message = useMemo(() => {
    if (total === 0) return 'まだ改善案がありません。「AI改善案を生成」から改善案を作成して、サイトの改善を始めましょう。';
    const parts = [`現在のスコアは **${overall}点** です。`];
    if (highPriorityPending > 0) {
      const potentialGain = Math.min(100 - overall, highPriorityPending * 5);
      parts.push(`優先度「高」の改善案 **${highPriorityPending}件** を実行すると、約 **${Math.min(100, overall + potentialGain)}点** に向上する見込みです。`);
    }
    if (lowestAxis && lowestAxis.score < 70) {
      parts.push(`特に **${lowestAxis.name}（${lowestAxis.score}点）** の改善が最もインパクトが大きい領域です。`);
    }
    return parts.join('');
  }, [overall, highPriorityPending, lowestAxis, total]);

  if (!diagnosisData && total === 0) return null;

  const diagnosedDate = diagnosisData?.diagnosedAt
    ? new Date(diagnosisData.diagnosedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const toggleSection = (key) => setExpandedKey(prev => prev === key ? null : key);

  const renderDetail = (key) => {
    switch (key) {
      case 'tech': return <TechQualityDetail data={diagnosisData} />;
      case 'content': return <ContentQualityDetail data={diagnosisData} />;
      case 'seo': return <SeoDetail data={diagnosisData} />;
      case 'engagement': return <EngagementDetail data={diagnosisData} />;
      case 'usability': return <UsabilityDetail data={diagnosisData} />;
      default: return null;
    }
  };

  return (
    <div className="mb-8 rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
      {/* ヘッダー */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-bold text-dark dark:text-white">
          <Activity className="h-5 w-5 text-body-color" />
          サイト改善スコア
          <Tooltip content={getTooltip('siteHealthScore')} />
        </div>
        <div className="flex items-center gap-3">
          {diagnosedDate && <span className="text-xs text-body-color">最終更新: {diagnosedDate}</span>}
          {onRunDiagnosis && (
            <button
              type="button"
              onClick={() => onRunDiagnosis()}
              disabled={isRunning}
              className="inline-flex items-center gap-1 rounded-md border border-stroke px-2.5 py-1.5 text-xs font-medium text-body-color transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3"
            >
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isRunning ? '診断中...' : '再診断'}
            </button>
          )}
        </div>
      </div>

      {/* ゲージ + 軸 */}
      <div className="flex gap-8 items-start">
        <div className="shrink-0"><ScoreGauge score={overall} /></div>
        <div className="flex-1 grid grid-cols-3 gap-2.5">
          {axes.map(ax => (
            <AxisItem
              key={ax.key}
              name={ax.name}
              score={ax.score}
              detail={ax.detail}
              isExpanded={expandedKey === ax.key}
              onClick={() => toggleSection(ax.key)}
              hasDetail={EXPANDABLE_KEYS.has(ax.key) && !!diagnosisData}
              tooltip={AXIS_TOOLTIP_MAP[ax.key] ? getTooltip(AXIS_TOOLTIP_MAP[ax.key]) : null}
            />
          ))}
        </div>
      </div>

      {/* 展開された詳細パネル */}
      {expandedKey && diagnosisData && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-white p-4 dark:border-primary/30 dark:bg-dark">
          {renderDetail(expandedKey)}
        </div>
      )}

      {/* メッセージ */}
      <div className="mt-4 rounded-lg border border-stroke bg-white px-4 py-3 text-sm text-body-color leading-relaxed dark:border-dark-3 dark:bg-dark">
        {message.split('**').map((part, i) =>
          i % 2 === 1 ? <strong key={i} className="text-dark dark:text-white">{part}</strong> : <span key={i}>{part}</span>
        )}
      </div>

      {/* 改善進捗バー */}
      {total > 0 && (
        <div className="mt-4 flex items-center gap-4 border-t border-dark-8 pt-4 dark:border-dark-3">
          <span className="text-sm font-semibold text-body-color whitespace-nowrap">改善進捗</span>
          <div className="flex-1">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-[#f1f5f9] dark:bg-dark-4">
              {donePercent > 0 && <div className="bg-secondary rounded-l-full" style={{ width: `${donePercent}%` }} />}
              {wipPercent > 0 && <div className="bg-primary" style={{ width: `${wipPercent}%` }} />}
            </div>
          </div>
          <div className="flex gap-3 text-xs text-body-color whitespace-nowrap">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-secondary" /> 完了 {completed}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> 対応中 {inProgress}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-dark-7" /> 起案 {draft}</span>
          </div>
        </div>
      )}
    </div>
  );
}
