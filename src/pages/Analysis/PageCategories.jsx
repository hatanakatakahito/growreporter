import React, { useState, useMemo, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSite } from '../../contexts/SiteContext';
import { useGA4Data } from '../../hooks/useGA4Data';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import { Folder, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { mergeComparisonRows } from '../../utils/comparisonHelpers';
import { useAuth } from '../../contexts/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/**
 * ページ分類別分析画面
 * ページをディレクトリ別に分類して表示
 */
export default function PageCategories() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('sitemap');
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [expandedPaths, setExpandedPaths] = useState(new Set(['/']));
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
    setPageTitle('ページ分類別');
  }, []);

  // GA4データ取得
  const {
    data: pageData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['screenPageViews', 'sessions', 'activeUsers', 'newUsers', 'engagementRate', 'bounceRate', 'averageSessionDuration'],
    ['pagePath'],
    ga4DimensionFilter
  );

  // 比較期間のGA4データ取得
  const { data: compPageData } = useGA4Data(
    comparisonDateRange ? selectedSiteId : null,
    comparisonDateRange?.from,
    comparisonDateRange?.to,
    ['screenPageViews', 'sessions', 'activeUsers', 'newUsers', 'engagementRate', 'bounceRate'],
    ['pagePath'],
    ga4DimensionFilter
  );
  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compPageData;

  // ページ別コンバージョンデータ取得
  const conversionEvents = selectedSite?.conversionEvents || [];
  const { data: conversionData } = useQuery({
    queryKey: ['ga4-pagecategory-conversions', selectedSiteId, dateRange.from, dateRange.to, ga4DimensionFilter],
    queryFn: async () => {
      if (conversionEvents.length === 0) return {};
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        metrics: ['eventCount'],
        dimensions: ['pagePath', 'eventName'],
        dimensionFilter: ga4DimensionFilter
          ? {
              andGroup: {
                expressions: [
                  { filter: { fieldName: 'eventName', inListFilter: { values: conversionEvents.map(e => e.eventName) } } },
                  ga4DimensionFilter,
                ],
              },
            }
          : { filter: { fieldName: 'eventName', inListFilter: { values: conversionEvents.map(e => e.eventName) } } },
      });
      const map = {};
      (result.data?.rows || []).forEach(row => {
        const path = row.pagePath;
        map[path] = (map[path] || 0) + (row.eventCount || 0);
      });
      return map;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to && conversionEvents.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ページをカテゴリ別に分類
  const categoryData = useMemo(() => {
    if (!pageData?.rows) return [];

    const categories = {};

    pageData.rows.forEach((row) => {
      const path = row.pagePath || '/';
      const parts = path.split('/').filter(Boolean);
      
      // カテゴリ判定（第1階層をカテゴリとする）
      const category = parts.length > 0 ? `/${parts[0]}` : '/';

      if (!categories[category]) {
        categories[category] = {
          category,
          pageViews: 0,
          sessions: 0,
          users: 0,
          newUsers: 0,
          engagementRateSum: 0,
          bounceRateSum: 0,
          avgDurationSum: 0,
          conversions: 0,
          pages: 0,
        };
      }

      categories[category].pageViews += row.screenPageViews || 0;
      categories[category].sessions += row.sessions || 0;
      categories[category].users += row.activeUsers || 0;
      categories[category].newUsers += row.newUsers || 0;
      categories[category].engagementRateSum += (row.engagementRate || 0) * (row.sessions || 0);
      categories[category].bounceRateSum += (row.bounceRate || 0) * (row.sessions || 0);
      categories[category].avgDurationSum += (row.averageSessionDuration || 0) * (row.sessions || 0);
      // コンバージョンデータをカテゴリに集計
      if (conversionData) {
        categories[category].conversions += conversionData[path] || 0;
      }
      categories[category].pages += 1;
    });

    return Object.values(categories).map(cat => ({
      ...cat,
      engagementRate: cat.sessions > 0 ? ((cat.engagementRateSum / cat.sessions) * 100).toFixed(1) : '0.0',
      bounceRate: cat.sessions > 0 ? ((cat.bounceRateSum / cat.sessions) * 100).toFixed(1) : '0.0',
      avgDuration: cat.sessions > 0 ? cat.avgDurationSum / cat.sessions : 0,
      conversions: cat.conversions,
      conversionRate: cat.sessions > 0 ? ((cat.conversions / cat.sessions) * 100).toFixed(2) : '0.00',
    })).sort((a, b) => b.pageViews - a.pageViews);
  }, [pageData, conversionData]);

  // 比較期間のカテゴリ別集計データ
  const mergedTableData = useMemo(() => {
    if (!isComparing || !compPageData?.rows) return categoryData;
    // Aggregate comparison data by category using the same logic
    const compCategories = {};
    compPageData.rows.forEach((row) => {
      const path = row.pagePath || '/';
      const category = path === '/' ? 'トップページ' : '/' + path.split('/').filter(Boolean)[0];
      if (!compCategories[category]) {
        compCategories[category] = { category, sessions: 0, pageViews: 0, conversions: 0 };
      }
      compCategories[category].sessions += row.sessions || 0;
      compCategories[category].pageViews += row.screenPageViews || 0;
    });
    const compTable = Object.values(compCategories);
    return mergeComparisonRows(categoryData, compTable, 'category', ['sessions', 'users', 'newUsers', 'pageViews', 'engagementRate', 'bounceRate', 'avgDuration', 'conversions', 'conversionRate']);
  }, [categoryData, isComparing, compPageData]);

  // チャート用のデータ（上位10件）
  const chartData = [...categoryData].slice(0, 10);

  // 円グラフ用の色
  const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#84cc16',
  ];

  // 円グラフ用のデータ
  const pieData = chartData.slice(0, 8).map((item, index) => ({
    name: item.category,
    value: item.pageViews,
    color: COLORS[index % COLORS.length],
  }));

  // 合計値
  const totalPageViews = categoryData.reduce((sum, row) => sum + row.pageViews, 0);

  // サイトマップツリー構造の生成（全ページデータを使用）
  const sitemapTree = useMemo(() => {
    if (!pageData?.rows || pageData.rows.length === 0) return null;

    const tree = { name: '/', children: {}, data: null, pageViews: 0 };

    pageData.rows.forEach((page) => {
      const path = page.pagePath || '/';
      const parts = path.split('/').filter(Boolean);

      let current = tree;
      let currentPath = '';

      if (parts.length === 0) {
        // ルートページ
        tree.data = {
          path: '/',
          pageViews: page.screenPageViews || 0,
        };
        tree.pageViews += page.screenPageViews || 0;
      } else {
        parts.forEach((part, index) => {
          currentPath += '/' + part;
          
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              fullPath: currentPath,
              children: {},
              data: null,
              pageViews: 0,
            };
          }

          current.children[part].pageViews += page.screenPageViews || 0;

          // 最後の部分の場合、ページデータを設定
          if (index === parts.length - 1) {
            current.children[part].data = {
              path: page.pagePath,
              pageViews: page.screenPageViews || 0,
            };
          }

          current = current.children[part];
        });
      }
    });

    return tree;
  }, [pageData]);

  // ツリーの展開/折りたたみ
  const togglePath = (path) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // サイトマップツリーのレンダリング（テーブル風・リンク付き）
  const renderSitemapTree = (node, depth = 0) => {
    if (!node) return null;

    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedPaths.has(node.fullPath || '/');
    const isRoot = depth === 0;
    const percentage = totalPageViews > 0 ? ((node.pageViews / totalPageViews) * 100).toFixed(1) : 0;
    
    // 実際のページURLを生成
    const fullUrl = selectedSite?.siteUrl && node.data?.path
      ? `${selectedSite.siteUrl.replace(/\/$/, '')}${node.data.path}`
      : null;

    return (
      <div key={node.fullPath || 'root'}>
        {!isRoot && (
          <div className="flex items-center border-b border-stroke hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3">
            {/* カテゴリ列 */}
            <div 
              className="flex items-center gap-2 py-3 px-4 min-w-[350px] flex-1"
              style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
            >
              {hasChildren ? (
                <div
                  onClick={() => togglePath(node.fullPath)}
                  className="cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-body-color flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-body-color flex-shrink-0" />
                  )}
                </div>
              ) : (
                <div className="w-4 flex-shrink-0" />
              )}
              
              {hasChildren ? (
                <Folder className="h-4 w-4 text-primary flex-shrink-0" />
              ) : fullUrl ? (
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 hover:opacity-70"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="h-4 w-4 text-body-color flex-shrink-0" />
                </a>
              ) : (
                <FileText className="h-4 w-4 text-body-color flex-shrink-0" />
              )}
              
              {fullUrl ? (
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {node.name}
                </a>
              ) : (
                <span className="text-sm text-dark dark:text-white truncate">
                  {node.name}
                </span>
              )}
            </div>
            
            {/* 配下のページ数列 */}
            <div className="py-3 px-4 text-right min-w-[150px]">
              <span className="text-sm font-medium text-dark dark:text-white">
                {hasChildren ? `${Object.keys(node.children).length}ページ` : '-'}
              </span>
            </div>
            
            {/* ページビュー列 */}
            <div className="py-3 px-4 text-right min-w-[150px]">
              <span className="text-sm font-medium text-dark dark:text-white">
                {node.pageViews.toLocaleString()} PV
              </span>
            </div>
            
            {/* 割合列 */}
            <div className="py-3 px-4 text-right min-w-[100px]">
              <span className="text-sm font-medium text-dark dark:text-white">
                {percentage}%
              </span>
            </div>
          </div>
        )}

        {(isRoot || isExpanded) &&
          Object.values(node.children)
            .sort((a, b) => b.pageViews - a.pageViews)
            .map((child) => renderSitemapTree(child, depth + 1))}
      </div>
    );
  };

  // 凡例クリックハンドラー
  const handleLegendClick = (dataKey) => {
    setHiddenSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // カスタム凡例
  const CustomLegend = ({ payload }) => {
    return (
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-1.5 transition-opacity hover:opacity-70"
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <div
              className="h-2.5 w-2.5 rounded"
              style={{
                backgroundColor: hiddenSeries[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenSeries[entry.dataKey] ? 0.3 : 1,
              }}
            />
            <span
              className="text-xs"
              style={{
                color: hiddenSeries[entry.dataKey] ? '#ccc' : entry.color,
                textDecoration: hiddenSeries[entry.dataKey] ? 'line-through' : 'none',
              }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">
            {payload[0].payload.category}
          </p>
          {payload
            .filter((entry) => !hiddenSeries[entry.dataKey])
            .map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value?.toLocaleString()}
              </p>
            ))}
        </div>
      );
    }
    return null;
  };

  // 円グラフのラベル
  const renderLabel = (entry) => {
    const percent = ((entry.value / totalPageViews) * 100).toFixed(1);
    return `${entry.name} (${percent}%)`;
  };

  return (
    <div className="flex flex-col h-full">
      <AnalysisHeader
          dateRange={dateRange}
          setDateRange={updateDateRange}
          showDateRange={true}
          showSiteInfo={false}
        />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark">
        {/* コンテンツ */}
        <div className="mx-auto max-w-content px-6 py-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark dark:text-white">
                エンゲージメント - ページ分類別
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                ページを第1階層のディレクトリ別に分類して表示します
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

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert
              message={error?.message || 'データの読み込みに失敗しました。'}
            />
          ) : !categoryData || categoryData.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* タブ */}
              <div className="mb-6 mt-4 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
                <button
                  onClick={() => setActiveTab('sitemap')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'sitemap'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  サイトマップ形式
                </button>
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'chart'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  グラフ形式
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 rounded-md px-8 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'table'
                      ? 'bg-primary text-white transition hover:bg-opacity-90'
                      : 'text-body-color hover:bg-gray-2 dark:hover:bg-dark-3'
                  }`}
                >
                  表形式
                </button>
              </div>

              {/* タブコンテンツ */}
              {activeTab === 'sitemap' ? (
                <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                  <div className="border-b border-stroke p-4 dark:border-dark-3">
                    <h3 className="text-lg font-semibold text-dark dark:text-white">
                      サイトマップ形式
                    </h3>
                    <p className="mt-1 text-sm text-body-color">
                      ページを階層構造で表示します（PV数の多い順）
                    </p>
                  </div>
                  
                  {/* ヘッダー行 */}
                  <div className="flex items-center border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
                    <div className="py-3 px-4 min-w-[350px] flex-1">
                      <span className="text-sm font-semibold text-dark dark:text-white">
                        カテゴリ
                      </span>
                    </div>
                    <div className="py-3 px-4 text-right min-w-[150px]">
                      <span className="text-sm font-semibold text-dark dark:text-white">
                        配下のページ数
                      </span>
                    </div>
                    <div className="py-3 px-4 text-right min-w-[150px]">
                      <span className="text-sm font-semibold text-dark dark:text-white">
                        ページビュー
                      </span>
                    </div>
                    <div className="py-3 px-4 text-right min-w-[100px]">
                      <span className="text-sm font-semibold text-dark dark:text-white">
                        割合
                      </span>
                    </div>
                  </div>
                  
                  {/* ツリーコンテンツ */}
                  <div className="overflow-auto">
                    {sitemapTree && renderSitemapTree(sitemapTree)}
                  </div>
                </div>
              ) : activeTab === 'chart' ? (
                <div className="space-y-6">
                  {/* 円グラフ */}
                  <ChartContainer title="カテゴリ別ページビュー構成比" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderLabel}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  {/* 棒グラフ */}
                  <ChartContainer title="カテゴリ別ページビュー数（上位10件）" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tickFormatter={(v) => v.toLocaleString()} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar
                          dataKey="pageViews"
                          name="ページビュー"
                          fill="#3b82f6"
                          hide={hiddenSeries.pageViews}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <DataTable
                  tableKey="analysis-page-categories"
                  isComparing={isComparing}
                  columns={[
                    {
                      key: 'category',
                      label: 'カテゴリ',
                      sortable: true,
                      required: true,
                    },
                    {
                      key: 'pages',
                      label: '配下のページ数',
                      format: 'number',
                      align: 'right',
                    },
                    {
                      key: 'pageViews',
                      label: 'ページビュー',
                      align: 'right',
                      comparison: true,
                      render: (value) => {
                        const percentage = totalPageViews > 0
                          ? ((value / totalPageViews) * 100).toFixed(1)
                          : 0;
                        return (
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">{value.toLocaleString()}</span>
                            <span className="text-sm text-body-color">({percentage}%)</span>
                          </div>
                        );
                      },
                    },
                    {
                      key: 'sessions',
                      label: '訪問者',
                      format: 'number',
                      align: 'right',
                      tooltip: 'sessions',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'users',
                      label: 'ユーザー数',
                      format: 'number',
                      align: 'right',
                      tooltip: 'activeUsers',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'newUsers',
                      label: '新規ユーザー',
                      format: 'number',
                      align: 'right',
                      tooltip: 'newUsers',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'engagementRate',
                      label: 'ENG率',
                      align: 'right',
                      tooltip: 'engagementRate',
                      render: (value) => `${value}%`,
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'bounceRate',
                      label: '直帰率',
                      align: 'right',
                      tooltip: 'bounceRate',
                      render: (value) => `${value}%`,
                      defaultVisible: false,
                      comparison: true,
                      invertColor: true,
                    },
                    {
                      key: 'avgDuration',
                      label: '平均滞在時間',
                      align: 'right',
                      tooltip: 'avgSessionDuration',
                      render: (value) => {
                        const v = value || 0;
                        const minutes = Math.floor(v / 60);
                        const seconds = Math.floor(v % 60);
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      },
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'conversions',
                      label: 'コンバージョン',
                      format: 'number',
                      align: 'right',
                      tooltip: 'conversions',
                      defaultVisible: false,
                      comparison: true,
                    },
                    {
                      key: 'conversionRate',
                      label: 'CVR',
                      align: 'right',
                      tooltip: 'conversionRate',
                      render: (value) => `${value}%`,
                      defaultVisible: false,
                      comparison: true,
                    },
                  ]}
                  data={mergedTableData}
                  pageSize={25}
                  showPagination={true}
                  emptyMessage="表示するデータがありません。"
                  showTotals
                />
              )}
            </>
          )}

          {/* メモ & AI分析タブ */}
          {currentUser && selectedSiteId && (
            <div className="mt-6">
              <TabbedNoteAndAI
                pageType="page-categories"
                noteContent={
                  <PageNoteSection
                    userId={currentUser.uid}
                    siteId={selectedSiteId}
                    pageType="page-categories"
                    dateRange={dateRange}
                  />
                }
                aiContent={
                  !isLoading && categoryData && categoryData.length > 0 ? (
                    <AIAnalysisSection
                      pageType={PAGE_TYPES.PAGE_CATEGORIES}
                      rawData={{ rows: categoryData }}
                      period={{
                        startDate: dateRange?.from,
                        endDate: dateRange?.to,
                      }}
                      comparisonRawData={isComparing ? compPageData : null}
                      comparisonPeriod={isComparing ? { startDate: comparisonDateRange?.from, endDate: comparisonDateRange?.to } : null}
                      onLimitExceeded={() => setIsLimitModalOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      データを読み込み中...
                    </div>
                  )
                }
              />
            </div>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && !isLoading && categoryData && categoryData.length > 0 && (
          <AIFloatingButton
            pageType={PAGE_TYPES.PAGE_CATEGORIES}
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

