import React, { useState, useMemo, useEffect } from 'react';
import { useSite } from '../contexts/SiteContext';
import { useGA4UserDemographics } from '../hooks/useGA4UserDemographics';
import Sidebar from '../components/Layout/Sidebar';
import AnalysisHeader from '../components/Analysis/AnalysisHeader';
import AISummarySheet from '../components/Analysis/AISummarySheet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { Info, Sparkles } from 'lucide-react';
import { setPageTitle } from '../utils/pageTitle';
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
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const [locationType, setLocationType] = useState('city');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('ユーザー属性');
  }, []);

  // AI分析ボタンのアニメーション（5秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      // アニメーション終了後にリセット
      setTimeout(() => setIsAnimating(false), 1500);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const { data: demographicsData, isLoading, isError } = useGA4UserDemographics(
    selectedSiteId,
    dateRange.from,
    dateRange.to
  );

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

  // ドーナツチャートコンポーネント
  const DonutChartCard = ({ title, data, isGender = false }) => {
    if (!data || data.length === 0) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
          <div className="flex h-[350px] items-center justify-center text-body-color">
            データがありません
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
        <ResponsiveContainer width="100%" height={350}>
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
    );
  };

  // 横棒グラフコンポーネント
  const HorizontalBarChartCard = ({ title, data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">{title}</h3>
          <div className="flex h-[350px] items-center justify-center text-body-color">
            データがありません
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-dark-2">
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
              ユーザー属性
            </h2>
            <p className="text-body-color">
              ユーザーの性別、年齢、デバイス、地域などの属性データを確認できます
            </p>
          </div>

          {isLoading && !demographicsData ? (
            <LoadingSpinner message="ユーザー属性データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert message="ユーザー属性データの取得に失敗しました。GA4の接続を確認してください。" />
          ) : (
            <>
              {/* 新規/リピーター & 性別 */}
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DonutChartCard 
                  title="新規ユーザー/リピーター比率" 
                  data={chartData.newReturning}
                />
                <DonutChartCard 
                  title="性別比率" 
                  data={chartData.gender}
                  isGender={true}
                />
              </div>

              {/* 年齢 & デバイス */}
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <HorizontalBarChartCard 
                  title="年齢比率" 
                  data={chartData.age}
                />
                <DonutChartCard 
                  title="デバイス比率" 
                  data={chartData.device}
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
                      className="w-[180px] appearance-none rounded-md border border-stroke bg-transparent py-2 px-4 pr-10 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary"
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
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.location} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                      <YAxis dataKey="name" type="category" width={120} interval={0} axisLine={false} tickLine={false} />
                      <RechartsTooltip formatter={(value) => [`${value.toFixed(1)}%`, '割合']} />
                      <Bar dataKey="percentage" fill={COLORS.blue} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-body-color">
                    データがありません
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {!isError && (
          <div className="fixed bottom-6 right-6 z-30">
            {/* 波紋エフェクト */}
            {isAnimating && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 ai-button-ripple" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 ai-button-ripple" style={{ animationDelay: '0.3s' }} />
                </div>
              </>
            )}
            
            {/* メインボタン */}
            <button
              onClick={() => setIsAISheetOpen(true)}
              disabled={isLoading}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 ${
                isAnimating ? 'ai-button-pulse' : ''
              }`}
              aria-label="AI分析を見る"
            >
              <div className="flex flex-col items-center">
                <Sparkles className={`h-7 w-7 ${isAnimating ? 'ai-icon-sparkle' : ''}`} />
                <span className="mt-1 text-[11px] font-medium">AI分析</span>
              </div>
            </button>
          </div>
        )}

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          siteId={selectedSiteId}
          pageType="users"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            demographicsData: demographicsData,
            chartData: chartData,
          }}
        />
      </main>
    </>
  );
}
