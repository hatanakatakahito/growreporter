/**
 * Cloudflare Worker: HTMLフェッチプロキシ / 完全スナップショット生成
 *
 * モード:
 *   mode: 'html'     — 対象URLのHTMLをそのまま返す（既存動作、デフォルト）
 *   mode: 'snapshot' — 外部CSSをインライン化し、画像/フォントURLを絶対化した
 *                      自己完結HTMLを返す（改善モックアップの完全再現用）
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const COMMON_FETCH_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

// CSS / 画像のフェッチタイムアウト
const ASSET_FETCH_TIMEOUT_MS = 10_000;
const IMPORT_DEPTH_LIMIT = 2; // @import のネスト解決深さ上限

export default {
  async fetch(request, env) {
    // CORSプリフライト
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // シークレットキー認証
    const secret = request.headers.get('X-Proxy-Secret');
    if (!secret || secret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const body = await request.json();
      const { url, mode = 'html' } = body;
      if (!url || !url.startsWith('http')) {
        return corsJson({ error: 'Invalid URL' }, 400);
      }

      if (mode === 'snapshot') {
        return corsJson(await buildSnapshot(url));
      }

      // デフォルト: HTMLそのまま返却（既存動作）
      const response = await fetch(url, { headers: COMMON_FETCH_HEADERS, redirect: 'follow' });
      const html = await response.text();
      return corsJson({ status: response.status, html });
    } catch (err) {
      return corsJson({ error: err.message }, 500);
    }
  },
};

// ========== スナップショット生成 ==========

/**
 * 完全スナップショットを生成する
 * @param {string} pageUrl 対象ページURL
 * @returns {Promise<{status:number, html:string, stats?:object, error?:string}>}
 */
async function buildSnapshot(pageUrl) {
  const htmlRes = await fetch(pageUrl, { headers: COMMON_FETCH_HEADERS, redirect: 'follow' });
  if (!htmlRes.ok) {
    return { status: htmlRes.status, html: '', error: `target returned ${htmlRes.status}` };
  }
  const rawHtml = await htmlRes.text();
  const finalUrl = htmlRes.url || pageUrl; // リダイレクト後URL

  // 1) <script> / <noscript> を除去
  let html = stripScripts(rawHtml);

  // 2) CSS リンクを収集＋フェッチ＋インライン化
  const { html: htmlAfterCss, stats: cssStats } = await inlineStylesheets(html, finalUrl);
  html = htmlAfterCss;

  // 3) 属性URL（img/src, srcset, source, video, iframe, link, a など）を絶対化
  html = absolutizeAttributeUrls(html, finalUrl);

  // 4) インライン style="..." の url(...) を絶対化
  html = absolutizeInlineStyleUrls(html, finalUrl);

  // 5) <base href> を最終URLで固定（念のため）
  html = ensureBaseTag(html, finalUrl);

  return {
    status: 200,
    html,
    stats: {
      finalUrl,
      cssInlined: cssStats.inlined,
      cssFailed: cssStats.failed,
      byteLen: html.length,
    },
  };
}

// ========== スクリプト除去 ==========

function stripScripts(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
}

// ========== CSS インライン化 ==========

/**
 * HTML内の <link rel="stylesheet" href="..."> をフェッチして <style>...</style> に置換する
 */
