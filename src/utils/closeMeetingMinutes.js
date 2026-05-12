/**
 * クローズミーティング画面 → 議事録 HTML（Notion / Word / Google Docs 貼り付け用）。
 *
 * 数値系（サマリー指標 / チャネル別 / ページ別 / デバイス別）は <table> で出力する。
 * メタ情報・背景/狙い・AI 総括は表だと幅がバラつくので「見出し＋段落＋箇条書き」で出力する。
 * グラフ画像は含めない（Notion がうまく取り込めないため、数値は表で再構成）。
 */
import { comparisonModeLabel } from './closeMeetingPeriod';
import { formatChangePercent } from './comparisonHelpers';
import { fmtDate, KPI_GROUPS, BREAKDOWN_COLUMNS, formatMetricValue } from '../components/GrowInternal/closeMeetingFormat';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** 1 ブロックとして貼る用：内部の改行・連続空白を 1 個の空白に潰す（Notion で勝手に改行されないように） */
const escInline = (s) => esc(String(s ?? '').replace(/\s+/g, ' ').trim());

// すべての表で横幅を統一（width:100% ＝ 貼り付け先の本文幅いっぱい）
const TABLE_OPEN = '<table border="1" cellpadding="4" style="border-collapse:collapse;width:100%;margin:8px 0;font-size:13px">';

/** プレーン文字列の配列 → <ul>（各項目は改行潰し＋エスケープ） */
function listHtml(items) {
  const arr = (Array.isArray(items) ? items : []).filter((x) => x != null && String(x).trim() !== '');
  return arr.length ? `<ul>${arr.map((x) => `<li>${escInline(x)}</li>`).join('')}</ul>` : '';
}

/** 既に HTML 化済みの <li> 内容の配列 → <ul>（エスケープしない） */
function rawList(htmlItems) {
  const arr = (htmlItems || []).filter(Boolean);
  return arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
}

/** 「label：value」1 行（li 内容） */
const kvLine = (label, value) => `<strong>${escInline(label)}</strong>：${escInline(value)}`;

/** 「背景・課題…」など長文項目 → 見出し＋段落の並び */
function notesSections(rows) {
  return rows
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .flatMap(([k, v]) => [`<h3>${esc(k)}</h3>`, `<p>${esc(v).replace(/\n/g, '<br>')}</p>`])
    .join('');
}

