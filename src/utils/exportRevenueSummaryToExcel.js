import * as XLSX from 'xlsx-js-style';

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: '3758F9' } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } },
  },
};

const CELL_BORDER = {
  border: {
    top: { style: 'thin', color: { rgb: 'EEEEEE' } },
    bottom: { style: 'thin', color: { rgb: 'EEEEEE' } },
    left: { style: 'thin', color: { rgb: 'EEEEEE' } },
    right: { style: 'thin', color: { rgb: 'EEEEEE' } },
  },
};

const LABEL_CELL = {
  ...CELL_BORDER,
  font: { bold: true },
  fill: { patternType: 'solid', fgColor: { rgb: 'F5F7FF' } },
};

const CURRENCY_FMT = '¥#,##0';

function fmtDateTime(iso) {
  if (!iso) return new Date().toLocaleString('ja-JP');
  try {
    return new Date(iso).toLocaleString('ja-JP');
  } catch {
    return '';
  }
}

/**
 * 契約・売上サマリーを Excel にエクスポート
 *
 * Sheet 1: 経営 KPI スナップショット
 * Sheet 2: 契約数推移 (12 ヶ月)
 */
export function exportRevenueSummaryToExcel({ revenue, contractTrend, fetchedAt }) {
  const safeRevenue = revenue || { mrr: 0, arr: 0, activeBusinessContracts: 0, totalExtras: 0, arpu: 0 };
  const safeTrend = Array.isArray(contractTrend) ? contractTrend : [];
  const thisMonth = safeTrend.length > 0
    ? safeTrend[safeTrend.length - 1]
    : { newContracts: 0, churnedContracts: 0, netNew: 0 };

  const wb = XLSX.utils.book_new();

  // ========== Sheet 1: 経営 KPI スナップショット ==========
  const summaryRows = [
    ['契約・売上サマリー (税別)'],
    ['取得日時', fmtDateTime(fetchedAt)],
    [],
    ['指標', '値', '備考'],
    ['月次売上高', safeRevenue.mrr, 'アクティブ Business × ¥49,800 + 有効な追加サイト × ¥15,000'],
    ['年次売上高', safeRevenue.arr, '月次売上高 × 12'],
    ['アクティブ契約数', safeRevenue.activeBusinessContracts, 'memberRole=owner かつ plan=business のアカウント数'],
    ['追加サイト数合計', safeRevenue.totalExtras, '有効期限内 (extraSitesValidUntil) のみ'],
    ['ARPU (1 契約あたり)', safeRevenue.arpu, '月次売上高 ÷ アクティブ契約数'],
    [],
    ['当月の新規契約', thisMonth.newContracts || 0, '当月内に active 化された new_business 件数'],
    ['当月の解約', thisMonth.churnedContracts || 0, '当月内に cancelled 化された new_business 件数'],
    ['純増 (新規−解約)', thisMonth.netNew || 0, ''],
    [],
    ['※ 社内ドメイン (grow-group.jp) のユーザーは全集計から除外'],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 60 },
  ];
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // タイトル
    { s: { r: 14, c: 0 }, e: { r: 14, c: 2 } }, // 注記
  ];

  // タイトル行
  if (ws1['A1']) {
    ws1['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '1F2937' } },
      alignment: { vertical: 'center' },
    };
  }
  // ヘッダー行 (4 行目: 指標/値/備考)
  ['A4', 'B4', 'C4'].forEach(addr => {
    if (ws1[addr]) ws1[addr].s = HEADER_STYLE;
  });
  // 通貨セル (B5, B6, B9 = 月次/年次/ARPU)
  ['B5', 'B6', 'B9'].forEach(addr => {
    if (ws1[addr]) {
      ws1[addr].t = 'n';
      ws1[addr].z = CURRENCY_FMT;
      ws1[addr].s = { ...CELL_BORDER, alignment: { horizontal: 'right' }, numFmt: CURRENCY_FMT };
    }
  });
  // 数値セル (B7=契約数, B8=サイト数, B11=新規, B12=解約, B13=純増)
  ['B7', 'B8', 'B11', 'B12', 'B13'].forEach(addr => {
    if (ws1[addr]) {
      ws1[addr].t = 'n';
      ws1[addr].s = { ...CELL_BORDER, alignment: { horizontal: 'right' } };
    }
  });
  // ラベル列
  ['A5', 'A6', 'A7', 'A8', 'A9', 'A11', 'A12', 'A13', 'A2'].forEach(addr => {
    if (ws1[addr]) ws1[addr].s = LABEL_CELL;
  });
  // 備考列のセル
  ['C5', 'C6', 'C7', 'C8', 'C9', 'C11', 'C12', 'C13', 'B2'].forEach(addr => {
    if (ws1[addr]) ws1[addr].s = { ...CELL_BORDER, alignment: { vertical: 'center' } };
  });
  // 注記行
  if (ws1['A15']) {
    ws1['A15'].s = {
      font: { italic: true, color: { rgb: '6B7280' } },
      alignment: { vertical: 'center' },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws1, '契約・売上サマリー');

  // ========== Sheet 2: 契約数推移 ==========
  const trendHeader = ['月', '新規契約数', '解約数', '純増'];
  const trendRows = [trendHeader, ...safeTrend.map(r => [
    r.month || '',
    r.newContracts || 0,
    r.churnedContracts || 0,
    r.netNew || 0,
  ])];

  const ws2 = XLSX.utils.aoa_to_sheet(trendRows);
  ws2['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  // ヘッダー
  ['A1', 'B1', 'C1', 'D1'].forEach(addr => {
    if (ws2[addr]) ws2[addr].s = HEADER_STYLE;
  });
  // データ行
  for (let i = 2; i <= trendRows.length; i++) {
    ['A', 'B', 'C', 'D'].forEach(col => {
      const addr = `${col}${i}`;
      if (ws2[addr]) {
        ws2[addr].s = {
          ...CELL_BORDER,
          alignment: { horizontal: col === 'A' ? 'left' : 'right' },
        };
        if (col !== 'A') ws2[addr].t = 'n';
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, ws2, '契約数推移');

  // ========== 出力 ==========
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `revenue-summary_${yyyy}-${mm}-${dd}.xlsx`;

  XLSX.writeFile(wb, filename);
}
