import React from 'react';
import MetricCard from './MetricCard';
import { getTooltip } from '../../constants/tooltips';

/**
 * 主要指標カード（GA4 + GSC）
 * @param {object} currentMetrics - 現在期間の指標
 * @param {object} previousMetrics - 前期間の指標（前月比算出用）
 * @param {boolean} isLoading
 * @param {boolean} hasGSCConnection - GSC連携の有無
 */
export default function MetricCards({ currentMetrics, previousMetrics, isLoading, hasGSCConnection }) {
  const calcChange = (current, previous) => {
    if (current == null || previous == null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const curr = currentMetrics || {};
  const prev = previousMetrics || {};

  const metrics = [
    {
      title: '訪問者数',
      value: curr.sessions || 0,
      change: calcChange(curr.sessions, prev.sessions),
      format: 'number',
      tooltip: getTooltip('sessions'),
      icon: (
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      title: 'ユーザー数',
      value: curr.totalUsers || 0,
      change: calcChange(curr.totalUsers, prev.totalUsers),
      format: 'number',
      tooltip: getTooltip('users'),
      icon: (
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'ページビュー数',
      value: curr.pageViews || 0,
      change: calcChange(curr.pageViews, prev.pageViews),
      format: 'number',
      tooltip: getTooltip('pageViews'),
      icon: (
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      title: 'エンゲージメント率',
      value: curr.engagementRate || 0,
      change: calcChange(curr.engagementRate, prev.engagementRate),
      format: 'percent',
      tooltip: getTooltip('engagementRate'),
      icon: (
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      title: 'コンバージョン数',
      value: curr.conversions || 0,
      change: calcChange(curr.conversions, prev.conversions),
      format: 'number',
      tooltip: getTooltip('conversions'),
      icon: (
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      title: 'コンバージョン率',
      value: curr.sessions > 0 ? (curr.conversions || 0) / curr.sessions : 0,
      change: (() => {
        const currRate = curr.sessions > 0 ? (curr.conversions || 0) / curr.sessions : 0;
        const prevRate = prev.sessions > 0 ? (prev.conversions || 0) / prev.sessions : 0;
        return calcChange(currRate, prevRate);
      })(),
      format: 'percent',
      tooltip: getTooltip('conversionRate'),
      icon: (
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  // GSC指標（連携がある場合のみ）
  if (hasGSCConnection) {
    metrics.push(
      {
        title: '検索クリック数',
        value: curr.clicks || 0,
        change: calcChange(curr.clicks, prev.clicks),
        format: 'number',
        tooltip: getTooltip('clicks'),
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        ),
      },
      {
        title: '検索表示回数',
        value: curr.impressions || 0,
        change: calcChange(curr.impressions, prev.impressions),
        format: 'number',
        tooltip: getTooltip('impressions'),
        icon: (
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
      }
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} isLoading={isLoading} />
      ))}
    </div>
  );
}
