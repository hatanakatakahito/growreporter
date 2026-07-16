/**
 * KPI 予実テーブルの実績解決ロジック（テーブル描画と AI 考察生成で共用）。
 * kpiSettings.kpiList の各 KPI を、観測期間の実績値（actuals）に突合する。
 */

/** kpiSettings.kpiList の metric → 観測期間 KPI のフィールド。
 *  基本指標 / target_* / snake_case の別名も canonical に解決する。
 *  CV イベント別目標（metric が "conversion_<eventName>"）は actuals.conversionEvents から別途解決。 */
const METRIC_FIELD_MAP = {
  sessions: 'sessions', session: 'sessions', target_sessions: 'sessions',
  users: 'users', totalUsers: 'users', user: 'users', target_users: 'users',
  newUsers: 'newUsers', newUser: 'newUsers',
  conversions: 'conversions', conversion: 'conversions', cv: 'conversions', target_conversions: 'conversions',
  conversionRate: 'conversionRate', cvr: 'conversionRate', target_conversion_rate: 'conversionRate',
  pageViews: 'pageViews', screenPageViews: 'pageViews', pageview: 'pageViews', pageviews: 'pageViews', pv: 'pageViews',
  engagementRate: 'engagementRate', engagement_rate: 'engagementRate',
  clicks: 'clicks', click: 'clicks',
  impressions: 'impressions', impression: 'impressions',
};
const RATE_METRICS = new Set(['conversionRate', 'cvr', 'engagementRate']);

/** metric が「率」系か（target_conversion_rate / engagement_rate 等も拾う） */
export function isRateMetric(kpi) {
  if (RATE_METRICS.has(kpi.metric) || kpi.type === 'rate') return true;
  return typeof kpi.metric === 'string' && kpi.metric.toLowerCase().includes('rate');
}

/** KPI 1件の観測期間実績を解決。CVイベント別目標はイベント名で内訳マップを参照 */
export function resolveActual(kpi, actuals) {
  if (kpi.isConversion || (typeof kpi.metric === 'string' && kpi.metric.startsWith('conversion_'))) {
    const evMap = actuals.conversionEvents || {};
    const ev = kpi.eventName;
    return ev && evMap[ev] != null ? Number(evMap[ev]) : null;
  }
  const field = METRIC_FIELD_MAP[kpi.metric];
  return field && actuals[field] != null ? Number(actuals[field]) : null;
}

/** kpiList × 観測期間実績 → 予実行（{name, isRate, target, actual, achievement}）。テーブル描画と考察生成で共用 */
export function computeKpiTargetRows(kpiList, actuals) {
  if (!Array.isArray(kpiList) || kpiList.length === 0 || !actuals) return [];
  return kpiList.map((kpi) => {
    const isRate = isRateMetric(kpi);
    const actual = resolveActual(kpi, actuals);
    const targetRaw = kpi.monthlyTarget ?? kpi.target ?? kpi.monthlyValue ?? kpi.value ?? null;
    let target = targetRaw != null && !Number.isNaN(Number(targetRaw)) ? Number(targetRaw) : null;
    if (target != null && isRate && target > 1) target = target / 100;
    const achievement = target && actual != null && target !== 0 ? (actual / target) * 100 : null;
    return { name: kpi.name || kpi.label || '(KPI)', isRate, target, actual, achievement };
  });
}
