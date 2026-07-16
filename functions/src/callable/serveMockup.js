/**
 * 改善モックアップ HTML プロキシ
 *
 * 2 つのモード:
 *   1. ラッパーモード (default): /page-mockups/{siteId}/{improvementId}.html
 *      → アプリ内 Drawer の UI を完全再現したラッパー HTML を返す
 *   2. raw モード: /page-mockups/{siteId}/{improvementId}.html?raw=1
 *      → 生のモックアップ HTML だけを返す (ラッパー内 iframe 用)
 */

import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

const SAFE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

// 改善案見積もりロジック (frontend src/utils/improvementEstimate.js と同一)
const HOURLY_RATE = 10000;
const DIRECTION_RATE = 1.2;
const MIN_DELIVERY_DAYS = 3;
const HOURS_PER_BUSINESS_DAY = 5;

function formatPrice(estimatedLaborHours) {
  const h = Number(estimatedLaborHours);
  if (!Number.isFinite(h) || h <= 0) return '要相談';
  const price = Math.round(h * HOURLY_RATE * DIRECTION_RATE);
  return `${price.toLocaleString()}円〜`;
}

function formatDelivery(estimatedLaborHours) {
  const h = Number(estimatedLaborHours);
  if (!Number.isFinite(h) || h <= 0) return '要相談';
  const days = Math.max(MIN_DELIVERY_DAYS, Math.ceil(h / HOURS_PER_BUSINESS_DAY));
  return `${days}営業日〜`;
}

const CIRCLED_NUM_MAP = { '①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10 };

const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' };
// frontend priorityColors を hex に変換 (Tailwind と同等)
const PRIORITY_COLORS = {
  high: { bg: '#FEE2E2', fg: '#991B1B' },     // bg-red-100 / text-red-800
  medium: { bg: '#FEF3C7', fg: '#92400E' },   // bg-amber-100 / text-amber-800
  low: { bg: '#F3F4F6', fg: '#374151' },      // bg-gray-100 / text-gray-700
};
const CATEGORY_LABELS = {
  acquisition: '集客',
  content: 'コンテンツ',
  design: 'デザイン',
  feature: '機能',
  other: 'その他',
};
const CATEGORY_COLORS = {
  acquisition: { bg: '#DBEAFE', fg: '#1E40AF' }, // blue
  content: { bg: '#E9D5FF', fg: '#6B21A8' },     // purple
  design: { bg: '#FCE7F3', fg: '#9D174D' },      // pink
  feature: { bg: '#DCFCE7', fg: '#166534' },     // green
  other: { bg: '#F3F4F6', fg: '#1F2937' },       // gray
};

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDescriptionSections(text) {
  if (!text || typeof text !== 'string') return { legacy: text || '' };
  const SECTION_KEYS = [
    { key: 'problem', regex: /【\s*現状の問題\s*】/ },
    { key: 'solution', regex: /【\s*提案内容\s*】/ },
    { key: 'rationale', regex: /【\s*なぜ効くか\s*】/ },
  ];
  const hasAny = SECTION_KEYS.some(s => s.regex.test(text));
  if (!hasAny) return { legacy: text };
  const positions = SECTION_KEYS
    .map(s => {
      const m = text.match(s.regex);
      return m ? { key: s.key, idx: m.index, len: m[0].length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.idx - b.idx);
  const result = {};
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const nextIdx = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    result[p.key] = text.substring(p.idx + p.len, nextIdx).trim();
  }
  return result;
}

function parseProposals(text) {
  if (!text || typeof text !== 'string') return null;
  const re = /([①②③④⑤⑥⑦⑧⑨⑩])\s*([\s\S]*?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|$)/g;
  const items = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const num = CIRCLED_NUM_MAP[m[1]];
    const body = (m[2] || '').trim();
    if (!body) continue;
    const nlIdx = body.indexOf('\n');
    const fullColonIdx = body.indexOf('：');
    const halfColonIdx = body.indexOf(':');
    const candidates = [nlIdx, fullColonIdx, halfColonIdx].filter(i => i >= 0);
    let splitIdx = candidates.length ? Math.min(...candidates) : -1;
    if (splitIdx < 0) {
      const spaceRe = /[ 　]/g;
      let match;
      while ((match = spaceRe.exec(body)) !== null) {
        if (match.index >= 6 && match.index <= 40) {
          splitIdx = match.index;
          break;
        }
      }
    }
    let title, detail;
    if (splitIdx < 0) {
      title = body;
      detail = '';
    } else {
      title = body.slice(0, splitIdx).trim();
      detail = body.slice(splitIdx + 1).trim();
    }
    items.push({ num, title, detail });
  }
  return items.length >= 2 ? items : null;
}

function buildChips(mockupPatchChanges, proposals) {
  const proposalTitleByNum = new Map((proposals || []).map(p => [p.num, p.title]));
  const numToChip = new Map();
  let fallbackCounter = 0;
  for (const c of (Array.isArray(mockupPatchChanges) ? mockupPatchChanges : [])) {
    const label = (c?.change_label || '変更').trim();
    const firstChar = label.charAt(0);
    const circled = CIRCLED_NUM_MAP[firstChar];
    let num;
    if (circled) {
      num = circled;
    } else {
      const existing = [...numToChip.values()].find(ch => ch.label === label);
      if (existing) {
        num = existing.num;
      } else {
        fallbackCounter++;
        num = fallbackCounter;
      }
    }
    if (numToChip.has(num)) continue;
    const displayText = proposalTitleByNum.get(num) || label;
    // displayLabel: 先頭の丸数字とその後の空白を除去 (バッジと重複するため)
    const displayLabel = displayText.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '');
    numToChip.set(num, { num, label: displayLabel });
  }
  return [...numToChip.values()].sort((a, b) => a.num - b.num);
}