/** サマリー指標テーブル（標準10指標、公開前→公開後→増減率） */
function kpiTable(kpi) {
  const after = kpi?.after;
  if (!after) return '';
  const comp = kpi?.comparison;
  const changes = kpi?.changes || {};
  const has = !!kpi?.hasComparison && !!comp;
  const head = has
    ? '<tr><th>指標</th><th>公開前</th><th>公開後</th><th>増減率</th></tr>'
    : '<tr><th>指標</th><th>公開後</th></tr>';
  const body = KPI_GROUPS.flatMap((g) => g.metrics)
    .map((m) => {
      const a = formatMetricValue(after[m.key], m.format);
      if (!has) return `<tr><td>${esc(m.label)}</td><td>${esc(a)}</td></tr>`;
      const b = formatMetricValue(comp[m.key], m.format);
      const c = formatChangePercent(changes[m.key]);
      return `<tr><td>${esc(m.label)}</td><td>${esc(b)}</td><td>${esc(a)}</td><td>${esc(c)}</td></tr>`;
    })
    .join('');
  return `${TABLE_OPEN}<thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/** ブレイクダウン1表（key 列 ＋ 指定指標を 公開前/公開後/増減 で）。多い順、topN 件まで。 */
function breakdownTable(breakdown, columns, metricKey, hasComparison, topN) {
  if (!breakdown?.rows?.length) return '<p>データなし</p>';
  const col = (columns || []).find((c) => c.key === metricKey) || (columns || [])[0];
  if (!col) return '<p>データなし</p>';
  const rows = [...breakdown.rows].sort((a, b) => (Number(b[col.key]) || 0) - (Number(a[col.key]) || 0));
  const limited = topN ? rows.slice(0, topN) : rows;
  const head = hasComparison
    ? `<tr><th>${esc(breakdown.keyLabel)}</th><th>${esc(col.label)}（公開前）</th><th>${esc(col.label)}（公開後）</th><th>増減</th></tr>`
    : `<tr><th>${esc(breakdown.keyLabel)}</th><th>${esc(col.label)}（公開後）</th></tr>`;
  const body = limited
    .map((r) => {
      const name = esc(String(r[breakdown.keyField] || '(なし)').replace(/\s+/g, ' ').trim());
      const a = formatMetricValue(r[col.key], col.format);
      if (!hasComparison) return `<tr><td>${name}</td><td>${esc(a)}</td></tr>`;
      const prev = r[`${col.key}_prev`];
      const b = prev == null ? '—' : formatMetricValue(prev, col.format);
      const ch = r[`${col.key}_change`];
      const c = ch == null ? '—' : formatChangePercent(ch);
      return `<tr><td>${name}</td><td>${esc(b)}</td><td>${esc(a)}</td><td>${esc(c)}</td></tr>`;
    })
    .join('');
  return `${TABLE_OPEN}<thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function htmlToPlainText(html) {
  return html
    .replace(/<\/(h1|h2|h3|p|tr|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '・')
    .replace(/<(th|td)[^>]*>/gi, '\t')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * 議事録 HTML を組み立てる。
 * @returns {{ html: string, text: string }}
 */
export function buildCloseMeetingMinutes({ siteName, siteUrl, record, kpi, breakdowns, observationRange, comparisonRange, hasComparison }) {
  const title = `${siteName || 'サイト'} リニューアル公開後 クローズミーティング`;
  const obsText = observationRange?.from ? `${fmtDate(observationRange.from)} 〜 ${fmtDate(observationRange.to)}` : '—';
  const compText = comparisonRange?.from
    ? `${comparisonModeLabel(comparisonRange.mode)}（${fmtDate(comparisonRange.from)} 〜 ${fmtDate(comparisonRange.to)}）`
    : '—';
  const notes = record?.consultantNotes || {};
  const ai = record?.aiSummary || null;

  const parts = [`<h1>${esc(title)}</h1>`];

  // メタ情報（箇条書き）
  parts.push(
    rawList(
      [
        ['記録名', record?.label],
        ['リニューアル公開日', record?.launchDate ? fmtDate(record.launchDate) : ''],
        ['観測期間（公開後）', obsText],
        ['比較期間（旧サイト）', compText],
        ['サイトURL', siteUrl],
      ]
        .filter(([, v]) => v != null && String(v).trim() !== '')
        .map(([k, v]) => kvLine(k, v)),
    ),
  );

  // プロジェクト設定（背景・課題・目的・目標・備考）（見出し＋段落）
  const noteRows = [
    ['背景', notes.background],
    ['課題', notes.challenge],
    ['目的', notes.purpose],
    ['定性目標', notes.qualitativeGoal],
    ['定量目標', notes.quantitativeGoal],
    ['備考', notes.remarks],
  ];
  const measures = Array.isArray(notes.measures) ? notes.measures.filter(Boolean) : [];
  if (noteRows.some(([, v]) => v && String(v).trim()) || measures.length) {
    parts.push('<h2>プロジェクト設定</h2>', notesSections(noteRows));
    if (measures.length) parts.push('<h3>実施施策</h3>', listHtml(measures));
  }

  // サマリー指標（表）
  if (kpi?.after) parts.push('<h2>サマリー指標（公開前 → 公開後）</h2>', kpiTable(kpi));

  // ブレイクダウン（表・アプリ画面の各表の初期表示指標に合わせる：チャネル/デバイス＝セッション、ページ＝PV）
  parts.push(
    '<h2>チャネル別（公開前 → 公開後）</h2>',
    breakdownTable(breakdowns?.channels, BREAKDOWN_COLUMNS.channels, 'sessions', hasComparison, null),
    '<h2>ページ別（公開前 → 公開後・上位20）</h2>',
    breakdownTable(breakdowns?.pages, BREAKDOWN_COLUMNS.pages, 'screenPageViews', hasComparison, 20),
    '<h2>デバイス別（公開前 → 公開後）</h2>',
    breakdownTable(breakdowns?.devices, BREAKDOWN_COLUMNS.devices, 'sessions', hasComparison, null),
  );

  // AI 総括（見出し＋段落＋箇条書き）
  if (ai && (ai.summary || (ai.goodPoints || []).length || (ai.nextActions || []).length)) {
    parts.push('<h2>公開後の総括</h2>');
    if (ai.summary) parts.push('<h3>総括</h3>', `<p>${escInline(ai.summary)}</p>`);
    if ((ai.goodPoints || []).length) parts.push('<h3>良くなった点</h3>', listHtml(ai.goodPoints));
    if ((ai.nextActions || []).length) parts.push('<h3>残課題・次に取り組むこと</h3>', listHtml(ai.nextActions));
  }

  const html = `<div>${parts.filter(Boolean).join('\n')}</div>`;
  return { html, text: htmlToPlainText(html) };
}
