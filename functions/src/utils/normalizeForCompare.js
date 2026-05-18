/**
 * 文字列比較用の正規化ヘルパー（サーバー側）
 *
 * 大文字小文字・スペース有無を同一視するため、以下の正規化を行う:
 *   - toLowerCase
 *   - 半角・全角スペース（連続含む）をすべて除去
 *
 * 用途: プランID正規化、board API 顧客マッチング等
 */
const WHITESPACE_PATTERN = new RegExp('[\\s\\u3000]+', 'g');

export function normalizeForCompare(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(WHITESPACE_PATTERN, '');
}

export default normalizeForCompare;