function buildWrapperHtml({ siteId, improvementId, siteName, improvement }) {
  const title = improvement?.title || '改善モックアップ';
  const targetPageUrl = improvement?.targetPageUrl || '';
  const priority = improvement?.priority;
  const priorityLabel = priority ? PRIORITY_LABELS[priority] : '';
  const priorityCol = priority ? PRIORITY_COLORS[priority] : null;
  const category = improvement?.category;
  const categoryLabel = category ? CATEGORY_LABELS[category] : '';
  const categoryCol = category ? CATEGORY_COLORS[category] : null;

  const sections = parseDescriptionSections(improvement?.description || '');
  const proposals = sections.solution ? parseProposals(sections.solution) : null;
  const chips = buildChips(improvement?.mockupPatchChanges, proposals);

  const expectedImpact = improvement?.expectedImpact || '';
  const priceLabel = formatPrice(improvement?.estimatedLaborHours);
  const deliveryLabel = formatDelivery(improvement?.estimatedLaborHours);

  const rawIframeUrl = `/page-mockups/${siteId}/${improvementId}.html?raw=1`;

  let solutionHtml = '';
  if (proposals && proposals.length >= 2) {
    solutionHtml = `<ol class="proposal-list">${proposals.map(p => `
      <li class="proposal-card" data-proposal-num="${p.num}">
        <span class="proposal-num">${p.num}</span>
        <div class="proposal-body">
          <div class="proposal-title">${esc(p.title)}</div>
          ${p.detail ? `<p class="proposal-detail">${esc(p.detail)}</p>` : ''}
        </div>
      </li>`).join('')}</ol>`;
  } else if (sections.solution) {
    solutionHtml = `<p class="text-paragraph">${esc(sections.solution)}</p>`;
  }

  const chipsHtml = chips.length > 0 ? chips.map(c => `
    <button type="button" class="chip" data-num="${c.num}">
      <span class="chip-num">${c.num}</span>
      <span class="chip-label">${esc(c.label)}</span>
    </button>`).join('') : '';

  // ExternalLink icon (lucide-react と同じ path)
  const externalLinkSvg = '<svg class="ext-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  // ChevronDown
  const chevronSvg = '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  // TrendingUp icon (lucide-react)
  const trendingUpSvg = '<svg class="trending-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)} - 改善モックアップ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;}
  html,body{margin:0;padding:0;height:100%;overflow:hidden;}
  body{font-family:'Inter','Noto Sans JP',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:#111827;background:#fff;line-height:1.5;font-size:14px;}
  button{font:inherit;color:inherit;cursor:pointer;border:0;background:transparent;padding:0;}
  a{color:inherit;text-decoration:none;}

  /* === ドロワーヘッダー === (Improve.jsx 1858-1894 と同じ構造) */
  .drawer-header{padding:16px 24px;border-bottom:1px solid #E5E7EB;flex-shrink:0;background:#fff;}
  .header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
  .header-meta-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;}
  .target-link{display:inline-flex;align-items:center;gap:2px;font-size:12px;color:#3758F9;font-weight:500;}
  .target-link:hover{text-decoration:underline;}
  .ext-icon{width:12px;height:12px;}
  .header-title{font-size:18px;font-weight:700;color:#111827;line-height:1.25;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

  /* === レイアウト 2 カラム === */
  .drawer-body{display:flex;flex:1;overflow:hidden;}

  /* === 左カラム: 改善内容 === */
  .left-col{width:540px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid #F3F4F6;background:#fff;}
  .left-header{padding:14px 24px;border-bottom:1px solid #F3F4F6;flex-shrink:0;}
  .left-header h2{margin:0;font-size:16px;font-weight:700;color:#111827;}
  .left-scroll{flex:1;overflow-y:auto;padding:32px 24px;}

  /* セクション */
  .section{margin-bottom:20px;}
  details.section{margin-bottom:20px;}
  details.section > summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;}
  details.section > summary::-webkit-details-marker{display:none;}
  details.section > summary:hover{opacity:0.8;}
  .section-label{font-size:13px;font-weight:700;color:#3758F9;letter-spacing:0.025em;}
  .chevron{width:16px;height:16px;color:#9CA3AF;transition:transform 0.15s;}
  details[open] .chevron{transform:rotate(180deg);}
  .text-paragraph{margin:8px 0 0;font-size:14px;line-height:1.75;color:#374151;}

  /* 提案内容カード (drawer line 2046-2065 と同じ) */
  .proposal-list{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:10px;}
  .proposal-card{display:flex;gap:10px;padding:12px;border-radius:12px;background:#F9FAFB;transition:background 0.15s;}
  .proposal-card.highlighted{background:#FEF3C7;}
  .proposal-num{flex-shrink:0;width:28px;height:28px;border-radius:9999px;background:#3758F9;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
  .proposal-body{flex:1;min-width:0;}
  .proposal-title{font-size:14px;font-weight:600;color:#111827;}
  .proposal-detail{margin:4px 0 0;font-size:12px;line-height:1.5;color:#374151;}

  /* 左カラム下部 (drawer line 2098-2128 と同じ) */
  .left-bottom{border-top:2px solid #E5E7EB;background:#fff;padding:10px 20px;flex-shrink:0;}
  .impact-strip{display:flex;align-items:center;gap:8px;padding:6px 10px;margin-bottom:8px;border-radius:8px;background:linear-gradient(to right,#F0FDF4,#F0FDFA);border:1px solid #BBF7D0;}
  .trending-icon{width:14px;height:14px;color:#15803D;flex-shrink:0;}
  .impact-label{font-size:11px;font-weight:700;color:#166534;flex-shrink:0;}
  .impact-sep{color:#D1D5DB;flex-shrink:0;}
  .impact-text{font-size:12px;font-weight:600;color:#111827;line-height:1.375;}
  .price-row{display:flex;align-items:center;gap:8px;}
  .price-box{flex:1;border:1px solid #E5E7EB;border-radius:8px;padding:4px 10px;display:flex;align-items:baseline;gap:6px;}
  .price-box .label{font-size:10px;color:#637381;font-weight:500;flex-shrink:0;}
  .price-box .value{font-size:14px;font-weight:700;color:#111827;}
  .price-box .tax{font-size:9px;color:#9CA3AF;}

  /* === 右カラム: モックアップ === */
  .right-col{flex:1;background:#F9FAFB;display:flex;flex-direction:column;overflow:hidden;}
  .right-header{position:sticky;top:0;z-index:10;background:#fff;flex-shrink:0;}
  .right-row-1{padding:12px 24px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .right-row-1 h3{margin:0;font-size:16px;font-weight:700;color:#1F2937;}
  .right-row-1 .pipe{color:#D1D5DB;font-size:14px;}
  .right-row-1 .change-count{font-size:12px;font-weight:700;color:#3758F9;}
  .right-row-2{padding:10px 24px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#fff;}

  /* チップ (drawer line 2236-2247 と同じ) */
  .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px 4px 4px;border-radius:9999px;background:#F3F4F6;color:#374151;font-size:12px;font-weight:500;transition:all 0.15s;}
  .chip:hover{background:rgba(55,88,249,0.1);color:#3758F9;}
  .chip.active{background:#FEF3C7;color:#3758F9;box-shadow:0 0 0 2px rgba(55,88,249,0.3);}
  .chip-num{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#3758F9;color:#fff;font-size:10px;font-weight:700;flex-shrink:0;}
  .chip-label{white-space:nowrap;}

  /* iframe コンテナ */
  .iframe-wrap{flex:1;overflow:auto;background:#fff;}
  .iframe-wrap iframe{display:block;width:100%;border:0;background:#fff;}

  /* レスポンシブ */
  @media (max-width:980px){
    html,body{overflow:auto;}
    .drawer-body{flex-direction:column;height:auto;overflow:visible;}
    .left-col{width:100%;border-right:0;border-bottom:1px solid #E5E7EB;}
    .left-scroll{max-height:400px;}
    .right-col{height:auto;overflow:visible;}
    .iframe-wrap{height:75vh;}
  }
</style>
</head>
<body>
<div style="display:flex;flex-direction:column;height:100vh;">
  <!-- ドロワーヘッダー (タイトル + メタ) -->
  <header class="drawer-header">
    <div class="header-meta-row">
      ${priorityLabel ? `<span class="badge" style="background:${priorityCol.bg};color:${priorityCol.fg};">優先度: ${esc(priorityLabel)}</span>` : ''}
      ${categoryLabel ? `<span class="badge" style="background:${categoryCol.bg};color:${categoryCol.fg};">${esc(categoryLabel)}</span>` : ''}
      ${targetPageUrl ? `<a class="target-link" href="${esc(targetPageUrl)}" target="_blank" rel="noopener noreferrer">対象ページを開く${externalLinkSvg}</a>` : ''}
      ${siteName ? `<span class="impact-sep">·</span><span style="font-size:11px;color:#6B7280;">${esc(siteName)}</span>` : ''}
    </div>
    <h1 class="header-title">${esc(title)}</h1>
  </header>

  <!-- 2 カラム本体 -->
  <div class="drawer-body">
    <!-- 左カラム: 改善内容 -->
    <div class="left-col">
      <div class="left-header"><h2>改善内容</h2></div>
      <div class="left-scroll">
        ${sections.problem ? `
          <details class="section" open>
            <summary>
              <div class="section-label">現状の問題</div>
              ${chevronSvg}
            </summary>
            <p class="text-paragraph">${esc(sections.problem)}</p>
          </details>` : ''}
        ${sections.solution ? `
          <section class="section">
            <div class="section-label" style="margin-bottom:8px;">提案内容</div>
            ${solutionHtml}
          </section>` : ''}
        ${sections.rationale ? `
          <details class="section" open>
            <summary>
              <div class="section-label">なぜ効くか</div>
              ${chevronSvg}
            </summary>
            <p class="text-paragraph">${esc(sections.rationale)}</p>
          </details>` : ''}
        ${!sections.problem && !sections.solution && !sections.rationale && sections.legacy ? `
          <p class="text-paragraph">${esc(sections.legacy)}</p>` : ''}
      </div>
      <div class="left-bottom">
        ${expectedImpact ? `
          <div class="impact-strip">
            ${trendingUpSvg}
            <span class="impact-label">期待する効果</span>
            <span class="impact-sep">·</span>
            <span class="impact-text">${esc(expectedImpact)}</span>
          </div>` : ''}
        <div class="price-row">
          <div class="price-box">
            <span class="label">料金</span>
            <span class="value">${esc(priceLabel)}</span>
            <span class="tax">（税別）</span>
          </div>
          <div class="price-box">
            <span class="label">納期</span>
            <span class="value">${esc(deliveryLabel)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右カラム: モックアップ -->
    <div class="right-col">
      <div class="right-header">
        <div class="right-row-1">
          <h3>改善モックアップ</h3>
          ${chips.length > 0 ? `<span class="pipe">｜</span><span class="change-count">変更 ${chips.length} 件</span>` : ''}
        </div>
        ${chipsHtml ? `<div class="right-row-2">${chipsHtml}</div>` : ''}
      </div>
      <div class="iframe-wrap" id="iframeWrap">
        <iframe id="mockupFrame" src="${esc(rawIframeUrl)}" title="改善モックアップ"></iframe>
      </div>
    </div>
  </div>
</div>

<script>
  (function() {
    var frame = document.getElementById('mockupFrame');
    var wrap = document.getElementById('iframeWrap');

    // mockup HTML の helper script からの postMessage で iframe 高さを反映
    // (helper は __mockup_size をポストする)
    window.addEventListener('message', function(e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__mockup_size' && e.data.height) {
        frame.style.height = e.data.height + 'px';
      } else if (e.data.type === '__mockup_changed_clicked' && e.data.num != null) {
        // iframe 内 badge クリック → wrapper のチップをハイライト
        setActiveChip(String(e.data.num));
        highlightProposal(String(e.data.num));
      }
    });

    function setActiveChip(num) {
      document.querySelectorAll('.chip').forEach(function(c) {
        c.classList.toggle('active', c.getAttribute('data-num') === num);
      });
    }
    function highlightProposal(num) {
      document.querySelectorAll('.proposal-card').forEach(function(p) {
        p.classList.toggle('highlighted', p.getAttribute('data-proposal-num') === num);
      });
    }
    function clearHighlights() {
      document.querySelectorAll('.chip.active').forEach(function(c){ c.classList.remove('active'); });
      document.querySelectorAll('.proposal-card.highlighted').forEach(function(p){ p.classList.remove('highlighted'); });
    }

    // チップクリック: wrapper の iframe-wrap をスクロール + ハイライト
    document.querySelectorAll('.chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        var num = chip.getAttribute('data-num');
        setActiveChip(num);
        highlightProposal(num);
        // iframe は同一オリジン (grow-reporter.com) なので contentDocument 経由で要素取得可
        var doc = frame.contentDocument;
        if (!doc) return;
        var target = doc.querySelector('[data-num="' + num + '"]');
        if (!target) return;
        // iframe height は postMessage で実コンテンツ高さに設定済み (内部スクロールなし)
        // → target の iframe 内オフセット = wrap でのスクロール先
        var rect = target.getBoundingClientRect();
        var iframeContentScroll = (frame.contentWindow.pageYOffset || doc.documentElement.scrollTop || 0);
        var targetTop = rect.top + iframeContentScroll;
        // wrap の上部オフセット (iframe 自体は wrap の top に配置される想定)
        wrap.scrollTo({ top: targetTop - 24, behavior: 'smooth' });
      });
    });

    // チップ以外をクリックしたらハイライト解除
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.chip')) {
        // 提案カードのハイライトのみ残す (iframe からのクリック由来)
        // チップは active 維持で OK だが、ここでは触らない
      }
    });
  })();
</script>
</body>
</html>`;
}

export async function serveMockupRequest(req, res) {
  try {
    const m = (req.path || '').match(/^\/page-mockups\/([^/]+)\/([^/]+)\.html$/);
    if (!m) {
      res.status(400).set('Content-Type', 'text/plain; charset=utf-8').send('Invalid path');
      return;
    }
    const [, siteId, improvementId] = m;
    if (!SAFE_ID_RE.test(siteId) || !SAFE_ID_RE.test(improvementId)) {
      res.status(400).set('Content-Type', 'text/plain; charset=utf-8').send('Invalid id format');
      return;
    }

    const isRaw = req.query?.raw === '1' || req.query?.raw === 'true';

    if (isRaw) {
      const bucket = getStorage().bucket();
      const file = bucket.file(`page-mockups/${siteId}/${improvementId}.html`);
      const [exists] = await file.exists();
      if (!exists) {
        res
          .status(404)
          .set('Content-Type', 'text/html; charset=utf-8')
          .send(`<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>Not Found</title></head><body style="font-family:system-ui;padding:48px;text-align:center;color:#374151"><h1 style="color:#3758F9">モックアップが見つかりません</h1></body></html>`);
        return;
      }
      const [buffer] = await file.download();
      res
        .status(200)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300')
        .send(buffer);
      return;
    }

    const db = getFirestore();
    const [improvementSnap, siteSnap] = await Promise.all([
      db.doc(`sites/${siteId}/improvements/${improvementId}`).get(),
      db.doc(`sites/${siteId}`).get(),
    ]);
    if (!improvementSnap.exists) {
      res
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(`<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>Not Found</title></head><body style="font-family:system-ui;padding:48px;text-align:center;color:#374151"><h1 style="color:#3758F9">改善案が見つかりません</h1><p>URL が正しくないか、削除されている可能性があります。</p></body></html>`);
      return;
    }
    const improvement = improvementSnap.data() || {};
    const siteName = siteSnap.exists ? (siteSnap.data()?.siteName || siteSnap.data()?.name || '') : '';

    const html = buildWrapperHtml({ siteId, improvementId, siteName, improvement });

    res
      .status(200)
      .set('Content-Type', 'text/html; charset=utf-8')
      // ラッパー HTML は Firestore の改善案データを毎回反映する必要があるため
      // ブラウザ・CDN 共にキャッシュしない (raw モックアップは別途キャッシュあり)
      .set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Frame-Options', 'SAMEORIGIN')
      .send(html);
  } catch (err) {
    console.error('[serveMockup] error:', err);
    res
      .status(500)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('Internal error');
  }
}
