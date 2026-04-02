import PptxGenJS from 'pptxgenjs';
import {
  fmt, fmtNum, fmtPct, fmtPctRaw, fmtDate, fmtYearMonth, fmtTimestamp,
  CHANNEL_MAP, DAY_NAMES,
} from './exportAnalysisToExcel';
import logoSvgRaw from '../assets/img/logo.svg?raw';

// ─── 定数 ──────────────────────────────────────────────────────
const FONT_FACE = '游ゴシック';

const COLORS = {
  primary: '0017C1',
  accent: 'FF7043',
  accentDark: 'C63F17',
  sectionBg: 'FBE9E7',
  white: 'FFFFFF',
  dark: '212121',
  subText: '666666',
  altRow: 'D9E6FF',
  border: 'CDCDCD',
  memoLabel: '0017C1',
  lightGray: 'F5F5F5',
};

const CHART_PALETTE = ['0017C1', 'FF7043', 'C63F17', '212121', 'B2B2B2', 'D9E6FF', 'F26B43', 'FBE9E7'];

// スライドサイズ（インチ）
const SLIDE_W = 11;
const SLIDE_H = 7.5;
const MARGIN_X = 0.4;
const CONTENT_W = SLIDE_W - MARGIN_X * 2;
const TITLE_Y = 0.15;
const TITLE_H = 0.45;
const CONTENT_Y = TITLE_Y + TITLE_H + 0.05;
const FOOTER_H = 0.3;
const FOOTER_Y = SLIDE_H - FOOTER_H;
const AI_MIN_H = 0.5;

// ─── ロゴ変換 ─────────────────────────────────────────────────────

function svgToBase64Png(svgString, width = 600, height = 144) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// ─── ヘルパー ────────────────────────────────────────────────────

function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '・')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}

function getTableFontSize(rowCount) {
  if (rowCount <= 8) return 8;
  if (rowCount <= 15) return 7;
  if (rowCount <= 24) return 6.5;
  return 6;
}

function calcLayout(dataRowCount, hasAI, hasMemos) {
  const aiHeight = (hasAI || hasMemos) ? AI_MIN_H + (hasMemos ? 0.3 : 0) : 0;
  const availableH = FOOTER_Y - CONTENT_Y - aiHeight - 0.1;

  let chartH, tableH;
  if (dataRowCount <= 8) {
    chartH = availableH * 0.55;
    tableH = availableH * 0.45;
  } else if (dataRowCount <= 15) {
    chartH = availableH * 0.42;
    tableH = availableH * 0.58;
  } else if (dataRowCount <= 24) {
    chartH = availableH * 0.35;
    tableH = availableH * 0.65;
  } else {
    chartH = availableH * 0.28;
    tableH = availableH * 0.72;
  }

  const tableY = CONTENT_Y + chartH + 0.05;
  const aiY = tableY + tableH + 0.05;
  return { chartH, chartY: CONTENT_Y, tableH, tableY, aiY, aiHeight };
}

function calcTableOnlyLayout(hasAI, hasMemos) {
  const aiHeight = (hasAI || hasMemos) ? AI_MIN_H + (hasMemos ? 0.3 : 0) : 0;
  const tableY = CONTENT_Y;
  const tableH = FOOTER_Y - CONTENT_Y - aiHeight - 0.1;
  const aiY = tableY + tableH + 0.05;
  return { tableY, tableH, aiY, aiHeight };
}

function addSlideTitle(slide, title) {
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: CONTENT_W, h: TITLE_H,
    fontSize: 18, fontFace: FONT_FACE, bold: true, color: COLORS.dark,
    valign: 'middle',
  });
}

let _slideCount = 0;
let _totalSlides = 0;

function addSlideFooter(slide) {
  _slideCount++;
  slide.addText(`${_slideCount} / ${_totalSlides}`, {
    x: SLIDE_W - 1.5, y: FOOTER_Y, w: 1.2, h: FOOTER_H,
    fontSize: 8, fontFace: FONT_FACE, color: COLORS.subText,
    align: 'right', valign: 'middle',
  });
}

function addAIAndMemoFooter(slide, aiData, memos, y, maxH) {
  if (!aiData && (!memos || memos.length === 0)) return;

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;

  let currentY = y;

  // AI分析とメモの高さ配分
  let aiH = 0;
  let memoH = 0;
  if (hasAI && hasMemos) {
    aiH = Math.max(maxH * 0.55, 0.35);
    memoH = Math.max(maxH - aiH - 0.05, 0.25);
  } else if (hasAI) {
    aiH = Math.max(maxH, 0.35);
  } else {
    memoH = Math.max(maxH, 0.25);
  }

  // AI分析
  if (hasAI) {
    const aiText = cleanMarkdown(aiData.summary);
    if (aiText) {
      slide.addText([
        { text: 'AI分析: ', options: { bold: true, color: COLORS.accent, fontSize: 10, fontFace: FONT_FACE } },
        { text: aiText, options: { color: COLORS.subText, fontSize: 10, fontFace: FONT_FACE } },
      ], {
        x: MARGIN_X, y: currentY, w: CONTENT_W, h: aiH,
        valign: 'top', wrap: true, shrinkText: true,
      });
      currentY += aiH + 0.05;
    }
  }

  // メモ
  if (hasMemos) {
    const memoTexts = memos.map((m) => {
      const author = m.isConsultantNote
        ? `[コンサルタント] ${m.consultantName || ''}`
        : `${m.userLastName || ''}${m.userFirstName || ''}`;
      const date = fmtTimestamp(m.updatedAt || m.createdAt);
      return `${author} | ${date} | ${m.content || ''}`;
    });

    const memoContent = [
      { text: 'メモ: ', options: { bold: true, color: COLORS.memoLabel, fontSize: 9, fontFace: FONT_FACE } },
      { text: memoTexts.join('\n'), options: { color: COLORS.subText, fontSize: 9, fontFace: FONT_FACE } },
    ];

    slide.addText(memoContent, {
      x: MARGIN_X, y: currentY, w: CONTENT_W, h: memoH,
      valign: 'top', wrap: true, shrinkText: true,
    });
  }
}

// テーブルヘッダー行スタイル
function headerCellOpts(align = 'center') {
  return {
    fill: { color: COLORS.primary },
    color: COLORS.white,
    bold: true,
    fontSize: 10,
    fontFace: FONT_FACE,
    align,
    valign: 'middle',
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    margin: [4, 6, 4, 6],
  };
}

// データセルスタイル
function dataCellOpts(rowIdx, align = 'left') {
  return {
    fill: { color: rowIdx % 2 === 0 ? COLORS.altRow : COLORS.white },
    color: COLORS.dark,
    fontSize: 10,
    fontFace: FONT_FACE,
    align,
    valign: 'middle',
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    margin: [4, 6, 4, 6],
  };
}

function buildTable(headers, rows, colWidths) {
  const headerRow = headers.map((h) => ({
    text: h.label,
    options: headerCellOpts(h.align || 'center'),
  }));

  const dataRows = rows.map((row, rIdx) =>
    row.map((cell, cIdx) => ({
      text: String(cell ?? '-'),
      options: dataCellOpts(rIdx, headers[cIdx]?.align || (typeof cell === 'number' ? 'right' : 'left')),
    }))
  );

  return {
    rows: [headerRow, ...dataRows],
    options: {
      x: MARGIN_X,
      w: CONTENT_W,
      colW: colWidths,
      fontSize: getTableFontSize(rows.length),
      fontFace: FONT_FACE,
      border: { type: 'solid', pt: 0.5, color: COLORS.border },
      autoPage: false,
    },
  };
}

function formatNumber(v) {
  if (v == null || v === '') return '-';
  const n = typeof v === 'number' ? v : Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('ja-JP');
}

