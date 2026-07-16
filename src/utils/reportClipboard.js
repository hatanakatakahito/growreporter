/**
 * クローズミーティング画面のコピペ補助（Notion 等への貼り付け対応）
 *
 * - copyHtmlTable: <table> を text/html + text/plain でクリップボードへ（Notion に貼ると表になる）
 * - copyChartAsPng: コンテナ内の <svg>（Recharts）を PNG 化してクリップボードへ（非対応ブラウザは PNG ダウンロード）
 * - copyHtmlBlock: 見出し+表+グラフ画像など任意の HTML をクリップボードへ（Phase 2「レポート全体をコピー」用）
 *
 * 依存ライブラリは追加せず、XMLSerializer + canvas で SVG→PNG を行う。
 */

function tableToPlainText(tableEl) {
  try {
    const lines = [];
    for (const row of tableEl.rows) {
      const cells = [];
      for (const cell of row.cells) {
        cells.push((cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim());
      }
      lines.push(cells.join('\t'));
    }
    return lines.join('\n');
  } catch {
    return tableEl.innerText || tableEl.textContent || '';
  }
}

async function writeClipboardItems(items) {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('clipboard-api-unavailable');
  }
  await navigator.clipboard.write([new ClipboardItem(items)]);
}

/**
 * <table> 要素をクリップボードへ（HTML + プレーンテキスト）
 * @param {HTMLTableElement|HTMLElement} tableEl
 * @returns {Promise<boolean>}
 */
export async function copyHtmlTable(tableEl) {
  if (!tableEl) return false;
  const table = tableEl.tagName === 'TABLE' ? tableEl : tableEl.querySelector('table');
  if (!table) return false;
  const html = `<meta charset="utf-8">${table.outerHTML}`;
  const text = tableToPlainText(table);
  try {
    await writeClipboardItems({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    });
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 任意の HTML 文字列をクリップボードへ（text/html + text/plain）
 * @param {string} html
 * @param {string} [plainText]
 * @returns {Promise<boolean>}
 */
export async function copyHtmlBlock(html, plainText = '') {
  const wrapped = `<meta charset="utf-8">${html}`;
  try {
    await writeClipboardItems({
      'text/html': new Blob([wrapped], { type: 'text/html' }),
      'text/plain': new Blob([plainText || html.replace(/<[^>]+>/g, ' ')], { type: 'text/plain' }),
    });
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(plainText || html.replace(/<[^>]+>/g, ' '));
      return true;
    } catch {
      return false;
    }
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * コンテナ内の <svg> を PNG 化して返す（Promise<Blob>）
 */
export async function renderSvgToPngBlob(containerEl, { scale = 2, background = '#ffffff' } = {}) {
  const svg = containerEl?.tagName === 'svg' ? containerEl : containerEl?.querySelector('svg');
  if (!svg) throw new Error('svg-not-found');

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || svg.viewBox?.baseVal?.width || 600));
  const height = Math.max(1, Math.round(rect.height || svg.viewBox?.baseVal?.height || 300));

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  // フォントを明示（外部CSSに依存しないように）
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = "text{font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;}";
  clone.insertBefore(style, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('svg-image-load-failed'));
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas-toBlob-failed'))), 'image/png');
  });
  return blob;
}

/**
 * コンテナ内の <svg> を PNG にしてクリップボードへ。非対応ブラウザは PNG をダウンロード。
 * @returns {Promise<'clipboard'|'download'|false>}
 */
export async function copyChartAsPng(containerEl, filename = 'chart.png') {
  let blob;
  try {
    blob = await renderSvgToPngBlob(containerEl);
  } catch {
    return false;
  }
  try {
    await writeClipboardItems({ 'image/png': blob });
    return 'clipboard';
  } catch {
    downloadBlob(blob, filename);
    return 'download';
  }
}

/** PNG をクリップボードへ書く（既存 Blob 用） */
export async function copyPngBlob(blob, filename = 'image.png') {
  try {
    await writeClipboardItems({ 'image/png': blob });
    return 'clipboard';
  } catch {
    downloadBlob(blob, filename);
    return 'download';
  }
}
