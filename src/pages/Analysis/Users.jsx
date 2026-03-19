import React, { useState, useMemo, useEffect } from 'react';
import { useSite } from '../../contexts/SiteContext';
import { useGA4UserDemographics } from '../../hooks/useGA4UserDemographics';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { Info } from 'lucide-react';
import { setPageTitle } from '../../utils/pageTitle';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
import { useAuth } from '../../contexts/AuthContext';
import DimensionFilters, { buildGA4DimensionFilter } from '../../components/Analysis/DimensionFilters';
import ComparisonBadge from '../../components/Analysis/ComparisonBadge';
import { mergeComparisonRows } from '../../utils/comparisonHelpers';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  sky: '#0ea5e9',
  pink: '#ec4899',
  gray: '#6b7280',
  orange: '#f97316',
  purple: '#8b5cf6',
  yellow: '#eab308',
};

// 性別専用の色マッピング
const GENDER_COLORS = {
  '男性': COLORS.blue,
  '女性': COLORS.pink,
  '不明': COLORS.gray,
};

/**
 * ユーザー属性分析画面
 * GA4のユーザー属性（性別、年齢、デバイス、地域など）を表示
 */
export default function Users() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange, comparisonMode, comparisonDateRange } = useSite();
  const { currentUser } = useAuth();
  const [locationType, setLocationType] = useState('city');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState({});
  const ga4DimensionFilter = buildGA4DimensionFilter(dimensionFilters);

  const scrollToAIAnalysis = () => {
    window.dispatchEvent(new Event('switchToAITab'));
    setTimeout(() => {
      const element = document.getElementById('ai-analysis-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ユーザー属性');
  }, []);

  // AI分析ボタンのアニメーションは削除（パフォーマンス改善のため）
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIsAnimating(true);
  //     // アニメーション終了後にリセット
  //     setTimeout(() => setIsAnimating(false), 1500);
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, []);

  const { data: demographicsData, isLoading, isError } = useGA4UserDemographics(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ga4DimensionFilter
  );

  // 比較期間データ
  const { data: compDemographics } = useGA4UserDemographics(
    comparisonDateRange ? selectedSiteId : null,
    comparisonDateRange?.from,
    comparisonDateRange?.to,
    ga4DimensionFilter
  );
  const isComparing = comparisonMode !== 'none' && !!comparisonDateRange && !!compDemographics;

  // ドーナツチャート用のカスタムラベル
  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="font-semibold text-dark dark:text-white">
            {`${payload[0].name}: ${payload[0].value.toLocaleString()} (${payload[0].payload.percentage.toFixed(1)}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  // 性別・年齢データの空状態ヒント
  const demographicEmptyHint = (
    <div className="max-w-[340px] rounded-lg bg-blue-50 p-4 text-left text-xs leading-relaxed text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
      <p className="mb-1.5 font-semibold">データを表示するにはGA4の設定が必要です</p>
      <p>GA4管理画面 →「管理」→「データの収集と修正」→「データの収集」→ Googleシグナルのデータ収集をオンにしてください。</p>
      <p className="mt-1.5 text-blue-500 dark:text-blue-400">※ 有効化後、反映に24〜48時間程度かかります。</p>
    </div>
  );

  // 比較テーブルコンポーネント（チャートの下に表示）
  const ComparisonTable = ({ data }) => {
    if (!data || data.length === 0) return null;
    return (
      <div className="mt-4 border-t border-stroke pt-3 dark:border-dark-3">
        <p className="mb-2 text-xs font-semibold text-body-color">期間比較</p>
        <div className="space-y-1.5">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-dark dark:text-white">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-body-color">{item.value?.toLocaleString()}</span>
                <ComparisonBadge value={item.value_change} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ドーナツチャートコンポーネント
  const DonutChartCard = ({ title, data, isGender = false, emptyHint = null, comparisonData = null }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
          <div className="flex h-[350px] flex-col items-center justify-center gap-3 text-body-color">
            <Info className="h-8 w-8 text-body-color/40" />
            <p className="text-sm">データがありません</p>
            {emptyHint}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
        <div className="flex-1" style={{ minHeight: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                label={renderCustomizedLabel}
                labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
              >
                {data.map((entry, index) => {
                  const fillColor = isGender
                    ? (GENDER_COLORS[entry.name] || COLORS.gray)
                    : Object.values(COLORS)[index % Object.values(COLORS).length];
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {comparisonData && <ComparisonTable data={comparisonData} />}
      </div>
    );
  };

  // 横棒グラフコンポーネント
  const HorizontalBarChartCard = ({ title, data, emptyHint = null, comparisonData = null }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
          <div className="flex h-[350px] flex-col items-center justify-center gap-3 text-body-color">
            <Info className="h-8 w-8 text-body-color/40" />
            <p className="text-sm">データがありません</p>
            {emptyHint}
          </div>
        </div>
      );
    }

    return (
      <div className="h-full rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
            <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} />
            <RechartsTooltip formatter={(value) => [`${value.toFixed(1)}%`, '割合']} />
            <Bar dataKey="percentage" fill={COLORS.blue} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
        {comparisonData && <ComparisonTable data={comparisonData} />}
      </div>
    );
  };

  // チャートデータの整形
  const chartData = useMemo(() => {
    if (!demographicsData) {
      return { newReturning: [], gender: [], age: [], device: [], location: [] };
    }

    return {
      newReturning: demographicsData.newReturning || [],
      gender: demographicsData.gender || [],
      age: demographicsData.age || [],
      device: demographicsData.device || [],
      location: demographicsData.location?.[locationType] || [],
    };
  }, [demographicsData, locationType]);

  // 比較用マージデータ
  const compData = useMemo(() => {
    if (!isComparing) return { newReturning: null, gender: null, age: null, device: null, location: null };

    return {
      newReturning: mergeComparisonRows(
        chartData.newReturning, compDemographics.newReturning || [], 'name', ['value']
      ),
      gender: mergeComparisonRows(
        chartData.gender, compDemographics.gender || [], 'name', ['value']
      ),
      age: mergeComparisonRows(
        chartData.age, compDemographics.age || [], 'name', ['value']
      ),
      device: mergeComparisonRows(
        chartData.device, compDemographics.device || [], 'name', ['value']
      ),
      location: mergeComparisonRows(
        chartData.location, compDemographics.location?.[locationType] || [], 'name', ['value']
      ),
    };
  }, [isComparing, chartData, compDemographics, locationType]);

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
                ユーザー属性
              </h2>
              <p className="mt-0.5 text-sm text-body-color">
                ユーザーの性別、年齢、デバイス、地域などの属性データを確認できます
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

          {isLoading && !demographicsData ? (
            <LoadingSpinner message="ユーザー属性データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert message="ユーザー属性データの取得に失敗しました。GA4の接続を確認してください。" />
          ) : (
            <>
              {/* 新規/リピーター & 性別 */}
              <div className="mb-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
                <DonutChartCard
                  title="新規ユーザー/リピーター比率"
                  data={chartData.newReturning}
                  comparisonData={compData.newReturning}
                />
                <DonutChartCard
                  title="性別比率"
                  data={chartData.gender}
                  isGender={true}
                  emptyHint={demographicEmptyHint}
                  comparisonData={compData.gender}
                />
              </div>

              {/* 年齢 & デバイス */}
              <div className="mb-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
                <HorizontalBarChartCard
                  title="年齢比率"
                  data={chartData.age}
                  emptyHint={demographicEmptyHint}
                  comparisonData={compData.age}
                />
                <DonutChartCard
                  title="デバイス比率"
                  data={chartData.device}
                  comparisonData={compData.device}
                />
              </div>

              {/* 地域 */}
              <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    地域比率（上位10地域）
                  </h3>
                  <div className="relative">
                    <select
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value)}
                      className="w-[180px] appearance-none rounded-md border border-stroke bg-transparent py-2 px-4 pr-10 text-dark outline-none transition-all duration-200 focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20"
                    >
                      <option value="country">国別</option>
                      <option value="region">都道府県別</option>
                      <option value="city">市区町村別</option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </div>
                {chartData.location && chartData.location.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.location} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                        <YAxis dataKey="name" type="category" width={120} interval={0} axisLine={false} tickLine={false} />
                        <RechartsTooltip formatter={(value) => [`${value.toFixed(1)}%`, '割合']} />
                        <Bar dataKey="percentage" fill={COLORS.blue} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                    {compData.location && <ComparisonTable data={compData.location} />}
                  </>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-body-color">
                    データがありません
                  </div>
                )}
              </div>
            </>
          )}

        {/* メモ & AI分析タブ */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <TabbedNoteAndAI
              pageType="users"
              noteContent={
                <PageNoteSection
                  userId={currentUser.uid}
                  siteId={selectedSiteId}
                  pageType="users"
                  dateRange={dateRange}
                />
              }
              aiContent={
                !isLoading && demographicsData ? (
                  <AIAnalysisSection
                    pageType={PAGE_TYPES.USERS}
                    rawData={demographicsData}
                    period={{
                      startDate: dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                      endDate: dateRange?.to || new Date(new Date().getFullYear(), new Date().getMonth(), 0),
                    }}
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
        {selectedSiteId && !isLoading && demographicsData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.USERS}
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
