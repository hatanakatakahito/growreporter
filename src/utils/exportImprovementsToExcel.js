import * as XLSX from 'xlsx-js-style';
import { formatEstimatedPriceLabel, formatEstimatedDeliveryLabel } from './improvementEstimate';

const categoryLabels = {
  acquisition: '集客',
  content: 'コンテンツ',
  design: 'デザイン',
  feature: '機能',
  other: 'その他',
};
const priorityLabels = { high: '高', medium: '中', low: '低' };
const statusLabels = { draft: '起案', in_progress: '対応中', completed: '完了' };

// 改善モックアップ共有 URL のベース (Firebase Hosting rewrite で serveMockup に流れる)
const MOCKUP_SHARE_BASE_URL = 'https://grow-reporter.com';

/**
 * mockupStorageUrl から siteId / improvementId を抽出して
 * grow-reporter.com 形式の共有 URL を組み立てる
 * モックアップ未生成の場合は空文字を返す
 */
function buildMockupShareUrl(mockupStorageUrl) {
  if (!mockupStorageUrl) return '';
  const m = String(mockupStorageUrl).match(/\/page-mockups\/([^/]+)\/([^/]+)\.html/);
  if (!m) return '';
  return `${MOCKUP_SHARE_BASE_URL}/page-mockups/${m[1]}/${m[2]}.html`;
}

/**
 * モックアップ列に表示する値を決定
 * - URL あり: URL 文字列 (ハイパーリンク化)
 * - URL なし + mockupSkipped: "対応不要" (非ビジュアル改善で意図的に生成スキップ)
 * - URL なし + 通常: "未生成"
 */
function getMockupCellDisplay(item) {
  const url = buildMockupShareUrl(item.mockupStorageUrl);
  if (url) return { value: url, isUrl: true };
  if (item.mockupSkipped) return { value: '対応不要', isUrl: false };
  return { value: '未生成', isUrl: false };
}

function sortByOrderOrCreatedAt(list) {
  return list.slice().sort((a, b) => {
    const orderA = a.order != null ? Number(a.order) : (a.createdAt?.toMillis?.() ?? a.createdAt ?? 0);
    const orderB = b.order != null ? Number(b.order) : (b.createdAt?.toMillis?.() ?? b.createdAt ?? 0);
    return orderA - orderB;
  });
}

/**
 * 列順は分析エクスポート (functions-python/export_excel/sheets/improvements.py) と
 * 揃える: No → カテゴリ → 優先度 → タイトル → 対象URL → モックアップURL → 説明 → 期待効果 → 目安料金 → 納期 → ステータス → 対象箇所
 * モックアップURL は対象URL の隣に配置 (ハイパーリンク化)
 * 分析シートに無い JS 固有列 (ステータス・対象箇所) は末尾に残す
 */
const COL_WIDTHS = [
  { wch: 4.25 },   // No.
  { wch: 10.25 },  // カテゴリ
  { wch: 6.25 },   // 優先度
  { wch: 50.25 },  // タイトル
  { wch: 40.25 },  // 対象URL
  { wch: 60.25 },  // モックアップURL
  { wch: 60.25 },  // 説明
  { wch: 40.25 },  // 期待効果
  { wch: 18.25 },  // 目安料金（税別）
  { wch: 14.25 },  // 納期（営業日）
  { wch: 8.25 },   // ステータス
  { wch: 20.25 },  // 対象箇所
];

/** モックアップURL 列のインデックス (ハイパーリンク化対象) */
const MOCKUP_URL_COL_INDEX = 5;

