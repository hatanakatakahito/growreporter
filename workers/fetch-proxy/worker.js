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

// 許可するオリジン（CORS）。ワイルドカードは廃止し、本番フロントと grow-reporter.com、ローカル開発のみ。
const ALLOWED_ORIGINS = new Set([
  'https://grow-reporter.com',
  'https://growgroupreporter.web.app',
  'https://growgroupreporter.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
]);

// SSRF 対策: 外部 URL の検証
function isAllowedTargetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, reason: `disallowed protocol: ${protocol}` };
  }
  const host = parsed.hostname.toLowerCase();
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc[0-9a-f]{2}:/,
    /^fd[0-9a-f]{2}:/,
    /^fe80:/,
    /^metadata\.google\.internal$/,
    /^169\.254\.169\.254$/,
    /^metadata$/,
  ];
  for (const re of privatePatterns) {
    if (re.test(host)) {
      return { ok: false, reason: `private/internal host blocked: ${host}` };
    }
  }
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsAllowed = ALLOWED_ORIGINS.has(origin);

    // CORSプリフライト
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin, corsAllowed);
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // シークレットキー認証（実体はサーバー間呼出。Origin チェックは緩め）
    const secret = request.headers.get('X-Proxy-Secret');
    if (!secret || secret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const body = await request.json();
      const { url, mode = 'html' } = body;

      // SSRF 検証: プロトコル / プライベート IP / メタデータ
      const v = isAllowedTargetUrl(url);
      if (!v.ok) {
        return corsJson({ error: `URL blocked: ${v.reason}` }, 400, origin, corsAllowed);
      }

      if (mode === 'snapshot') {
        return corsJson(await buildSnapshot(url), 200, origin, corsAllowed);
      }

      // デフォルト: HTMLそのまま返却（既存動作）
      const response = await fetch(url, { headers: COMMON_FETCH_HEADERS, redirect: 'follow' });
      const html = await response.text();
      return corsJson({ status: response.status, html }, 200, origin, corsAllowed);
    } catch (err) {
      return corsJson({ error: err.message }, 500, origin, corsAllowed);
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

  // 1) lazy-load 属性を src/srcset に解決（script 除去前に実施）
  //    data-src, data-srcset, data-original, data-lazy-src 等を本物の URL に巻き戻す
  let html = resolveLazyLoadAttributes(rawHtml);

  // 2) <script> / <noscript> を除去
  html = stripScripts(html);

  // 3) CSS リンクを収集＋フェッチ＋インライン化
  const { html: htmlAfterCss, stats: cssStats } = await inlineStylesheets(html, finalUrl);
  html = htmlAfterCss;

  // 4) 属性URL（img/src, srcset, source, video, iframe, link, a など）を絶対化
  html = absolutizeAttributeUrls(html, finalUrl);

  // 5) インライン style="..." の url(...) を絶対化
  html = absolutizeInlineStyleUrls(html, finalUrl);

  // 6) <base href> を最終URLで固定（念のため）
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

// ========== lazy-load 解決 ==========

/**
 * lazy-load 属性を src/srcset に巻き戻す
 * - data-src / data-original / data-lazy-src / data-actual-src → src
 * - data-srcset / data-lazy-srcset → srcset
 * - data-bg / data-background-image → style="background-image:url(...)"
 * - loading="lazy" → loading="eager"
 *
 * 主要 lazy-load ライブラリ (lazysizes, WP Rocket, A3 Lazy Load, Smush, JTB自社実装等) を網羅
 */
function resolveLazyLoadAttributes(html) {
  let result = html;

  // data-{src系} → src への置換（既に src があっても上書き、placeholder は捨てる）
  // 順序: より一般的な data-src を最後に置いてフォールバック扱いにする
  const srcAttrs = ['data-original', 'data-lazy-src', 'data-actual-src', 'data-img', 'data-src'];
  for (const attr of srcAttrs) {
    // <img|source|video|audio|iframe ... data-xxx="VALUE" ... > を捕捉して
    // 同タグ内の src="..." を VALUE に書き換え or 追加
    const re = new RegExp(
      `(<(?:img|source|video|audio|iframe|picture)\\b[^>]*?)\\s${attr}\\s*=\\s*["']([^"']+)["']([^>]*>)`,
      'gi'
    );
    result = result.replace(re, (_, pre, value, post) => {
      // 既存 src="..." を上書き
      const combined = pre + post;
      if (/\ssrc\s*=\s*["'][^"']*["']/i.test(combined)) {
        return (pre + post).replace(/(\ssrc\s*=\s*["'])[^"']*(["'])/i, `$1${value}$2`);
      }
      // src 属性が無ければ追加
      return `${pre} src="${value}"${post}`;
    });
  }

  // data-{srcset系} → srcset への置換
  const srcsetAttrs = ['data-lazy-srcset', 'data-srcset'];
  for (const attr of srcsetAttrs) {
    const re = new RegExp(
      `(<(?:img|source|picture)\\b[^>]*?)\\s${attr}\\s*=\\s*["']([^"']+)["']([^>]*>)`,
      'gi'
    );
    result = result.replace(re, (_, pre, value, post) => {
      const combined = pre + post;
      if (/\ssrcset\s*=\s*["'][^"']*["']/i.test(combined)) {
        return (pre + post).replace(/(\ssrcset\s*=\s*["'])[^"']*(["'])/i, `$1${value}$2`);
      }
      return `${pre} srcset="${value}"${post}`;
    });
  }

  // data-bg / data-background-image / data-background → 背景画像 style に展開
  const bgAttrs = ['data-bg', 'data-background-image', 'data-background', 'data-bg-image'];
  for (const attr of bgAttrs) {
    const re = new RegExp(`(<[a-z][a-z0-9]*\\b[^>]*?)\\s${attr}\\s*=\\s*["']([^"']+)["']([^>]*>)`, 'gi');
    result = result.replace(re, (_, pre, value, post) => {
      const bgUrl = /^url\(/i.test(value) ? value : `url('${value}')`;
      const combined = pre + post;
      // 既存 style 属性があれば追加、なければ新規
      if (/\sstyle\s*=\s*["'][^"']*["']/i.test(combined)) {
        return (pre + post).replace(
          /(\sstyle\s*=\s*["'])([^"']*)(["'])/i,
          (_full, sPre, sVal, sSuf) => {
            const sep = sVal && !sVal.trim().endsWith(';') ? ';' : '';
            return `${sPre}${sVal}${sep}background-image:${bgUrl};${sSuf}`;
          }
        );
      }
      return `${pre} style="background-image:${bgUrl};"${post}`;
    });
  }

  // loading="lazy" → "eager" （iframe 内では viewport 判定が効かないため）
  result = result.replace(/(\sloading\s*=\s*["'])lazy(["'])/gi, '$1eager$2');

  return result;
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

function corsHeaders(origin = '', allowed = false) {
  // 許可オリジンのみ Allow-Origin を返す。それ以外はヘッダ無し（CORS preflight 失敗で拒否される）
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Secret',
    'Vary': 'Origin',
  };
  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function corsJson(obj, status = 200, origin = '', allowed = false) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, allowed),
    },
  });
}

function corsResponse(body, status, origin = '', allowed = false) {
  return new Response(body, { status, headers: corsHeaders(origin, allowed) });
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
