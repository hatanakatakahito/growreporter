import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Settings } from 'lucide-react';

const METRIC_LABELS = {
  users: 'ユーザー数',
  sessions: '訪問者数',
  pageviews: 'ページビュー数',
  engagement_rate: 'エンゲージメント率',
  target_sessions: '目標訪問者数',
  target_users: '目標ユーザー数',
  target_conversions: '目標コンバージョン数',
  target_conversion_rate: '目標コンバージョン率',
};

/**
 * KPI達成状況
 */
export default function KPIProgress({ kpiSettings, metricsData, conversionsData, isLoading }) {
  const kpiList = kpiSettings?.kpiList || [];

  if (isLoading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">KPI達成状況</h3>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-2 h-4 w-32 rounded bg-gray-200 dark:bg-dark-3" />
              <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-dark-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kpiList.length === 0) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">KPI達成状況</h3>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Target className="h-10 w-10 text-body-color/40" />
          <p className="text-sm text-body-color">KPIが設定されていません</p>
          <Link
            to="/sites/list"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-opacity-90"
          >
            <Settings className="h-3.5 w-3.5" />
            サイト設定でKPIを設定
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">KPI達成状況</h3>
      <div className="space-y-4">
        {kpiList.map((kpi) => {
          const target = kpi.target || 0;
          let actual = 0;

          // コンバージョンKPIの場合
          if (kpi.isConversion && kpi.eventName && conversionsData) {
            actual = conversionsData[kpi.eventName] || 0;
          } else if (metricsData) {
            const metricMap = {
              users: metricsData.totalUsers,
              sessions: metricsData.sessions,
              pageviews: metricsData.pageViews,
              engagement_rate: metricsData.engagementRate,
              target_sessions: metricsData.sessions,
              target_users: metricsData.totalUsers,
              target_conversions: metricsData.conversions,
              target_conversion_rate: metricsData.conversions > 0 && metricsData.sessions > 0
                ? metricsData.conversions / metricsData.sessions
                : 0,
            };
            actual = metricMap[kpi.metric] ?? 0;
          }

          const isRate = kpi.metric?.includes('rate') || kpi.metric === 'engagement_rate';
          const displayActual = isRate ? `${(actual * 100).toFixed(1)}%` : actual.toLocaleString();
          const displayTarget = isRate ? `${(target * 100).toFixed(1)}%` : target.toLocaleString();
          const percent = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
          const label = kpi.label || METRIC_LABELS[kpi.metric] || kpi.metric;

          return (
            <div key={kpi.id}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-dark dark:text-white">{label}</span>
                <span className="text-xs text-body-color">
                  {displayActual} / {displayTarget}（{percent.toFixed(0)}%）
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent >= 100 ? 'bg-secondary' : percent >= 70 ? 'bg-primary' : 'bg-amber-400'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
