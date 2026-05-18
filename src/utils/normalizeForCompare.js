/**
 * 文字列比較用の正規化ヘルパー
 *
 * 大文字小文字・スペース有無を同一視するため、以下の正規化を行う:
 *   - toLowerCase
 *   - 半角・全角スペース（連続含む）をすべて除去
 *
 * 用途: プランID（'Business' / ' business ' / 'BUSINESS'）や
 *       会社名マッチング（'株式会社 グロー' / '株式会社グロー'）の同一視
 */
const WHITESPACE_PATTERN = new RegExp('[\\s\\u3000]+', 'g');

export function normalizeForCompare(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(WHITESPACE_PATTERN, '');
}

export default normalizeForCompare;
