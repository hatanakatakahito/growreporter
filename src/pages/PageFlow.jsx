import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../utils/pageTitle';
import { useSearchParams } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { useSite } from '../contexts/SiteContext';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import Sidebar from '../components/Layout/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { TrendingUp, TrendingDown, ExternalLink, ArrowRight } from 'lucide-react';
import AIFloatingButton from '../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../constants/plans';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import SankeyMock3 from '../components/PageFlow/SankeyMock3';

/**
 * ページフロー画面
 * 特定ページを閲覧する直前に、ユーザーがサイト内のどのページを見ていたかを分析
 */

export default function PageFlow() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedPageOption, setSelectedPageOption] = useState(null);
  const [activeTab, setActiveTab] = useState('chart');

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

  // ページパス一覧を取得
  const {
    data: pagePathsData,
    isLoading: pagePathsLoading,
    error: pagePathsError,
  } = useQuery({
    queryKey: ['ga4-page-paths', selectedSiteId, dateRange],
    queryFn: async () => {
      console.log('[PageFlow] queryFn実行開始', { selectedSiteId, dateRange });
      
      if (!selectedSiteId || !dateRange.from || !dateRange.to) {
        console.log('[PageFlow] 条件不足で空配列を返す');
        return [];
      }
      
      const formatDate = (date) => {
        if (typeof date === 'string') return date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      try {
        console.log('[PageFlow] API呼び出し開始');
        const fetchPagePaths = httpsCallable(functions, 'fetchGA4PagePaths');
        const result = await fetchPagePaths({
          siteId: selectedSiteId,
          startDate: formatDate(dateRange.from),
          endDate: formatDate(dateRange.to),
        });
        
        console.log('[PageFlow] ページパス取得結果:', result.data);
        console.log('[PageFlow] パース済みページパス数:', result.data.data?.length);
        return result.data.data || [];
      } catch (error) {
        console.error('[PageFlow] ページパス取得エラー:', error);
        console.error('[PageFlow] エラー詳細:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw error;
      }
    },
    enabled: !!selectedSiteId && !!dateRange?.from && !!dateRange?.to,
    retry: false,
  });

  // React Select用のオプション
  const pagePathOptions = useMemo(() => {
    console.log('[PageFlow] pagePathsData:', pagePathsData);
    console.log('[PageFlow] pagePathsData length:', pagePathsData?.length);
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

  // デバッグログ
  useEffect(() => {
    console.log('[PageFlow] 状態確認:', {
      selectedSiteId,
      dateRange,
      pagePathsLoading,
      pagePathsError,
      pagePathsDataLength: pagePathsData?.length,
      pagePathOptionsLength: pagePathOptions?.length,
    });
  }, [selectedSiteId, dateRange, pagePathsLoading, pagePathsError, pagePathsData, pagePathOptions]);

  // ページフローデータ取得
  const {
    data: transitionData,
    isLoading: transitionLoading,
    isError: transitionError,
    error: transitionErrorMessage,
  } = useQuery({
    queryKey: ['ga4-page-transition', selectedSiteId, selectedPage, dateRange.from, dateRange.to],
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
    <>
      <Sidebar />
      <main className="ml-64 flex-1 bg-gray-50 dark:bg-dark">
        {/* ヘッダー */}
        <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={true}
        />

        {/* コンテンツ */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              ページフロー
            </h2>
            <p className="text-body-color">
              特定ページを閲覧する直前に、ユーザーがサイト内のどのページを見ていたかを分析
            </p>
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
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: '#e5e7eb',
                      '&:hover': {
                        borderColor: '#3b82f6',
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                    option: (base) => ({
                      ...base,
                      padding: '8px 12px',
                    }),
                  }}
                />
                <p className="mt-1 text-xs text-body-color">
                  候補から選択するか、カスタムパスを入力できます
                </p>
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
                    <div className="mb-4">
                      <div className="text-sm font-medium text-body-color">このページの合計ページビュー</div>
                      <div className="mt-1 text-4xl font-bold text-dark dark:text-white">
                        {formatNumber(transitionData.metrics.pageViews)}
                      </div>
                    </div>
                    {transitionData.trafficBreakdown && (
                      <>
                        <div className="mb-3 border-t border-stroke pt-3 dark:border-dark-3">
                          <div className="text-sm font-medium text-body-color">内訳</div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
                            <div className="text-xs text-body-color">ランディングページ</div>
                            <div className="mt-1 text-2xl font-bold text-primary">
                              {formatNumber(transitionData.metrics.pageViews - transitionData.trafficBreakdown.total)}
                            </div>
                            <div className="text-xs text-body-color">
                              （{((transitionData.metrics.pageViews - transitionData.trafficBreakdown.total) / transitionData.metrics.pageViews * 100).toFixed(1)}%）
                            </div>
                          </div>
                          <div className="rounded-lg border-2 border-primary bg-blue-50 p-4 dark:bg-blue-900/20">
                            <div className="text-xs text-body-color">サイト内遷移から</div>
                            <div className="mt-1 text-2xl font-bold text-primary">
                              {formatNumber(transitionData.trafficBreakdown.internal.count)}
                            </div>
                            <div className="text-xs text-body-color">
                              （{((transitionData.trafficBreakdown.internal.count / transitionData.metrics.pageViews) * 100).toFixed(1)}%）
                            </div>
                          </div>
                          <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
                            <div className="text-xs text-body-color">外部・直接アクセスから</div>
                            <div className="mt-1 text-2xl font-bold text-primary">
                              {formatNumber((transitionData.trafficBreakdown.external.count || 0) + (transitionData.trafficBreakdown.direct.count || 0))}
                            </div>
                            <div className="text-xs text-body-color">
                              （{(((transitionData.trafficBreakdown.external.count || 0) + (transitionData.trafficBreakdown.direct.count || 0)) / transitionData.metrics.pageViews * 100).toFixed(1)}%）
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            このページ（<strong>{formatNumber(transitionData.metrics.pageViews)}PV</strong>）のうち、
                            <strong>{formatNumber(transitionData.metrics.pageViews - transitionData.trafficBreakdown.total)}PV</strong> は
                            ランディングページ（セッションの最初のページ）としてのアクセスです。
                          </p>
                          <p className="mt-2 text-sm text-blue-900 dark:text-blue-100">
                            残り<strong>{formatNumber(transitionData.trafficBreakdown.total)}PV</strong>の遷移元は、
                            サイト内が <strong>{formatNumber(transitionData.trafficBreakdown.internal.count)}PV
                            （{transitionData.trafficBreakdown.internal.percentage}%）</strong>、
                            外部・直接が <strong>{formatNumber((transitionData.trafficBreakdown.external.count || 0) + (transitionData.trafficBreakdown.direct.count || 0))}PV
                            （{((transitionData.trafficBreakdown.external.percentage || 0) + (transitionData.trafficBreakdown.direct.percentage || 0)).toFixed(1)}%）</strong>です。
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* タブ */}
                  <div className="flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                    <button
                      onClick={() => setActiveTab('chart')}
                      className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                        activeTab === 'chart'
                          ? 'bg-primary text-white'
                          : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                      }`}
                    >
                      グラフ形式
                    </button>
                    <button
                      onClick={() => setActiveTab('table')}
                      className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition ${
                        activeTab === 'table'
                          ? 'bg-primary text-white'
                          : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                      }`}
                    >
                      表形式
                    </button>
                  </div>

                  {/* タブコンテンツ */}
                  {activeTab === 'chart' ? (
                    /* ページフロービジュアライゼーション */
                    transitionData && (
                      <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                        <div className="border-b border-stroke p-6 dark:border-dark-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-dark dark:text-white">
                                ページフロー可視化
                              </h3>
                              <p className="mt-1 text-sm text-body-color">
                                サイト内ページ遷移と外部流入の全体像を表示
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <SankeyMock3 
                            transitionData={transitionData} 
                            selectedPage={selectedPage}
                            selectedPageTitle={pagePathsData?.find(p => p.path === selectedPage)?.title || null}
                            formatNumber={formatNumber} 
                          />
                        </div>
                      </div>
                    )
                  ) : (
                    /* サイト内の直前ページ */
                    transitionData.inbound && transitionData.inbound.length > 0 && (
                      <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                        <div className="border-b border-stroke p-6 dark:border-dark-3">
                          <h3 className="text-lg font-semibold text-dark dark:text-white">
                            サイト内の直前ページ (Top 10)
                          </h3>
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
                                    {item.page}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark dark:text-white">
                                    {formatNumber(item.pageViews)}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-body-color">
                                    {item.percentage.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan="3" className="px-4 py-3">
                                  <p className="text-xs text-body-color">
                                    * サイト内遷移（{formatNumber(transitionData.trafficBreakdown?.internal.count || 0)}PV）に対する割合
                                  </p>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && selectedPage && transitionData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.PAGE_FLOW}
            metrics={{
              pagePath: selectedPage,
              metrics: {
                pageViews: transitionData.metrics?.pageViews || 0,
              },
              inbound: transitionData.inbound,
              trafficBreakdown: transitionData.trafficBreakdown,
            }}
            period={{
              startDate: dateRange.from,
              endDate: dateRange.to,
            }}
          />
        )}
      </main>
    </>
  );
}

