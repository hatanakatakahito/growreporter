import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { useUserJourney } from '../../hooks/useUserJourney';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import JourneySankey from '../../components/Analysis/UserJourney/JourneySankey';
import { setPageTitle } from '../../utils/pageTitle';
import { PAGE_TYPES } from '../../constants/plans';
import { Search, Link as LinkIcon, FileText, X, ArrowRight, Sparkles, ChevronDown, Filter } from 'lucide-react';

/**
 * ユーザージャーニー分析画面
 *
 * 5層フロー: 流入元 → KW/参照元 → LP → 中間 → 結果
 * 構成:
 *   ① ジャーニー俯瞰マップ (サンキー) + ノード詳細パネル
 *   ② 主要ジャーニー TOP 3 (ストーリーカード)
 *   ③ 詳細パステーブル
 *   ④ メモ & AI 詳細分析タブ
 */
export default function UserJourney() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange;

  const [selectedNodeId, setSelectedNodeId] = useState('lp-seo-tips');
  const [storyCardSort, setStoryCardSort] = useState('sessions');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  useEffect(() => {
    setPageTitle('ユーザージャーニー');
  }, []);

  // admin チェック完了後、非 admin なら dashboard へリダイレクト
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  const { data, isLoading, isError, error } = useUserJourney(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    isComparing ? comparisonDateRange : null
  );

  const hasGSCConnection = !!(selectedSite?.gscSiteUrl && selectedSite?.gscOauthTokenId);

  const selectedNode = useMemo(() => {
    if (!data?.nodes) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [data, selectedNodeId]);

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const el = document.getElementById('ai-analysis-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // admin チェック中はローディング、非 admin は何も描画しない（リダイレクト発火中）
  if (adminLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <LoadingSpinner message="権限を確認中..." />
      </div>
    );
  }
  if (!isAdmin) return null;

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
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-dark dark:text-white">分析する - ユーザージャーニー</h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium">
                  プレビュー
                </span>
                {hasGSCConnection ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-medium">
                    <LinkIcon className="h-3 w-3" />
                    GSC 連携中
                  </span>
                ) : (
                  <Link
                    to={`/sites/${selectedSiteId}/edit?step=2`}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-700 px-2 py-0.5 text-[11px] font-medium hover:bg-rose-100"
                  >
                    GSC 未連携 - 連携する
                  </Link>
                )}
              </div>
              <p className="mt-0.5 text-sm text-body-color">流入から成果までの流れを俯瞰とストーリーの両面で把握できます</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
              <div className="relative">
                <select className="appearance-none rounded-md border border-stroke bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-dark hover:border-primary">
                  <option>入口の粒度: チャネル</option>
                  <option>入口の粒度: GSC キーワード</option>
                  <option>入口の粒度: 参照元ドメイン</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-body-color" />
              </div>
              <div className="relative">
                <select className="appearance-none rounded-md border border-stroke bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-dark hover:border-primary">
                  <option>表示: 上位ノードのみ</option>
                  <option>表示: 全ノード</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-body-color" />
              </div>
              <button className="flex items-center gap-1.5 rounded-md border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-dark hover:border-primary">
                <Filter className="h-3.5 w-3.5 text-body-color" />
                <span>絞り込み</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner message="ジャーニーデータを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert message={error?.message || 'データの読み込みに失敗しました。'} />
          ) : !data ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* ① 全体マップ + ノード詳細（横並び） */}
              <div className="flex gap-6 mb-6">
                {/* サンキー（左、フレックス） */}
                <div className="flex-1 min-w-0 rounded-lg border border-stroke bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-dark">ジャーニー俯瞰マップ</h3>
                    <div className="flex gap-3 text-[11px] text-body-color">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary"></span>流入</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#A78BFA' }}></span>LP</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-secondary"></span>中間</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span>CV</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-400"></span>離脱</span>
                    </div>
                  </div>
                  <JourneySankey
                    data={data}
                    selectedNodeId={selectedNodeId}
                    onNodeClick={(n) => setSelectedNodeId(n.id)}
                    height={480}
                  />
                  <p className="mt-3 text-xs text-center text-body-color">
                    ノードをクリックすると右パネルに詳細を表示
                  </p>
                </div>

                {/* ノード詳細パネル（右、コンパクト） */}
                <NodeDetailPanel node={selectedNode} onClear={() => setSelectedNodeId(null)} />
              </div>

              {/* ② 主要ジャーニー TOP 3 */}
              <StoryTop3 stories={data.storyTop3} sortBy={storyCardSort} onSortChange={setStoryCardSort} />

              {/* ③ 詳細パステーブル */}
              <DetailPathTable paths={data.detailPaths} />
            </>
          )}

          {/* ④ メモ & AI タブ */}
          {selectedSiteId && currentUser && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="analysis/user-journey"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="analysis/user-journey"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  !isLoading && data ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.USER_JOURNEY}
                      rawData={data}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
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

        {/* AI フローティングボタン */}
        {selectedSiteId && data && (
          <AIFloatingButton
            pageType={PAGE_TYPES.USER_JOURNEY}
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
      </main>
    </div>
  );
}

