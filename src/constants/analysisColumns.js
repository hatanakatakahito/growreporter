/**
 * 分析ページの DataTable 列定義（Excel エクスポート共用）
 *
 * 各 tableKey ごとに画面で表示している完全な列リストを保持する。
 * Excel 生成時に localStorage の `gr:table-columns:<tableKey>` と
 * `gr:table-order:<tableKey>` を読み取り、ユーザーの表示状態をそのまま
 * Excel に反映するために使用する。
 *
 * フィールド:
 *  - key:            データ行のプロパティ名
 *  - label:          ヘッダ表示名
 *  - format:         'number' | 'decimal' | 'percent' | 'duration' | 'string'（省略=string）
 *  - required:       true の場合はユーザーが非表示にできず常に出力
 *  - defaultVisible: false の場合はデフォルト非表示（ユーザーが表示に切替可）
 *  - comparison:     true の場合、比較モード時に前期値・変化率の列を追加
 */

// 共通の「期間×メトリクス」列セット（日/曜日/時間帯で共通）
const PERIOD_METRIC_COLUMNS = [
  { key: 'sessions', label: '訪問者', format: 'number', comparison: true },
  { key: 'users', label: 'ユーザー', format: 'number', defaultVisible: false, comparison: true },
  { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
  { key: 'pageViews', label: 'PV数', format: 'number', defaultVisible: false, comparison: true },
  { key: 'engagementRate', label: 'ENG率', format: 'percent', defaultVisible: false, comparison: true },
  { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
  { key: 'avgSessionDuration', label: '平均滞在', format: 'duration', defaultVisible: false, comparison: true },
  { key: 'conversions', label: 'コンバージョン', format: 'number', comparison: true },
  { key: 'conversionRate', label: 'CVR', format: 'percent', defaultVisible: false },
];

export const ANALYSIS_COLUMNS = {
  'analysis-month': [
    { key: 'label', label: '年月', required: true },
    { key: 'users', label: 'ユーザー数', format: 'number', comparison: true },
    { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'sessions', label: '訪問者', format: 'number', comparison: true },
    { key: 'avgPageviews', label: '平均PV', format: 'decimal', comparison: true },
    { key: 'pageViews', label: '表示回数', format: 'number', comparison: true },
    { key: 'engagementRate', label: 'ENG率', format: 'percent', comparison: true },
    { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'averageSessionDuration', label: '平均滞在時間', format: 'duration', defaultVisible: false, comparison: true },
    { key: 'conversions', label: 'CV数', format: 'number', comparison: true },
    { key: 'conversionRate', label: 'CVR', format: 'percent', comparison: true },
  ],
  'analysis-day': [
    { key: 'date', label: '日付', required: true },
    ...PERIOD_METRIC_COLUMNS,
  ],
  'analysis-week': [
    { key: 'dayName', label: '曜日', required: true },
    ...PERIOD_METRIC_COLUMNS,
  ],
  'analysis-hour': [
    { key: 'hour', label: '時間帯', required: true },
    ...PERIOD_METRIC_COLUMNS,
  ],
  'analysis-channels': [
    { key: 'channelName', label: 'チャネル', required: true },
    { key: 'sessions', label: '訪問者', format: 'number', comparison: true },
    { key: 'sessionRate', label: '割合', format: 'percent' },
    { key: 'users', label: 'ユーザー', format: 'number', comparison: true },
    { key: 'conversions', label: 'コンバージョン', format: 'number', comparison: true },
    { key: 'conversionRate', label: 'CVR', format: 'percent', comparison: true },
    { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'pageViews', label: 'PV数', format: 'number', defaultVisible: false, comparison: true },
    { key: 'engagementRate', label: 'ENG率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'avgSessionDuration', label: '平均滞在', format: 'duration', defaultVisible: false, comparison: true },
  ],
  'analysis-keywords': [
    { key: 'keyword', label: 'キーワード', required: true },
    { key: 'clicks', label: 'クリック数', format: 'number', comparison: true },
    { key: 'impressions', label: '表示回数', format: 'number', comparison: true },
    { key: 'ctr', label: 'クリック率', format: 'percent', comparison: true },
    { key: 'position', label: '平均掲載順位', format: 'decimal', comparison: true },
  ],
  'analysis-referrals': [
    { key: 'source', label: '参照元', required: true },
    { key: 'sessions', label: '訪問者', format: 'number', comparison: true },
    { key: 'users', label: 'ユーザー数', format: 'number', comparison: true },
    { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'pageViews', label: '表示回数', format: 'number', defaultVisible: false, comparison: true },
    { key: 'engagementRate', label: 'ENG率', format: 'percent', comparison: true },
    { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'avgSessionDuration', label: '平均滞在時間', format: 'duration', comparison: true },
    { key: 'conversions', label: 'コンバージョン', format: 'number', comparison: true },
    { key: 'conversionRate', label: 'CVR', format: 'percent', comparison: true },
  ],
  'analysis-pages': [
    { key: 'path', label: 'ページパス', required: true },
    { key: 'pageViews', label: 'ページビュー', format: 'number', comparison: true },
    { key: 'sessions', label: '訪問者', format: 'number', defaultVisible: false, comparison: true },
    { key: 'users', label: 'ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'engagementRate', label: 'ENG率', format: 'percent', comparison: true },
    { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'avgDuration', label: '平均滞在時間', format: 'duration', comparison: true },
    { key: 'conversions', label: 'コンバージョン', format: 'number', defaultVisible: false, comparison: true },
    { key: 'conversionRate', label: 'CVR', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'interestScore', label: '興味スコア', format: 'decimal', comparison: true },
    { key: 'scrollRate', label: '完読率', format: 'percent', defaultVisible: false, comparison: true },
  ],
  'analysis-page-categories': [
    { key: 'category', label: 'カテゴリ', required: true },
    { key: 'pages', label: '配下のページ数', format: 'number' },
    { key: 'pageViews', label: 'ページビュー', format: 'number', comparison: true },
    { key: 'sessions', label: '訪問者', format: 'number', defaultVisible: false, comparison: true },
    { key: 'users', label: 'ユーザー数', format: 'number', defaultVisible: false, comparison: true },
    { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'engagementRate', label: 'ENG率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'avgDuration', label: '平均滞在時間', format: 'duration', defaultVisible: false, comparison: true },
    { key: 'conversions', label: 'コンバージョン', format: 'number', defaultVisible: false, comparison: true },
    { key: 'conversionRate', label: 'CVR', format: 'percent', defaultVisible: false, comparison: true },
  ],
  'analysis-landing-pages': [
    { key: 'path', label: 'ランディングページ', required: true },
    { key: 'sessions', label: '訪問者', format: 'number', comparison: true },
    { key: 'users', label: 'ユーザー数', format: 'number', defaultVisible: false, comparison: true },
    { key: 'newUsers', label: '新規ユーザー', format: 'number', defaultVisible: false, comparison: true },
    { key: 'pageViews', label: '表示回数', format: 'number', defaultVisible: false, comparison: true },
    { key: 'engagementRate', label: 'ENG率', format: 'percent', comparison: true },
    { key: 'bounceRate', label: '直帰率', format: 'percent', defaultVisible: false, comparison: true },
    { key: 'avgSessionDuration', label: '平均滞在時間', format: 'duration', comparison: true },
    { key: 'conversions', label: 'コンバージョン', format: 'number', comparison: true },
    { key: 'conversionRate', label: 'CVR', format: 'percent', comparison: true },
  ],
  'analysis-file-downloads': [
    { key: 'fileName', label: 'ファイル名', required: true },
    { key: 'downloads', label: 'ダウンロード数', format: 'number', comparison: true },
    { key: 'users', label: 'ユーザー数', format: 'number', comparison: true },
  ],
  'analysis-external-links': [
    { key: 'linkUrl', label: 'URL', required: true },
    { key: 'clicks', label: 'クリック数', format: 'number', comparison: true },
    { key: 'users', label: 'ユーザー数', format: 'number', comparison: true },
  ],
};

const STORAGE_PREFIX = 'gr:table-columns:';
const ORDER_PREFIX = 'gr:table-order:';

function readStorage(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * ユーザーの localStorage 設定を反映した表示列を返す
 * （useTableColumns と同じマージロジック）
 */
export function resolveVisibleColumns(tableKey) {
  const columns = ANALYSIS_COLUMNS[tableKey];
  if (!columns) return [];

  const storedVisible = readStorage(STORAGE_PREFIX + tableKey);
  const storedOrder = readStorage(ORDER_PREFIX + tableKey);

  const requiredKeys = columns.filter((c) => c.required).map((c) => c.key);
  const defaultVisibleKeys = columns
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);

  // 表示キー集合
  let visibleKeys;
  if (storedVisible) {
    const storedSet = new Set(storedVisible);
    // ストアに未登録の新しいデフォルト表示列を追加（useTableColumns と同じ挙動）
    const newDefaults = columns
      .filter((c) => c.defaultVisible !== false && !storedSet.has(c.key))
      .map((c) => c.key);
    visibleKeys = Array.from(
      new Set([
        ...requiredKeys,
        ...storedVisible.filter((k) => columns.some((c) => c.key === k)),
        ...newDefaults,
      ])
    );
  } else {
    visibleKeys = Array.from(new Set([...requiredKeys, ...defaultVisibleKeys]));
  }

  // 並び順
  const allKeys = columns.map((c) => c.key);
  let orderKeys;
  if (storedOrder) {
    const valid = storedOrder.filter((k) => allKeys.includes(k));
    const missing = allKeys.filter((k) => !valid.includes(k));
    orderKeys = [...valid, ...missing];
  } else {
    orderKeys = allKeys;
  }

  // visible × order
  const visibleSet = new Set(visibleKeys);
  const orderedVisibleKeys = orderKeys.filter((k) => visibleSet.has(k));

  return orderedVisibleKeys
    .map((k) => columns.find((c) => c.key === k))
    .filter(Boolean);
}

/**
 * セル値に変換（Excel 用）
 */
export function formatCellValue(col, value) {
  if (value == null) return '';
  switch (col.format) {
    case 'number':
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'decimal':
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'percent':
      // 入力は 0-1 の小数（画面側 render で *100 している）
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'duration':
      // 秒数を m:ss 文字列に変換
      {
        const v = Number(value) || 0;
        const m = Math.floor(v / 60);
        const s = Math.floor(v % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      }
    default:
      return String(value);
  }
}