/** ヘッダー行のスタイル */
const HEADER_STYLE = {
  fill: { fgColor: { rgb: 'D9D9D9' } },
  font: { name: 'MS Gothic', sz: 10, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

/** 1行の高さ（pt）。MS Gothic 10pt 折り返し＋余白を多めに */
const LINE_HEIGHT_PT = 15.5;
/** 行の最小高さ（pt） */
const MIN_ROW_HEIGHT_PT = 26.25;
/** 行の最大高さ（pt）。Excelの上限 409 以内 */
const MAX_ROW_HEIGHT_PT = 409;
/** 列幅 wch あたりの1行に収まる文字数 */
const CHARS_PER_UNIT_WCH = 0.5;

/** データセル用のスタイル（折り返し＋縦中央） */
function getDataCellStyle() {
  return {
    font: { name: 'MS Gothic', sz: 10 },
    alignment: { vertical: 'center', wrapText: true },
  };
}

/** ハイパーリンクセル用のスタイル (Excel 標準のリンク色) */
function getHyperlinkCellStyle() {
  return {
    font: { name: 'MS Gothic', sz: 10, color: { rgb: '0563C1' }, underline: true },
    alignment: { vertical: 'center', wrapText: true },
  };
}

/**
 * 改善案一覧を Excel (.xlsx) の Blob で生成する
 * 列順は分析エクスポート (improvements.py) に揃える + モックアップURL 列を追加
 */
export async function exportImprovementsToExcel(improvements, siteName = 'サイト') {
  const sorted = sortByOrderOrCreatedAt(improvements || []);

  const headers = [
    'No.',
    'カテゴリ',
    '優先度',
    'タイトル',
    '対象URL',
    'モックアップURL',
    '説明',
    '期待効果',
    '目安料金（税別）',
    '納期（営業日）',
    'ステータス',
    '対象箇所',
  ];

  // モックアップ列の表示値を行ごとに事前計算 (ハイパーリンク化判定で使うため)
  const mockupDisplays = sorted.map(item => getMockupCellDisplay(item));

  const rows = sorted.map((item, index) => [
    index + 1,
    (item.category && categoryLabels[item.category]) ? categoryLabels[item.category] : (item.category || ''),
    (item.priority && priorityLabels[item.priority]) ? priorityLabels[item.priority] : (item.priority || ''),
    item.title || '',
    (item.targetPageUrl || '').trim(),
    mockupDisplays[index].value,
    (item.description || '').trim(),
    item.expectedImpact || '',
    formatEstimatedPriceLabel(item.estimatedLaborHours) + (formatEstimatedPriceLabel(item.estimatedLaborHours) !== '要相談' ? '（税別）' : ''),
    formatEstimatedDeliveryLabel(item.estimatedLaborHours),
    (item.status && statusLabels[item.status]) ? statusLabels[item.status] : (item.status || ''),
    item.targetArea || '',
  ]);

  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = COL_WIDTHS;

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  ws['!rows'] = [];

  for (let R = range.s.r; R <= range.e.r; R++) {
    if (R === 0) {
      ws['!rows'][R] = { hpt: MIN_ROW_HEIGHT_PT };
      continue;
    }
    let maxLines = 1;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell || cell.v == null) continue;
      const str = String(cell.v).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const wch = COL_WIDTHS[C]?.wch ?? 10;
      const charsPerLine = Math.max(8, wch * CHARS_PER_UNIT_WCH);
      const segments = str.split('\n');
      let lines = 0;
      for (const seg of segments) {
        lines += Math.max(1, Math.ceil(seg.length / charsPerLine));
      }
      maxLines = Math.max(maxLines, lines);
    }
    const hpt = Math.min(MAX_ROW_HEIGHT_PT, Math.max(MIN_ROW_HEIGHT_PT, Math.ceil(maxLines * LINE_HEIGHT_PT * 1.05)));
    ws['!rows'][R] = { hpt };
  }

  // ヘッダースタイル
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellAddress]) ws[cellAddress].s = HEADER_STYLE;
  }

  // データセル: 通常スタイル + モックアップURL 列は URL 行のみハイパーリンク化
  const dataStyle = getDataCellStyle();
  const linkStyle = getHyperlinkCellStyle();
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) continue;
      // モックアップ列で、かつ事前判定で URL だった行だけハイパーリンク化
      // (「未生成」「対応不要」のテキスト行はハイパーリンクにしない)
      const rowIdx = R - 1; // 0-indexed
      if (C === MOCKUP_URL_COL_INDEX && cell.v && mockupDisplays[rowIdx]?.isUrl) {
        cell.l = { Target: String(cell.v), Tooltip: 'After モックアップを開く' };
        cell.s = linkStyle;
      } else {
        cell.s = dataStyle;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const safeSheetName = (siteName || '改善案').replace(/[/\\:*?"[\]]/g, '_').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName || '改善案');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * 改善案を Excel でダウンロードする
 * ファイル名: サイト名_サイト改善案_YYYYMMDD.xlsx
 */
export async function downloadImprovementsExcel(improvements, siteName = 'サイト') {
  const blob = await exportImprovementsToExcel(improvements, siteName);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = (siteName || 'サイト').replace(/[/\\:*?"<>|]/g, '_').trim() || 'サイト';
  const fileName = `${safeName}_サイト改善案_${dateStr}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
