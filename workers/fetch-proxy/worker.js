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
// ========================================================
// withTimeout: Promise を指定 ms で reject する保護ラッパー (2026-05-11)
// ========================================================
// 用途: page.evaluate / page.goto / page.content 等が CF BR の Connection closed 後に
//   永久ハングする問題を解消。各 await を withTimeout で包んで上限を強制する。
async function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      console.warn(`[TIMEOUT] ${label} exceeded ${ms}ms`);
      reject(new Error(`${label}-timeout-${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ========================================================
// acquireBrowser: session reuse パターン (2026-05-11)
// ========================================================
// CF 公式推奨: puppeteer.sessions() で利用可能な session を探し、
//   connect() で再利用、無ければ launch() で新規作成 (keep_alive=10分)。
// 終了時は close ではなく disconnect することで session が pool に保持される。
// → cold start hang (puppeteer.launch 直後の goto が 50s timeout する問題) を構造的に解消。
async function acquireBrowser(browserBinding) {
  try {
    const sessions = await withTimeout(
      puppeteer.sessions(browserBinding),
      5_000,
      'puppeteer.sessions'
    );
    const free = (sessions || []).filter((s) => !s.connectionId).map((s) => s.sessionId);
    if (free.length > 0) {
      const sid = free[Math.floor(Math.random() * free.length)];
      try {
        const browser = await withTimeout(
          puppeteer.connect(browserBinding, sid),
          5_000,
          'puppeteer.connect'
        );
        return { browser, reused: true, sessionId: sid };
      } catch (e) {
        console.warn(`[acquireBrowser] connect(${sid}) failed: ${e.message}, falling back to launch`);
      }
    }
  } catch (e) {
    console.warn(`[acquireBrowser] sessions() failed: ${e.message}, falling back to launch`);
  }
  // Fallback: 新規 launch with 10 分 keep_alive
  const browser = await puppeteer.launch(browserBinding, { keep_alive: 600_000 });
  return { browser, reused: false, sessionId: null };
}

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
  // 診断ログ用 (2026-05-08 追加): リダイレクト連鎖と response status を全部記録して
  // 403 / 異常応答時の根本原因調査に使う。レスポンスにそのまま含めて返す。
  const diagnostics = {
    requests: [],
    responses: [],
    consoleMessages: [],
  };
  // 詳細タイミングログ (2026-05-11): どのステップが 90s タイムアウトの主犯か特定するため
  const tStart = Date.now();
  let tLast = tStart;
  const tmark = (phase) => {
    const now = Date.now();
    const stepMs = now - tLast;
    const totalMs = now - tStart;
    console.log(`[TIMING] phase=${phase} step=${stepMs}ms total=${totalMs}ms url=${pageUrl}`);
    tLast = now;
  };
  let hadError = false;
  try {
    const acquired = await acquireBrowser(browserBinding);
    browser = acquired.browser;
    tmark(acquired.reused ? `puppeteer.connect(reused,${acquired.sessionId?.slice(0,8)})` : 'puppeteer.launch(new)');
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

    // ========================================================
    // about:blank プリナビゲーション (2026-05-11 追加, Phase 2)
    // ========================================================
    // CF BR cold pool で初回 navigation の CDP プロトコル送受信が確立できず
    // DCL イベントが届かない問題への対処。先に about:blank を開いて
    // browser ↔ page ↔ CDP の接続経路を強制確立する。失敗しても無視。
    await withTimeout(
      page.goto('about:blank', { timeout: 3_000 }).catch(() => {}),
      4_000,
      'prewarm-about-blank'
    );
    tmark('prewarm-about-blank');

    // 診断: main document の request/response を記録
    page.on('request', (req) => {
      try {
        if (req.resourceType() === 'document' || req.isNavigationRequest?.()) {
          diagnostics.requests.push({
            url: req.url(),
            method: req.method(),
            headers: req.headers(),
            redirectChainLength: req.redirectChain?.()?.length || 0,
          });
        }
      } catch (_) {}
    });
    page.on('response', (res) => {
      try {
        const req = res.request();
        if (req.resourceType() === 'document' || req.isNavigationRequest?.()) {
          diagnostics.responses.push({
            url: res.url(),
            status: res.status(),
            statusText: res.statusText?.() || '',
            headers: res.headers(),
          });
        }
      } catch (_) {}
    });
    page.on('console', (msg) => {
      try {
        if (diagnostics.consoleMessages.length < 50) {
          diagnostics.consoleMessages.push({
            type: msg.type(),
            text: msg.text().slice(0, 500),
          });
        }
      } catch (_) {}
    });

    // ========================================================
    // 第三者 analytics / tag manager / telemetry の遮断
    // ========================================================
    // 目的: 壊れた third-party script (TLS 失敗等) や重い tag manager で
    //       browser instance が刺さるのを防ぐ。
    //
    // 直接の契機: 2026-05 grow-group.jp で happi.net (Tealium 系タグ) が
    //   TLS handshake mid で SEC_E_ILLEGAL_MESSAGE を返すようになり、
    //   Browser Rendering が hang → "Target closed" 連発する事象が発生。
    //   第三者ベンダの突発障害でメイン機能を落とさないよう、
    //   既知の analytics / telemetry ドメインを request interception で遮断する。
    //
    // 設計方針:
    //   - 視覚要素のある第三者 widget (juicer, addtoany 等) は遮断しない
    //     → モックアップの視覚再現性を維持
    //   - 視覚寄与のない analytics / telemetry / tag manager のみ遮断
    //   - hostname suffix match (sub.tealiumiq.com も tealiumiq.com で hit)
    //   - handler 内例外でリクエストが詰まらないよう try/catch + continue フォールバック
    // ========================================================
    const BLOCKED_HOSTS = [
      'happi.net',                                         // 発端: 2026-05 grow-group.jp TLS 切れ
      'tealiumiq.com', 'tiqcdn.com',                       // Tealium
      'google-analytics.com', 'analytics.google.com',      // Google Analytics
      'doubleclick.net',                                   // DoubleClick
      'googletagmanager.com',                              // GTM
      'facebook.net', 'fbcdn.net',                         // FB Pixel
      'hotjar.com', 'hotjar.io',                           // Hotjar
      'clarity.ms',                                        // MS Clarity
      'fullstory.com',                                     // FullStory
      'mixpanel.com', 'mxpnl.com',                         // Mixpanel
      'segment.com', 'segment.io',                         // Segment
      'amplitude.com',                                     // Amplitude
      'newrelic.com', 'nr-data.net',                       // New Relic
      'bugsnag.com',                                       // Bugsnag
      'sentry.io', 'sentry-cdn.com',                       // Sentry
      'heap.io', 'heapanalytics.com',                      // Heap
      'recaptcha.net',                                     // reCAPTCHA alt domain
    ];
    // パス前提の遮断: ドメイン全体は遮断したくない (Maps/Fonts は通したい) が
    // 特定パス配下のみ遮断したい場合に使う。reCAPTCHA は keepalive で
    // networkidle0 を永久に阻害するため必須。
    const BLOCKED_URL_PATTERNS = [
      { hostSuffix: 'google.com', pathPrefix: '/recaptcha/' },     // www.google.com/recaptcha/...
      { hostSuffix: 'gstatic.com', pathPrefix: '/recaptcha/' },    // www.gstatic.com/recaptcha/...
    ];
    const isBlockedHost = (u) => {
      try {
        const parsed = new URL(u);
        const host = parsed.hostname.toLowerCase();
        if (BLOCKED_HOSTS.some((d) => host === d || host.endsWith('.' + d))) return true;
        const path = parsed.pathname;
        for (const { hostSuffix, pathPrefix } of BLOCKED_URL_PATTERNS) {
          if ((host === hostSuffix || host.endsWith('.' + hostSuffix)) && path.startsWith(pathPrefix)) {
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    };
    let blockedCount = 0;
    const blockedHostSamples = new Set();
    // 注: setRequestInterception の有効化は goto 後に行う (2026-05-11, Phase 1)。
    //   理由: cloudflare/puppeteer#67 で「interception を navigation 前に有効化すると
    //   DCL イベントが Puppeteer protocol 層に届かず timeout」する既知問題。
    //   ここでは BLOCKED_HOSTS / isBlockedHost の定義だけ済ませて、実際の
    //   interception 有効化は goto + initial-wait-2s の後で行う。
    tmark('setup-diagnostic');

    // navigation: DOMContentLoaded で goto を抜ける。
    //
    // 経緯:
    //   1. 初期は networkidle0 → keepalive (reCAPTCHA等) で永久発火せず timeout
    //   2. domcontentloaded に変更 → 通常は OK だが CF BR の cold pool では DCL イベントが
    //      Puppeteer Protocol 層に届かず、50s timeout 張り付き → attempt 1 ほぼ全失敗
    //   3. (2026-05-11) timeout を 50s → 15s に短縮。DCL を 15s 内に受信できなければ
    //      諦めて先に進む。post-goto の autoScrollToBottom + waitForNetworkIdle が
    //      実際の DOM 状態を吸収する。warm pool では 1-5s で DCL が来るため影響なし。
    //      cold pool では 15s 諦め → autoScroll で実 DOM 取得 → 合計 50-60s で完走可能。
    const response = await page.goto(pageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    }).catch((e) => {
      return null;
    });
    tmark('goto');

    // goto 失敗時の早期 abort (2026-05-11):
    //   goto が timeout で null 返した場合、ping check で page が生きているか確認。
    //   応答なし (zombie page) なら即 504 で return → autoScroll 等で 60+秒浪費を排除。
    //   応答あり (DCL イベントだけ届かなかった) なら通常フロー継続。
    //
    //   注: 試行した Phase 3 (3s 待機 + 8s readyState 確認 + body 500B 判定) は
    //   @cloudflare/puppeteer の CDP 自体が応答しないケース (例: grow-group.jp/)
    //   で 11s 余分に浪費するだけで救済できなかったため、シンプル版に戻した。
    //   構造的に救えない URL は captureBrowserRendering.js 側の URL ルーティングで
    //   L1 をスキップして直接 L2 へ送る方針。
    if (!response) {
      try {
        const alive = await withTimeout(
          page.evaluate(() => 1),
          2_000,
          'page-alive-check'
        );
        if (alive !== 1) {
          hadError = true;
          return { status: 504, error: 'page-alive-check-failed', diagnostics };
        }
        console.log('[renderWithBrowser] goto timeout, but page alive — continuing');
      } catch (e) {
        hadError = true;
        return { status: 504, error: `page-dead-after-goto: ${e.message}`, diagnostics };
      }
      tmark('alive-check-ok');
    }

    // 初期 JS 実行 (React/Vue hydration, framework init 等) を待つ
    await new Promise((r) => setTimeout(r, 2000));
    tmark('initial-wait-2s');

    // ========================================================
    // setRequestInterception を有効化 (2026-05-11, Phase 1: 移動)
    // ========================================================
    // navigation 完了後にのみ interception を有効化することで
    // cloudflare/puppeteer#67 で報告されている「初回 navigation で
    // DCL イベントが届かない」問題を回避する。
    // goto 中の reCAPTCHA 等の遮断は失うが、その後の autoScroll や lazy-load
    // で発生する第三者リクエストは引き続き遮断される。
    try {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        try {
          const u = req.url();
          if (isBlockedHost(u)) {
            blockedCount++;
            try { blockedHostSamples.add(new URL(u).hostname); } catch (_) {}
            req.abort('blockedbyclient').catch(() => {});
            return;
          }
          req.continue().catch(() => {});
        } catch (_) {
          // handler 内例外でリクエストが永久に詰まるのを防ぐ
          try { req.continue(); } catch (_) {}
        }
      });
    } catch (e) {
      // setRequestInterception 自体が失敗した場合は遮断なしで続行（既存動作にフォールバック）
      console.warn(`[renderWithBrowser] setRequestInterception (post-goto) failed, fallthrough: ${e.message}`);
    }
    tmark('enable-interception-post-goto');

    // ========================================================
    // Lazy-load 強制対策（Browser Rendering でも漏れる lazy-load を確実に発火）
    // - background-image を JS で動的に付与する実装（フッターヒーロー等）に対応
    // - <img loading="lazy"> を eager 化
    // - lazy 系 CSS の opacity 0 / visibility hidden を上書き
    // ========================================================
    await withTimeout(page.evaluate(() => {
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
    }), 10_000, 'lazy-setup');

    tmark('lazy-setup');

    // ========================================================
    // 2-pass autoScroll で lazy-load を確実に発火させる
    // ========================================================
    // 1 回目: ゆっくり最下までスクロール → IntersectionObserver 発火
    await withTimeout(autoScrollToBottom(page), 65_000, 'autoScroll-1');
    tmark('autoScroll-1');
    try {
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 5000 });
    } catch (_) { /* 5s 経過しても進める */ }
    tmark('idle-1');

    // ========================================================
    // 2 回目要否判定 (2026-05-11): pass 1 後に未解決の lazy-load があるかを動的検出
    // - 解決済 → pass 2 スキップ (フォーム系・短ページで -10〜25s)
    // - 残存 → pass 2 実行 (長尺記事・lazy-load 多用ページで品質維持)
    // ========================================================
    const needsSecondPass = await withTimeout(page.evaluate(() => {
      const lazyImgs = document.querySelectorAll(
        'img[data-src]:not([data-src=""]), img[loading="lazy"]:not([src]), img[loading="lazy"][src=""]'
      ).length;
      const lazyBgs = document.querySelectorAll(
        '[data-bg]:not([style*="background-image"]), [data-background-image]:not([style*="background-image"]), [data-background]:not([style*="background-image"])'
      ).length;
      const pendingImgs = Array.from(document.images).filter(
        (i) => !i.complete && i.src && !i.src.startsWith('data:')
      ).length;
      return { lazyImgs, lazyBgs, pendingImgs, need: lazyImgs > 0 || lazyBgs > 0 || pendingImgs > 5 };
    }), 5_000, 'lazy-check');
    console.log(`[renderWithBrowser] lazy-check: imgs=${needsSecondPass.lazyImgs} bgs=${needsSecondPass.lazyBgs} pending=${needsSecondPass.pendingImgs} need2nd=${needsSecondPass.need}`);

    if (needsSecondPass.need) {
      // 2 回目: 先頭に戻して再度最下まで → 1 回目で起動した lazy-load の fetch 完了 + 取りこぼし回収
      await withTimeout(page.evaluate(() => window.scrollTo(0, 0)), 3_000, 'scrollTo-top-a');
      await new Promise((r) => setTimeout(r, 600));
      await withTimeout(autoScrollToBottom(page), 65_000, 'autoScroll-2');
      tmark('autoScroll-2');
      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 });
      } catch (_) { /* 進める */ }
      tmark('idle-2');
    } else {
      tmark('autoScroll-2-skipped');
    }

    // 撮影前に先頭へ戻す（fade-in / parallax の安定化、ただし fullPage screenshot 自体は全域撮るので位置は問題ない）
    await withTimeout(page.evaluate(() => window.scrollTo(0, 0)), 3_000, 'scrollTo-top-b');
    await new Promise((r) => setTimeout(r, 600));

    // 画像読込待ち（最大 5s）
    await withTimeout(page.evaluate(async () => {
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
    }), 10_000, 'image-wait');
    tmark('image-wait');

    // ========================================================
    // ScrollReveal 等の動的 hidden を解除
    // - <html class="sr"> + 配下の要素に inline style="visibility:hidden;opacity:0;transform:translateY(...)" が付与される
    // - iframe srcDoc では scroll event が発火しないため visible 切替が走らず真っ白になる
    // - root から sr クラスを除去 + inline style を強制リセット
    // ========================================================
    await withTimeout(page.evaluate(() => {
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
    }), 5_000, 'scrollreveal-cleanup');
    tmark('scrollreveal-cleanup');

    const finalUrl = page.url();

    // 第三者リクエスト遮断の効果を可視化（CF Worker tail で確認可能）
    if (blockedCount > 0) {
      console.log(
        `[renderWithBrowser] ${pageUrl}: blocked=${blockedCount} hosts=[${[...blockedHostSamples].join(',')}]`
      );
    }

    // ========================================================
    // Google Maps iframe (会社概要 / アクセス等) のレンダ補助
    // - <iframe src="https://www.google.com/maps/embed?..."> は networkidle 後も
    //   タイルを追加 fetch するため、スクショ時に空白で残るケースが多い
    // - 該当 iframe を scrollIntoView して lazy-load を発火させ、追加で 4s 待機
    // - 該当 iframe が無ければスキップ (待機時間を浪費しない)
    // ========================================================
    const hasGoogleMaps = await withTimeout(page.evaluate(() => {
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
    }), 3_000, 'google-maps-detect');
    if (hasGoogleMaps) {
      await new Promise((r) => setTimeout(r, 4000));
      // 撮影前にページ先頭に戻す（fullPage 撮影なので位置は無関係だが描画安定のため）
      await withTimeout(page.evaluate(() => window.scrollTo(0, 0)), 3_000, 'scrollTo-top-c');
      await new Promise((r) => setTimeout(r, 300));
      tmark('google-maps-wait');
    }

    // 'screenshot' / 'render+shot' は visual 確定後に screenshot を撮る
    // (CSS インライン化や script 削除前の DOM 状態でピクセル化することで、
    //  実サイトの見た目と完全一致させる)
    let screenshotBase64 = null;
    let screenshotByteLen = 0;
    if (mode === 'screenshot' || mode === 'render+shot') {
      const buf = await withTimeout(page.screenshot({
        fullPage: fullPage !== false,
        type: 'jpeg',
        quality: 85,
      }), 30_000, 'screenshot');
      screenshotBase64 = arrayBufferToBase64(buf);
      screenshotByteLen = buf.length || buf.byteLength || 0;
      tmark('screenshot');
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
    await withTimeout(page.evaluate(() => {
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
    }), 5_000, 'hidden-cleanup');

    // iframe srcDoc 表示用: 外部 CSS をブラウザ内で fetch して <style> にインライン化
    // - iframe では cross-origin / CORS で外部 CSS の読み込みが失敗するケースがある
    // - インライン化することで iframe srcDoc でも実サイトと同等のレンダリングになる
    // - Browser Rendering の puppeteer から直接 fetch するため CORS の制約を受けない
    await withTimeout(page.evaluate(async () => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      // 各 fetch に 5s timeout を被せる + 全体 Promise.all
      const fetchWithTimeout = (url, ms) => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { credentials: 'omit', signal: ctrl.signal }).finally(() => clearTimeout(tid));
      };
      await Promise.all(
        links.map(async (link) => {
          try {
            const href = link.href;
            if (!href || href.startsWith('data:') || href.startsWith('blob:')) return;
            const res = await fetchWithTimeout(href, 5000);
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
    }), 30_000, 'css-inline');
    tmark('css-inline');

    // (2026-05-11 削除): <video> 要素のスクリーンショット → poster 埋込ロジック
    // フルスクリーン hero 動画でオーバーレイ文字込みで撮れてしまいレイアウト崩壊。
    // <video> タグは Cloud Functions 側でも置換せずそのまま残す方針に変更。

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
    // HTML 文字列ベースの cleanup (script / on* / video / YouTube / javascript:) は
    // Cloud Functions 側の applyPostBrCleanup に一元化済 (2026-05-11)。
    // Worker / Cloud Run は素のレンダリング HTML を返すだけ。L1/L2 で結果統一。
    // Worker 側では DOM 必須の処理 (lazy-load 展開、CSS インライン化、ScrollReveal 解除等)
    // のみ実施する。
    tmark('cleanup-deferred-to-functions');

    const html = await withTimeout(page.content(), 10_000, 'page-content');
    tmark('page-content');
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
      diagnostics,
    };
  } catch (err) {
    hadError = true;
    return { status: 500, error: `browser-render: ${err.message}`, diagnostics };
  } finally {
    if (browser) {
      // browser 終了処理 (2026-05-11 改訂):
      //   正常終了時: browser.disconnect() で session を pool に戻す (warm 再利用可能)
      //   エラー時: browser.close() で完全終了 (壊れた session を再利用させない)
      //   どちらも 3 秒で見切って Worker 応答を返す。
      if (hadError) {
        await Promise.race([
          browser.close().catch(() => { /* noop */ }),
          new Promise((r) => setTimeout(r, 3000)),
        ]);
      } else {
        await Promise.race([
          browser.disconnect().catch(() => { /* noop */ }),
          new Promise((r) => setTimeout(r, 3000)),
        ]);
      }
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
      // 早期 exit (2026-05-11): scrollHeight が連続 N step 安定したらページ伸長
      // 停止と判定して打ち切る。lazy-load が完了して新規コンテンツが追加されなく
      // なった時点で抜けられる。settle 待機は最大 stable 観測の場合のみ短縮。
      const STABLE_LIMIT = 5;
      let prevHeight = 0;
      let stableCount = 0;
      const timer = setInterval(() => {
        const sh = document.body.scrollHeight;
        window.scrollBy(0, distance);
        total += distance;
        if (sh === prevHeight) {
          stableCount++;
        } else {
          stableCount = 0;
          prevHeight = sh;
        }
        const reachedBottom = total >= sh + 500;
        const hitMax = total >= max;
        const stabilized = stableCount >= STABLE_LIMIT && total > 1000;
        if (reachedBottom || hitMax || stabilized) {
          clearInterval(timer);
          // 自然 bottom 到達時は通常の settle、stabilized 検出時は短縮 settle
          const settleMs = stabilized && !reachedBottom ? 600 : settleAtBottom;
          setTimeout(resolve, settleMs);
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
