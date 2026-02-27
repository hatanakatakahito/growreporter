import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DataTable from '../../components/Analysis/DataTable';
import ChartContainer from '../../components/Analysis/ChartContainer';
import { ExternalLink } from 'lucide-react';
import { setPageTitle } from '../../utils/pageTitle';
import AIFloatingButton from '../../components/common/AIFloatingButton';
import { PAGE_TYPES } from '../../constants/plans';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import PageNoteSection from '../../components/Analysis/PageNoteSection';
import TabbedNoteAndAI from '../../components/Analysis/TabbedNoteAndAI';
import AIAnalysisSection from '../../components/Analysis/AIAnalysisSection';
import PlanLimitModal from '../../components/common/PlanLimitModal';
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
 * 被リンク元分析画面
 * GA4の参照元データ（Referral）を表示
 */
export default function Referrals() {
  const { selectedSite, selectedSiteId, dateRange, updateDateRange } = useSite();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('table');
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [isConversionAlertOpen, setIsConversionAlertOpen] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('被リンク元');
  }, []);

  // 初回のみコンバージョン未設定アラートを表示（サイトデータ読込完了後に判定）
  useEffect(() => {
    if (!selectedSite || !selectedSiteId) return;
    const conversionEvents = selectedSite.conversionEvents || [];
    if (conversionEvents.length === 0) {
      const hasSeenAlert = sessionStorage.getItem('conversionAlertSeen');
      if (!hasSeenAlert) {
        setIsConversionAlertOpen(true);
        sessionStorage.setItem('conversionAlertSeen', 'true');
      }
    }
  }, [selectedSite, selectedSiteId]);

  // ✅ GA4参照元/メディア別コンバージョンデータ取得（サイト設定で定義したコンバージョンイベントのみ）
  const {
    data: referralData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ga4-referral-conversions', selectedSiteId, dateRange.from, dateRange.to],
    queryFn: async () => {
      console.log('[Referrals] Fetching referral conversion data...');
      const fetchReferralConversionData = httpsCallable(functions, 'fetchGA4ReferralConversionData');
      const result = await fetchReferralConversionData({
        siteId: selectedSiteId,
        startDate: dateRange.from,
        endDate: dateRange.to,
      });
      console.log('[Referrals] Referral conversion data fetched:', result.data);
      return result.data;
    },
    enabled: !!selectedSiteId && !!dateRange.from && !!dateRange.to,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // リファラルデータの整形（バックエンドで既にreferralのみをフィルタ済み）
  const formatReferralData = () => {
    if (!referralData?.rows) return [];
    
    return referralData.rows
      .map(row => ({
        source: row.source,
        medium: 'referral',
        sessions: row.sessions || 0,
        users: row.users || 0,
        conversions: row.conversions || 0,
        conversionRate:
          row.sessions > 0
            ? ((row.conversions / row.sessions) * 100).toFixed(2)
            : '0.00',
        engagementRate: ((row.engagementRate || 0) * 100).toFixed(1),
        avgSessionDuration: row.averageSessionDuration || 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  };

  const referrals = formatReferralData();

  // チャートの色
  const COLORS = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
  ];

  // 合計値の計算
  const totalSessions = referrals.reduce((sum, row) => sum + row.sessions, 0);
  const totalUsers = referrals.reduce((sum, row) => sum + row.users, 0);
  const totalConversions = referrals.reduce((sum, row) => sum + row.conversions, 0);
  const avgConversionRate =
    referrals.length > 0
      ? referrals.reduce((sum, row) => sum + parseFloat(row.conversionRate), 0) /
        referrals.length
      : 0;

  // テーブル用のデータ
  const tableData = referrals;

  // グラフ用のデータ（上位10件）
  const chartData = [...referrals].slice(0, 10);

  // 円グラフ用のデータ（上位7件 + その他）
  const pieData = chartData.slice(0, 7).map((item, index) => ({
    name: item.source,
    value: item.sessions,
    color: COLORS[index % COLORS.length],
  }));

  if (chartData.length > 7) {
    const othersSum = chartData
      .slice(7)
      .reduce((sum, item) => sum + item.sessions, 0);
    if (othersSum > 0) {
      pieData.push({
        name: 'その他',
        value: othersSum,
        color: '#9ca3af',
      });
    }
  }

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
      <div className="mt-4 flex justify-center gap-6">
        {payload.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <div
              className="h-3 w-3 rounded"
              style={{
                backgroundColor: hiddenSeries[entry.dataKey] ? '#ccc' : entry.color,
                opacity: hiddenSeries[entry.dataKey] ? 0.3 : 1,
              }}
            />
            <span
              className="text-sm"
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

  // カスタムツールチップ（棒グラフ用）
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-stroke bg-white p-3 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          <p className="mb-2 font-semibold text-dark dark:text-white">
            {payload[0].payload.source}
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

  // カスタムラベル（円グラフ用）
  const renderLabel = (entry) => {
    const percent = ((entry.value / totalSessions) * 100).toFixed(1);
    return `${entry.name} (${percent}%)`;
  };

  // 平均訪問時間のフォーマット（秒 → 分:秒）
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">
              集客 - 被リンク元
            </h2>
            <p className="text-body-color">
              外部サイトからの参照流入（Referral）データを確認できます
            </p>
          </div>

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert
              message={error?.message || 'データの読み込みに失敗しました。'}
            />
          ) : !referrals || referrals.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">
                表示するデータがありません。
                <br />
                参照流入（Referral）のデータが見つかりませんでした。
              </p>
            </div>
          ) : (
            <>
              {/* タブ */}
              <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
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
              {activeTab === 'chart' ? (
                <div className="space-y-6">
                  {/* 円グラフ */}
                  <ChartContainer title="参照元別訪問者構成比" height={400}>
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
                  <ChartContainer title="参照元別訪問者数（上位10件）" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="source"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar
                          dataKey="sessions"
                          name="訪問者"
                          fill="#3b82f6"
                          hide={hiddenSeries.sessions}
                        />
                        <Bar
                          dataKey="conversions"
                          name="コンバージョン"
                          fill="#ef4444"
                          hide={hiddenSeries.conversions}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: 'source',
                      label: '参照元',
                      sortable: true,
                      tooltip: 'source',
                      render: (value) => (
                        <a
                          href={`https://${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span>{value}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ),
                    },
                    {
                      key: 'sessions',
                      label: '訪問者',
                      format: 'number',
                      align: 'right',
                      tooltip: 'sessions',
                    },
                    {
                      key: 'users',
                      label: 'ユーザー',
                      format: 'number',
                      align: 'right',
                      tooltip: 'users',
                    },
                    {
                      key: 'conversions',
                      label: 'コンバージョン',
                      format: 'number',
                      align: 'right',
                      tooltip: 'conversions',
                    },
                    {
                      key: 'conversionRate',
                      label: 'CVR',
                      align: 'right',
                      tooltip: 'conversionRate',
                      render: (value) => `${value}%`,
                    },
                    {
                      key: 'engagementRate',
                      label: 'ENG率',
                      align: 'right',
                      tooltip: 'engagementRate',
                      render: (value) => `${value}%`,
                    },
                    {
                      key: 'avgSessionDuration',
                      label: '平均滞在時間',
                      align: 'right',
                      tooltip: 'avgSessionDuration',
                      render: (value) => formatDuration(value || 0),
                    },
                  ]}
                  data={tableData}
                  pageSize={25}
                  showPagination={true}
                  emptyMessage="表示するデータがありません。"
                />
              )}
            </>
          )}

        {/* メモセクション */}
        {selectedSiteId && currentUser && (
          <div className="mt-6">
            <PageNoteSection
              userId={currentUser.uid}
              siteId={selectedSiteId}
              pageType="referrals"
              dateRange={dateRange}
            />
          </div>
        )}
        </div>

        {/* AI分析フローティングボタン */}
        {selectedSiteId && !isLoading && referralData && (
          <AIFloatingButton
            pageType={PAGE_TYPES.REFERRALS}
            rawData={referralData}
            period={{
              startDate: dateRange.from,
              endDate: dateRange.to,
            }}
          />
        )}
      </main>
    </div>
  );
}

