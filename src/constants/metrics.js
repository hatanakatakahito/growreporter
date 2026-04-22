import raw from '../../shared/metrics.json';

const METRICS = raw.metrics;
const COMPARISON_SUFFIX = raw.comparisonSuffix;
const TARGET_PREFIX = raw.targetPrefix;

const ALIAS_MAP = (() => {
  const map = new Map();
  for (const [key, meta] of Object.entries(METRICS)) {
    map.set(key, key);
    for (const alias of meta.aliases || []) {
      map.set(alias, key);
    }
  }
  return map;
})();

function stripTargetPrefix(key) {
  if (typeof key !== 'string') return key;
  if (key.startsWith('target_')) return key.slice('target_'.length);
  return key;
}

export function resolveAlias(key) {
  if (key == null) return null;
  const stripped = stripTargetPrefix(key);
  if (ALIAS_MAP.has(stripped)) return ALIAS_MAP.get(stripped);
  return null;
}

function getMetric(key) {
  const canonical = resolveAlias(key);
  if (!canonical) return null;
  return METRICS[canonical];
}

export function getLabel(key, fallback = key) {
  const m = getMetric(key);
  return m ? m.label : fallback;
}

export function getShortLabel(key, fallback = key) {
  const m = getMetric(key);
  return m ? m.shortLabel : fallback;
}

export function getTooltip(key, fallback = '') {
  const m = getMetric(key);
  return m ? m.description : fallback;
}

export function getFormat(key) {
  const m = getMetric(key);
  return m ? m.format : 'number';
}

export function getUnit(key) {
  const m = getMetric(key);
  return m ? (m.suffix || '') : '';
}

export function getInvertColor(key) {
  const m = getMetric(key);
  return m ? !!m.invertColor : false;
}

export function getAiYasashii(key) {
  const m = getMetric(key);
  return m ? m.aiYasashii : null;
}

export function getTargetLabel(key) {
  const canonical = resolveAlias(key);
  if (!canonical) return key;
  return `${TARGET_PREFIX}${METRICS[canonical].label}`;
}

export function formatComparisonLabel(key, kind, opts = {}) {
  const base = opts.useShort ? getShortLabel(key) : getLabel(key);
  const suffix = COMPARISON_SUFFIX[kind] || '';
  return `${base}${suffix}`;
}

function formatNumber(n, decimals) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  const num = Number(n);
  return num.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDurationHms(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return '-';
  const total = Math.round(Number(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}

export function formatValue(key, value, opts = {}) {
  const m = getMetric(key);
  if (!m) {
    if (value == null) return '-';
    return String(value);
  }
  if (value == null || value === '') return '-';

  const suffix = opts.omitSuffix ? '' : (m.suffix || '');

  switch (m.format) {
    case 'percent':
      return `${formatNumber(value, m.decimals ?? 1)}${suffix}`;
    case 'decimal':
      return `${formatNumber(value, m.decimals ?? 2)}${suffix}`;
    case 'rankDecimal':
      return `${formatNumber(value, m.decimals ?? 1)}${suffix}`;
    case 'duration':
      return formatDurationHms(value);
    case 'number':
    default:
      return `${formatNumber(value, m.decimals ?? 0)}${suffix}`;
  }
}

export function listMetricKeys() {
  return Object.keys(METRICS);
}

export function getMetricMeta(key) {
  return getMetric(key);
}

export const METRICS_RAW = METRICS;
