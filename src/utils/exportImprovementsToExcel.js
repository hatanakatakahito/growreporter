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

function sortByOrderOrCreatedAt(list) {
  return list.slice().sort((a, b) => {
    const orderA = a.order != null ? Number(a.order) : (a.createdAt?.toMillis?.() ?? a.createdAt ?? 0);
    const orderB = b.order != null ? Number(b.order) : (b.createdAt?.toMillis?.() ?? b.createdAt ?? 0);
    return orderA - orderB;
  });
}

/** サイト改善案.xlsx 参照の列幅（wch） */
const COL_WIDTHS = [
  { wch: 4.25 },   // No.
  { wch: 50.25 },  // タイトル
  { wch: 60.25 },  // 説明
  { wch: 10.25 },  // カテゴリ
  { wch: 6.25 },   // 優先度
  { wch: 8.25 },   // ステータス
  { wch: 40.25 },  // 対象URL
  { wch: 20.25 },  // 対象箇所
  { wch: 40.25 },  // 期待効果
  { wch: 18.25 },  // 目安料金（税別）
  { wch: 14.25 },  // 納期（営業日）
];

/** ヘッダー行のスタイル（サイト改善案.xlsx / Wireframe現状サイトマップと同様） */
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
/** 列幅 wch あたりの1行に収まる文字数（日本語は全角で約0.5〜0.6なので控えめに） */
const CHARS_PER_UNIT_WCH = 0.5;

/** データセル用のスタイル（折り返し＋縦中央） */
function getDataCellStyle() {
  return {
    font: { name: 'MS Gothic', sz: 10 },
    alignment: { vertical: 'center', wrapText: true },
  };
}

/**
 * 改善案一覧を Excel (.xlsx) の Blob で生成する
 * 書式: format/improve/サイト改善案.xlsx に準拠（Wireframe 現状サイトマップExcelと同様に xlsx-js-style で書式を適用）
 * @param {Array<{ title, description?, category?, priority?, status?, targetPageUrl?, targetArea?, expectedImpact?, estimatedLaborHours? }>} improvements
 * @param {string} siteName - サイト名（シート名・ファイル名に使用）
 * @returns {Promise<Blob>}
 */
export async function exportImprovementsToExcel(improvements, siteName = 'サイト') {
  const sorted = sortByOrderOrCreatedAt(improvements || []);

  const headers = [
    'No.',
    'タイトル',
    '説明',
    'カテゴリ',
    '優先度',
    'ステータス',
    '対象URL',
    '対象箇所',
    '期待効果',
    '目安料金（税別）',
    '納期（営業日）',
  ];

  const rows = sorted.map((item, index) => [
    index + 1,
    item.title || '',
    (item.description || '').trim(),
    (item.category && categoryLabels[item.category]) ? categoryLabels[item.category] : (item.category || ''),
    (item.priority && priorityLabels[item.priority]) ? priorityLabels[item.priority] : (item.priority || ''),
    (item.status && statusLabels[item.status]) ? statusLabels[item.status] : (item.status || ''),
    (item.targetPageUrl || '').trim(),
    item.targetArea || '',
    item.expectedImpact || '',
    formatEstimatedPriceLabel(item.estimatedLaborHours),
    formatEstimatedDeliveryLabel(item.estimatedLaborHours),
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

  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellAddress]) ws[cellAddress].s = HEADER_STYLE;
  }

  const dataStyle = getDataCellStyle();
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[cellAddress]) ws[cellAddress].s = dataStyle;
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
