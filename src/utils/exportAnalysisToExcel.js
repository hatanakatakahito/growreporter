import * as XLSX from 'xlsx-js-style';
import { resolveVisibleColumns } from '../constants/analysisColumns';
import { getLabel, getShortLabel } from '../constants/metrics';

// ─── スタイル定数 ───────────────────────────────────────────
const FONT_BASE = { name: 'MS Gothic', sz: 10 };

/** データテーブルヘッダー（ダークグレー背景・白文字・太字・中央揃え） */
const HEADER_STYLE = {
  fill: { fgColor: { rgb: '404040' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder(),
};

/** データセル（折り返し・縦中央） */
const DATA_CELL_STYLE = {
  font: { ...FONT_BASE },
  alignment: { vertical: 'center', wrapText: true },
  border: thinBorder(),
};

/** 数値セル（右揃え・カンマ区切り） */
const NUMBER_CELL_STYLE = {
  font: { ...FONT_BASE },
  alignment: { vertical: 'center', horizontal: 'right', wrapText: false },
  border: thinBorder(),
  numFmt: '#,##0',
};

/** パーセンテージセル（右揃え） */
const PERCENT_CELL_STYLE = {
  font: { ...FONT_BASE },
  alignment: { vertical: 'center', horizontal: 'right', wrapText: false },
  border: thinBorder(),
};

/** AI分析セクションヘッダー（パープル背景・白文字・太字） */
const AI_SECTION_STYLE = {
  fill: { fgColor: { rgb: '9333EA' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

/** AI分析テキスト */
const AI_CONTENT_STYLE = {
  font: { ...FONT_BASE },
  alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
};

/** メモセクションヘッダー（ブルー背景・白文字・太字） */
const MEMO_SECTION_STYLE = {
  fill: { fgColor: { rgb: '3758F9' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

/** メモ内容 */
const MEMO_CONTENT_STYLE = {
  font: { ...FONT_BASE },
  alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
};

/** 合計/平均行（薄いグレー背景・太字） */
const TOTAL_LABEL_STYLE = {
  fill: { fgColor: { rgb: 'E7E6E6' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: thinBorder(),
};
const TOTAL_NUMBER_STYLE = {
  fill: { fgColor: { rgb: 'E7E6E6' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: thinBorder(),
  numFmt: '#,##0',
};
const TOTAL_TEXT_STYLE = {
  fill: { fgColor: { rgb: 'E7E6E6' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: '000000' } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: thinBorder(),
};

/** 比較ヘッダー（オレンジ背景） */
const COMP_HEADER_STYLE = {
  fill: { fgColor: { rgb: 'F59E0B' } },
  font: { ...FONT_BASE, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder(),
};

/** 変化率ヘルパー */
function fmtChange(current, prev) {
  if (prev == null || prev === 0 || current == null) return '-';
  const change = ((current - prev) / prev * 100).toFixed(1);
  return `${change > 0 ? '+' : ''}${change}%`;
}

/** 表紙タイトル */
const COVER_TITLE_STYLE = {
  font: { name: 'MS Gothic', sz: 16, bold: true, color: { rgb: '333333' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const COVER_LABEL_STYLE = {
  font: { ...FONT_BASE, bold: true, color: { rgb: '666666' } },
  alignment: { vertical: 'center' },
};

const COVER_VALUE_STYLE = {
  font: { ...FONT_BASE, color: { rgb: '333333' } },
  alignment: { vertical: 'center' },
};

// ─── 行高さ計算定数 ─────────────────────────────────────────
const LINE_HEIGHT_PT = 15.5;
const MIN_ROW_HEIGHT_PT = 22;
const MAX_ROW_HEIGHT_PT = 409;
const CHARS_PER_UNIT_WCH = 0.5;

// ─── ヘルパー関数 ───────────────────────────────────────────
function thinBorder() {
  const side = { style: 'thin', color: { rgb: 'CCCCCC' } };
  return { top: side, bottom: side, left: side, right: side };
}

/** 日本語の曜日名 */
export const DAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

/** チャネル名の日本語変換 */
export const CHANNEL_MAP = {
  'Organic Search': 'オーガニック検索',
  'Direct': 'ダイレクト',
  'Referral': '参照元サイト',
  'Organic Social': 'オーガニックSNS',
  'Paid Search': 'リスティング広告',
  'Paid Social': 'SNS広告',
  'Email': 'メール',
  'Display': 'ディスプレイ広告',
  'Affiliates': 'アフィリエイト',
  'Unassigned': '未分類',
  '(other)': 'その他',
};

export function fmt(v) {
  if (v == null) return '-';
  if (typeof v === 'number') return v;
  return v;
}

export function fmtNum(v) {
  if (v == null || v === '') return 0;
  return typeof v === 'number' ? v : Number(v) || 0;
}

export function fmtPct(v) {
  if (v == null) return '-';
  const n = typeof v === 'number' ? v : Number(v);
  if (isNaN(n)) return '-';
  return `${(n * 100).toFixed(2)}%`;
}

export function fmtPctRaw(v) {
  if (v == null) return '-';
  const n = typeof v === 'number' ? v : Number(v);
  if (isNaN(n)) return '-';
  return `${n.toFixed(2)}%`;
}

export function fmtDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr || '';
  return `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export function fmtYearMonth(ym) {
  if (!ym) return '';
  const s = String(ym);
  if (s.length === 6) return `${s.slice(0, 4)}年${s.slice(4)}月`;
  if (s.includes('-')) return s.replace(/^(\d{4})-(\d{2})$/, '$1年$2月');
  return s;
}

export function fmtTimestamp(ts) {
  if (!ts) return '';
  let d;
  if (ts.toDate) d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function safeSheetName(name) {
  return (name || 'Sheet').replace(/[/\\:*?"[\]]/g, '_').slice(0, 31);
}

// ─── 動的行高さ計算 ────────────────────────────────────────
function calcRowHeight(ws, row, colWidths) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  let maxLines = 1;
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: C });
    const cell = ws[addr];
    if (!cell || cell.v == null) continue;
    const str = String(cell.v).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const wch = colWidths[C]?.wch ?? 10;
    const charsPerLine = Math.max(8, wch * CHARS_PER_UNIT_WCH);
    let lines = 0;
    for (const seg of str.split('\n')) {
      lines += Math.max(1, Math.ceil(seg.length / charsPerLine));
    }
    maxLines = Math.max(maxLines, lines);
  }
  return Math.min(MAX_ROW_HEIGHT_PT, Math.max(MIN_ROW_HEIGHT_PT, Math.ceil(maxLines * LINE_HEIGHT_PT * 1.05)));
}

// ─── AI分析 + メモ セクション追記 ────────────────────────────
function appendAIAndMemoSections(ws, startRow, numCols, colWidths, aiData, memos) {
  let row = startRow;

  // AI分析セクション
  if (aiData && aiData.summary) {
    row += 2; // 空白行

    // 「AI分析」ヘッダー
    const aiHeaderAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[aiHeaderAddr] = { v: '■ AI分析', s: AI_SECTION_STYLE };
    // ヘッダー行を結合
    if (numCols > 1) {
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: numCols - 1 } });
    }
    if (!ws['!rows']) ws['!rows'] = [];
    ws['!rows'][row] = { hpt: 26 };
    row++;

    // AI分析テキスト（Markdownの#や*を除去）
    const cleanText = (aiData.summary || '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    const contentAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[contentAddr] = { v: cleanText, s: AI_CONTENT_STYLE };
    if (numCols > 1) {
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: numCols - 1 } });
    }
    // テキストの行数に合わせた高さ
    const textLines = cleanText.split('\n').length;
    const totalWch = colWidths.reduce((sum, c) => sum + (c.wch || 10), 0);
    const charsPerLine = Math.max(20, totalWch * CHARS_PER_UNIT_WCH);
    let calcLines = 0;
    for (const seg of cleanText.split('\n')) {
      calcLines += Math.max(1, Math.ceil(seg.length / charsPerLine));
    }
    ws['!rows'][row] = { hpt: Math.min(MAX_ROW_HEIGHT_PT, Math.max(MIN_ROW_HEIGHT_PT, calcLines * LINE_HEIGHT_PT * 1.05)) };
    row++;
  }

  // メモセクション
  if (memos && memos.length > 0) {
    row += 2; // 空白行

    // 「メモ」ヘッダー
    const memoHeaderAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[memoHeaderAddr] = { v: '■ メモ', s: MEMO_SECTION_STYLE };
    if (numCols > 1) {
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: numCols - 1 } });
    }
    if (!ws['!rows']) ws['!rows'] = [];
    ws['!rows'][row] = { hpt: 26 };
    row++;

    // 各メモをAI分析と同じ結合セル形式で表示
    for (const memo of memos) {
      const isConsultant = memo.isConsultantNote;
      let authorName;
      if (isConsultant) {
        authorName = `[コンサルタント] ${memo.consultantName || ''}`;
      } else {
        const last = memo.userLastName || '';
        const first = memo.userFirstName || '';
        authorName = (last + ' ' + first).trim() || memo.userDisplayName || '';
      }
      const dateStr = fmtTimestamp(memo.updatedAt || memo.createdAt);
      const content = (memo.content || '').trim();

      // 1つの結合セルに「投稿者：/ 日付：/ 内容：」をまとめる
      const memoText = `投稿者：${authorName}\n日付：${dateStr}\n内容：${content}`;
      const cellStyle = isConsultant
        ? { ...MEMO_CONTENT_STYLE, font: { ...FONT_BASE, color: { rgb: '7030A0' } } }
        : MEMO_CONTENT_STYLE;

      const addr = XLSX.utils.encode_cell({ r: row, c: 0 });
      ws[addr] = { v: memoText, s: cellStyle };
      if (numCols > 1) {
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: numCols - 1 } });
      }

      // テキストの行数に合わせた高さ
      const totalWch = colWidths.reduce((sum, c) => sum + (c.wch || 10), 0);
      const charsPerLine = Math.max(20, totalWch * CHARS_PER_UNIT_WCH);
      let calcLines = 0;
      for (const seg of memoText.split('\n')) {
        calcLines += Math.max(1, Math.ceil(seg.length / charsPerLine));
      }
      ws['!rows'][row] = { hpt: Math.min(MAX_ROW_HEIGHT_PT, Math.max(MIN_ROW_HEIGHT_PT, calcLines * LINE_HEIGHT_PT * 1.05)) };
      row++;
    }
  }

  // ws['!ref'] を更新
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  range.e.r = Math.max(range.e.r, row - 1);
  ws['!ref'] = XLSX.utils.encode_range(range);

  return row;
}

// ─── 合計/平均行の計算 ─────────────────────────────────────
/**
 * 各列の値を走査して合計または平均を算出する。
 * - 数値列 → 合計（SUM）
 * - "X.XX%" 文字列列 → 平均（AVG）
 * - "X秒" 文字列列 → 平均秒数
 * - "変化率"/"前期"を含むヘッダー、"-"のみの列 → 空欄
 * 戻り値: { values: [...], styles: [...] }
 */
function computeTotalsRow(headers, rows) {
  const numCols = headers.length;
  const values = new Array(numCols).fill('');
  const styles = new Array(numCols).fill(TOTAL_TEXT_STYLE);

  // 1列目: ラベル
  values[0] = '合計 / 平均';
  styles[0] = TOTAL_LABEL_STYLE;

  if (!rows || rows.length === 0) {
    return { values, styles };
  }

  const pctRe = /^(-?\d+(?:\.\d+)?)%$/;
  const secRe = /^(\d+(?:\.\d+)?)秒$/;

  for (let c = 1; c < numCols; c++) {
    const header = String(headers[c] || '');
    // 変化率列はスキップ（意味のある集計ができない）
    if (header.includes('変化率')) continue;

    const colVals = rows.map(r => r[c]).filter(v => v !== null && v !== undefined && v !== '' && v !== '-');
    if (colVals.length === 0) continue;

    // 全て数値 → 合計
    if (colVals.every(v => typeof v === 'number' && !isNaN(v))) {
      const sum = colVals.reduce((a, b) => a + b, 0);
      values[c] = sum;
      styles[c] = TOTAL_NUMBER_STYLE;
      continue;
    }

    // 全てパーセンテージ文字列 → 平均
    if (colVals.every(v => typeof v === 'string' && pctRe.test(v))) {
      const nums = colVals.map(v => parseFloat(v.match(pctRe)[1]));
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      values[c] = `${avg.toFixed(2)}%`;
      styles[c] = TOTAL_TEXT_STYLE;
      continue;
    }

    // 全て秒数文字列 → 平均
    if (colVals.every(v => typeof v === 'string' && secRe.test(v))) {
      const nums = colVals.map(v => parseFloat(v.match(secRe)[1]));
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      values[c] = `${Math.round(avg)}秒`;
      styles[c] = TOTAL_TEXT_STYLE;
      continue;
    }

    // 数値混在（一部が "-" 等）→ 数値のみで合計を試みる
    const nums = colVals.filter(v => typeof v === 'number' && !isNaN(v));
    if (nums.length > 0 && nums.length === colVals.length) {
      values[c] = nums.reduce((a, b) => a + b, 0);
      styles[c] = TOTAL_NUMBER_STYLE;
    }
  }

  return { values, styles };
}

// ─── シート作成ヘルパー ─────────────────────────────────────
function createDataSheet(headers, rows, colWidths, aiData, memos) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = colWidths;
  ws['!rows'] = [];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // ヘッダー行スタイル
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[addr]) ws[addr].s = HEADER_STYLE;
  }
  ws['!rows'][0] = { hpt: 28 };

  // データ行スタイル + 高さ
  for (let R = 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) {
        const v = ws[addr].v;
        if (typeof v === 'number') {
          ws[addr].s = NUMBER_CELL_STYLE;
        } else if (typeof v === 'string' && v.match(/^-?\d[\d,.]*(%|秒)?$/)) {
          // 数値系文字列（パーセンテージ・秒数・小数等）は右寄せ
          ws[addr].s = PERCENT_CELL_STYLE;
        } else {
          ws[addr].s = DATA_CELL_STYLE;
        }
      }
    }
    ws['!rows'][R] = { hpt: calcRowHeight(ws, R, colWidths) };
  }

  // 合計/平均行を追記（データ行が1行以上ある場合のみ）
  let nextRow = range.e.r + 1;
  if (rows && rows.length > 0) {
    const { values: totalVals, styles: totalStyles } = computeTotalsRow(headers, rows);
    for (let C = 0; C < headers.length; C++) {
      const addr = XLSX.utils.encode_cell({ r: nextRow, c: C });
      const v = totalVals[C];
      const cell = { v, s: totalStyles[C] };
      if (typeof v === 'number') cell.t = 'n';
      else if (typeof v === 'string') cell.t = 's';
      ws[addr] = cell;
    }
    ws['!rows'][nextRow] = { hpt: 24 };
    // 範囲を拡張
    range.e.r = nextRow;
    ws['!ref'] = XLSX.utils.encode_range(range);
    nextRow++;
  }

  // AI分析 + メモ追記
  appendAIAndMemoSections(ws, nextRow, headers.length, colWidths, aiData, memos);

  return ws;
}

// ─── 動的列対応シートビルダー ─────────────────────────────
// 画面の DataTable と完全に同じ列構成（localStorage の表示/順序設定を反映）で
// Excel シートを生成する。比較モード時は comparison 列に「前期」「変化率」を追加する。

// 列ラベルをフォーマット種別に応じたセル値に変換
function formatCellForExport(col, value) {
  if (value === undefined || value === null || value === '') return '-';

  switch (col.format) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return isNaN(n) ? '-' : n;
    }
    case 'decimal': {
      const n = typeof value === 'number' ? value : Number(value);
      return isNaN(n) ? '-' : Number(n.toFixed(2));
    }
    case 'percent': {
      // 画面側の transform 済み文字列（"12.3"）と素の 0-1 数値の両方に対応
      const n = typeof value === 'number' ? value : Number(value);
      if (isNaN(n)) return '-';
      const pct = Math.abs(n) <= 1 ? n * 100 : n;
      return `${pct.toFixed(2)}%`;
    }
    case 'duration': {
      const n = typeof value === 'number' ? value : Number(value);
      if (isNaN(n)) return '-';
      const m = Math.floor(n / 60);
      const s = Math.floor(n % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    default:
      return String(value);
  }
}

// 列のデフォルト幅をフォーマットに応じて推定
function defaultColWidth(col) {
  if (col.required || col.format === undefined || col.format === 'string') {
    // 文字列系（ラベル列）は広め
    if (col.key === 'path' || col.key === 'linkUrl' || col.key === 'fileName' || col.key === 'keyword' || col.key === 'source') return { wch: 36 };
    if (col.key === 'channelName' || col.key === 'category') return { wch: 22 };
    return { wch: 16 };
  }
  if (col.format === 'number') return { wch: 14 };
  if (col.format === 'percent') return { wch: 12 };
  if (col.format === 'decimal') return { wch: 12 };
  if (col.format === 'duration') return { wch: 12 };
  return { wch: 14 };
}

/**
 * 動的シートビルダー
 * @param {string} tableKey - analysisColumns.js の tableKey
 * @param {Array} rows - 画面と同じキーでキー付けされた行オブジェクト配列（current 期間）
 * @param {Object} opts
 * @param {Array|null} opts.compRows - 比較期間の行配列（画面と同じ key でキー付け）
 * @param {string}    opts.compJoinKey - 比較用のマージキー（日別=date, チャネル=channelName 等）
 * @param {Object|null} opts.aiData
 * @param {Array|null}  opts.memos
 */
function buildDynamicSheet(tableKey, rows, { compRows = null, compJoinKey = null, aiData = null, memos = null } = {}) {
  const visibleCols = resolveVisibleColumns(tableKey);
  if (visibleCols.length === 0) {
    return createDataSheet(['データなし'], [], [{ wch: 20 }], aiData, memos);
  }

  const isComparing = Array.isArray(compRows);
  // 比較行の索引（compJoinKey が指定されていれば join、なければ index 合わせ）
  const compMap = new Map();
  if (isComparing && compJoinKey) {
    for (const c of compRows) {
      const k = c?.[compJoinKey];
      if (k != null) compMap.set(k, c);
    }
  }

  // ヘッダ組み立て
  const headers = [];
  const colWidths = [];
  // 各 "表示列" に対応する "出力列の定義" を記録して行生成時に使う
  //   type: 'current' | 'prev' | 'delta'
  //   col:  元の col 定義
  const outCols = [];
  for (const col of visibleCols) {
    headers.push(col.label);
    colWidths.push(defaultColWidth(col));
    outCols.push({ type: 'current', col });
    if (isComparing && col.comparison) {
      headers.push('前期');
      colWidths.push(defaultColWidth(col));
      outCols.push({ type: 'prev', col });
      headers.push('変化率');
      colWidths.push({ wch: 10 });
      outCols.push({ type: 'delta', col });
    }
  }

  // 行生成
  const outRows = rows.map((row, idx) => {
    const compRow = isComparing
      ? compJoinKey
        ? compMap.get(row?.[compJoinKey])
        : compRows[idx]
      : null;
    return outCols.map(({ type, col }) => {
      if (type === 'current') {
        return formatCellForExport(col, row?.[col.key]);
      }
      if (type === 'prev') {
        return formatCellForExport(col, compRow?.[col.key]);
      }
      // delta
      const curN = Number(row?.[col.key]);
      const prvN = Number(compRow?.[col.key]);
      if (isNaN(curN) || isNaN(prvN)) return '-';
      return fmtChange(curN, prvN);
    });
  });

  return createDataSheet(headers, outRows, colWidths, aiData, memos);
}

// ─── 画面と同じ行構造への変換（各 Cloud Function 結果 → screen-ready オブジェクト）

function adaptMonthlyRows(monthlyData) {
  const sorted = [...(monthlyData || [])].sort((a, b) => (b.label || '').localeCompare(a.label || ''));
  return sorted.map((d) => ({
    label: d.label || fmtYearMonth(d.month),
    users: d.users,
    newUsers: d.newUsers,
    sessions: d.sessions,
    avgPageviews: d.avgPageviews ?? (d.sessions > 0 ? d.pageViews / d.sessions : 0),
    pageViews: d.pageViews,
    engagementRate: d.engagementRate,
    bounceRate: d.bounceRate,
    averageSessionDuration: d.averageSessionDuration ?? d.avgSessionDuration,
    conversions: d.conversions,
    conversionRate: d.conversionRate ?? (d.sessions > 0 ? d.conversions / d.sessions : 0),
  }));
}

function adaptDailyRows(data) {
  const rows = (data?.rows || []).slice().sort((a, b) => (a.date > b.date ? -1 : 1));
  return rows.map((r) => ({
    date: fmtDate(r.date),
    sessions: r.sessions,
    users: r.users,
    newUsers: r.newUsers,
    pageViews: r.pageViews,
    engagementRate: r.engagementRate,
    bounceRate: r.bounceRate,
    avgSessionDuration: r.avgSessionDuration ?? r.averageSessionDuration,
    conversions: r.conversions,
    conversionRate: r.sessions > 0 ? r.conversions / r.sessions : 0,
  }));
}

function adaptWeeklyRows(data) {
  return (data?.rows || []).map((r) => ({
    dayName: DAY_NAMES[Number(r.dayOfWeek)] || r.dayOfWeek,
    sessions: r.sessions,
    users: r.users,
    newUsers: r.newUsers,
    pageViews: r.pageViews,
    engagementRate: r.engagementRate,
    bounceRate: r.bounceRate,
    avgSessionDuration: r.avgSessionDuration ?? r.averageSessionDuration,
    conversions: r.conversions,
    conversionRate: r.sessions > 0 ? r.conversions / r.sessions : 0,
  }));
}

function adaptHourlyRows(data) {
  return (data?.rows || []).map((r) => ({
    hour: `${r.hour}時`,
    sessions: r.sessions,
    users: r.users,
    newUsers: r.newUsers,
    pageViews: r.pageViews,
    engagementRate: r.engagementRate,
    bounceRate: r.bounceRate,
    avgSessionDuration: r.avgSessionDuration ?? r.averageSessionDuration,
    conversions: r.conversions,
    conversionRate: r.sessions > 0 ? r.conversions / r.sessions : 0,
  }));
}

function adaptChannelRows(data) {
  const rows = data?.rows || [];
  const total = rows.reduce((sum, r) => sum + (r.sessions || 0), 0);
  return rows
    .map((r) => ({
      channelName: CHANNEL_MAP[r.sessionDefaultChannelGroup] || r.sessionDefaultChannelGroup || '',
      sessions: r.sessions || 0,
      sessionRate: total > 0 ? (r.sessions || 0) / total : 0,
      users: r.activeUsers || r.users || 0,
      conversions: r.conversions || 0,
      conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
      newUsers: r.newUsers || 0,
      pageViews: r.screenPageViews ?? r.pageViews ?? 0,
      engagementRate: r.engagementRate || 0,
      bounceRate: r.bounceRate || 0,
      avgSessionDuration: r.averageSessionDuration || 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function adaptReferralRows(data) {
  return (data?.rows || []).map((r) => ({
    source: r.source || '',
    sessions: r.sessions || 0,
    users: r.users ?? r.activeUsers ?? 0,
    newUsers: r.newUsers || 0,
    pageViews: r.screenPageViews ?? r.pageViews ?? 0,
    engagementRate: r.engagementRate || 0,
    bounceRate: r.bounceRate || 0,
    avgSessionDuration: r.averageSessionDuration || 0,
    conversions: r.conversions || 0,
    conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
  }));
}

function adaptPageRows(data) {
  return (data?.rows || []).map((r) => ({
    path: r.pagePath || r.path || '',
    pageViews: r.screenPageViews ?? r.pageViews ?? 0,
    sessions: r.sessions || 0,
    users: r.activeUsers ?? r.users ?? 0,
    newUsers: r.newUsers || 0,
    engagementRate: r.engagementRate || 0,
    bounceRate: r.bounceRate || 0,
    avgDuration: r.averageSessionDuration ?? r.avgDuration ?? 0,
    conversions: r.conversions || 0,
    conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
    interestScore: r.interestScore ?? null,
    scrollRate: r.scrollRate ?? null,
  }));
}

function adaptLandingPageRows(data) {
  return (data?.rows || []).map((r) => ({
    path: r.landingPagePlusQueryString || r.pagePath || r.path || '',
    sessions: r.sessions || 0,
    users: r.users ?? r.activeUsers ?? 0,
    newUsers: r.newUsers || 0,
    pageViews: r.screenPageViews ?? r.pageViews ?? 0,
    engagementRate: r.engagementRate || 0,
    bounceRate: r.bounceRate || 0,
    avgSessionDuration: r.averageSessionDuration || 0,
    conversions: r.conversions || 0,
    conversionRate: r.sessions > 0 ? (r.conversions || 0) / r.sessions : 0,
  }));
}

function adaptFileDownloadRows(data) {
  return (data?.rows || []).map((r) => ({
    fileName: r.linkUrl || r.fileName || '',
    downloads: r.eventCount ?? r.downloads ?? 0,
    users: r.activeUsers ?? r.users ?? 0,
  }));
}

function adaptExternalLinkRows(data) {
  return (data?.rows || []).map((r) => ({
    linkUrl: r.linkUrl || '',
    clicks: r.eventCount ?? r.clicks ?? 0,
    users: r.activeUsers ?? r.users ?? 0,
  }));
}

function adaptPageCategoryRows(data) {
  const rows = data?.rows || [];
  const categories = {};
  for (const row of rows) {
    const path = row.pagePath || '/';
    const parts = path.split('/').filter(Boolean);
    const category = parts.length > 0 ? `/${parts[0]}` : '/';
    if (!categories[category]) {
      categories[category] = {
        category,
        pageViews: 0,
        sessions: 0,
        users: 0,
        newUsers: 0,
        engagementRateSum: 0,
        bounceRateSum: 0,
        avgDurationSum: 0,
        conversions: 0,
        pages: 0,
      };
    }
    categories[category].pageViews += row.screenPageViews || 0;
    categories[category].sessions += row.sessions || 0;
    categories[category].users += row.activeUsers || 0;
    categories[category].newUsers += row.newUsers || 0;
    categories[category].engagementRateSum += (row.engagementRate || 0) * (row.sessions || 0);
    categories[category].bounceRateSum += (row.bounceRate || 0) * (row.sessions || 0);
    categories[category].avgDurationSum += (row.averageSessionDuration || 0) * (row.sessions || 0);
    categories[category].conversions += row.conversions || 0;
    categories[category].pages += 1;
  }
  return Object.values(categories)
    .map((c) => ({
      category: c.category,
      pages: c.pages,
      pageViews: c.pageViews,
      sessions: c.sessions,
      users: c.users,
      newUsers: c.newUsers,
      engagementRate: c.sessions > 0 ? c.engagementRateSum / c.sessions : 0,
      bounceRate: c.sessions > 0 ? c.bounceRateSum / c.sessions : 0,
      avgDuration: c.sessions > 0 ? c.avgDurationSum / c.sessions : 0,
      conversions: c.conversions,
      conversionRate: c.sessions > 0 ? c.conversions / c.sessions : 0,
    }))
    .sort((a, b) => b.pageViews - a.pageViews);
}

function adaptKeywordRows(gscData) {
  return (gscData?.topQueries || []).map((q) => ({
    keyword: q.query || '',
    clicks: q.clicks || 0,
    impressions: q.impressions || 0,
    ctr: q.ctr || 0,
    position: q.position || 0,
  }));
}

// ─── 個別シート生成関数 ──────────────────────────────────────

/** 1. レポート概要（表紙） */
function createCoverSheet(siteName, siteUrl, dateRange, compDateRange) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const totalCols = 6;
  ws['!cols'] = [{ wch: 3 }, { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 3 }];
  ws['!rows'] = [];
  if (!ws['!merges']) ws['!merges'] = [];

  const COVER_BG = { fill: { fgColor: { rgb: '404040' } } };
  const COVER_BG_EMPTY = {
    fill: { fgColor: { rgb: '404040' } },
    font: { color: { rgb: '404040' } },
  };

  // Row 0-3: ダークグレー帯（上部）
  for (let R = 0; R < 4; R++) {
    for (let C = 0; C < totalCols; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      ws[addr] = { v: '', s: COVER_BG_EMPTY };
    }
    ws['!rows'][R] = { hpt: R === 0 ? 20 : 16 };
  }

  // Row 1: 「ANALYSIS REPORT」サブタイトル
  const subAddr = XLSX.utils.encode_cell({ r: 1, c: 1 });
  ws[subAddr] = {
    v: 'ANALYSIS REPORT',
    s: {
      ...COVER_BG,
      font: { name: 'MS Gothic', sz: 10, color: { rgb: 'AAAAAA' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
  };
  ws['!merges'].push({ s: { r: 1, c: 1 }, e: { r: 1, c: 4 } });

  // Row 2: メインタイトル「分析レポート」
  const titleAddr = XLSX.utils.encode_cell({ r: 2, c: 1 });
  ws[titleAddr] = {
    v: '分析レポート',
    s: {
      ...COVER_BG,
      font: { name: 'MS Gothic', sz: 24, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
  };
  ws['!merges'].push({ s: { r: 2, c: 1 }, e: { r: 2, c: 4 } });
  ws['!rows'][2] = { hpt: 50 };

  // Row 3: ダークグレー帯下部余白
  ws['!rows'][3] = { hpt: 20 };

  // Row 4-5: 空白行
  ws['!rows'][4] = { hpt: 30 };
  ws['!rows'][5] = { hpt: 10 };

  // Row 6: 仕切り線（薄いアクセントライン）
  for (let C = 1; C <= 4; C++) {
    const addr = XLSX.utils.encode_cell({ r: 6, c: C });
    ws[addr] = {
      v: '',
      s: { border: { bottom: { style: 'medium', color: { rgb: '4472C4' } } } },
    };
  }
  ws['!rows'][6] = { hpt: 6 };
  ws['!rows'][7] = { hpt: 20 };

  // Row 8-11: 情報セクション
  const infoRows = [
    ['サイト名', siteName || ''],
    ['URL', siteUrl || ''],
    ['分析期間', `${dateRange?.from || ''} 〜 ${dateRange?.to || ''}`],
    ...(compDateRange ? [['比較期間', `${compDateRange.from || ''} 〜 ${compDateRange.to || ''}`]] : []),
    ['レポート生成日', new Date().toLocaleDateString('ja-JP')],
  ];

  for (let i = 0; i < infoRows.length; i++) {
    const R = 8 + i;
    const labelAddr = XLSX.utils.encode_cell({ r: R, c: 1 });
    ws[labelAddr] = {
      v: infoRows[i][0],
      s: {
        font: { ...FONT_BASE, bold: true, color: { rgb: '404040' } },
        alignment: { vertical: 'center', horizontal: 'left' },
      },
    };
    const valueAddr = XLSX.utils.encode_cell({ r: R, c: 2 });
    ws[valueAddr] = {
      v: infoRows[i][1],
      s: {
        font: { ...FONT_BASE, color: { rgb: '333333' } },
        alignment: { vertical: 'center', horizontal: 'left' },
      },
    };
    ws['!merges'].push({ s: { r: R, c: 2 }, e: { r: R, c: 4 } });
    ws['!rows'][R] = { hpt: 28 };
  }

  // Row 12-13: 下部余白
  ws['!rows'][12] = { hpt: 40 };
  ws['!rows'][13] = { hpt: 10 };

  // Row 14: 仕切り線（下部）
  for (let C = 1; C <= 4; C++) {
    const addr = XLSX.utils.encode_cell({ r: 14, c: C });
    ws[addr] = {
      v: '',
      s: { border: { bottom: { style: 'thin', color: { rgb: 'CCCCCC' } } } },
    };
  }
  ws['!rows'][14] = { hpt: 6 };

  // Row 15: フッターテキスト
  ws['!rows'][15] = { hpt: 15 };
  const footerAddr = XLSX.utils.encode_cell({ r: 16, c: 1 });
  ws[footerAddr] = {
    v: 'Generated by グローレポータ',
    s: {
      font: { name: 'MS Gothic', sz: 8, color: { rgb: 'AAAAAA' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
  };
  ws['!merges'].push({ s: { r: 16, c: 1 }, e: { r: 16, c: 4 } });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 16, c: totalCols - 1 } });
  return ws;
}

/** 2. 全体サマリー（主要指標 + 目標予実 + コンバージョン内訳） */
function createSummarySheet(data, kpiSettings, aiData, memos, compSummary) {
  const m = data?.metrics || {};
  const conversions = data?.conversions || {};
  const kpiList = kpiSettings?.kpiList || [];

  // 目標セクション（設定がある場合）
  if (kpiList.length > 0) {
    const headers = ['目標指標', '目標値', '実績値', '達成率'];
    const rows = kpiList.map(kpi => {
      const target = kpi.target || 0;
      let actual = 0;
      const isRate = kpi.metric?.includes('rate');

      switch (kpi.metric) {
        case 'users': case 'target_users':
          actual = fmtNum(m.totalUsers); break;
        case 'sessions': case 'target_sessions':
          actual = fmtNum(m.sessions); break;
        case 'pageviews':
          actual = fmtNum(m.pageViews); break;
        case 'engagement_rate':
          actual = m.engagementRate != null ? Number((m.engagementRate * 100).toFixed(2)) : 0; break;
        case 'target_conversions':
          actual = fmtNum(m.conversions); break;
        case 'target_conversion_rate':
          actual = m.sessions > 0 ? Number(((m.conversions || 0) / m.sessions * 100).toFixed(2)) : 0; break;
        default:
          if (kpi.metric?.startsWith('conversion_') && kpi.eventName) {
            actual = fmtNum(conversions[kpi.eventName]);
          }
      }

      const achievement = target > 0 ? `${((actual / target) * 100).toFixed(1)}%` : '-';
      const targetDisplay = isRate ? `${target}%` : target;
      const actualDisplay = isRate ? `${actual}%` : actual;
      return [kpi.label || kpi.metric, targetDisplay, actualDisplay, achievement];
    });

    // 目標 + 基本指標 + コンバージョン内訳を1シートにまとめる
    rows.push(['', '', '', '']);
    rows.push(['【基本指標】', '', '', '']);
    rows.push([getLabel('sessions'), '', fmtNum(m.sessions), '']);
    rows.push([getLabel('totalUsers'), '', fmtNum(m.totalUsers), '']);
    rows.push([getLabel('newUsers'), '', fmtNum(m.newUsers), '']);
    rows.push([getLabel('screenPageViews'), '', fmtNum(m.pageViews), '']);
    rows.push([getLabel('engagementRate'), '', fmtPct(m.engagementRate), '']);
    rows.push([`${getLabel('conversions')}（合計）`, '', fmtNum(m.conversions), '']);
    rows.push([getLabel('clicks'), '', fmtNum(m.clicks), '']);
    rows.push([getLabel('impressions'), '', fmtNum(m.impressions), '']);
    rows.push([getLabel('ctr'), '', fmtPctRaw(m.ctr), '']);
    rows.push([getLabel('position'), '', m.position ? Number(m.position).toFixed(1) : '-', '']);

    if (Object.keys(conversions).length > 0) {
      rows.push(['', '', '', '']);
      rows.push(['【コンバージョン内訳】', '', '', '']);
      for (const [eventName, count] of Object.entries(conversions)) {
        rows.push([`  ${eventName}`, '', fmtNum(count), '']);
      }
    }

    const colWidths = [{ wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    return createDataSheet(headers, rows, colWidths, aiData, memos);
  }

  // 目標未設定の場合は従来のレイアウト
  const cm = compSummary?.metrics || {};
  const hasComp = compSummary != null;
  const headers = hasComp ? ['指標', '当期', '前期', '変化率'] : ['指標', '値'];
  const makeRow = (label, val, compVal) => {
    if (hasComp) return [label, val, compVal ?? '-', typeof val === 'number' && typeof compVal === 'number' ? fmtChange(val, compVal) : '-'];
    return [label, val];
  };
  const rows = [
    makeRow(getLabel('sessions'), fmtNum(m.sessions), fmtNum(cm.sessions)),
    makeRow(getLabel('totalUsers'), fmtNum(m.totalUsers), fmtNum(cm.totalUsers)),
    makeRow(getLabel('newUsers'), fmtNum(m.newUsers), fmtNum(cm.newUsers)),
    makeRow(getLabel('screenPageViews'), fmtNum(m.pageViews), fmtNum(cm.pageViews)),
    makeRow(getLabel('engagementRate'), fmtPct(m.engagementRate), fmtPct(cm.engagementRate)),
    makeRow(`${getLabel('conversions')}（合計）`, fmtNum(m.conversions), fmtNum(cm.conversions)),
    makeRow(getLabel('clicks'), fmtNum(m.clicks), fmtNum(cm.clicks)),
    makeRow(getLabel('impressions'), fmtNum(m.impressions), fmtNum(cm.impressions)),
    makeRow(getLabel('ctr'), fmtPctRaw(m.ctr), fmtPctRaw(cm.ctr)),
    makeRow(getLabel('position'), m.position ? Number(m.position).toFixed(1) : '-', cm.position ? Number(cm.position).toFixed(1) : '-'),
  ];
  // コンバージョン内訳
  if (Object.keys(conversions).length > 0) {
    rows.push(hasComp ? ['', '', '', ''] : ['', '']);
    rows.push(hasComp ? ['【コンバージョン内訳】', '', '', ''] : ['【コンバージョン内訳】', '']);
    for (const [eventName, count] of Object.entries(conversions)) {
      rows.push(hasComp ? [`  ${eventName}`, fmtNum(count), '', ''] : [`  ${eventName}`, fmtNum(count)]);
    }
  }
  const colWidths = hasComp ? [{ wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 14 }] : [{ wch: 30 }, { wch: 20 }];
  return createDataSheet(headers, rows, colWidths, aiData, memos);
}

/** 3. 月別（13ヶ月推移） — 動的列 */
function createMonthlySheet(monthlyData, aiData, memos) {
  const rows = adaptMonthlyRows(monthlyData);
  return buildDynamicSheet('analysis-month', rows, { aiData, memos });
}

/** 4. ユーザー属性 */
function createUsersSheet(demographics, aiData, memos) {
  const d = demographics?.data || demographics || {};
  const ws = XLSX.utils.aoa_to_sheet([]);
  const colWidths = [{ wch: 20 }, { wch: 16 }, { wch: 14 }];
  ws['!cols'] = colWidths;
  ws['!rows'] = [];
  if (!ws['!merges']) ws['!merges'] = [];

  let row = 0;
  const sections = [
    { title: '新規/リピーター', data: d.newReturning },
    { title: '性別', data: d.gender },
    { title: '年齢層', data: d.age },
    { title: 'デバイス', data: d.device },
    { title: '国', data: d.location?.country },
    { title: '地域', data: d.location?.region },
    { title: '市区町村', data: d.location?.city },
  ];

  for (const section of sections) {
    if (!section.data || section.data.length === 0) continue;
    if (row > 0) row++; // セクション間空白

    // セクションタイトル
    const titleAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[titleAddr] = { v: section.title, s: HEADER_STYLE };
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });
    ws['!rows'][row] = { hpt: 26 };
    row++;

    // ヘッダー
    const hdrLabels = ['項目', getShortLabel('totalUsers'), '割合'];
    for (let c = 0; c < 3; c++) {
      ws[XLSX.utils.encode_cell({ r: row, c })] = { v: hdrLabels[c], s: HEADER_STYLE };
    }
    ws['!rows'][row] = { hpt: 24 };
    row++;

    for (const item of section.data) {
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: item.name || '', t: 's', s: DATA_CELL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: fmtNum(item.value), t: 'n', s: NUMBER_CELL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 2 })] = { v: item.percentage != null ? `${Number(item.percentage).toFixed(1)}%` : '-', t: 's', s: NUMBER_CELL_STYLE };
      ws['!rows'][row] = { hpt: 22 };
      row++;
    }
  }

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(row - 1, 0), c: 2 } });
  appendAIAndMemoSections(ws, row, 3, colWidths, aiData, memos);
  return ws;
}

/** 5. 日別 — 動的列、比較対応 */
function createDailySheet(data, aiData, memos, compData) {
  const rows = adaptDailyRows(data);
  const compRows = compData ? adaptDailyRows(compData) : null;
  return buildDynamicSheet('analysis-day', rows, { compRows, compJoinKey: 'date', aiData, memos });
}

/** 6. 曜日別 — 動的列 */
function createWeeklySheet(data, aiData, memos) {
  const rows = adaptWeeklyRows(data);
  return buildDynamicSheet('analysis-week', rows, { aiData, memos });
}

/** 7. 時間帯別 — 動的列 */
function createHourlySheet(data, aiData, memos) {
  const rows = adaptHourlyRows(data);
  return buildDynamicSheet('analysis-hour', rows, { aiData, memos });
}

/** 8. 集客チャネル — 動的列、比較対応 */
function createChannelsSheet(data, aiData, memos, compData) {
  const rows = adaptChannelRows(data);
  const compRows = compData ? adaptChannelRows(compData) : null;
  return buildDynamicSheet('analysis-channels', rows, { compRows, compJoinKey: 'channelName', aiData, memos });
}

/** 9. 流入キーワード — 動的列 */
function createKeywordsSheet(gscData, aiData, memos) {
  const rows = adaptKeywordRows(gscData);
  return buildDynamicSheet('analysis-keywords', rows, { aiData, memos });
}

/** 10. 被リンク元 — 動的列、比較対応 */
function createReferralsSheet(data, aiData, memos, compData) {
  const rows = adaptReferralRows(data);
  const compRows = compData ? adaptReferralRows(compData) : null;
  return buildDynamicSheet('analysis-referrals', rows, { compRows, compJoinKey: 'source', aiData, memos });
}

/** 11. ページ別 — 動的列、比較対応 */
function createPagesSheet(data, aiData, memos, compData) {
  const rows = adaptPageRows(data);
  const compRows = compData ? adaptPageRows(compData) : null;
  return buildDynamicSheet('analysis-pages', rows, { compRows, compJoinKey: 'path', aiData, memos });
}

/** 12. ページ分類別 — 動的列 */
function createPageCategoriesSheet(data, aiData, memos) {
  const rows = adaptPageCategoryRows(data);
  return buildDynamicSheet('analysis-page-categories', rows, { aiData, memos });
}

/** 13. ランディングページ — 動的列、比較対応 */
function createLandingPagesSheet(data, aiData, memos, compData) {
  const rows = adaptLandingPageRows(data);
  const compRows = compData ? adaptLandingPageRows(compData) : null;
  return buildDynamicSheet('analysis-landing-pages', rows, { compRows, compJoinKey: 'path', aiData, memos });
}

/** 14. ファイルDL — 動的列 */
function createFileDownloadsSheet(data, aiData, memos) {
  const rows = adaptFileDownloadRows(data);
  return buildDynamicSheet('analysis-file-downloads', rows, { aiData, memos });
}

/** 15. 外部リンク — 動的列 */
function createExternalLinksSheet(data, aiData, memos) {
  const rows = adaptExternalLinkRows(data);
  return buildDynamicSheet('analysis-external-links', rows, { aiData, memos });
}

/** 16. コンバージョン一覧 */
function createConversionsSheet(data, aiData, memos) {
  if (!data?.data || data.data.length === 0) {
    const headers = ['月', `${getShortLabel('conversions')}（合計）`];
    return createDataSheet(headers, [], [{ wch: 14 }, { wch: 16 }], aiData, memos);
  }
  // イベント名を収集（yearMonth以外のキー）
  const eventNames = new Set();
  for (const row of data.data) {
    for (const key of Object.keys(row)) {
      if (key !== 'yearMonth') eventNames.add(key);
    }
  }
  const events = [...eventNames];
  const headers = ['月', ...events];
  const rows = [...data.data].sort((a, b) => (b.yearMonth || '').localeCompare(a.yearMonth || '')).map(r => [
    fmtYearMonth(r.yearMonth),
    ...events.map(e => fmtNum(r[e])),
  ]);
  const colWidths = [{ wch: 14 }, ...events.map(() => ({ wch: 16 }))];
  return createDataSheet(headers, rows, colWidths, aiData, memos);
}

/** 18. 逆算フロー */
function createReverseFlowSheet(flowResults, aiData, memos) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const colWidths = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  ws['!cols'] = colWidths;
  ws['!rows'] = [];
  if (!ws['!merges']) ws['!merges'] = [];

  let row = 0;

  for (const flow of (flowResults || [])) {
    if (row > 0) row++; // フロー間空白

    // フロー名ヘッダー
    const titleAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[titleAddr] = { v: `フロー: ${flow.flowName || ''}`, s: { ...HEADER_STYLE, fill: { fgColor: { rgb: 'BDD7EE' } } } };
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    ws['!rows'][row] = { hpt: 28 };
    row++;

    // フロー情報
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: 'フォームページ', s: COVER_LABEL_STYLE };
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: flow.formPagePath || '', s: DATA_CELL_STYLE };
    ws['!rows'][row] = { hpt: 22 };
    row++;
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: '目標CV', s: COVER_LABEL_STYLE };
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: flow.targetCvEvent || '', s: DATA_CELL_STYLE };
    ws['!rows'][row] = { hpt: 22 };
    row++;

    // サマリー
    if (flow.summary) {
      const s = flow.summary;
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: '全PV', s: COVER_LABEL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: fmtNum(s.totalSiteViews), s: NUMBER_CELL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 2 })] = { v: 'フォームPV', s: COVER_LABEL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 3 })] = { v: fmtNum(s.formPageViews), s: NUMBER_CELL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 4 })] = { v: '送信完了', s: COVER_LABEL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 5 })] = { v: fmtNum(s.submissionComplete), s: NUMBER_CELL_STYLE };
      ws['!rows'][row] = { hpt: 22 };
      row++;
      const overallCVR = s.totalSiteViews > 0 ? (s.submissionComplete / s.totalSiteViews) * 100 : 0;
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: '全体CVR', s: COVER_LABEL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: `${overallCVR.toFixed(2)}%`, s: NUMBER_CELL_STYLE };
      ws['!rows'][row] = { hpt: 22 };
      row++;
    }

    // 月次テーブル
    if (flow.monthlyTable && flow.monthlyTable.length > 0) {
      row++; // 空白
      const mHeaders = ['年月', '全PV', '遷移率①', 'フォームPV', '遷移率②', '送信完了', '全体CVR'];
      for (let c = 0; c < 7; c++) {
        ws[XLSX.utils.encode_cell({ r: row, c })] = { v: mHeaders[c], s: HEADER_STYLE };
      }
      ws['!rows'][row] = { hpt: 26 };
      row++;

      for (const m of [...flow.monthlyTable].reverse()) {
        const rate1 = m.totalSiteViews > 0 ? (m.formPageViews / m.totalSiteViews) * 100 : 0;
        const rate2 = m.formPageViews > 0 ? (m.submissionComplete / m.formPageViews) * 100 : 0;
        const overall = m.totalSiteViews > 0 ? (m.submissionComplete / m.totalSiteViews) * 100 : 0;
        const vals = [
          fmtYearMonth(m.yearMonth),
          fmtNum(m.totalSiteViews),
          `${rate1.toFixed(2)}%`,
          fmtNum(m.formPageViews),
          `${rate2.toFixed(2)}%`,
          fmtNum(m.submissionComplete),
          `${overall.toFixed(2)}%`,
        ];
        for (let c = 0; c < 7; c++) {
          ws[XLSX.utils.encode_cell({ r: row, c })] = { v: vals[c], s: c === 0 ? DATA_CELL_STYLE : NUMBER_CELL_STYLE };
        }
        ws['!rows'][row] = { hpt: 22 };
        row++;
      }
    }
  }

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(row - 1, 0), c: 6 } });
  appendAIAndMemoSections(ws, row, 7, colWidths, aiData, memos);
  return ws;
}

// ─── メインエクスポート関数 ──────────────────────────────────

/**
 * 全分析データからマルチシートExcel (Blob) を生成する
 * @param {object} allData - 全シートのデータ
 * @param {string} siteName
 * @param {object} dateRange - { from, to }
 * @returns {Blob}
 */
export function exportAnalysisToExcel(allData, siteName, dateRange) {
  const wb = XLSX.utils.book_new();
  const ai = allData.aiAnalysis || {};
  const memos = allData.memos || {};
  const comp = allData.comparison || null;

  // 1. レポート概要
  XLSX.utils.book_append_sheet(wb, createCoverSheet(siteName, allData.siteUrl, dateRange, comp?.dateRange), safeSheetName('レポート概要'));

  // 2. 全体サマリー（主要指標 + 目標予実 + コンバージョン内訳）
  if (allData.summaryMetrics) {
    XLSX.utils.book_append_sheet(wb, createSummarySheet(allData.summaryMetrics, allData.kpiSettings, ai['analysis/summary'], memos['analysis/summary'], comp?.summaryMetrics), safeSheetName('全体サマリー'));
  }

  // 3. 月別（13ヶ月推移）
  if (allData.monthlyData) {
    XLSX.utils.book_append_sheet(wb, createMonthlySheet(allData.monthlyData, ai['analysis/month'], memos['analysis/month']), safeSheetName('月別'));
  }

  // 4. ユーザー属性
  if (allData.demographics) {
    XLSX.utils.book_append_sheet(wb, createUsersSheet(allData.demographics, ai['analysis/users'], memos['analysis/users']), safeSheetName('ユーザー属性'));
  }

  // 5. 日別
  if (allData.daily) {
    XLSX.utils.book_append_sheet(wb, createDailySheet(allData.daily, ai['analysis/day'], memos['analysis/day'], comp?.daily), safeSheetName('日別'));
  }

  // 6. 曜日別
  if (allData.weekly) {
    XLSX.utils.book_append_sheet(wb, createWeeklySheet(allData.weekly, ai['analysis/week'], memos['analysis/week']), safeSheetName('曜日別'));
  }

  // 7. 時間帯別
  if (allData.hourly) {
    XLSX.utils.book_append_sheet(wb, createHourlySheet(allData.hourly, ai['analysis/hour'], memos['analysis/hour']), safeSheetName('時間帯別'));
  }

  // 8. 集客チャネル
  if (allData.channels) {
    XLSX.utils.book_append_sheet(wb, createChannelsSheet(allData.channels, ai['analysis/channels'], memos['analysis/channels'], comp?.channels), safeSheetName('集客チャネル'));
  }

  // 9. 流入キーワード（GSC接続時のみ）
  if (allData.keywords) {
    XLSX.utils.book_append_sheet(wb, createKeywordsSheet(allData.keywords, ai['analysis/keywords'], memos['analysis/keywords']), safeSheetName('流入キーワード'));
  }

  // 10. 被リンク元
  if (allData.referrals) {
    XLSX.utils.book_append_sheet(wb, createReferralsSheet(allData.referrals, ai['analysis/referrals'], memos['analysis/referrals'], comp?.referrals), safeSheetName('被リンク元'));
  }

  // 11. ページ別
  if (allData.pages) {
    XLSX.utils.book_append_sheet(wb, createPagesSheet(allData.pages, ai['analysis/pages'], memos['analysis/pages'], comp?.pages), safeSheetName('ページ別'));
  }

  // 12. ページ分類別
  if (allData.pageCategories) {
    XLSX.utils.book_append_sheet(wb, createPageCategoriesSheet(allData.pageCategories, ai['analysis/page-categories'], memos['analysis/page-categories']), safeSheetName('ページ分類別'));
  }

  // 13. ランディングページ
  if (allData.landingPages) {
    XLSX.utils.book_append_sheet(wb, createLandingPagesSheet(allData.landingPages, ai['analysis/landing-pages'], memos['analysis/landing-pages'], comp?.landingPages), safeSheetName('ランディングページ'));
  }

  // 14. ファイルDL
  if (allData.fileDownloads) {
    XLSX.utils.book_append_sheet(wb, createFileDownloadsSheet(allData.fileDownloads, ai['analysis/file-downloads'], memos['analysis/file-downloads']), safeSheetName('ファイルDL'));
  }

  // 15. 外部リンク
  if (allData.externalLinks) {
    XLSX.utils.book_append_sheet(wb, createExternalLinksSheet(allData.externalLinks, ai['analysis/external-links'], memos['analysis/external-links']), safeSheetName('外部リンク'));
  }

  // 16. コンバージョン一覧
  if (allData.conversions) {
    XLSX.utils.book_append_sheet(wb, createConversionsSheet(allData.conversions, ai['analysis/conversions'], memos['analysis/conversions']), safeSheetName('コンバージョン一覧'));
  }

  // 18. 逆算フロー（条件付き）
  if (allData.reverseFlows && allData.reverseFlows.length > 0) {
    XLSX.utils.book_append_sheet(wb, createReverseFlowSheet(allData.reverseFlows, ai['analysis/reverse-flow'], memos['analysis/reverse-flow']), safeSheetName('逆算フロー'));
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * 分析レポートをExcelでダウンロードする
 */
export function downloadAnalysisExcel(allData, siteName, dateRange) {
  const blob = exportAnalysisToExcel(allData, siteName, dateRange);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = (siteName || 'サイト').replace(/[/\\:*?"<>|]/g, '_').trim() || 'サイト';
  const fileName = `${safeName}_分析レポート_${dateStr}.xlsx`;
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
