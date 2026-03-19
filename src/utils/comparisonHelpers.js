/**
 * 期間比較ユーティリティ
 */

/**
 * 増減率を計算
 * @param {number} current - 現在の値
 * @param {number} previous - 比較期間の値
 * @returns {number|null} 増減率（%）、計算不可の場合はnull
 */
export function calculateChangePercent(current, previous) {
  if (previous == null || current == null) return null;
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return current > 0 ? 100 : -100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * 増減率をフォーマット
 * @param {number|null} value - 増減率
 * @returns {string} "+12.3%" / "-5.1%" / "—"
 */
export function formatChangePercent(value) {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * 2つの配列をキーフィールドでマージし、比較データを追加
 * @param {Array} primaryRows - 現在期間のデータ
 * @param {Array} comparisonRows - 比較期間のデータ
 * @param {string} keyField - マッチングに使うキーフィールド名
 * @param {string[]} valueFields - 比較対象の数値フィールド名リスト
 * @returns {Array} マージ済みデータ（_prev, _change 接尾辞フィールド追加）
 */
export function mergeComparisonRows(primaryRows, comparisonRows, keyField, valueFields) {
  if (!primaryRows || !comparisonRows) return primaryRows || [];

  const compMap = new Map();
  comparisonRows.forEach((row) => {
    compMap.set(row[keyField], row);
  });

  return primaryRows.map((row) => {
    const compRow = compMap.get(row[keyField]);
    const merged = { ...row };

    valueFields.forEach((field) => {
      const currentVal = parseFloat(row[field]) || 0;
      const prevVal = compRow ? (parseFloat(compRow[field]) || 0) : null;
      merged[`${field}_prev`] = prevVal;
      merged[`${field}_change`] = prevVal != null ? calculateChangePercent(currentVal, prevVal) : null;
    });

    return merged;
  });
}

/**
 * インデックスベースで2配列をマージ（日別データ等、キーが一致しない場合）
 * @param {Array} primaryRows - 現在期間のデータ
 * @param {Array} comparisonRows - 比較期間のデータ
 * @param {string[]} valueFields - 比較対象の数値フィールド名リスト
 * @returns {Array} マージ済みデータ
 */
export function mergeComparisonByIndex(primaryRows, comparisonRows, valueFields) {
  if (!primaryRows || !comparisonRows) return primaryRows || [];

  return primaryRows.map((row, i) => {
    const compRow = comparisonRows[i] || null;
    const merged = { ...row };

    valueFields.forEach((field) => {
      const currentVal = parseFloat(row[field]) || 0;
      const prevVal = compRow ? (parseFloat(compRow[field]) || 0) : null;
      merged[`${field}_prev`] = prevVal;
      merged[`${field}_change`] = prevVal != null ? calculateChangePercent(currentVal, prevVal) : null;
    });

    return merged;
  });
}
