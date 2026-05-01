/**
 * Cloudflare Worker: HTMLフェッチプロキシ / 完全スナップショット生成
 *
 * モード:
 *   mode: 'html'        — 対象URLのHTMLをそのまま返す（既存動作、デフォルト）
 *   mode: 'snapshot'    — 外部CSSをインライン化し、画像/フォントURLを絶対化した
 *                          自己完結HTMLを返す（改善モックアップの完全再現用）
 *   mode: 'render'      — Browser Rendering で JS 実行後の DOM (HTML) を返す
 *                          lazy-load 全発火、networkidle 待機まで実施
 *   mode: 'screenshot'  — Browser Rendering でフルページ JPEG を base64 で返す
 *   mode: 'render+shot' — 1 アクセスで HTML と JPEG を同時に返す（改善ロジック統一化用）
 *                          visual 確定後に screenshot を撮り、その後で iframe srcDoc 用の
 *                          HTML 処理 (CSS インライン化 + script 削除) を続行
 *
 * Browser Rendering モード ('render' | 'screenshot' | 'render+shot') は env.BROWSER バインディングを使用。
 * Workers Free では 1日10分・同時3ブラウザまで。本番ロールアウト時に Workers Paid 検討。
 */
import puppeteer from '@cloudflare/puppeteer';

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
      const { url, mode = 'html', viewport = 'pc', fullPage = true } = body;

      // SSRF 検証: プロトコル / プライベート IP / メタデータ
      const v = isAllowedTargetUrl(url);
      if (!v.ok) {
        return corsJson({ error: `URL blocked: ${v.reason}` }, 400, origin, corsAllowed);
      }

      if (mode === 'snapshot') {
        return corsJson(await buildSnapshot(url), 200, origin, corsAllowed);
      }

      if (mode === 'render' || mode === 'screenshot' || mode === 'render+shot') {
        if (!env.BROWSER) {
          return corsJson({ error: 'Browser Rendering binding (BROWSER) not configured' }, 500, origin, corsAllowed);
        }
        return corsJson(await renderWithBrowser(env.BROWSER, url, mode, viewport, fullPage), 200, origin, corsAllowed);
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

// ========== Browser Rendering モード ==========

/**
 * Browser Rendering でページを開き、JS 実行後の HTML またはスクショを返す。
 *
 * 共通処理:
 *   1. viewport 設定（pc=1920x1080, mobile=412x915）
 *   2. networkidle0 で goto（最大 50s）
 *   3. lazy-load 全発火のため最下までスクロール → 戻す
 *   4. 画像読込待ち（最大 2s）
 *
 * @param {Fetcher} browserBinding env.BROWSER
 * @param {string} pageUrl 撮影対象 URL（SSRF 検証済）
 * @param {'render'|'screenshot'|'render+shot'} mode
 *   - 'render': HTML のみ返却
 *   - 'screenshot': screenshot のみ返却（HTML 処理スキップ）
 *   - 'render+shot': screenshot を撮ってから HTML 処理を続行し、両方返却
 * @param {'pc'|'mobile'} viewport
 * @param {boolean} [fullPage=true] - true: ページ全体撮影 (デフォルト互換)、false: viewport のみ撮影 (サムネ用)
 * @returns {Promise<{status: number, html?: string, screenshot?: string, finalUrl?: string, error?: string}>}
 */
async function renderWithBrowser(browserBinding, pageUrl, mode, viewport, fullPage = true) {
  const VIEWPORT_PRESETS = {
    // PC: ノートパソコン標準サイズ (1400×900)
    // - フル HD (1920) より狭めに取ることで iframe srcDoc 表示時の文字サイズが読みやすくなる
    // - 1400 はノート PC の中位サイズ (1366〜1440 帯) の代表値
    // - hero CSS の height (generateImprovementMockup.js 内 900px) と一致させて aspect 不一致を回避
    pc: { width: 1400, height: 900, deviceScaleFactor: 1, isMobile: false },
    mobile: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true },
  };
  const vp = VIEWPORT_PRESETS[viewport] || VIEWPORT_PRESETS.pc;

  let browser;
  try {
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();
    await page.setViewport(vp);
    if (vp.isMobile) {
      // mobile UA を明示的に設定（一部サイトは UA で出し分け）
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
    } else {
      await page.setUserAgent(USER_AGENT);
    }

    // navigation: networkidle0 を試みつつ、長時間ロードでも 50s で諦める
    const response = await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
      timeout: 50_000,
    }).catch((e) => {
      // networkidle まで届かなくても DOMContentLoaded で進める
      return null;
    });

    // ========================================================
    // Lazy-load 強制対策（Browser Rendering でも漏れる lazy-load を確実に発火）
    // - background-image を JS で動的に付与する実装（フッターヒーロー等）に対応
    // - <img loading="lazy"> を eager 化
    // - lazy 系 CSS の opacity 0 / visibility hidden を上書き
    // ========================================================
    await page.evaluate(() => {
      // 1) img loading=lazy を eager に
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        try { img.loading = 'eager'; } catch (_) {}
      });

      // 2) data-bg / data-background-image 等を style="background-image:url(...)" に展開
      const bgAttrs = ['data-bg', 'data-background-image', 'data-background', 'data-bg-image'];
      const sel = bgAttrs.map((a) => `[${a}]`).join(',');
      document.querySelectorAll(sel).forEach((el) => {
        for (const attr of bgAttrs) {
          const v = el.getAttribute(attr);
          if (!v) continue;
          const cur = el.getAttribute('style') || '';
          if (/background-image/i.test(cur)) break; // 既に背景画像あり
          const urlExpr = /^url\(/i.test(v) ? v : `url('${v}')`;
          const sep = cur && !cur.trim().endsWith(';') ? ';' : '';
          el.setAttribute('style', `${cur}${sep}background-image:${urlExpr};background-size:cover;background-position:center;`);
          break;
        }
      });

      // 3) data-src / data-srcset を src / srcset に展開（src が空 or プレースホルダなら）
      document.querySelectorAll('img[data-src]').forEach((img) => {
        const ds = img.getAttribute('data-src');
        const cur = img.getAttribute('src') || '';
        if (ds && (!cur || /data:image\/svg/.test(cur))) {
          try { img.src = ds; } catch (_) {}
        }
      });
      document.querySelectorAll('img[data-srcset], source[data-srcset]').forEach((el) => {
        const ds = el.getAttribute('data-srcset');
        const cur = el.getAttribute('srcset') || '';
        if (ds && !cur) {
          try { el.srcset = ds; } catch (_) {}
        }
      });

      // 4) 強制可視化 CSS 注入 + background-attachment:fixed → scroll 強制
      //    Puppeteer の fullPage screenshot は background-attachment:fixed と相性が悪く、
      //    各 viewport ずつ撮影 + 結合する仕組みのため、fixed 背景が描画されない / 位置がずれる
      //    既知の問題。すべての要素で scroll に強制する。
      if (!document.getElementById('__force-visible')) {
        const style = document.createElement('style');
        style.id = '__force-visible';
        style.textContent = `
[data-src],[data-srcset],[data-lazy-src],[data-original],
.lazy,.lazyloading,.lazyload,.lazyloaded{
opacity:1 !important;visibility:visible !important;
}
*,*::before,*::after{
background-attachment:scroll !important;
}`;
        document.head.appendChild(style);
      }
    });

    // ========================================================
    // 2-pass autoScroll で lazy-load を確実に発火させる
    // ========================================================
    // 1 回目: ゆっくり最下までスクロール → IntersectionObserver 発火
    await autoScrollToBottom(page);
    try {
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 5000 });
    } catch (_) { /* 5s 経過しても進める */ }

    // 2 回目: 先頭に戻して再度最下まで → 1 回目で起動した lazy-load の fetch 完了 + 取りこぼし回収
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 600));
    await autoScrollToBottom(page);
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 });
    } catch (_) { /* 進める */ }

    // 撮影前に先頭へ戻す（fade-in / parallax の安定化、ただし fullPage screenshot 自体は全域撮るので位置は問題ない）
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 600));

    // 画像読込待ち（最大 5s）
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((r) => {
                  img.addEventListener('load', r, { once: true });
                  img.addEventListener('error', r, { once: true });
                })
          )
        ),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    });

    // ========================================================
    // ScrollReveal 等の動的 hidden を解除
    // - <html class="sr"> + 配下の要素に inline style="visibility:hidden;opacity:0;transform:translateY(...)" が付与される
    // - iframe srcDoc では scroll event が発火しないため visible 切替が走らず真っ白になる
    // - root から sr クラスを除去 + inline style を強制リセット
    // ========================================================
    await page.evaluate(() => {
      // 1) html / body の ScrollReveal 系クラスを除去
      const root = document.documentElement;
      ['sr', 'sr-init'].forEach((cls) => {
        if (root.classList.contains(cls)) root.classList.remove(cls);
      });
      const body = document.body;
      if (body) {
        ['sr', 'sr-init'].forEach((cls) => {
          if (body.classList.contains(cls)) body.classList.remove(cls);
        });
      }

      // 2) inline style の visibility:hidden / opacity:0 / transform を解除
      //    要素自身に inline で隠される ScrollReveal / GSAP / AOS 系を一括解除
      document.querySelectorAll('[style]').forEach((el) => {
        const s = el.style;
        if (s.visibility === 'hidden') s.visibility = 'visible';
        if (s.opacity && parseFloat(s.opacity) < 0.1) s.opacity = '1';
        // transform: translate(...) や scale(0) などの「初期非表示状態」をリセット
        // ※ rotate(45deg) などの装飾用 transform は残したいが、ここでは一律 none で割り切る
        if (s.transform && /translate|scale\s*\(\s*0/i.test(s.transform)) {
          s.transform = 'none';
        }
      });
    });

    const finalUrl = page.url();

    // ========================================================
    // Google Maps iframe (会社概要 / アクセス等) のレンダ補助
    // - <iframe src="https://www.google.com/maps/embed?..."> は networkidle 後も
    //   タイルを追加 fetch するため、スクショ時に空白で残るケースが多い
    // - 該当 iframe を scrollIntoView して lazy-load を発火させ、追加で 4s 待機
    // - 該当 iframe が無ければスキップ (待機時間を浪費しない)
    // ========================================================
    const hasGoogleMaps = await page.evaluate(() => {
      const iframes = document.querySelectorAll(
        'iframe[src*="google.com/maps"], iframe[src*="maps.google.com"], iframe[src*="google.co.jp/maps"]'
      );
      if (iframes.length === 0) return false;
      iframes.forEach((iframe) => {
        try {
          // loading="lazy" を eager に切替（既に eager ならノーオペ）
          if (iframe.loading === 'lazy') iframe.loading = 'eager';
          iframe.scrollIntoView({ block: 'center' });
        } catch (_) {}
      });
      return true;
    });
    if (hasGoogleMaps) {
      await new Promise((r) => setTimeout(r, 4000));
      // 撮影前にページ先頭に戻す（fullPage 撮影なので位置は無関係だが描画安定のため）
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 300));
    }

    // 'screenshot' / 'render+shot' は visual 確定後に screenshot を撮る
    // (CSS インライン化や script 削除前の DOM 状態でピクセル化することで、
    //  実サイトの見た目と完全一致させる)
    let screenshotBase64 = null;
    let screenshotByteLen = 0;
    if (mode === 'screenshot' || mode === 'render+shot') {
      const buf = await page.screenshot({
        fullPage: fullPage !== false,
        type: 'jpeg',
        quality: 85,
      });
      screenshotBase64 = arrayBufferToBase64(buf);
      screenshotByteLen = buf.length || buf.byteLength || 0;
    }

    if (mode === 'screenshot') {
      return {
        status: 200,
        screenshot: screenshotBase64,
        finalUrl,
        viewport,
        byteLen: screenshotByteLen,
      };
    }

    // mode === 'render' or 'render+shot' — HTML 処理を続行
    // ScrollReveal などのスクロール検知ライブラリが残した visibility:hidden / opacity:0 を解除
    // - iframe srcDoc では document の scroll event がほぼ発生しないため、
    //   ScrollReveal で hidden 状態のまま残った要素は永久に表示されない
    // - <html class="sr"> や 個別要素の inline style で hidden になっているものを強制解除
    await page.evaluate(() => {
      try {
        document.documentElement.classList.remove('sr');
      } catch (_) {}
      const hiddenSel = '[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0"],[style*="opacity:0"]';
      document.querySelectorAll(hiddenSel).forEach((el) => {
        try {
          el.style.removeProperty('visibility');
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
        } catch (_) {}
      });
      // ScrollReveal 系が data 属性で管理している場合の保険
      document.querySelectorAll('[data-sr-id],[data-sr]').forEach((el) => {
        try {
          el.style.removeProperty('visibility');
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
        } catch (_) {}
      });
    });

    // iframe srcDoc 表示用: 外部 CSS をブラウザ内で fetch して <style> にインライン化
    // - iframe では cross-origin / CORS で外部 CSS の読み込みが失敗するケースがある
    // - インライン化することで iframe srcDoc でも実サイトと同等のレンダリングになる
    // - Browser Rendering の puppeteer から直接 fetch するため CORS の制約を受けない
    await page.evaluate(async () => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      await Promise.all(
        links.map(async (link) => {
          try {
            const href = link.href;
            if (!href || href.startsWith('data:') || href.startsWith('blob:')) return;
            const res = await fetch(href, { credentials: 'omit' });
            if (!res.ok) return;
            let css = await res.text();
            // CSS 内の url(...) 相対パスを CSS ファイルの絶対 URL ベースで解決
            css = css.replace(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g, (m, q, u) => {
              if (/^(data:|https?:\/\/|\/\/|#|mailto:|tel:)/i.test(u)) return m;
              try {
                return `url(${q}${new URL(u, href).toString()}${q})`;
              } catch {
                return m;
              }
            });
            const style = document.createElement('style');
            style.setAttribute('data-inlined-from', href);
            style.textContent = css;
            link.replaceWith(style);
          } catch (_) {
            // fetch 失敗時はそのまま残す（ブラウザのフォールバックに任せる）
          }
        })
      );
    });

    // ========================================================
    // 全 <script> タグを削除（iframe srcDoc で JS 実行を完全に無効化）
    // - iframe sandbox=allow-scripts では外部 ScrollReveal / GSAP / AOS などの JS が再実行される
    // - これらが要素に inline style="visibility:hidden" を再追加 → CSS の !important でも負ける
    // - JS 自体を削除すれば再実行されない → worker 側で解除した状態が iframe でも維持される
    // - Browser Rendering 内では既に JS 実行済 (autoScroll 等で lazy-load 解決済) なので、
    //   DOM 状態は維持される。iframe 表示 (= static screenshot 用途) では JS 不要。
    // - generateImprovementMockup 側で helper script (postMessage 等) を別途注入するため、
    //   フロント側の機能は別途確保される。
    // ========================================================
    await page.evaluate(() => {
      document.querySelectorAll('script').forEach((s) => {
        try { s.remove(); } catch (_) {}
      });
    });

    const html = await page.content();
    return {
      status: response?.status() || 200,
      html,
      ...(mode === 'render+shot' && {
        screenshot: screenshotBase64,
        screenshotByteLen,
      }),
      finalUrl,
      viewport,
      byteLen: html.length,
    };
  } catch (err) {
    return { status: 500, error: `browser-render: ${err.message}` };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) { /* noop */ }
    }
  }
}

/**
 * IntersectionObserver / lazyload 系を発火させるため、ページ全体をスクロールして最下まで降りる。
 *
 * チューニング:
 *   - distance 600 / interval 250ms: 各位置で IntersectionObserver の発火を待つ（早すぎるスクロールで欠落するセクションがあった）
 *   - 最下点到達後 1.5s 停留: stagger animation や遅延 fetch される画像の完了を待つ
 *   - 上限 60s: 異常な長尺ページでの暴走防止
 */
async function autoScrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const distance = 600;
      const interval = 250;
      const settleAtBottom = 1500;
      let total = 0;
      const max = 60_000;
      const timer = setInterval(() => {
        const sh = document.body.scrollHeight;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= sh + 500 || total >= max) {
          clearInterval(timer);
          // 最下点で stagger animation / 遅延 lazy-load の完了待ち
          setTimeout(resolve, settleAtBottom);
        }
      }, interval);
    });
  });
}

/**
 * Uint8Array / ArrayBuffer を base64 文字列に変換
 */
function arrayBufferToBase64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

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