async function inlineStylesheets(html, baseUrl) {
  // <link ... rel="stylesheet" ... > 全体を捕捉（属性順が任意）
  const linkRe = /<link\b[^>]*>/gi;
  const matches = [...html.matchAll(linkRe)];
  const stats = { inlined: 0, failed: 0 };

  const replacements = await Promise.all(
    matches.map(async (m) => {
      const tag = m[0];
      if (!/rel\s*=\s*["']?stylesheet["']?/i.test(tag)) return null;
      const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      if (!hrefMatch) return null;

      const absUrl = absolutize(hrefMatch[1], baseUrl);
      try {
        const cssText = await fetchCssWithImports(absUrl, 0);
        if (!cssText) {
          stats.failed++;
          return { original: tag, replacement: '' };
        }
        stats.inlined++;
        return {
          original: tag,
          replacement: `<style data-src="${escapeAttr(absUrl)}">${cssText}</style>`,
        };
      } catch {
        stats.failed++;
        return { original: tag, replacement: '' };
      }
    })
  );

  let result = html;
  for (const r of replacements) {
    if (!r) continue;
    result = result.replace(r.original, r.replacement);
  }
  return { html: result, stats };
}

/**
 * CSSを取得し @import を最大 IMPORT_DEPTH_LIMIT 段までインライン化する
 */
async function fetchCssWithImports(cssUrl, depth) {
  const res = await fetchWithTimeout(cssUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return '';
  let css = await res.text();
  css = rewriteCssUrlRefs(css, cssUrl);

  if (depth < IMPORT_DEPTH_LIMIT) {
    css = await inlineCssImports(css, cssUrl, depth + 1);
  }
  return css;
}

async function inlineCssImports(css, baseUrl, depth) {
  // @import url("...") / @import "..." / @import url(...)
  const importRe = /@import\s+(?:url\(\s*)?['"]?([^'")\s]+)['"]?\s*\)?[^;]*;/g;
  const imports = [...css.matchAll(importRe)];
  if (imports.length === 0) return css;

  const resolved = await Promise.all(
    imports.map(async (m) => {
      const abs = absolutize(m[1], baseUrl);
      try {
        const inner = await fetchCssWithImports(abs, depth);
        return { original: m[0], replacement: inner };
      } catch {
        return { original: m[0], replacement: '' };
      }
    })
  );

  let result = css;
  for (const r of resolved) {
    result = result.replace(r.original, r.replacement);
  }
  return result;
}

/**
 * CSS テキスト中の url(...) を絶対URLに書き換え
 */
function rewriteCssUrlRefs(cssText, cssBaseUrl) {
  return cssText.replace(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g, (match, quote, url) => {
    if (isAbsoluteOrDataUrl(url)) return match;
    const abs = absolutize(url, cssBaseUrl);
    return `url(${quote}${abs}${quote})`;
  });
}

// ========== HTML 属性の URL 絶対化 ==========

function absolutizeAttributeUrls(html, baseUrl) {
  // src / href / poster / data （objectタグ用）
  // srcset は別処理
  const attrPatterns = [
    { re: /(<(?:img|video|audio|source|iframe|embed|track)\b[^>]*?\s(?:src|poster)\s*=\s*["'])([^"']+)(["'])/gi },
    { re: /(<link\b[^>]*?\shref\s*=\s*["'])([^"']+)(["'])/gi },
    { re: /(<a\b[^>]*?\shref\s*=\s*["'])([^"']+)(["'])/gi },
    { re: /(<form\b[^>]*?\saction\s*=\s*["'])([^"']+)(["'])/gi },
    { re: /(<object\b[^>]*?\sdata\s*=\s*["'])([^"']+)(["'])/gi },
    { re: /(<use\b[^>]*?\s(?:href|xlink:href)\s*=\s*["'])([^"']+)(["'])/gi },
  ];

  let result = html;
  for (const { re } of attrPatterns) {
    result = result.replace(re, (_, pre, url, suf) => {
      if (url.startsWith('#')) return `${pre}${url}${suf}`; // フラグメント許容
      return `${pre}${absolutize(url, baseUrl)}${suf}`;
    });
  }

  // srcset（カンマ区切り + descriptor）
  result = result.replace(
    /(<(?:img|source)\b[^>]*?\ssrcset\s*=\s*["'])([^"']+)(["'])/gi,
    (_, pre, srcset, suf) => `${pre}${absolutizeSrcset(srcset, baseUrl)}${suf}`
  );
  return result;
}

function absolutizeSrcset(srcset, baseUrl) {
  return srcset
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      const spaceIdx = trimmed.search(/\s/);
      if (spaceIdx < 0) return absolutize(trimmed, baseUrl);
      const url = trimmed.slice(0, spaceIdx);
      const desc = trimmed.slice(spaceIdx);
      return `${absolutize(url, baseUrl)}${desc}`;
    })
    .filter(Boolean)
    .join(', ');
}

function absolutizeInlineStyleUrls(html, baseUrl) {
  return html.replace(/(\sstyle\s*=\s*["'])([^"']*)(["'])/gi, (_, pre, style, suf) => {
    if (!/url\(/i.test(style)) return `${pre}${style}${suf}`;
    return `${pre}${rewriteCssUrlRefs(style, baseUrl)}${suf}`;
  });
}

// ========== <base> タグ差し込み ==========

function ensureBaseTag(html, finalUrl) {
  if (/<base\b[^>]*>/i.test(html)) return html;
  const baseTag = `<base href="${escapeAttr(finalUrl)}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }
  // <head> が無い HTML でも先頭に挿入
  return baseTag + html;
}

// ========== URL ユーティリティ ==========

function absolutize(url, base) {
  if (!url) return url;
  if (isAbsoluteOrDataUrl(url) || /^(mailto:|tel:|javascript:|blob:|#)/i.test(url)) {
    return url;
  }
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function isAbsoluteOrDataUrl(url) {
  return /^(data:|https?:\/\/|\/\/)/i.test(url);
}

// ========== HTTP ==========

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

// ========== レスポンスヘルパ ==========

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Secret',
  };
}

function corsJson(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsResponse(body, status) {
  return new Response(body, { status, headers: corsHeaders() });
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
