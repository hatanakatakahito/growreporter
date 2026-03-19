/**
 * 改善案の目安料金・納期を算出する（GrowGroup仕様）
 * 単価: 8,000円/時（税別）、ディレクション: 工数合計の20％、納期は最低3営業日
 */

const HOURLY_RATE = 8000;
const DIRECTION_RATE = 1.2; // 工数 + 20% ディレクション
const MIN_DELIVERY_DAYS = 3;

/**
 * 想定工数（時間）から目安料金（税別）を算出
 * @param {number|null|undefined} estimatedLaborHours - 想定工数（時間）
 * @returns {number|null} 税別金額（整数）、未設定時は null
 */
export function getEstimatedPrice(estimatedLaborHours) {
  if (estimatedLaborHours == null || estimatedLaborHours === '' || Number.isNaN(Number(estimatedLaborHours))) {
    return null;
  }
  const hours = Number(estimatedLaborHours);
  if (hours <= 0) return null;
  return Math.round(hours * HOURLY_RATE * DIRECTION_RATE);
}

/** 1営業日あたりの稼働時間（時間→営業日換算に使用） */
const HOURS_PER_BUSINESS_DAY = 8;

/**
 * 想定工数（時間）から目安納期（営業日）を算出
 * 1営業日＝8時間で換算（例: 40時間 → 5営業日）
 * @param {number|null|undefined} estimatedLaborHours - 想定工数（時間）
 * @returns {number|null} 営業日（整数）、未設定時は null
 */
export function getEstimatedDeliveryDays(estimatedLaborHours) {
  if (estimatedLaborHours == null || estimatedLaborHours === '' || Number.isNaN(Number(estimatedLaborHours))) {
    return null;
  }
  const hours = Number(estimatedLaborHours);
  if (hours <= 0) return null;
  const businessDays = Math.ceil(hours / HOURS_PER_BUSINESS_DAY);
  return Math.max(MIN_DELIVERY_DAYS, businessDays);
}

/**
 * 目安料金の表示用文字列（～を末尾に付けて「以上」の意を明示）
 * @param {number|null|undefined} estimatedLaborHours
 * @returns {string} 例: "9,600円（税別）～" または "要相談"
 */
export function formatEstimatedPriceLabel(estimatedLaborHours) {
  const price = getEstimatedPrice(estimatedLaborHours);
  if (price == null) return '要相談';
  return `${price.toLocaleString()}円～`;
}

/**
 * 目安納期の表示用文字列（～を末尾に付けて「以上」の意を明示）
 * @param {number|null|undefined} estimatedLaborHours
 * @returns {string} 例: "3営業日～" または "要相談"
 */
export function formatEstimatedDeliveryLabel(estimatedLaborHours) {
  const days = getEstimatedDeliveryDays(estimatedLaborHours);
  if (days == null) return '要相談';
  return `${days}営業日～`;
}
