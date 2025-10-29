import React, { useState, useEffect } from 'react';
import { setPageTitle } from '../../utils/pageTitle';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useGA4Data } from '../../hooks/useGA4Data';
import AnalysisHeader from '../../components/Analysis/AnalysisHeader';
import Sidebar from '../../components/Layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import ChartContainer from '../../components/Analysis/ChartContainer';
import AISummarySheet from '../../components/Analysis/AISummarySheet';
import { format, sub } from 'date-fns';
import { Sparkles } from 'lucide-react';

/**
 * 曜日別分析画面
 * 曜日×時間帯のヒートマップで傾向を表示
 */
export default function Week() {
  const { selectedSiteId, selectSite, sites, dateRange, updateDateRange } = useSite();
  const [searchParams] = useSearchParams();
  const [heatmapMetric, setHeatmapMetric] = useState('sessions');
  const [activeTab, setActiveTab] = useState('chart');
  const [isAISheetOpen, setIsAISheetOpen] = useState(false);

  // ページタイトルを設定
  useEffect(() => {
    setPageTitle('週別分析');
  }, []);

  // URLパラメータのsiteIdがあれば選択
  useEffect(() => {
    const siteIdParam = searchParams.get('siteId');
    if (siteIdParam && siteIdParam !== selectedSiteId && sites.some(site => site.id === siteIdParam)) {
      selectSite(siteIdParam);
    }
  }, [searchParams, selectedSiteId, sites, selectSite]);

  // GA4データ取得（曜日×時間帯）
  const {
    data: weekData,
    isLoading,
    isError,
    error,
  } = useGA4Data(
    selectedSiteId,
    dateRange.from,
    dateRange.to,
    ['sessions', 'conversions'],
    ['dayOfWeek', 'hour']
  );

  // ヒートマップ用のマトリックスデータを生成
  const generateMatrix = () => {
    if (!weekData?.rows) return { matrix: [], maxSessions: 0, maxConversions: 0 };

    const matrix = Array(7)
      .fill(null)
      .map(() =>
        Array(24)
          .fill(null)
          .map(() => ({ sessions: 0, conversions: 0 }))
      );

    let maxSessions = 0;
    let maxConversions = 0;

    weekData.rows.forEach((row) => {
      const dayOfWeek = parseInt(row.dayOfWeek); // 0=日曜, 1=月曜, ..., 6=土曜
      const hour = parseInt(row.hour);
      const sessions = row.sessions || 0;
      const conversions = row.conversions || 0;

      // GA4の曜日は0=日曜から始まるので、1=月曜から始まるように変換
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      matrix[adjustedDay][hour] = { sessions, conversions };

      if (sessions > maxSessions) maxSessions = sessions;
      if (conversions > maxConversions) maxConversions = conversions;
    });

    return { matrix, maxSessions, maxConversions };
  };

  const { matrix, maxSessions, maxConversions } = generateMatrix();
  const maxValue = heatmapMetric === 'sessions' ? maxSessions : maxConversions;

  // ヒートマップの色を計算
  const getColorForValue = (value, max) => {
    if (!value || value === 0 || !max || max === 0) return '#f3f4f6';

    const ratio = value / max;

    if (heatmapMetric === 'sessions') {
      // 青系のグラデーション
      const intensity = Math.round(ratio * 255);
      return `rgb(${255 - intensity}, ${220 - Math.round(ratio * 90)}, 255)`;
    } else {
      // 赤系のグラデーション
      const intensity = Math.round(ratio * 200);
      return `rgb(255, ${255 - intensity}, ${220 - intensity})`;
    }
  };

  const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];

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
            <h2 className="mb-1 text-2xl font-bold text-dark dark:text-white">分析する - 曜日別分析</h2>
            <p className="text-body-color">
              曜日×時間帯のヒートマップで傾向を確認できます
            </p>
          </div>

          {isLoading ? (
            <LoadingSpinner message="データを読み込んでいます..." />
          ) : isError ? (
            <ErrorAlert message={error?.message || 'データの読み込みに失敗しました。'} />
          ) : !matrix || matrix.length === 0 ? (
            <div className="rounded-lg border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-dark-2">
              <p className="text-body-color">表示するデータがありません。</p>
            </div>
          ) : (
            <>
              {/* タブ */}
              <div className="mb-6 flex gap-2 rounded-lg border border-stroke bg-white p-1 dark:border-dark-3 dark:bg-dark-2">
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
              <ChartContainer title="曜日×時間帯ヒートマップ">
                <div className="space-y-4">
                  {/* 指標選択 */}
                  <div className="mb-4 flex items-center gap-4">
                    <label className="text-sm font-medium text-dark dark:text-white">
                      表示指標:
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHeatmapMetric('sessions')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          heatmapMetric === 'sessions'
                            ? 'bg-primary text-white'
                            : 'bg-gray-2 text-body-color hover:bg-gray-3 dark:bg-dark-3 dark:hover:bg-dark-4'
                        }`}
                      >
                        セッション
                      </button>
                      <button
                        onClick={() => setHeatmapMetric('conversions')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          heatmapMetric === 'conversions'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-2 text-body-color hover:bg-gray-3 dark:bg-dark-3 dark:hover:bg-dark-4'
                        }`}
                      >
                        コンバージョン
                      </button>
                    </div>
                  </div>

                  {/* ヒートマップテーブル */}
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <table className="border-collapse">
                        <thead>
                          <tr>
                            <th className="min-w-[100px] border border-stroke bg-gray-2 px-4 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                              曜日 / 時間
                            </th>
                            {Array.from({ length: 24 }, (_, i) => (
                              <th
                                key={i}
                                className="min-w-[50px] border border-stroke bg-gray-2 px-3 py-2 text-xs font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white"
                              >
                                {i}時
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dayNames.map((dayName, dayIndex) => (
                            <tr key={dayIndex}>
                              <td className="whitespace-nowrap border border-stroke bg-gray-2 px-4 py-3 text-sm font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                                {dayName}
                              </td>
                              {Array.from({ length: 24 }, (_, hourIndex) => {
                                const cellData = matrix[dayIndex]?.[hourIndex];
                                const value = cellData?.[heatmapMetric] || 0;
                                const bgColor = getColorForValue(value, maxValue);
                                const textColor =
                                  value > maxValue * 0.5 ? 'text-white' : 'text-dark';

                                return (
                                  <td
                                    key={hourIndex}
                                    className={`cursor-pointer border border-stroke px-3 py-3 text-center text-sm font-medium transition-opacity hover:opacity-80 ${textColor}`}
                                    style={{ backgroundColor: bgColor }}
                                    title={`${dayName} ${hourIndex}時: ${
                                      heatmapMetric === 'sessions'
                                        ? 'セッション'
                                        : 'コンバージョン'
                                    } ${value.toLocaleString()}`}
                                  >
                                    {value > 0 ? value.toLocaleString() : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 凡例 */}
                  <div className="mt-4 flex items-center gap-4 text-sm text-body-color">
                    <span>色の濃さ:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-8 rounded border border-stroke bg-gray-100"></div>
                      <span>少ない</span>
                    </div>
                    <div
                      className="h-4 flex-1 rounded border border-stroke"
                      style={{
                        background:
                          heatmapMetric === 'sessions'
                            ? 'linear-gradient(to right, #f3f4f6, #bfdbfe, #3b82f6)'
                            : 'linear-gradient(to right, #f3f4f6, #fca5a5, #ef4444)',
                      }}
                    ></div>
                    <div className="flex items-center gap-2">
                      <span>多い</span>
                      <div
                        className={`h-4 w-8 rounded border border-stroke ${
                          heatmapMetric === 'sessions' ? 'bg-primary' : 'bg-red-600'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </ChartContainer>
            ) : (
              <div className="rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                <div className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                    曜日×時間帯データ表
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border border-stroke bg-gray-2 px-4 py-2 text-left font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                            曜日
                          </th>
                          <th className="border border-stroke bg-gray-2 px-4 py-2 text-left font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                            時間
                          </th>
                          <th className="border border-stroke bg-gray-2 px-4 py-2 text-right font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                            セッション
                          </th>
                          <th className="border border-stroke bg-gray-2 px-4 py-2 text-right font-medium text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                            コンバージョン
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayNames.map((dayName, dayIndex) =>
                          Array.from({ length: 24 }, (_, hourIndex) => {
                            const cellData = matrix[dayIndex]?.[hourIndex];
                            if (
                              !cellData ||
                              (cellData.sessions === 0 && cellData.conversions === 0)
                            )
                              return null;

                            return (
                              <tr
                                key={`${dayIndex}-${hourIndex}`}
                                className="hover:bg-gray-1 dark:hover:bg-dark-3"
                              >
                                <td className="border border-stroke px-4 py-2 text-body-color dark:border-dark-3">
                                  {dayName}
                                </td>
                                <td className="border border-stroke px-4 py-2 text-body-color dark:border-dark-3">
                                  {hourIndex}時
                                </td>
                                <td className="border border-stroke px-4 py-2 text-right font-medium text-dark dark:border-dark-3 dark:text-white">
                                  {cellData.sessions.toLocaleString()}
                                </td>
                                <td className="border border-stroke px-4 py-2 text-right font-medium text-dark dark:border-dark-3 dark:text-white">
                                  {cellData.conversions.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* AI分析フローティングボタン */}
        {!isError && (
          <button
            onClick={() => setIsAISheetOpen(true)}
            disabled={isLoading}
            className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="AI分析を見る"
          >
            <div className="flex flex-col items-center">
              <Sparkles className="h-6 w-6" />
              <span className="mt-0.5 text-[10px] font-medium">AI分析</span>
            </div>
          </button>
        )}

        {/* AI分析サイドシート */}
        <AISummarySheet
          isOpen={isAISheetOpen}
          onClose={() => setIsAISheetOpen(false)}
          pageType="week"
          startDate={dateRange.from}
          endDate={dateRange.to}
          metrics={{
            sessions: maxSessions,
            conversions: maxConversions,
            heatmapData: matrix,
          }}
        />
      </main>
    </>
  );
}