function formatSeconds(sec) {
  if (sec == null) return '-';
  const n = typeof sec === 'number' ? sec : Number(sec);
  if (isNaN(n)) return '-';
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── スライド生成関数 ──────────────────────────────────────────

// 1. 表紙
function createCoverSlide(pptx, siteName, siteUrl, dateRange, logoBase64, compDateRange) {
  const slide = pptx.addSlide();

  // ロゴ画像（左上に小さめ配置）
  if (logoBase64) {
    slide.addImage({
      data: logoBase64,
      x: MARGIN_X, y: 0.4, w: 2.4, h: 0.58,
    });
  }

  // メインタイトル
  slide.addText('分析レポート', {
    x: MARGIN_X, y: 1.5, w: 7, h: 0.8,
    fontSize: 32, fontFace: FONT_FACE, bold: true,
    color: COLORS.dark, align: 'left',
  });

  // サブタイトル
  slide.addText('基本レポート', {
    x: MARGIN_X, y: 2.3, w: 7, h: 0.6,
    fontSize: 20, fontFace: FONT_FACE,
    color: COLORS.subText, align: 'left',
  });

  // 大きな日付表示（右側に配置）
  const from = dateRange?.from || '';
  const dateLabel = from ? `'${from.substring(2, 4)}.${from.substring(5, 7)}` : '';
  if (dateLabel) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.5, y: 3.5, w: 5, h: 3.2,
      fill: { color: COLORS.altRow },
      rectRadius: 0.1,
    });
    slide.addText(dateLabel, {
      x: 5.5, y: 3.5, w: 5, h: 2.0,
      fontSize: 72, fontFace: 'Arial', bold: true,
      color: COLORS.primary, align: 'center', valign: 'middle',
    });
    slide.addText('分析対象月', {
      x: 5.5, y: 5.2, w: 5, h: 0.4,
      fontSize: 10, fontFace: FONT_FACE,
      color: COLORS.subText, align: 'center',
    });
  }

  // 情報テーブル（左下に配置）
  const infoRows = [
    ['サイト名', siteName || ''],
    ['URL', siteUrl || ''],
    ['分析期間', `${dateRange?.from || ''} 〜 ${dateRange?.to || ''}`],
  ];
  if (compDateRange) {
    infoRows.push(['比較期間', `${compDateRange.from || ''} 〜 ${compDateRange.to || ''}`]);
  }
  infoRows.push(['レポート作成日', new Date().toLocaleDateString('ja-JP')]);

  const tableRows = infoRows.map(([label, val]) => [
    { text: label, options: { bold: true, color: COLORS.subText, fontSize: 10, fontFace: FONT_FACE, align: 'left', valign: 'middle', fill: { color: COLORS.lightGray }, border: { type: 'solid', pt: 0.5, color: COLORS.border } } },
    { text: val, options: { color: COLORS.dark, fontSize: 10, fontFace: FONT_FACE, align: 'left', valign: 'middle', fill: { color: COLORS.white }, border: { type: 'solid', pt: 0.5, color: COLORS.border } } },
  ]);

  slide.addTable(tableRows, {
    x: MARGIN_X, y: 3.8, w: 4.8, colW: [1.4, 3.4],
    rowH: 0.4,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
  });

  addSlideFooter(slide);
}

// 2. 全体サマリー（主要指標 + KPI予実 + コンバージョン内訳）
function createSummarySlide(pptx, dashboard, kpiSettings, aiData, memos, compSummary) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, '全体サマリー');

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const hasComp = !!compSummary?.metrics;

  if (dashboard?.metrics) {
    const m = dashboard.metrics;
    const cm = compSummary?.metrics || {};

    // 変化率ヘルパー
    const fmtChange = (cur, prev) => {
      if (cur == null || prev == null || prev === 0) return '';
      const pct = ((cur - prev) / prev * 100).toFixed(1);
      return pct > 0 ? `(+${pct}%)` : `(${pct}%)`;
    };

    // [label, currentValue, prevValue(optional)]
    const metricsData = [
      ['セッション数', formatNumber(m.sessions), hasComp ? formatNumber(cm.sessions) : null, hasComp ? fmtChange(m.sessions, cm.sessions) : null],
      ['ユーザー数', formatNumber(m.totalUsers), hasComp ? formatNumber(cm.totalUsers) : null, hasComp ? fmtChange(m.totalUsers, cm.totalUsers) : null],
      ['新規ユーザー数', formatNumber(m.newUsers), hasComp ? formatNumber(cm.newUsers) : null, hasComp ? fmtChange(m.newUsers, cm.newUsers) : null],
      ['ページビュー数', formatNumber(m.pageViews), hasComp ? formatNumber(cm.pageViews) : null, hasComp ? fmtChange(m.pageViews, cm.pageViews) : null],
      ['エンゲージメント率', fmtPct(m.engagementRate), hasComp ? fmtPct(cm.engagementRate) : null, null],
      ['コンバージョン数', formatNumber(m.conversions), hasComp ? formatNumber(cm.conversions) : null, hasComp ? fmtChange(m.conversions, cm.conversions) : null],
    ];

    // GSC指標
    if (m.clicks || m.impressions) {
      metricsData.push(
        ['クリック数（GSC）', formatNumber(m.clicks), hasComp ? formatNumber(cm.clicks) : null, hasComp ? fmtChange(m.clicks, cm.clicks) : null],
        ['表示回数（GSC）', formatNumber(m.impressions), hasComp ? formatNumber(cm.impressions) : null, hasComp ? fmtChange(m.impressions, cm.impressions) : null],
        ['CTR（GSC）', fmtPct(m.ctr), hasComp ? fmtPct(cm.ctr) : null, null],
        ['平均掲載順位（GSC）', m.position ? Number(m.position).toFixed(1) : '-', hasComp && cm.position ? Number(cm.position).toFixed(1) : null, null],
      );
    }

    const labelCellOpts = { bold: true, color: COLORS.subText, fontSize: 12, fontFace: FONT_FACE, align: 'left', valign: 'middle', fill: { color: COLORS.lightGray }, border: { type: 'solid', pt: 0.5, color: COLORS.border }, margin: [1, 8, 1, 8] };
    const valueCellOpts = { bold: true, color: COLORS.primary, fontSize: 14, fontFace: FONT_FACE, align: 'right', valign: 'middle', fill: { color: COLORS.white }, border: { type: 'solid', pt: 0.5, color: COLORS.border }, margin: [1, 8, 1, 8] };
    const compCellOpts = { color: COLORS.subText, fontSize: 10, fontFace: FONT_FACE, align: 'right', valign: 'middle', fill: { color: COLORS.white }, border: { type: 'solid', pt: 0.5, color: COLORS.border }, margin: [1, 8, 1, 8] };

    let tableRows;
    if (hasComp) {
      // 比較モード: 縦1列形式（ラベル / 当期 / 前期 / 変化率）
      const headerRow = [
        { text: '指標', options: headerCellOpts('left') },
        { text: '当期', options: headerCellOpts('right') },
        { text: '前期', options: headerCellOpts('right') },
        { text: '変化率', options: headerCellOpts('right') },
      ];
      tableRows = [headerRow, ...metricsData.map(([label, val, prevVal, change], rIdx) => [
        { text: label, options: { ...dataCellOpts(rIdx, 'left'), bold: true } },
        { text: val, options: { ...dataCellOpts(rIdx, 'right'), bold: true, color: COLORS.primary } },
        { text: prevVal || '-', options: dataCellOpts(rIdx, 'right') },
        { text: change || '-', options: dataCellOpts(rIdx, 'right') },
      ])];

      slide.addTable(tableRows, {
        x: MARGIN_X, y: CONTENT_Y, w: CONTENT_W,
        colW: [3.0, 2.6, 2.6, 2.0],
        rowH: 0.42,
        fontSize: 10, fontFace: FONT_FACE,
      });
    } else {
      // 通常モード: 2列×N行カード風
      tableRows = [];
      for (let i = 0; i < metricsData.length; i += 2) {
        const row = [];
        row.push(
          { text: metricsData[i][0], options: { ...labelCellOpts } },
          { text: metricsData[i][1], options: { ...valueCellOpts } },
        );
        if (i + 1 < metricsData.length) {
          row.push(
            { text: metricsData[i + 1][0], options: { ...labelCellOpts } },
            { text: metricsData[i + 1][1], options: { ...valueCellOpts } },
          );
        } else {
          row.push(
            { text: '', options: { border: { type: 'none' } } },
            { text: '', options: { border: { type: 'none' } } },
          );
        }
        tableRows.push(row);
      }

      slide.addTable(tableRows, {
        x: MARGIN_X, y: CONTENT_Y, w: CONTENT_W,
        colW: [2.2, 2.85, 2.2, 2.85],
        rowH: 0.55,
      });
    }

    // KPI達成状況
    const rowH = hasComp ? 0.42 : 0.55;
    let kpiEndY = CONTENT_Y + tableRows.length * rowH + 0.2;
    if (kpiSettings?.kpiList && kpiSettings.kpiList.length > 0) {
      const activeKpis = kpiSettings.kpiList.filter(k => k.isActive);
      if (activeKpis.length > 0) {
        slide.addText('KPI達成状況', {
          x: MARGIN_X, y: kpiEndY, w: CONTENT_W, h: 0.3,
          fontSize: 12, fontFace: FONT_FACE, bold: true, color: COLORS.dark,
        });
        kpiEndY += 0.35;

        const kpiHeaders = [
          { text: '指標', options: headerCellOpts('left') },
          { text: '目標値', options: headerCellOpts('right') },
          { text: '実績値', options: headerCellOpts('right') },
          { text: '達成率', options: headerCellOpts('right') },
        ];

        const kpiRows = activeKpis.map((kpi, rIdx) => {
          const actual = getKPIActual(kpi, dashboard);
          const rate = kpi.target && actual != null ? ((actual / kpi.target) * 100).toFixed(1) + '%' : '-';
          return [
            { text: kpi.label || kpi.metric, options: dataCellOpts(rIdx, 'left') },
            { text: formatNumber(kpi.target), options: dataCellOpts(rIdx, 'right') },
            { text: formatNumber(actual), options: dataCellOpts(rIdx, 'right') },
            { text: rate, options: dataCellOpts(rIdx, 'right') },
          ];
        });

        slide.addTable([kpiHeaders, ...kpiRows], {
          x: MARGIN_X, y: kpiEndY, w: CONTENT_W,
          colW: [3.5, 2.2, 2.2, 2.2],
          rowH: 0.4,
          fontSize: 10, fontFace: FONT_FACE,
        });
        kpiEndY += (kpiRows.length + 1) * 0.4 + 0.1;
      }
    }

    // AI分析+メモ（テーブル/KPIの直下から配置）
    const aiY = kpiEndY + 0.1;
    const aiMaxH = FOOTER_Y - aiY - 0.05;
    if (aiMaxH > 0.2) {
  // [moved to AI summary section]
    }
  }

  addSlideFooter(slide);
}