// ===== サブコンポーネント =====

function NodeDetailPanel({ node, onClear }) {
  if (!node) {
    return (
      <div className="w-[380px] shrink-0 rounded-lg border border-stroke bg-white p-6 self-start">
        <div className="text-xs text-body-color text-center py-8">
          サンキー図のノードをクリックすると詳細が表示されます
        </div>
      </div>
    );
  }

  return (
    <div className="w-[380px] shrink-0 rounded-lg border border-stroke bg-white p-6 self-start">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <span className="text-[11px] uppercase tracking-wide text-body-color font-medium">選択中のノード</span>
          <h3 className="text-lg font-semibold text-primary mt-0.5 truncate">{node.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-body-color mt-1">
            <FileText className="h-3.5 w-3.5" />
            <span>{getNodeTypeLabel(node.type)}</span>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-[11px] text-primary hover:underline shrink-0 inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          クリア
        </button>
      </div>

      {/* メトリクス 2x2 */}
      <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-stroke">
        <MetricCard label="通過セッション" value={node.value?.toLocaleString() || '-'} change={node.change} />
        <MetricCard label="シェア" value={node.share != null ? `${(node.share * 100).toFixed(1)}%` : '-'} />
        <MetricCard label="タイプ" value={getNodeTypeLabel(node.type)} />
        <MetricCard label="重要度" value="高" highlight />
      </div>

      <div className="text-xs text-body-color text-center">
        詳細メトリクス・GSC キーワード・次のページ TOP 5 は<br/>
        Phase 2 でバックエンド連携時に実装予定
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, highlight }) {
  return (
    <div className={`rounded-md p-2.5 ${highlight ? 'border-2 border-emerald-300 bg-emerald-50/30' : 'border border-stroke'}`}>
      <div className="text-[10px] text-body-color">{label}</div>
      <div className={`mt-0.5 text-base font-semibold ${highlight ? 'text-emerald-600' : 'text-dark'}`}>{value}</div>
      {change != null && change !== 0 && (
        <div className={`text-[10px] font-medium ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {change > 0 ? '▲' : '▼'} {Math.abs(Math.round(change * 100))}%
        </div>
      )}
    </div>
  );
}

function getNodeTypeLabel(type) {
  const labels = {
    source: '流入元',
    keyword: 'キーワード/参照元',
    lp: 'ランディングページ',
    middle: '中間ページ',
    cv: 'コンバージョン',
    exit: '離脱',
  };
  return labels[type] || type;
}

function StoryTop3({ stories, sortBy, onSortChange }) {
  if (!stories?.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-dark">主要ジャーニー TOP 3</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-body-color">並び順:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none rounded-md border border-stroke bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-dark hover:border-primary"
            >
              <option value="sessions">セッション数順</option>
              <option value="cvRate">CV 率順</option>
              <option value="improvement">改善余地順</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-body-color" />
          </div>
          <button className="text-xs text-primary hover:underline">すべて表示</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} />
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story }) {
  const isWarning = story.type === 'warning';
  const cardBorder = isWarning ? 'border-2 border-rose-200' : 'border border-stroke';
  const headerBg = isWarning
    ? 'bg-gradient-to-br from-rose-50/60 to-white border-rose-200'
    : story.type === 'success'
    ? 'bg-gradient-to-br from-emerald-50/60 to-white'
    : 'bg-gradient-to-br from-blue-50/60 to-white';
  const rankBg = isWarning ? 'bg-rose-500' : story.rank === 1 ? 'bg-emerald-500' : story.rank === 2 ? 'bg-rose-500' : 'bg-blue-500';
  const cvRateColor = isWarning ? 'text-rose-700' : 'text-emerald-700';
  const sourceChipBg = story.sourceType === 'organic'
    ? 'bg-blue-50 text-primary'
    : story.sourceType === 'paid'
    ? 'bg-purple-50 text-purple-700'
    : story.sourceType === 'sns'
    ? 'bg-amber-50 text-amber-700'
    : 'bg-gray-50 text-body-color';
  const sourceChipLabel = story.sourceType === 'organic'
    ? 'GSC:'
    : story.sourceType === 'paid'
    ? '広告KW:'
    : story.sourceType === 'sns'
    ? '参照元:'
    : 'KW:';

  return (
    <article className={`rounded-lg ${cardBorder} bg-white overflow-hidden hover:shadow-md transition-all`}>
      <div className={`border-b px-5 py-4 ${headerBg}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${rankBg} text-white font-bold text-sm`}>
            {story.rank}
          </span>
          <span className={`text-xs font-semibold rounded px-2 py-0.5 ${isWarning ? 'text-rose-700 bg-rose-100' : story.rank === 1 ? 'text-emerald-700 bg-emerald-100' : 'text-blue-700 bg-blue-100'}`}>
            {story.sharePct}%
          </span>
          <span className={`ml-auto text-xs font-semibold ${cvRateColor}`}>
            CV {story.cvRate}%
          </span>
        </div>
        <h4 className="text-base font-semibold text-dark">{story.title}</h4>
      </div>
      <div className="p-5 space-y-3">
        {/* キーワードチップ */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-body-color font-medium mr-0.5">{sourceChipLabel}</span>
          {story.keywords?.slice(0, 3).map((kw, i) => (
            <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sourceChipBg}`}>
              {kw}
            </span>
          ))}
          {story.additionalKwCount > 0 && (
            <span className="rounded-full bg-gray-50 text-body-color text-[11px] px-2 py-0.5">+{story.additionalKwCount}</span>
          )}
        </div>
        <p className="text-sm text-body-color leading-relaxed">{story.narrative}</p>

        <div className="rounded-md bg-purple-50/60 border border-purple-100 p-3 text-sm">
          <span className="font-semibold text-purple-700">AI:</span>
          <span className="text-dark"> {story.aiComment}</span>
        </div>

        <Link
          to={story.improvePath}
          className={`w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            isWarning
              ? 'bg-gradient-business text-white hover:opacity-90'
              : 'border border-stroke text-dark hover:border-primary hover:text-primary'
          }`}
          style={isWarning ? { background: 'linear-gradient(135deg, #f87171 0%, #ec4899 100%)' } : undefined}
        >
          改善する画面で深掘り
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

function DetailPathTable({ paths }) {
  if (!paths?.length) return null;

  return (
    <div className="rounded-lg border border-stroke bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark">詳細パスデータ</h3>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark hover:border-primary">
            列の表示
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark">#</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark">流入元</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark">ランディング</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark">中間</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark">結果</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark">セッション</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark">CV 率</th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark">前期比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {paths.map((p) => (
              <tr key={p.rank} className="hover:bg-blue-50/30 transition-colors">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-body-color">{p.rank}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <SourceBadge label={p.source} color={p.sourceColor} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-dark">{p.lp}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-dark">{p.middle || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {p.result === '離脱' ? (
                    <span className="text-body-color">{p.result}</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">{p.result}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono text-dark">{p.sessions.toLocaleString()}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-sm text-right font-semibold ${p.cvRate >= 5 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.cvRate}%</td>
                <td className={`whitespace-nowrap px-4 py-3 text-xs text-right ${p.change > 0 ? 'text-emerald-600' : p.change < 0 ? 'text-rose-600' : 'text-body-color'}`}>
                  {p.change > 0 ? '+' : ''}{Math.round(p.change * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceBadge({ label, color }) {
  const colorMap = {
    primary: 'bg-blue-50 text-primary',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${colorMap[color] || 'bg-gray-50 text-body-color'}`}>
      {label}
    </span>
  );
}
