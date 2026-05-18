/**
 * 問い合わせ管理画面で共有する定数・ユーティリティ
 *
 * InquiryList / InquirySummaryPanel から共通参照される。
 * fast-refresh が壊れないよう、コンポーネントとは別ファイルに切り出している。
 */

export const STATUS_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'new', label: '新規' },
  { value: 'estimate_created', label: '見積作成済み' },
  { value: 'contract_sent', label: '契約書送付済み' },
  { value: 'active', label: '契約中' },
  { value: 'cancelled', label: '解約' },
  { value: 'inquiry_cancelled', label: '申込キャンセル' },
];

export const STATUS_BADGE = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  estimate_created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  contract_sent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  active: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  // completed は 2026-04-30 に廃止。既存データの表示用にラベル/バッジ定義のみ残す（フォールバック）
  completed: 'bg-gray-100 text-gray-600 dark:bg-dark-3 dark:text-dark-6',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  inquiry_cancelled: 'bg-gray-100 text-gray-500 dark:bg-dark-3 dark:text-dark-6',
};

export const STATUS_LABEL = {
  new: '新規',
  estimate_created: '見積作成済み',
  contract_sent: '契約書送付済み',
  active: '契約中',
  // completed は廃止。既存データのフォールバック表示のみ
  completed: '完了（廃止）',
  cancelled: '解約',
  inquiry_cancelled: '申込キャンセル',
};

export const PAYMENT_LABEL = {
  bulk: '一括請求',
  recurring: '定期請求',
};

export function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return '-'; }
}