function getKPIActual(kpi, dashboard) {
  if (!dashboard?.metrics) return null;
  const m = dashboard.metrics;
  const map = {
    sessions: m.sessions,
    totalUsers: m.totalUsers,
    newUsers: m.newUsers,
    screenPageViews: m.pageViews,
    engagementRate: m.engagementRate != null ? (m.engagementRate * 100) : null,
    conversions: m.conversions,
    clicks: m.clicks,
    impressions: m.impressions,
  };
  if (kpi.isConversion && kpi.eventName && dashboard.conversions) {
    return dashboard.conversions[kpi.eventName] || 0;
  }
  return map[kpi.metric] ?? null;
}

// セクション区切り
const SECTION_DESCRIPTIONS = {
  'トレンド分析': '月別・日別・曜日別・時間帯別のアクセス推移を確認いただけます。',
  'ユーザー分析': 'ユーザーの属性（男女比・年齢比・地域・デバイス）を確認いただけます。',
  '集客分析': 'どこからユーザーが来訪したのか、流入経路を総合的に分析いただけます。',
  'コンテンツ分析': 'アクセスの多いページやランディングページの分析を確認いただけます。',
  'コンバージョン分析': 'コンバージョンに至る導線やキーイベントの推移を確認いただけます。',
  'Appendix': 'レポート内で使用している用語・指標の説明です。',
};

function createSectionDivider(pptx, title) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };

  // 上部オレンジライン
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN_X, y: 1.0, w: CONTENT_W, h: 0.04,
    fill: { color: COLORS.accentDark },
  });

  // セクション名
  slide.addText(title, {
    x: MARGIN_X, y: 1.2, w: CONTENT_W, h: 0.7,
    fontSize: 28, fontFace: FONT_FACE, bold: true,
    color: COLORS.dark, align: 'left',
  });

  // 説明文
  const desc = SECTION_DESCRIPTIONS[title] || '';
  if (desc) {
    slide.addText(desc, {
      x: MARGIN_X, y: 2.0, w: CONTENT_W * 0.7, h: 1.0,
      fontSize: 14, fontFace: FONT_FACE,
      color: COLORS.subText, align: 'left', valign: 'top',
      lineSpacingMultiple: 1.5,
    });
  }

  addSlideFooter(slide);
}

