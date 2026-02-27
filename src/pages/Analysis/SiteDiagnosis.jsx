import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useSiteDiagnosis } from '../../hooks/useSiteDiagnosis';
import { usePlan } from '../../hooks/usePlan';
import { useGA4Data } from '../../hooks/useGA4Data';
import { isUnlimited } from '../../constants/plans';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import {
  Shield, Zap, Search, FileText, Users, Monitor, Smartphone,
  AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, Info, ExternalLink,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Tooltip from '../../components/common/Tooltip';
import { getTooltip } from '../../constants/tooltips';

// コンテンツ品質の問題種別 → 参考リンク
const ISSUE_REFERENCE_LINKS = {
  'タイトルがない、または短すぎる': {
    url: 'https://developers.google.com/search/docs/appearance/title-link',
    label: 'Google: タイトルリンクの仕組み',
  },
  'meta descriptionがない、または短すぎる': {
    url: 'https://developers.google.com/search/docs/appearance/snippet',
    label: 'Google: スニペットの管理',
  },
  '画像の50%以上にalt属性がない': {
    url: 'https://web.dev/learn/accessibility/images',
    label: 'web.dev: 画像のアクセシビリティ',
  },
  'h1タグがない': {
    url: 'https://web.dev/learn/html/headings-and-sections',
    label: 'web.dev: 見出しとセクション',
  },
  'h1タグが複数ある': {
    url: 'https://web.dev/learn/html/headings-and-sections',
    label: 'web.dev: 見出しとセクション',
  },
  'h2タグがない': {
    url: 'https://web.dev/learn/html/headings-and-sections',
    label: 'web.dev: 見出しとセクション',
  },
  '本文テキストが少ない（500文字未満）': {
    url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    label: 'Google: 有用なコンテンツの作成',
  },
  'コンテンツ品質スコアが低い（50点未満）': {
    url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    label: 'Google: 有用なコンテンツの作成',
  },
  '高アクセスだがエンゲージメント率が低い（30%未満）': {
    url: 'https://support.google.com/analytics/answer/12195621',
    label: 'GA4: エンゲージメント率',
  },
  '流入が多いが直帰率が高い（70%以上）': {
    url: 'https://support.google.com/analytics/answer/12195621',
    label: 'GA4: エンゲージメント率',
  },
};

// Lighthouse準拠のスコア色
function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 80) return '良好';
  if (score >= 50) return '要改善';
  return '要対策';
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

// 円形スコアゲージ
function ScoreGauge({ score, size = 120, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none"
          className="dark:stroke-dark-4"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text
          x={size / 2} y={size / 2 + 2}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.25} fontWeight="bold"
          className="fill-dark dark:fill-white"
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="mt-1 text-xs font-medium text-body-color">{label}</span>
      )}
    </div>
  );
}

