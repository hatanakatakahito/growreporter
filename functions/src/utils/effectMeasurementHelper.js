/**
 * 改善効果の自動計測 ヘルパーユーティリティ
 * Before/After期間の計算、カテゴリ別メトリクス定義、データ正規化
 */

import { format, subDays, addDays, parseISO, isBefore } from 'date-fns';

/**
 * Before期間を算出（effectiveDateの14日前〜前日 = 14日間）
 * ※改善日当日は計測対象外
 * @param {string} effectiveDate - 改善反映日 (YYYY-MM-DD)
 * @returns {{ startDate: string, endDate: string }}
 */
export function calculateBeforePeriod(effectiveDate) {
  const date = parseISO(effectiveDate);
  const endDate = subDays(date, 1);       // 改善日の前日
  const startDate = subDays(date, 14);    // 改善日の14日前（14日間）
  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

/**
 * After期間を算出（effectiveDateの翌日〜14日後 = 14日間）
 * @param {string} effectiveDate - 改善反映日 (YYYY-MM-DD)
 * @returns {{ startDate: string, endDate: string }}
 */
export function calculateAfterPeriod(effectiveDate) {
  const date = parseISO(effectiveDate);
  const startDate = addDays(date, 1);     // 改善日の翌日
  const endDate = addDays(date, 14);      // 改善日の14日後
  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

/**
 * After期間が既に過去かどうかを判定（即時計測可能か）
 * @param {string} effectiveDate - 改善反映日 (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isAfterPeriodPast(effectiveDate) {
  const afterPeriod = calculateAfterPeriod(effectiveDate);
  const afterEnd = parseISO(afterPeriod.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(afterEnd, today);
}

/**
 * 計測実行予定日を算出（effectiveDate + 15日）
 * @param {string} effectiveDate - 改善反映日 (YYYY-MM-DD)
 * @returns {string} ISO日時
 */
export function calculateNextMeasurementDate(effectiveDate) {
  const date = parseISO(effectiveDate);
  const measurementDate = addDays(date, 15);
  return measurementDate.toISOString();
}

/**
 * カテゴリ別のGA4メトリクス定義
 * @param {string} category - 改善カテゴリ (acquisition/content/design/feature/other)
 * @returns {string[]} GA4メトリクス名の配列
 */
export function getCategoryMetrics(category) {
  const base = ['sessions', 'totalUsers', 'screenPageViews', 'engagementRate', 'bounceRate', 'averageSessionDuration'];

  const categorySpecific = {
    acquisition: ['newUsers'],
    content: [],
    design: [],
    feature: [],
    other: [],
  };

  return [...base, ...(categorySpecific[category] || [])];
}

/**
 * カテゴリに応じてGSCデータを取得すべきかどうか
 * @param {string} category
 * @returns {boolean}
 */
export function shouldFetchGSC(category) {
  return category === 'acquisition';
}

/**
 * カテゴリに応じてチャネル別データを取得すべきかどうか
 * @param {string} category
 * @returns {boolean}
 */
export function shouldFetchChannels(category) {
  return category === 'acquisition';
}

/**
 * カテゴリに応じて外部リンク・ファイルDLデータを取得すべきかどうか
 * @param {string} category
 * @returns {boolean}
 */
export function shouldFetchEvents(category) {
  return category === 'feature';
}

/**
 * targetPageUrlからGA4のpagePathを抽出
 * @param {string} targetPageUrl - フルURL (例: https://example.com/contact?q=1)
 * @returns {string} パスのみ (例: /contact)
 */
export function extractPagePath(targetPageUrl) {
  if (!targetPageUrl) return null;
  try {
    const url = new URL(targetPageUrl);
    // 末尾スラッシュの正規化（/ のみの場合はそのまま）
    let path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  } catch {
    // URLパースに失敗した場合はそのまま返す（相対パスの可能性）
    return targetPageUrl.startsWith('/') ? targetPageUrl : `/${targetPageUrl}`;
  }
}

/**
 * pagePathに基づくGA4 dimensionFilterを構築
 * @param {string} pagePath - ページパス (例: /contact)
 * @returns {object|null} GA4 dimensionFilterオブジェクト
 */
export function buildPageFilter(pagePath) {
  if (!pagePath) return null;
  return {
    filter: {
      fieldName: 'pagePath',
      stringFilter: {
        matchType: 'CONTAINS',
        value: pagePath,
      },
    },
  };
}

/**
 * GA4 APIレスポンスからメトリクスを正規化してスナップショットオブジェクトを構築
 * @param {object} params
 * @param {object} params.ga4Basic - GA4基本メトリクス { sessions, totalUsers, newUsers, ... }
 * @param {object} params.ga4Conversions - コンバージョンデータ { eventName: count }
 * @param {object|null} params.gscData - GSCデータ { clicks, impressions, ctr, position }
 * @param {object|null} params.channelData - チャネル別セッション [{ channel, sessions, ... }]
 * @param {object|null} params.eventData - 外部リンク・ファイルDLデータ
 * @param {object|null} params.kpiData - KPIメトリクス
 * @param {{ startDate: string, endDate: string }} params.period - 計測期間
 * @returns {object} スナップショットオブジェクト
 */
export function buildSnapshot({
  ga4Basic = {},
  ga4Conversions = {},
  gscData = null,
  channelData = null,
  eventData = null,
  kpiData = null,
  period,
}) {
  const totalConversions = Object.values(ga4Conversions).reduce((sum, v) => sum + (v || 0), 0);

  return {
    period: `${period.startDate}_to_${period.endDate}`,
    // 基本指標
    sessions: ga4Basic.sessions || 0,
    totalUsers: ga4Basic.totalUsers || 0,
    newUsers: ga4Basic.newUsers || 0,
    pageViews: ga4Basic.screenPageViews || 0,
    engagementRate: ga4Basic.engagementRate || 0,
    bounceRate: ga4Basic.bounceRate || 0,
    avgSessionDuration: ga4Basic.averageSessionDuration || 0,
    // コンバージョン
    conversions: totalConversions,
    conversionRate: ga4Basic.sessions > 0 ? totalConversions / ga4Basic.sessions : 0,
    conversionDetail: ga4Conversions,
    // GSC
    impressions: gscData?.impressions || 0,
    clicks: gscData?.clicks || 0,
    ctr: gscData?.ctr || 0,
    avgPosition: gscData?.position || 0,
    // チャネル別
    channelSessions: channelData || null,
    // イベント
    externalLinkClicks: eventData?.externalLinkClicks || 0,
    fileDownloads: eventData?.fileDownloads || 0,
    // KPI
    kpiMetrics: kpiData || null,
  };
}

/**
 * Before/Afterスナップショットから変化率を算出
 * @param {object} before - Beforeスナップショット
 * @param {object} after - Afterスナップショット
 * @returns {object} 各指標の変化率（%）
 */
export function calculateChanges(before, after) {
  const calcRate = (bVal, aVal) => {
    if (bVal === 0 || bVal == null) return aVal > 0 ? 100 : 0;
    return ((aVal - bVal) / bVal) * 100;
  };

  return {
    sessions: calcRate(before.sessions, after.sessions),
    totalUsers: calcRate(before.totalUsers, after.totalUsers),
    newUsers: calcRate(before.newUsers, after.newUsers),
    pageViews: calcRate(before.pageViews, after.pageViews),
    engagementRate: calcRate(before.engagementRate, after.engagementRate),
    bounceRate: calcRate(before.bounceRate, after.bounceRate),
    avgSessionDuration: calcRate(before.avgSessionDuration, after.avgSessionDuration),
    conversions: calcRate(before.conversions, after.conversions),
    conversionRate: calcRate(before.conversionRate, after.conversionRate),
    impressions: calcRate(before.impressions, after.impressions),
    clicks: calcRate(before.clicks, after.clicks),
    ctr: calcRate(before.ctr, after.ctr),
    avgPosition: calcRate(before.avgPosition, after.avgPosition),
    externalLinkClicks: calcRate(before.externalLinkClicks, after.externalLinkClicks),
    fileDownloads: calcRate(before.fileDownloads, after.fileDownloads),
  };
}

/**
 * KPIの実績値をGA4データから抽出
 * @param {object} kpi - KPI定義
 * @param {object} ga4Basic - GA4基本メトリク���
 * @param {object} ga4Conversions - コンバージョンデータ
 * @returns {number}
 */
export function extractKpiActual(kpi, ga4Basic, ga4Conversions) {
  const metricMap = {
    users: ga4Basic.totalUsers,
    sessions: ga4Basic.sessions,
    pageviews: ga4Basic.screenPageViews,
    engagement_rate: ga4Basic.engagementRate,
    target_sessions: ga4Basic.sessions,
    target_users: ga4Basic.totalUsers,
    target_conversions: Object.values(ga4Conversions).reduce((s, v) => s + (v || 0), 0),
    target_conversion_rate: ga4Basic.sessions > 0
      ? Object.values(ga4Conversions).reduce((s, v) => s + (v || 0), 0) / ga4Basic.sessions
      : 0,
  };

  if (kpi.isConversion && kpi.eventName) {
    return ga4Conversions[kpi.eventName] || 0;
  }

  return metricMap[kpi.metric] ?? 0;
}