// 月別（13ヶ月推移）
function createMonthlySlide(pptx, monthlyData, aiData, memos, compMonthlyData) {
  if (!monthlyData || monthlyData.length === 0) return;
  // 昇順ソート（古い→新しい）
  const sorted = [...monthlyData].sort((a, b) => ((a.label || a.month || '') > (b.label || b.month || '') ? 1 : -1));
  const slide = pptx.addSlide();
  addSlideTitle(slide, '月別（13ヶ月推移）');

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(sorted.length, hasAI, hasMemos);

  // 折れ線チャート
  const labels = sorted.map(d => fmtYearMonth(d.month || d.label || d.yearMonth));
  const chartData = [
    { name: 'ユーザー', labels, values: sorted.map(d => fmtNum(d.users || d.totalUsers)) },
    { name: 'セッション', labels, values: sorted.map(d => fmtNum(d.sessions)) },
    { name: 'PV', labels, values: sorted.map(d => fmtNum(d.pageViews || d.screenPageViews)) },
    { name: 'CV', labels, values: sorted.map(d => fmtNum(d.conversions || d.totalConversions || 0)) },
  ];
  let chartColors = ['3b82f6', 'f59e0b', '8b5cf6', 'ef4444'];

  // 比較データ
  if (compMonthlyData && compMonthlyData.length > 0) {
    const compSorted = [...compMonthlyData].sort((a, b) => ((a.label || a.month || '') > (b.label || b.month || '') ? 1 : -1));
    chartData.push(
      { name: '前期セッション', labels, values: labels.map((_, i) => fmtNum(compSorted[i]?.sessions)) },
      { name: '前期CV', labels, values: labels.map((_, i) => fmtNum(compSorted[i]?.conversions || compSorted[i]?.totalConversions || 0)) },
    );
    chartColors = [...chartColors, '93c5fd', 'fca5a5'];
  }

  slide.addChart(pptx.charts.LINE, chartData, {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors,
    lineSize: 2, lineSmooth: false,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    catAxisOrientation: 'minMax',
    showValue: false,
  });

  // テーブル
  const headers = [
    { label: '月', align: 'center' },
    { label: 'セッション', align: 'right' },
    { label: 'ユーザー', align: 'right' },
    { label: '新規ユーザー', align: 'right' },
    { label: 'PV', align: 'right' },
    { label: 'エンゲ率', align: 'right' },
    { label: 'CV', align: 'right' },
    { label: 'CVR', align: 'right' },
  ];

  const rows = sorted.map(d => [
    fmtYearMonth(d.month || d.label || d.yearMonth),
    formatNumber(d.sessions),
    formatNumber(d.users || d.totalUsers),
    formatNumber(d.newUsers),
    formatNumber(d.pageViews || d.screenPageViews),
    fmtPct(d.engagementRate),
    formatNumber(d.conversions || d.totalConversions || 0),
    fmtPct(d.conversionRate),
  ]);

  const tbl = buildTable(headers, rows, [1.2, 1.3, 1.3, 1.3, 1.2, 1.1, 1.1, 1.1]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  tbl.options.fontSize = getTableFontSize(rows.length);
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 日別推移
function createDailySlide(pptx, dailyData, aiData, memos, compDailyData) {
  if (!dailyData?.rows || dailyData.rows.length === 0) return;

  // 昇順ソート（古い→新しい）
  const dataRows = [...dailyData.rows].sort((a, b) => (a.date > b.date ? 1 : -1));
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;

  // ─── スライド1: チャート ───
  const slide1 = pptx.addSlide();
  addSlideTitle(slide1, '日別推移');

  const chartH = FOOTER_Y - CONTENT_Y - 0.1;
  const labels = dataRows.map(d => fmtDate(d.date).replace(/^\d{4}\//, ''));
  const chartData = [
    { name: 'セッション', labels, values: dataRows.map(d => fmtNum(d.sessions)) },
    { name: 'CV', labels, values: dataRows.map(d => fmtNum(d.conversions || d.totalConversions || 0)) },
  ];
  let chartColors = ['3b82f6', 'ef4444'];

  // 比較データ
  if (compDailyData?.rows && compDailyData.rows.length > 0) {
    const compRows = [...compDailyData.rows].sort((a, b) => (a.date > b.date ? 1 : -1));
    chartData.push(
      { name: '前期セッション', labels, values: labels.map((_, i) => fmtNum(compRows[i]?.sessions)) },
      { name: '前期CV', labels, values: labels.map((_, i) => fmtNum(compRows[i]?.conversions || compRows[i]?.totalConversions || 0)) },
    );
    chartColors = [...chartColors, '93c5fd', 'fca5a5'];
  }

  slide1.addChart(pptx.charts.LINE, chartData, {
    x: MARGIN_X, y: CONTENT_Y, w: CONTENT_W, h: chartH,
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors,
    lineSize: 2,
    catAxisLabelFontSize: dataRows.length > 31 ? 5 : 6,
    valAxisLabelFontSize: 9,
    catAxisLabelRotate: dataRows.length > 15 ? 45 : 0,
    showValue: false,
  });

  addSlideFooter(slide1);

  // ─── スライド2: テーブル（左右2列） + AI分析 + メモ ───
  const slide2 = pptx.addSlide();
  addSlideTitle(slide2, '日別推移（データ）');

  const tableLayout = calcTableOnlyLayout(hasAI, hasMemos);
  const headers = [
    { label: '日付', align: 'center' },
    { label: 'セッション', align: 'right' },
    { label: 'CV', align: 'right' },
  ];
  const rows = dataRows.map(d => [
    fmtDate(d.date),
    formatNumber(d.sessions),
    formatNumber(d.conversions || d.totalConversions || 0),
  ]);

  // 左右2列に分割
  const mid = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, mid);
  const rightRows = rows.slice(mid);
  const gap = 0.3;
  const halfW = (CONTENT_W - gap) / 2;
  const colW = [1.6, 1.8, 1.55];
  const fontSize = getTableFontSize(mid);

  const tblL = buildTable(headers, leftRows, colW);
  tblL.options.x = MARGIN_X;
  tblL.options.w = halfW;
  tblL.options.y = tableLayout.tableY;
  tblL.options.h = tableLayout.tableH;
  tblL.options.fontSize = fontSize;
  slide2.addTable(tblL.rows, tblL.options);

  const tblR = buildTable(headers, rightRows, colW);
  tblR.options.x = MARGIN_X + halfW + gap;
  tblR.options.w = halfW;
  tblR.options.y = tableLayout.tableY;
  tblR.options.h = tableLayout.tableH;
  tblR.options.fontSize = fontSize;
  slide2.addTable(tblR.rows, tblR.options);

  // [moved to AI summary section]
  addSlideFooter(slide2);
}

// 曜日別
function createWeeklySlide(pptx, weeklyData, aiData, memos) {
  if (!weeklyData?.rows || weeklyData.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '曜日別');

  const dataRows = weeklyData.rows;
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(7, hasAI, hasMemos);

  const labels = dataRows.map(d => DAY_NAMES[Number(d.dayOfWeek)] || d.dayOfWeek);
  const chartData = [
    { name: 'セッション', labels, values: dataRows.map(d => fmtNum(d.sessions)) },
    { name: 'CV', labels, values: dataRows.map(d => fmtNum(d.conversions || d.totalConversions || 0)) },
  ];

  slide.addChart(pptx.charts.BAR, chartData, {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    barDir: 'col', barGrouping: 'clustered',
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors: ['3b82f6', 'ef4444'],
    catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
    showValue: false,
  });

  const headers = [
    { label: '曜日', align: 'center' },
    { label: 'セッション', align: 'right' },
    { label: 'CV', align: 'right' },
  ];
  const rows = dataRows.map(d => [
    DAY_NAMES[Number(d.dayOfWeek)] || d.dayOfWeek,
    formatNumber(d.sessions),
    formatNumber(d.conversions || d.totalConversions || 0),
  ]);

  const tbl = buildTable(headers, rows, [3.0, 3.6, 3.5]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 時間帯別
function createHourlySlide(pptx, hourlyData, aiData, memos) {
  if (!hourlyData?.rows || hourlyData.rows.length === 0) return;

  const dataRows = hourlyData.rows;
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;

  // ─── スライド1: チャート ───
  const slide1 = pptx.addSlide();
  addSlideTitle(slide1, '時間帯別');

  const chartH = FOOTER_Y - CONTENT_Y - 0.1;
  const labels = dataRows.map(d => `${d.hour}時`);
  const chartData = [
    { name: 'セッション', labels, values: dataRows.map(d => fmtNum(d.sessions)) },
    { name: 'CV', labels, values: dataRows.map(d => fmtNum(d.conversions || d.totalConversions || 0)) },
  ];

  slide1.addChart(pptx.charts.BAR, chartData, {
    x: MARGIN_X, y: CONTENT_Y, w: CONTENT_W, h: chartH,
    barDir: 'col', barGrouping: 'clustered',
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors: ['3b82f6', 'ef4444'],
    catAxisLabelFontSize: 6, valAxisLabelFontSize: 9,
    showValue: false,
  });

  addSlideFooter(slide1);

  // ─── スライド2: テーブル（左右2列） + AI分析 + メモ ───
  const slide2 = pptx.addSlide();
  addSlideTitle(slide2, '時間帯別（データ）');

  const tableLayout = calcTableOnlyLayout(hasAI, hasMemos);
  const headers = [
    { label: '時間', align: 'center' },
    { label: 'セッション', align: 'right' },
    { label: 'CV', align: 'right' },
  ];
  const rows = dataRows.map(d => [
    `${d.hour}時`,
    formatNumber(d.sessions),
    formatNumber(d.conversions || d.totalConversions || 0),
  ]);

  // 左右2列に分割
  const mid = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, mid);
  const rightRows = rows.slice(mid);
  const gap = 0.3;
  const halfW = (CONTENT_W - gap) / 2;
  const colW = [1.6, 1.8, 1.55];
  const fontSize = getTableFontSize(mid);

  const tblL = buildTable(headers, leftRows, colW);
  tblL.options.x = MARGIN_X;
  tblL.options.w = halfW;
  tblL.options.y = tableLayout.tableY;
  tblL.options.h = tableLayout.tableH;
  tblL.options.fontSize = fontSize;
  slide2.addTable(tblL.rows, tblL.options);

  const tblR = buildTable(headers, rightRows, colW);
  tblR.options.x = MARGIN_X + halfW + gap;
  tblR.options.w = halfW;
  tblR.options.y = tableLayout.tableY;
  tblR.options.h = tableLayout.tableH;
  tblR.options.fontSize = fontSize;
  slide2.addTable(tblR.rows, tblR.options);

  // [moved to AI summary section]
  addSlideFooter(slide2);
}

// ユーザー属性（ドーナツ×4）
function createUsersDonutSlide(pptx, demographics) {
  if (!demographics?.data) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, 'ユーザー属性');

  const data = demographics.data;
  const chartConfigs = [
    { title: '新規/リピーター', data: data.newReturning },
    { title: '性別', data: data.gender },
    { title: '年齢層', data: data.age },
    { title: 'デバイス', data: data.device },
  ];

  const positions = [
    { x: 0.3, y: 0.7 },   // 左上
    { x: 5.5, y: 0.7 },   // 右上
    { x: 0.3, y: 3.8 },   // 左下
    { x: 5.5, y: 3.8 },   // 右下
  ];

  const chartW = 5.0;
  const chartH = 2.8;

  chartConfigs.forEach((config, idx) => {
    if (!config.data || config.data.length === 0) return;
    const pos = positions[idx];

    slide.addText(config.title, {
      x: pos.x, y: pos.y, w: chartW, h: 0.3,
      fontSize: 10, fontFace: FONT_FACE, bold: true, color: COLORS.dark,
      align: 'center',
    });

    const chartData = [{
      name: config.title,
      labels: config.data.map(d => d.name || d.label || ''),
      values: config.data.map(d => fmtNum(d.value || d.count || d.users || 0)),
    }];

    slide.addChart(pptx.charts.DOUGHNUT, chartData, {
      x: pos.x, y: pos.y + 0.3, w: chartW, h: chartH,
      holeSize: 50,
      showLegend: true, legendPos: 'r', legendFontSize: 7,
      chartColors: CHART_PALETTE,
      dataLabelPosition: 'outEnd',
      showPercent: true, showValue: false, showLabel: false,
      dataLabelFontSize: 9,
    });
  });

  addSlideFooter(slide);
}

// ユーザー属性（地域テーブル）
function createUsersRegionSlide(pptx, demographics, aiData, memos) {
  if (!demographics?.data) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '地域別ランキング Top 20');

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcTableOnlyLayout(hasAI, hasMemos);

  // 地域データ（regionを優先、なければcountry）
  const locationData = demographics.data.location;
  const regionData = locationData?.region || locationData?.country || [];
  const topData = regionData.slice(0, 20);

  const headers = [
    { label: '#', align: 'center' },
    { label: '地域', align: 'left' },
    { label: 'ユーザー数', align: 'right' },
    { label: '割合', align: 'right' },
  ];

  const rows = topData.map((d, i) => [
    i + 1,
    d.name || '',
    formatNumber(d.value || d.users || 0),
    d.percentage != null ? `${Number(d.percentage).toFixed(1)}%` : '-',
  ]);

  const tbl = buildTable(headers, rows, [0.8, 5.0, 2.2, 2.1]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  tbl.options.fontSize = getTableFontSize(rows.length);
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 集客チャネル
function createChannelsSlide(pptx, channels, aiData, memos) {
  if (!channels?.rows || channels.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '集客チャネル');

  const dataRows = channels.rows;
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(Math.min(dataRows.length, 10), hasAI, hasMemos);

  // 円グラフ（Top 7 + その他）
  const sorted = [...dataRows].sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
  const top7 = sorted.slice(0, 7);
  const others = sorted.slice(7);
  const othersTotal = others.reduce((sum, r) => sum + (r.sessions || 0), 0);

  const pieLabels = top7.map(r => CHANNEL_MAP[r.sessionDefaultChannelGroup] || r.sessionDefaultChannelGroup || '');
  const pieValues = top7.map(r => fmtNum(r.sessions));
  if (othersTotal > 0) {
    pieLabels.push('その他');
    pieValues.push(othersTotal);
  }

  slide.addChart(pptx.charts.PIE, [{ name: 'セッション', labels: pieLabels, values: pieValues }], {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    showLegend: true, legendPos: 'r', legendFontSize: 7,
    chartColors: CHART_PALETTE,
    showPercent: true, showValue: false, showLabel: false,
    dataLabelFontSize: 9,
  });

  // テーブル
  const headers = [
    { label: 'チャネル', align: 'left' },
    { label: 'セッション', align: 'right' },
    { label: 'ユーザー', align: 'right' },
    { label: 'CV', align: 'right' },
  ];
  const rows = sorted.slice(0, 10).map(r => [
    CHANNEL_MAP[r.sessionDefaultChannelGroup] || r.sessionDefaultChannelGroup || '',
    formatNumber(r.sessions),
    formatNumber(r.activeUsers || r.users),
    formatNumber(r.conversions || 0),
  ]);

  const tbl = buildTable(headers, rows, [3.5, 2.5, 2.2, 1.9]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 流入キーワード
function createKeywordsSlide(pptx, keywords, aiData, memos) {
  if (!keywords?.topQueries || keywords.topQueries.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '流入キーワード Top 20');

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcTableOnlyLayout(hasAI, hasMemos);

  // クリック数降順でソートしてTop 20
  const sorted = [...keywords.topQueries].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  const top20 = sorted.slice(0, 20);
  const headers = [
    { label: '#', align: 'center' },
    { label: 'キーワード', align: 'left' },
    { label: 'クリック', align: 'right' },
    { label: '表示回数', align: 'right' },
    { label: 'CTR', align: 'right' },
    { label: '掲載順位', align: 'right' },
  ];

  const rows = top20.map((q, i) => [
    i + 1,
    q.query || '',
    formatNumber(q.clicks),
    formatNumber(q.impressions),
    fmtPct(q.ctr),
    q.position != null ? Number(q.position).toFixed(1) : '-',
  ]);

  const tbl = buildTable(headers, rows, [0.6, 4.0, 1.5, 1.5, 1.2, 1.3]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  tbl.options.fontSize = getTableFontSize(rows.length);
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 被リンク元
function createReferralsSlide(pptx, referrals, aiData, memos) {
  if (!referrals?.rows || referrals.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '被リンク元');

  const dataRows = referrals.rows;
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(Math.min(dataRows.length, 10), hasAI, hasMemos);

  // 円グラフ
  const sorted = [...dataRows].sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
  const top7 = sorted.slice(0, 7);
  const others = sorted.slice(7);
  const othersTotal = others.reduce((sum, r) => sum + (r.sessions || 0), 0);

  const pieLabels = top7.map(r => r.source || r.sessionSource || '');
  const pieValues = top7.map(r => fmtNum(r.sessions));
  if (othersTotal > 0) {
    pieLabels.push('その他');
    pieValues.push(othersTotal);
  }

  slide.addChart(pptx.charts.PIE, [{ name: 'セッション', labels: pieLabels, values: pieValues }], {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    showLegend: true, legendPos: 'r', legendFontSize: 9,
    chartColors: CHART_PALETTE,
    showPercent: true, showValue: false, showLabel: false,
    dataLabelFontSize: 9,
  });

  const headers = [
    { label: '参照元', align: 'left' },
    { label: 'セッション', align: 'right' },
    { label: 'ユーザー', align: 'right' },
    { label: 'CV', align: 'right' },
    { label: 'エンゲ率', align: 'right' },
  ];
  const rows = sorted.slice(0, 10).map(r => [
    r.source || r.sessionSource || '',
    formatNumber(r.sessions),
    formatNumber(r.users || r.activeUsers),
    formatNumber(r.conversions || 0),
    fmtPct(r.engagementRate),
  ]);

  const tbl = buildTable(headers, rows, [3.0, 2.0, 1.8, 1.6, 1.7]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// ページ別 Top 10
function createPagesSlide(pptx, pages, aiData, memos) {
  if (!pages?.rows || pages.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, 'ページ別 Top 10');

  const sorted = [...pages.rows].sort((a, b) => (b.screenPageViews || 0) - (a.screenPageViews || 0));
  const top10 = sorted.slice(0, 10);
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(10, hasAI, hasMemos);

  // 棒グラフ
  const chartData = [
    { name: 'PV', labels: top10.map(r => (r.pagePath || '').substring(0, 30)), values: top10.map(r => fmtNum(r.screenPageViews)) },
    { name: 'セッション', labels: top10.map(r => (r.pagePath || '').substring(0, 30)), values: top10.map(r => fmtNum(r.sessions)) },
  ];

  slide.addChart(pptx.charts.BAR, chartData, {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    barDir: 'col', barGrouping: 'clustered',
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors: ['3b82f6', '10b981'],
    catAxisLabelFontSize: 5, valAxisLabelFontSize: 9,
    catAxisLabelRotate: 45,
    showValue: false,
  });

  const headers = [
    { label: '#', align: 'center' },
    { label: 'ページパス', align: 'left' },
    { label: 'PV', align: 'right' },
    { label: 'セッション', align: 'right' },
    { label: 'エンゲ率', align: 'right' },
  ];
  const rows = top10.map((r, i) => [
    i + 1,
    (r.pagePath || '').substring(0, 50),
    formatNumber(r.screenPageViews),
    formatNumber(r.sessions),
    fmtPct(r.engagementRate),
  ]);

  const tbl = buildTable(headers, rows, [0.6, 4.8, 1.6, 1.6, 1.5]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// ページ分類別
function createPageCategoriesSlide(pptx, pageCategories, aiData, memos) {
  if (!pageCategories?.rows || pageCategories.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, 'ページ分類別');

  // クライアント側でカテゴリ集計
  const categoryMap = {};
  pageCategories.rows.forEach(r => {
    const path = r.pagePath || '/';
    const segments = path.split('/').filter(Boolean);
    const cat = segments.length > 0 ? `/${segments[0]}/` : '/';
    if (!categoryMap[cat]) categoryMap[cat] = { pageViews: 0, users: 0, engagementRate: 0, count: 0 };
    categoryMap[cat].pageViews += fmtNum(r.screenPageViews);
    categoryMap[cat].users += fmtNum(r.activeUsers);
    categoryMap[cat].engagementRate += fmtNum(r.engagementRate);
    categoryMap[cat].count++;
  });

  const categories = Object.entries(categoryMap)
    .map(([cat, d]) => ({ category: cat, pageViews: d.pageViews, users: d.users, engagementRate: d.count > 0 ? d.engagementRate / d.count : 0 }))
    .sort((a, b) => b.pageViews - a.pageViews);

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(Math.min(categories.length, 10), hasAI, hasMemos);

  // 円グラフ
  const top8 = categories.slice(0, 8);
  const othersTotal = categories.slice(8).reduce((sum, c) => sum + c.pageViews, 0);
  const pieLabels = top8.map(c => c.category);
  const pieValues = top8.map(c => c.pageViews);
  if (othersTotal > 0) {
    pieLabels.push('その他');
    pieValues.push(othersTotal);
  }

  slide.addChart(pptx.charts.PIE, [{ name: 'PV', labels: pieLabels, values: pieValues }], {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    showLegend: true, legendPos: 'r', legendFontSize: 7,
    chartColors: CHART_PALETTE,
    showPercent: true, showValue: false, showLabel: false,
    dataLabelFontSize: 9,
  });

  const headers = [
    { label: 'カテゴリ', align: 'left' },
    { label: 'PV', align: 'right' },
    { label: 'ユーザー', align: 'right' },
    { label: 'エンゲ率', align: 'right' },
  ];
  const rows = categories.slice(0, 10).map(c => [
    c.category,
    formatNumber(c.pageViews),
    formatNumber(c.users),
    fmtPct(c.engagementRate),
  ]);

  const tbl = buildTable(headers, rows, [3.5, 2.5, 2.2, 1.9]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// ランディングページ Top 10
function createLandingPagesSlide(pptx, landingPages, aiData, memos) {
  if (!landingPages?.rows || landingPages.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, 'ランディングページ Top 10');

  const sorted = [...landingPages.rows].sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
  const top10 = sorted.slice(0, 10);
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(10, hasAI, hasMemos);

  // 棒グラフ
  const chartData = [
    { name: 'セッション', labels: top10.map(r => (r.landingPage || '').substring(0, 30)), values: top10.map(r => fmtNum(r.sessions)) },
    { name: 'CV', labels: top10.map(r => (r.landingPage || '').substring(0, 30)), values: top10.map(r => fmtNum(r.conversions || 0)) },
  ];

  slide.addChart(pptx.charts.BAR, chartData, {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    barDir: 'col', barGrouping: 'clustered',
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors: ['3b82f6', 'ef4444'],
    catAxisLabelFontSize: 5, valAxisLabelFontSize: 9,
    catAxisLabelRotate: 45,
    showValue: false,
  });

  const headers = [
    { label: '#', align: 'center' },
    { label: 'ランディングページ', align: 'left' },
    { label: 'セッション', align: 'right' },
    { label: 'CV', align: 'right' },
    { label: 'エンゲ率', align: 'right' },
  ];
  const rows = top10.map((r, i) => [
    i + 1,
    (r.landingPage || '').substring(0, 50),
    formatNumber(r.sessions),
    formatNumber(r.conversions || 0),
    fmtPct(r.engagementRate),
  ]);

  const tbl = buildTable(headers, rows, [0.6, 4.8, 1.6, 1.6, 1.5]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// ファイルDL
function createFileDownloadsSlide(pptx, fileDownloads, aiData, memos) {
  if (!fileDownloads?.rows || fileDownloads.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, 'ファイルダウンロード');

  const sorted = [...fileDownloads.rows].sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0));
  const top10 = sorted.slice(0, 10);
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(Math.min(top10.length, 10), hasAI, hasMemos);

  // 棒グラフ
  const chartData = [
    { name: 'DL数', labels: top10.map(r => (r.fileName || r.linkUrl || '').substring(0, 25)), values: top10.map(r => fmtNum(r.eventCount)) },
    { name: 'ユーザー', labels: top10.map(r => (r.fileName || r.linkUrl || '').substring(0, 25)), values: top10.map(r => fmtNum(r.activeUsers)) },
  ];

  slide.addChart(pptx.charts.BAR, chartData, {
    x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
    barDir: 'col', barGrouping: 'clustered',
    showLegend: true, legendPos: 'b', legendFontSize: 7,
    chartColors: ['3b82f6', '10b981'],
    catAxisLabelFontSize: 5, valAxisLabelFontSize: 9,
    catAxisLabelRotate: 45,
    showValue: false,
  });

  const headers = [
    { label: '#', align: 'center' },
    { label: 'ファイル名', align: 'left' },
    { label: 'DL数', align: 'right' },
    { label: 'ユーザー', align: 'right' },
  ];
  const rows = top10.map((r, i) => [
    i + 1,
    (r.fileName || r.linkUrl || '').substring(0, 60),
    formatNumber(r.eventCount),
    formatNumber(r.activeUsers),
  ]);

  const tbl = buildTable(headers, rows, [0.6, 5.8, 1.9, 1.8]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 外部リンク
function createExternalLinksSlide(pptx, externalLinks, aiData, memos) {
  if (!externalLinks?.rows || externalLinks.rows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '外部リンククリック');

  const sorted = [...externalLinks.rows].sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0));
  const top10 = sorted.slice(0, 10);
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcTableOnlyLayout(hasAI, hasMemos);

  const headers = [
    { label: '#', align: 'center' },
    { label: 'リンクURL', align: 'left' },
    { label: 'クリック数', align: 'right' },
    { label: 'ユーザー', align: 'right' },
  ];
  const rows = top10.map((r, i) => [
    i + 1,
    (r.linkUrl || '').substring(0, 60),
    formatNumber(r.eventCount),
    formatNumber(r.activeUsers),
  ]);

  const tbl = buildTable(headers, rows, [0.6, 5.8, 1.9, 1.8]);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// コンバージョン月次推移
function createConversionsSlide(pptx, conversions, aiData, memos) {
  if (!conversions?.data || conversions.data.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, 'コンバージョン月次推移');

  // 昇順ソート（古い→新しい）
  const convData = [...conversions.data].sort((a, b) => ((a.yearMonth || a.month || '') > (b.yearMonth || b.month || '') ? 1 : -1));
  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcLayout(convData.length, hasAI, hasMemos);

  // CVイベント名を抽出
  const eventNames = new Set();
  convData.forEach(d => {
    Object.keys(d).forEach(k => {
      if (k !== 'yearMonth' && k !== 'month' && k !== 'total') eventNames.add(k);
    });
  });
  const events = [...eventNames];

  const labels = convData.map(d => fmtYearMonth(d.yearMonth || d.month));
  const colors = ['3b82f6', '10b981', 'f59e0b', 'ef4444', '8b5cf6', 'ec4899', '06b6d4'];
  const chartData = events.map(ev => ({
    name: ev,
    labels,
    values: convData.map(d => fmtNum(d[ev])),
  }));

  if (chartData.length > 0) {
    slide.addChart(pptx.charts.LINE, chartData, {
      x: MARGIN_X, y: layout.chartY, w: CONTENT_W, h: layout.chartH,
      showLegend: true, legendPos: 'b', legendFontSize: 7,
      chartColors: colors.slice(0, chartData.length),
      lineSize: 2,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showValue: false,
    });
  }

  // テーブル
  const headers = [
    { label: '月', align: 'center' },
    ...events.map(ev => ({ label: ev, align: 'right' })),
    { label: '合計', align: 'right' },
  ];
  const colWidths = [1.5, ...events.map(() => Math.max((CONTENT_W - 3.0) / (events.length + 1), 1.0)), 1.5];
  // 幅の調整
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const scale = CONTENT_W / totalW;
  const adjustedWidths = colWidths.map(w => w * scale);

  const rows = convData.map(d => [
    fmtYearMonth(d.yearMonth || d.month),
    ...events.map(ev => formatNumber(d[ev])),
    formatNumber(events.reduce((sum, ev) => sum + fmtNum(d[ev]), 0)),
  ]);

  const tbl = buildTable(headers, rows, adjustedWidths);
  tbl.options.y = layout.tableY;
  tbl.options.h = layout.tableH;
  tbl.options.fontSize = getTableFontSize(rows.length);
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// 逆算フロー
function createReverseFlowSlide(pptx, reverseFlows, aiData, memos) {
  if (!reverseFlows || reverseFlows.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, '逆算フロー');

  const hasAI = !!aiData?.summary;
  const hasMemos = memos && memos.length > 0;
  const layout = calcTableOnlyLayout(hasAI, hasMemos);

  // ファネルテーブル
  const headers = [
    { label: 'フロー名', align: 'left' },
    { label: '全PV', align: 'right' },
    { label: '遷移率①', align: 'right' },
    { label: 'フォームPV', align: 'right' },
    { label: '遷移率②', align: 'right' },
    { label: '送信完了', align: 'right' },
    { label: '全体CVR', align: 'right' },
  ];

  const rows = reverseFlows.map(flow => {
    const s = flow.summary || {};
    const totalPV = fmtNum(s.totalSiteViews);
    const formPV = fmtNum(s.formPageViews);
    const complete = fmtNum(s.submissionComplete);
    const rate1 = totalPV > 0 ? ((formPV / totalPV) * 100).toFixed(2) + '%' : '-';
    const rate2 = formPV > 0 ? ((complete / formPV) * 100).toFixed(2) + '%' : '-';
    const cvr = totalPV > 0 ? ((complete / totalPV) * 100).toFixed(2) + '%' : '-';

    return [
      flow.flowName || '',
      formatNumber(totalPV),
      rate1,
      formatNumber(formPV),
      rate2,
      formatNumber(complete),
      cvr,
    ];
  });

  const tbl = buildTable(headers, rows, [2.5, 1.3, 1.2, 1.3, 1.2, 1.3, 1.3]);
  tbl.options.y = layout.tableY;
  tbl.options.rowH = 0.4;
  slide.addTable(tbl.rows, tbl.options);

  // [moved to AI summary section]
  addSlideFooter(slide);
}

// Appendix: 用語集
// AI分析サマリーセクション（全セクションのAI考察をまとめて表示）
function createAISummarySection(pptx, aiMap, memosMap) {
  // AI考察があるページを収集
  const sections = [
    { key: 'dashboard', label: '全体サマリー' },
    { key: 'analysis/month', label: '月別分析' },
    { key: 'analysis/day', label: '日別分析' },
    { key: 'analysis/week', label: '曜日別分析' },
    { key: 'analysis/hour', label: '時間帯別分析' },
    { key: 'analysis/users', label: 'ユーザー属性' },
    { key: 'analysis/channels', label: '集客チャネル' },
    { key: 'analysis/keywords', label: 'キーワード' },
    { key: 'analysis/referrals', label: '参照元' },
    { key: 'analysis/pages', label: 'ページ分析' },
    { key: 'analysis/page-categories', label: 'ページ分類' },
    { key: 'analysis/landing-pages', label: 'ランディングページ' },
    { key: 'analysis/conversions', label: 'コンバージョン' },
    { key: 'analysis/reverse-flow', label: '逆引きフロー' },
  ];

  const entries = sections
    .map(s => ({ ...s, ai: aiMap[s.key]?.summary, memos: memosMap[s.key] }))
    .filter(s => s.ai || (s.memos && s.memos.length > 0));

  if (entries.length === 0) return;

  createSectionDivider(pptx, 'AI分析サマリー');

  // 1スライドに最大3セクション分を配置
  for (let i = 0; i < entries.length; i += 3) {
    const chunk = entries.slice(i, i + 3);
    const slide = pptx.addSlide();
    addSlideTitle(slide, 'AI分析サマリー');

    let y = CONTENT_Y + 0.1;
    chunk.forEach(entry => {
      // セクションラベル
      slide.addText(entry.label, {
        x: MARGIN_X, y, w: CONTENT_W, h: 0.35,
        fontSize: 12, fontFace: FONT_FACE, bold: true,
        color: COLORS.accent,
      });
      y += 0.35;

      // AI考察テキスト
      if (entry.ai) {
        const text = cleanMarkdown(entry.ai);
        const lines = Math.ceil(text.length / 80);
        const h = Math.max(0.5, Math.min(lines * 0.22, 1.5));
        slide.addText(text, {
          x: MARGIN_X + 0.2, y, w: CONTENT_W - 0.4, h,
          fontSize: 9, fontFace: FONT_FACE,
          color: COLORS.dark, valign: 'top',
          lineSpacingMultiple: 1.4,
          shrinkText: true,
        });
        y += h + 0.1;
      }

      // メモ
      if (entry.memos && entry.memos.length > 0) {
        entry.memos.slice(0, 2).forEach(memo => {
          const memoText = `[メモ] ${memo.text || ''}`;
          slide.addText(memoText, {
            x: MARGIN_X + 0.2, y, w: CONTENT_W - 0.4, h: 0.3,
            fontSize: 8, fontFace: FONT_FACE,
            color: COLORS.subText, valign: 'top',
          });
          y += 0.3;
        });
      }

      y += 0.15; // セクション間のスペース
    });

    addSlideFooter(slide);
  }
}

function createAppendixSlide(pptx) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, '指標・用語の説明');

  const terms = [
    ['セッション', 'ユーザーがサイトを訪問した回数。30分以上操作がない場合、新しいセッションとしてカウント'],
    ['ユーザー', 'サイトを訪問したユニークユーザー数'],
    ['新規ユーザー', '選択期間中に初めてサイトを訪問したユーザー数'],
    ['ページビュー（表示回数）', 'ページが表示された回数の合計'],
    ['エンゲージメント率', 'エンゲージメントのあったセッションの割合（10秒以上滞在、2PV以上、CVイベント発生のいずれか）'],
    ['平均エンゲージメント時間', 'ユーザーがサイトに積極的に関与していた平均時間'],
    ['コンバージョン（キーイベント）', '設定した目標アクション（お問い合わせ、資料DL等）の完了数'],
    ['コンバージョン率（CVR）', 'セッションのうちコンバージョンに至った割合'],
    ['ランディングページ', 'ユーザーが最初に閲覧したページ'],
    ['クリック数（GSC）', 'Google検索結果でサイトがクリックされた回数'],
    ['表示回数（GSC）', 'Google検索結果にサイトが表示された回数'],
    ['CTR（GSC）', '表示回数に対するクリック数の割合'],
    ['平均掲載順位（GSC）', 'Google検索結果での平均表示順位'],
  ];

  const tableY = CONTENT_Y;
  const tableH = FOOTER_Y - tableY - 0.15;
  const rowH = tableH / (terms.length + 1); // ヘッダー含む均等割り

  const headerRow = [
    { text: '指標名', options: headerCellOpts('left') },
    { text: '説明', options: headerCellOpts('left') },
  ];

  const dataRows = terms.map(([term, desc], idx) => [
    { text: term, options: { ...dataCellOpts(idx, 'left'), bold: true } },
    { text: desc, options: dataCellOpts(idx, 'left') },
  ]);

  slide.addTable([headerRow, ...dataRows], {
    x: MARGIN_X, y: tableY, w: CONTENT_W, h: tableH,
    colW: [3.0, 7.1],
    fontSize: 9, fontFace: FONT_FACE,
    rowH: rowH,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
  });

  addSlideFooter(slide);
}

// ─── メインエクスポート関数 ─────────────────────────────────────

function countSlides(allData) {
  let count = 2; // 表紙 + 全体サマリー
  // トレンド分析
  count += 1; // セクション区切り
  if (allData.monthlyData?.length > 0) count++;
  if (allData.daily?.rows?.length > 0) count += 2; // チャート + テーブル
  if (allData.weekly?.rows?.length > 0) count++;
  if (allData.hourly?.rows?.length > 0) count += 2; // チャート + テーブル
  // ユーザー分析
  count += 1; // セクション区切り
  if (allData.demographics?.data) count += 2; // ドーナツ + 地域
  // 集客分析
  count += 1;
  if (allData.channels?.rows?.length > 0) count++;
  if (allData.keywords?.topQueries?.length > 0) count++;
  if (allData.referrals?.rows?.length > 0) count++;
  // コンテンツ分析
  count += 1;
  if (allData.pages?.rows?.length > 0) count++;
  if (allData.pageCategories?.rows?.length > 0) count++;
  if (allData.landingPages?.rows?.length > 0) count++;
  if (allData.fileDownloads?.rows?.length > 0) count++;
  if (allData.externalLinks?.rows?.length > 0) count++;
  // コンバージョン分析
  count += 1;
  if (allData.conversions?.data?.length > 0) count++;
  if (allData.reverseFlows?.length > 0) count++;
  // Appendix
  count += 2; // セクション区切り + 用語集
  return count;
}

export async function downloadAnalysisPptx(allData, siteName, dateRange) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.defineLayout({ name: 'CUSTOM_4_3', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'CUSTOM_4_3';

  // テーマカラー設定
  pptx.theme = { headFontFace: FONT_FACE, bodyFontFace: FONT_FACE };

  // スライドマスター定義（チャレンジ）
  try {
    pptx.defineSlideMaster({
      title: 'CONTENT_MASTER',
      background: { fill: COLORS.white },
      objects: [
        // 上部にプライマリカラーのアクセントライン
        { rect: { x: 0, y: 0, w: SLIDE_W, h: 0.03, fill: { color: COLORS.primary } } },
        // フッターエリア
        { rect: { x: 0, y: FOOTER_Y - 0.05, w: SLIDE_W, h: 0.01, fill: { color: COLORS.border } } },
      ],
    });
  } catch (e) {
    console.warn('[PPTX] スライドマスター定義スキップ:', e.message);
  }

  // ロゴ変換
  const logoBase64 = await svgToBase64Png(logoSvgRaw).catch(() => null);

  // スライド総数を事前計算
  _slideCount = 0;
  _totalSlides = countSlides(allData);

  const ai = allData.aiAnalysis || {};
  const memos = allData.memos || {};

  const comp = allData.comparison || null;

  // 1. 表紙
  createCoverSlide(pptx, siteName, allData.siteUrl, dateRange, logoBase64, comp?.dateRange);

  // 2. 全体サマリー（主要指標 + KPI予実 + コンバージョン内訳）
  createSummarySlide(pptx, allData.summaryMetrics, allData.kpiSettings, ai['analysis/summary'], memos['analysis/summary'], comp?.summaryMetrics);

  // セクション2: トレンド分析
  createSectionDivider(pptx, 'トレンド分析');
  createMonthlySlide(pptx, allData.monthlyData, ai['analysis/month'], memos['analysis/month'], comp?.monthlyData);
  createDailySlide(pptx, allData.daily, ai['analysis/day'], memos['analysis/day'], comp?.daily);
  createWeeklySlide(pptx, allData.weekly, ai['analysis/week'], memos['analysis/week']);
  createHourlySlide(pptx, allData.hourly, ai['analysis/hour'], memos['analysis/hour']);

  // セクション3: ユーザー分析
  createSectionDivider(pptx, 'ユーザー分析');
  createUsersDonutSlide(pptx, allData.demographics);
  createUsersRegionSlide(pptx, allData.demographics, ai['analysis/users'], memos['analysis/users']);

  // セクション4: 集客分析
  createSectionDivider(pptx, '集客分析');
  createChannelsSlide(pptx, allData.channels, ai['analysis/channels'], memos['analysis/channels']);
  createKeywordsSlide(pptx, allData.keywords, ai['analysis/keywords'], memos['analysis/keywords']);
  createReferralsSlide(pptx, allData.referrals, ai['analysis/referrals'], memos['analysis/referrals']);

  // セクション5: コンテンツ分析
  createSectionDivider(pptx, 'コンテンツ分析');
  createPagesSlide(pptx, allData.pages, ai['analysis/pages'], memos['analysis/pages']);
  createPageCategoriesSlide(pptx, allData.pageCategories, ai['analysis/page-categories'], memos['analysis/page-categories']);
  createLandingPagesSlide(pptx, allData.landingPages, ai['analysis/landing-pages'], memos['analysis/landing-pages']);
  createFileDownloadsSlide(pptx, allData.fileDownloads, ai['analysis/file-downloads'], memos['analysis/file-downloads']);
  createExternalLinksSlide(pptx, allData.externalLinks, ai['analysis/external-links'], memos['analysis/external-links']);

  // セクション6: コンバージョン分析
  createSectionDivider(pptx, 'コンバージョン分析');
  createConversionsSlide(pptx, allData.conversions, ai['analysis/conversions'], memos['analysis/conversions']);
  createReverseFlowSlide(pptx, allData.reverseFlows, ai['analysis/reverse-flow'], memos['analysis/reverse-flow']);

  // セクション7: AI分析サマリー
  createAISummarySection(pptx, ai, memos);

  // セクション8: Appendix
  createSectionDivider(pptx, 'Appendix');
  createAppendixSlide(pptx);

  // ファイル名生成＆ダウンロード
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fileName = `${siteName || 'レポート'}_分析レポート_${dateStr}`;

  await pptx.writeFile({ fileName });
}
