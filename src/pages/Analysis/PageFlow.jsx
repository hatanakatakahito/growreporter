import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSearchParams } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { TrendingUp, TrendingDown, ExternalLink, ArrowRight, MousePointerClick, Search, BarChart3, Lightbulb } from 'lucide-react';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ページフロー画面
 * 特定ページを閲覧する直前に、ユーザーがサイト内のどのページを見ていたかを分析
 */

export default function PageFlow() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedPageOption, setSelectedPageOption] = useState(null);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  // AI分析タブへスクロールする関数
  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ページフロー');
  }, []);

  // URL パラメータからページを復元
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setSelectedPage(pageParam);
      setSelectedPageOption({ value: pageParam, label: pageParam });
    }
  }, [searchParams]);

  // ページパス一覧を取得（ReverseFlowと同じ実装）
  const {
    data: pagePathsData,
    isLoading: pagePathsLoading,
    error: pagePathsError,
  } = useQuery({
    queryKey: ['ga4-page-paths', selectedSiteId, dateRange],
    queryFn: async () => {
      const formatDate = (date) => {
        if (typeof date === 'string') return date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const fetchPagePaths = httpsCallable(functions, 'fetchGA4PagePaths');
      const result = await fetchPagePaths({
        siteId: selectedSiteId,
        startDate: formatDate(dateRange.from),
        endDate: formatDate(dateRange.to),
      });

      return result.data?.data || [];
    },
    enabled: !!selectedSiteId && !!dateRange?.from && !!dateRange?.to,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // React Select用のオプション
  const pagePathOptions = useMemo(() => {
    if (!pagePathsData || pagePathsData.length === 0) {
      return [];
    }
    return pagePathsData.map(item => {
      // 新しい形式（{ path, title }）と古い形式（文字列）の両方に対応
      if (typeof item === 'string') {
        return {
          value: item,
          label: item,
          title: item,
        };
      }
      return {
        value: item.path,
        label: item.path,
        title: item.title,
      };
    });
  }, [pagePathsData]);

  // ページフローデータ取得
  const {
    data: transitionData,
    isLoading: transitionLoading,
    isError: transitionError,
    error: transitionErrorMessage,
  } = useQuery({
    queryKey: ['ga4-page-transition', selectedSiteId, selectedPage, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      if (!selectedSiteId || !selectedPage) return null;
      
      const formatDate = (date) => {
        if (typeof date === 'string') return date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const fetchPageTransition = httpsCallable(functions, 'fetchGA4PageTransition');
      const result = await fetchPageTransition({
        siteId: selectedSiteId,
        pagePath: selectedPage,
        startDate: formatDate(dateRange.from),
        endDate: formatDate(dateRange.to),
        dimensionFilter: ga4DimensionFilter,
      });
      
      return result.data;
    },
    enabled: !!selectedSiteId && !!selectedPage && !!dateRange?.from && !!dateRange?.to,
    retry: false,
  });

  // ページ選択ハンドラー
  const handlePageSelect = (option) => {
    if (!option) {
      setSelectedPage('');
      setSelectedPageOption(null);
      setSearchParams({});
      return;
    }
    
    const pagePath = option.value;
    setSelectedPage(pagePath);
    setSelectedPageOption(option);
    setSearchParams({ page: pagePath });
  };

  // 数値フォーマット
  const formatNumber = (num) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(num));
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={false}
          hideComparison={true}
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-3 sm:px-6 py-6 sm:py-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark dark:text-white">
                ページフロー
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                特定ページを閲覧する直前に、ユーザーがサイト内のどのページを見ていたかを分析
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
              <DimensionFilters
                siteId={selectedSiteId}
                startDate={dateRange.from}
                endDate={dateRange.to}
                filters={dimensionFilters}
                onFiltersChange={setDimensionFilters}
              />
            </div>
          </div>

          {/* ページ選択カード */}
          <div className="mb-8 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
            <div className="border-b border-stroke p-6 dark:border-dark-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">分析対象ページ</h3>
            </div>
            
            <div className="p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  ページパス
                </label>
                <CreatableSelect
                  value={selectedPageOption}
                  onChange={handlePageSelect}
                  options={pagePathOptions}
                  isLoading={pagePathsLoading}
                  isSearchable={true}
                  isClearable={true}
                  menuPortalTarget={document.body}
                  placeholder="ページパスを選択または入力..."
                  noOptionsMessage={() => 'ページパスが見つかりません'}
                  loadingMessage={() => '読み込み中...'}
                  formatCreateLabel={(inputValue) => `"${inputValue}" を使用`}
                  formatOptionLabel={(option) => (
                    <div className="py-1">
                      <div className="font-medium text-dark dark:text-white">{option.label}</div>
                      {option.title && option.title !== option.label && (
                        <div className="text-xs text-body-color mt-0.5">{option.title}</div>
                      )}
                    </div>
                  )}
                  classNames={{
                    control: () => 'w-full rounded-md border border-stroke bg-transparent px-2 py-1 text-dark dark:border-dark-3 dark:text-white',
                    menu: () => 'mt-2 rounded-md border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2',
                    option: ({ isFocused, isSelected }) =>
                      `px-4 py-2 cursor-pointer ${
                        isSelected ? 'bg-primary text-white' :
                        isFocused ? 'bg-gray-100 dark:bg-dark-3' : ''
                      }`,
                    placeholder: () => 'text-body-color',
                    input: () => 'text-dark dark:text-white',
                    singleValue: () => 'text-dark dark:text-white',
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: state.isFocused ? '#3C50E0' : '#E5E7EB',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#3C50E0',
                      },
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                />
                {!pagePathsLoading && pagePathOptions.length > 0 && (
                  <p className="mt-1 text-xs text-body-color">
                    {pagePathOptions.length} 件のページパスが見つかりました
                  </p>
                )}
                {!pagePathsLoading && pagePathOptions.length === 0 && !pagePathsError && (
                  <p className="mt-1 text-xs text-body-color">
                    候補から選択するか、カスタムパスを入力できます
                  </p>
                )}
                {pagePathsError && (
                  <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                    <p className="text-xs text-red-800 dark:text-red-300">
                      ページパスの取得に失敗しました。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 未選択時のガイド */}
          {!selectedPage && (
            <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
              <div className="border-b border-stroke p-6 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">ページフローとは？</h3>
              </div>
              <div className="p-6">
                <p className="mb-6 text-sm leading-relaxed text-body-color">
                  ユーザーが特定のページにたどり着く前に、サイト内のどのページを見ていたかを可視化する機能です。
                  上のセレクトボックスから分析したいページを選択してください。
                </p>

                {/* 活用シーン */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
                    <MousePointerClick className="mb-2 h-6 w-6 text-primary" />
                    <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">CVページの流入元を把握</h4>
                    <p className="text-xs leading-relaxed text-body-color">
                      お問い合わせや資料請求ページの直前にどのページが見られているかを分析し、コンバージョンに貢献するコンテンツを特定できます。
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/10">
                    <Search className="mb-2 h-6 w-6 text-secondary" />
                    <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">導線のボトルネック発見</h4>
                    <p className="text-xs leading-relaxed text-body-color">
                      想定している導線と実際のユーザー行動を比較して、サイト内導線の改善ポイントを見つけることができます。
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/10">
                    <Lightbulb className="mb-2 h-6 w-6 text-purple-500" />
                    <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">コンテンツ改善のヒント</h4>
                    <p className="text-xs leading-relaxed text-body-color">
                      ユーザーがどのような情報を経てから特定のページに到達しているかを知り、コンテンツの改善に活かせます。
                    </p>
                  </div>
                </div>

                {/* 使い方の例 */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-dark-3">
                  <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">使い方の例</h4>
                  <ul className="space-y-2 text-xs leading-relaxed text-body-color">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>お問い合わせページ（/contact）を選択 → 直前にどのサービスページが見られているか確認</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>料金ページ（/pricing）を選択 → ユーザーが料金を見る前に何に興味を持ったか分析</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>離脱率の高いページを選択 → そのページへの導線に問題がないか検証</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* データ表示 */}
          {selectedPage && (
            <div className="space-y-8">
              {transitionLoading ? (
                <LoadingSpinner message="ページフローデータを読み込んでいます..." />
              ) : transitionError ? (
                <ErrorAlert message={transitionErrorMessage?.message || 'データの読み込みに失敗しました。'} />
              ) : transitionData ? (
                <>
                  {/* ページ概要 */}
                  <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-body-color">このページの合計ページビュー</div>
                        <div className="mt-1 text-3xl font-bold text-dark dark:text-white">
                          {formatNumber(transitionData?.metrics?.pageViews || 0)}
                        </div>
                      </div>
                      {transitionData?.trafficBreakdown?.internal && (
                        <div className="text-right">
                          <div className="text-sm text-body-color">サイト内遷移</div>
                          <div className="mt-1 text-2xl font-bold text-primary">
                            {formatNumber(transitionData.trafficBreakdown.internal.count || 0)}
                          </div>
                          <div className="text-xs text-body-color">
                            （{transitionData.trafficBreakdown.internal.percentage || 0}%）
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* サイト内の直前ページ */}
                  {transitionData?.inbound && transitionData.inbound.length > 0 && (
                    <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                      <div className="border-b border-stroke p-6 dark:border-dark-3">
                        <h3 className="text-lg font-semibold text-dark dark:text-white">
                          サイト内の直前ページ (Top 20)
                        </h3>
                        <div className="mt-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            このページ（<strong>{formatNumber(transitionData?.metrics?.pageViews || 0)}PV</strong>）のうち、
                            サイト内を経由したページビューは <strong>{formatNumber(transitionData?.trafficBreakdown?.internal?.count || 0)}PV
                            （{transitionData?.trafficBreakdown?.internal?.percentage || 0}%）</strong>です。
                          </p>
                          <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">
                            残りの {formatNumber((transitionData?.trafficBreakdown?.external?.count || 0) + (transitionData?.trafficBreakdown?.direct?.count || 0))}PV は、
                            外部サイト（Google検索、SNS等）やブックマークから直接アクセスされているため、
                            サイト内の直前ページは存在しません。
                          </p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="border-b border-stroke dark:border-dark-3">
                            <tr>
                              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-dark dark:text-white">
                                直前に閲覧していたページ
                              </th>
                              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
                                ページビュー
                              </th>
                              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
                                割合*
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {transitionData.inbound.map((item, index) => (
                              <tr key={index} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-dark dark:text-white">
                                  {item?.page || '-'}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark dark:text-white">
                                  {formatNumber(item?.pageViews || 0)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-body-color">
                                  {(item?.percentage || 0).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-primary-mid/30 bg-gradient-to-r from-primary-blue/5 to-primary-purple/5 font-semibold">
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-dark dark:text-white">合計</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark dark:text-white">
                                {formatNumber(transitionData.inbound.reduce((sum, item) => sum + (item?.pageViews || 0), 0))}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark dark:text-white">
                                {transitionData.inbound.reduce((sum, item) => sum + (item?.percentage || 0), 0).toFixed(1)}%
                              </td>
                            </tr>
                            <tr>
                              <td colSpan="3" className="px-4 py-3">
                                <p className="text-xs text-body-color">
                                  * サイト内遷移（{formatNumber(transitionData?.trafficBreakdown?.internal?.count || 0)}PV）に対する割合
                                </p>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* メモ & AI分析タブ（ページ選択済みの場合のみ表示） */}
          {currentUser && selectedSiteId && selectedPage && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="page-flow"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="page-flow"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  selectedPage && !transitionLoading && transitionData ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.PAGE_FLOW}
                      rawData={transitionData}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {!selectedPage ? 'ページを選択してください。' : 'データを読み込み中...'}
                    </div>
                  )
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && selectedPage && !transitionLoading && transitionData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.PAGE_FLOW}
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