// カテゴリスコアカード
function CategoryScoreCard({ title, score, icon: Icon, available = true, tooltip }) {
  const color = available ? getScoreColor(score) : '#9ca3af';

  return (
    <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5" style={{ color }} />
        <span className="text-sm font-medium text-dark dark:text-white">{title}</span>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      {available ? (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="mb-1 text-xs text-body-color">/ 100</span>
        </div>
      ) : (
        <span className="text-sm text-body-color">データなし</span>
      )}
      {available && (
        <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium"
          style={{ color, backgroundColor: `${color}15` }}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}

export default function SiteDiagnosis() {
  const { selectedSiteId, dateRange } = useSite();
  const { data, isLoading, runDiagnosis, isRunning, runError } = useSiteDiagnosis(selectedSiteId);
  const { plan, checkCanGenerate, getRemainingByType, getUsedByType } = usePlan();
  const [deviceTab, setDeviceTab] = useState('mobile');
  const [expandedIssues, setExpandedIssues] = useState({});

  // ダッシュボード/全体サマリーと同じ方法でエンゲージメント率を取得
  const { data: ga4EngData } = useGA4Data(
    selectedSiteId,
    dateRange?.from,
    dateRange?.to,
    ['engagementRate'],
    [],
  );
  const ga4EngagementRate = ga4EngData?.metrics?.engagementRate;

  useEffect(() => {
    setPageTitle('サイト診断');
  }, []);

  useEffect(() => {
    if (runError) {
      const msg = runError?.message || 'サイト診断でエラーが発生しました';
      toast.error(msg);
    }
  }, [runError]);

  const handleRunDiagnosis = (forceRefresh = false) => {
    if (!checkCanGenerate('diagnosis')) {
      toast.error('今月のサイト診断の利用回数上限に達しました');
      return;
    }
    runDiagnosis({ forceRefresh });
  };

  const remaining = getRemainingByType('diagnosis');
  const used = getUsedByType('diagnosis');
  const limit = plan.features?.diagnosisMonthly || 0;
  const unlimited = isUnlimited(limit);

  // フロントエンドGA4データからエンゲージメントスコアを計算
  const engagementFromGA4 = ga4EngagementRate != null ? (() => {
    const rate = ga4EngagementRate;
    let score = 0;
    if (rate >= 0.8) score = 100;
    else if (rate >= 0.7) score = 85;
    else if (rate >= 0.6) score = 70;
    else if (rate >= 0.5) score = 55;
    else if (rate >= 0.4) score = 40;
    else if (rate >= 0.25) score = 25;
    else score = 10;
    return { available: true, score, metrics: { avgEngagementRate: rate } };
  })() : null;

  // エンゲージメント: フロントエンドGA4データ優先、なければバックエンド診断データ
  const engagementData = engagementFromGA4 || data?.engagement;

  const psiData = data?.psi?.[deviceTab];

  return (
    <div className="flex h-full flex-col">
      <AnalysisHeader showDateRange={false} showSiteInfo={false} showExport={false} />

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        <div className="mx-auto max-w-content px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">分析する - サイト診断</h2>
            <p className="text-sm text-body-color">
              サイトのパフォーマンス・SEO・コンテンツ品質・エンゲージメントを総合診断します
            </p>
          </div>
          {data && !isRunning && (
            <button
              onClick={() => handleRunDiagnosis(true)}
              disabled={isRunning || !checkCanGenerate('diagnosis')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              再診断する
            </button>
          )}
        </div>

        {/* 状態A: データなし → 開始画面 */}
        {!data && !isLoading && !isRunning && (
          <div className="mx-auto max-w-lg rounded-lg border border-stroke bg-white p-8 text-center dark:border-dark-3 dark:bg-dark-2">
            <Shield className="mx-auto mb-4 h-16 w-16 text-primary opacity-60" />
            <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
              サイト診断を実行しましょう
            </h3>
            <p className="mb-4 text-sm text-body-color">
              PageSpeed Insightsとアプリのデータを組み合わせて、サイトの健全度を総合的に診断します。
            </p>
            <p className="mb-6 text-xs text-body-color">
              {unlimited ? '無制限' : `今月の残り回数: ${remaining}回 (${used}/${limit}回使用済み)`}
            </p>
            <button
              onClick={handleRunDiagnosis}
              disabled={!checkCanGenerate('diagnosis')}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              診断を開始する
            </button>
          </div>
        )}

        {/* 状態B: ロード中 / 実行中 */}
        {(isLoading || isRunning) && (
          <div className="mx-auto max-w-lg rounded-lg border border-stroke bg-white p-8 text-center dark:border-dark-3 dark:bg-dark-2">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-sm font-medium text-dark dark:text-white">
              {isRunning ? 'サイト診断を実行中... 約30秒お待ちください' : 'データを読み込み中...'}
            </p>
          </div>
        )}

        {/* 状態C: 結果あり */}
        {data && !isRunning && (
          <div className="space-y-6">
            {/* ① 総合スコア */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
                <ScoreGauge score={data.overallScore} size={140} strokeWidth={10} />
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-dark dark:text-white">サイト健全度スコア</h3>
                    <Tooltip content={getTooltip('siteHealthScore')} />
                  </div>
                  <p className="mt-1 text-sm text-body-color">
                    パフォーマンス・SEO・コンテンツ品質・エンゲージメントの総合評価
                  </p>
                  <p className="mt-2 text-xs text-body-color">
                    診断日時: {new Date(data.diagnosedAt).toLocaleString('ja-JP')}
                    {data.fromCache && ' (キャッシュ)'}
                  </p>
                </div>
              </div>
            </div>

            {/* ② カテゴリスコア 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              <CategoryScoreCard
                title="パフォーマンス"
                score={data.psi?.mobile?.performance ?? data.psi?.desktop?.performance ?? 0}
                icon={Zap}
                tooltip={getTooltip('diagPerformance')}
              />
              <CategoryScoreCard
                title="SEO"
                score={data.seo?.score ?? 0}
                icon={Search}
                tooltip={getTooltip('diagSeo')}
              />
              <CategoryScoreCard
                title="コンテンツ品質"
                score={data.contentQuality?.score ?? 0}
                icon={FileText}
                available={data.contentQuality?.available}
                tooltip={getTooltip('diagContentQuality')}
              />
              <CategoryScoreCard
                title="エンゲージメント"
                score={engagementData?.score ?? 0}
                icon={Users}
                available={engagementData?.available}
                tooltip={getTooltip('diagEngagement')}
              />
            </div>

            {/* ③ Core Web Vitals */}
            {(data.psi?.mobile || data.psi?.desktop) && (
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-dark dark:text-white">Core Web Vitals</h3>
                  <div className="flex rounded-lg border border-stroke dark:border-dark-3">
                    <button
                      onClick={() => setDeviceTab('mobile')}
                      className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-xs font-medium transition ${
                        deviceTab === 'mobile'
                          ? 'bg-primary text-white'
                          : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" /> モバイル
                    </button>
                    <button
                      onClick={() => setDeviceTab('desktop')}
                      className={`flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-xs font-medium transition ${
                        deviceTab === 'desktop'
                          ? 'bg-primary text-white'
                          : 'text-body-color hover:bg-gray-50 dark:hover:bg-dark-3'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" /> デスクトップ
                    </button>
                  </div>
                </div>

                {psiData?.cwv ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(psiData.cwv).map(([key, metric]) => (
                      <div key={key} className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                        <div className="mb-1 flex items-center gap-1">
                          <span className="text-xs font-medium uppercase text-body-color">{key.toUpperCase()}</span>
                          {getTooltip(key) && <Tooltip content={getTooltip(key)} />}
                        </div>
                        <div className="text-lg font-bold text-dark dark:text-white">
                          {metric.value !== null ? `${metric.value}${metric.unit}` : '-'}
                        </div>
                        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getRatingColor(metric.rating)}`}>
                          {getRatingLabel(metric.rating)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-body-color">このデバイスのデータは取得できませんでした</p>
                )}
              </div>
            )}

            {/* ④ Lighthouse詳細（失敗Audit一覧） */}
            {psiData?.topAudits?.length > 0 && (
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">
                  改善が必要な項目（{deviceTab === 'mobile' ? 'モバイル' : 'デスクトップ'}）
                </h3>
                <div className="space-y-3">
                  {psiData.topAudits.map((audit, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-stroke p-3 dark:border-dark-3">
                      {audit.score !== null && audit.score < 0.5 ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark dark:text-white">{audit.title}</span>
                          {audit.displayValue && (
                            <span className="shrink-0 text-xs text-body-color">{audit.displayValue}</span>
                          )}
                        </div>
                        {audit.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-body-color line-clamp-2">
                            {audit.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ⑤ コンテンツ品質詳細 */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">コンテンツ品質</h3>
              {data.contentQuality?.available ? (
                <div>
                  <div className="mb-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-dark dark:text-white">{data.contentQuality.score}</div>
                      <div className="text-xs text-body-color">平均スコア</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-dark dark:text-white">{data.contentQuality.totalPages}</div>
                      <div className="text-xs text-body-color">分析ページ数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">{data.contentQuality.problematicPages}</div>
                      <div className="text-xs text-body-color">問題ページ数</div>
                    </div>
                  </div>

                  {data.contentQuality.topIssues?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-dark dark:text-white">問題種別ランキング</h4>
                      <div className="space-y-1.5">
                        {data.contentQuality.topIssues.map((item, i) => {
                          const ref = ISSUE_REFERENCE_LINKS[item.issue];
                          const isExpanded = expandedIssues[i];
                          return (
                            <div key={i} className="overflow-hidden rounded border border-stroke dark:border-dark-3">
                              <button
                                onClick={() => setExpandedIssues(prev => ({ ...prev, [i]: !prev[i] }))}
                                className="flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-dark-3"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-body-color transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                  <span className="text-left text-dark dark:text-white">{item.issue}</span>
                                  {ref && (
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={ref.label}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <span className="shrink-0 text-xs font-medium text-red-500">{item.count}ページ</span>
                              </button>
                              {isExpanded && item.pages?.length > 0 && (
                                <div className="border-t border-stroke bg-gray-50 px-3 py-2 dark:border-dark-3 dark:bg-dark-3">
                                  <div className="max-h-48 space-y-1 overflow-y-auto">
                                    {item.pages.map((pagePath, j) => {
                                      const baseUrl = (data.siteUrl || '').replace(/\/+$/, '');
                                      const fullUrl = pagePath.startsWith('http') ? pagePath : `${baseUrl}${pagePath || '/'}`;
                                      return (
                                        <a
                                          key={j}
                                          href={fullUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 truncate text-xs text-primary hover:underline"
                                        >
                                          <ExternalLink className="h-3 w-3 shrink-0" />
                                          {pagePath || '/'}
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

                  {data.contentQuality.topPageDetails && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-dark dark:text-white">トップページの詳細</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                          <span className="text-body-color">テキスト量: </span>
                          <span className="font-medium text-dark dark:text-white">{data.contentQuality.topPageDetails.textLength.toLocaleString()}文字</span>
                        </div>
                        <div className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                          <span className="text-body-color">見出し: </span>
                          <span className="font-medium text-dark dark:text-white">
                            h1:{data.contentQuality.topPageDetails.headingStructure?.h1 || 0}
                            {' '}h2:{data.contentQuality.topPageDetails.headingStructure?.h2 || 0}
                            {' '}h3:{data.contentQuality.topPageDetails.headingStructure?.h3 || 0}
                          </span>
                        </div>
                        <div className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                          <span className="text-body-color">画像alt: </span>
                          <span className="font-medium text-dark dark:text-white">
                            {data.contentQuality.topPageDetails.imagesWithAlt}
                            /{data.contentQuality.topPageDetails.imagesWithAlt + data.contentQuality.topPageDetails.imagesWithoutAlt}
                          </span>
                        </div>
                        <div className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                          <span className="text-body-color">title: </span>
                          <span className="font-medium text-dark dark:text-white">
                            {data.contentQuality.topPageDetails.titleLength}文字
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-dark-3">
                  <Info className="mx-auto mb-2 h-8 w-8 text-body-color" />
                  <p className="text-sm text-body-color">
                    コンテンツ品質データがありません。「サイト管理」からスクレイピングを実行してください。
                  </p>
                </div>
              )}
            </div>

            {/* ⑥ SEO詳細 */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">SEO</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-body-color">PSI SEOスコア（モバイル）<Tooltip content={getTooltip('psiSeoMobile')} /></div>
                    <div className="text-xl font-bold" style={{ color: getScoreColor(data.seo?.psiSeoScore?.mobile || 0) }}>
                      {data.seo?.psiSeoScore?.mobile ?? '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-body-color">PSI SEOスコア（デスクトップ）<Tooltip content={getTooltip('psiSeoDesktop')} /></div>
                    <div className="text-xl font-bold" style={{ color: getScoreColor(data.seo?.psiSeoScore?.desktop || 0) }}>
                      {data.seo?.psiSeoScore?.desktop ?? '-'}
                    </div>
                  </div>
                </div>

                {data.seo?.metaAnalysis && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-dark dark:text-white">メタタグ分析</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-dark-3">
                        {data.seo.metaAnalysis.titleOptimal ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-dark dark:text-white">
                          title: {data.seo.metaAnalysis.titleLength}文字
                          {data.seo.metaAnalysis.titleOptimal ? '' : ' (推奨: 30-60文字)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-dark-3">
                        {data.seo.metaAnalysis.descOptimal ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-dark dark:text-white">
                          description: {data.seo.metaAnalysis.descLength}文字
                          {data.seo.metaAnalysis.descOptimal ? '' : ' (推奨: 50-160文字)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {data.seo?.gscConnected && data.seo?.gscMetrics ? (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-dark dark:text-white">Google Search Console</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div className="rounded border border-stroke px-3 py-2 text-center dark:border-dark-3">
                        <div className="text-lg font-bold text-dark dark:text-white">{data.seo.gscMetrics.avgPosition}</div>
                        <div className="text-xs text-body-color">平均順位</div>
                      </div>
                      <div className="rounded border border-stroke px-3 py-2 text-center dark:border-dark-3">
                        <div className="text-lg font-bold text-dark dark:text-white">{data.seo.gscMetrics.totalClicks?.toLocaleString()}</div>
                        <div className="text-xs text-body-color">クリック</div>
                      </div>
                      <div className="rounded border border-stroke px-3 py-2 text-center dark:border-dark-3">
                        <div className="text-lg font-bold text-dark dark:text-white">{data.seo.gscMetrics.totalImpressions?.toLocaleString()}</div>
                        <div className="text-xs text-body-color">表示回数</div>
                      </div>
                      <div className="rounded border border-stroke px-3 py-2 text-center dark:border-dark-3">
                        <div className="text-lg font-bold text-dark dark:text-white">{(data.seo.gscMetrics.avgCtr * 100).toFixed(1)}%</div>
                        <div className="text-xs text-body-color">CTR</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-dark-3">
                    <p className="text-xs text-body-color">
                      Google Search Consoleが接続されていません。接続するとSEO分析の精度が向上します。
                    </p>
                  </div>
                )}

                {data.seo?.issues?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-dark dark:text-white">SEOの問題点</h4>
                    <ul className="space-y-1">
                      {data.seo.issues.map((issue, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-body-color">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ⑦ エンゲージメント詳細 */}
            <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
              <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">エンゲージメント</h3>
              {engagementData?.available ? (
                <div>
                  <div className="mb-4">
                    <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
                      <div className="text-2xl font-bold text-dark dark:text-white">
                        {(engagementData.metrics.avgEngagementRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-body-color">平均エンゲージメント率</div>
                    </div>
                  </div>

                  {data.engagement?.lowEngagementPages?.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-dark dark:text-white">低エンゲージメントページ Top 5</h4>
                      <div className="space-y-1.5">
                        {data.engagement.lowEngagementPages.map((page, i) => (
                          <div key={i} className="flex items-center justify-between rounded border border-stroke px-3 py-2 text-sm dark:border-dark-3">
                            <span className="truncate text-dark dark:text-white">{page.path}</span>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-xs text-body-color">{page.pageViews?.toLocaleString()} PV</span>
                              <span className="text-xs font-medium text-amber-500">
                                {(page.engagementRate * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-dark-3">
                  <Info className="mx-auto mb-2 h-8 w-8 text-body-color" />
                  <p className="text-sm text-body-color">
                    エンゲージメントデータがありません。GA4データが蓄積されると表示されます。
                  </p>
                </div>
              )}
            </div>

            {/* ⑧ フッター（使用状況） */}
            <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
              <p className="text-xs text-body-color">
                {plan.displayName}: 今月 {unlimited ? '無制限' : `${used}/${limit}回使用済み`}
              </p>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
