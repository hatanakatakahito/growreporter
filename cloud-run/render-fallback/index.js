/**
 * Cloud Run puppeteer render service
 *
 * 用途: CF Browser Rendering の IP 帯 (104.28.x.x) が grow-group.jp 等の
 *       anti-spam plugin で 403 ブロックされる際、別 ASN (GCP) からアクセスして
 *       高品質 (Chromium 経由 JS 実行後 DOM) を取得するフォールバック層。
 *
 * エンドポイント:
 *   POST /render
 *     Body: { "url": "https://...", "viewport": "pc"|"mobile" }
 *     Auth: X-Render-Secret header (環境変数 RENDER_SECRET と一致必須)
 *     Response: { status, html, finalUrl, viewport, byteLen, error?, source: 'cloud-run' }
 *
 * 起動: PORT 環境変数 (Cloud Run 標準) で listen
 */

import express from 'express';
import puppeteer from 'puppeteer';

const PORT = parseInt(process.env.PORT || '8080', 10);
const RENDER_SECRET = process.env.RENDER_SECRET || '';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const VIEWPORT_PRESETS = {
  pc: { width: 1400, height: 900, deviceScaleFactor: 1, isMobile: false },
  mobile: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true },
};

// SSRF 対策: private/loopback/metadata 等への外向きアクセスを禁止
function isAllowedTargetUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    const blocked = [
      /^localhost$/, /^127\./, /^10\./, /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^169\.254\./, /^0\./,
      /^::1$/, /^fc[0-9a-f]{2}:/, /^fd[0-9a-f]{2}:/, /^fe80:/,
      /^metadata\.google\.internal$/, /^169\.254\.169\.254$/, /^metadata$/,
    ];
    return !blocked.some((re) => re.test(host));
  } catch {
    return false;
  }
}

// ブラウザインスタンスを使い回す (各リクエストで launch するとレイテンシ増)
let browserPromise = null;
async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.connected) return b;
    } catch (_) {}
    browserPromise = null;
  }
  browserPromise = puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled', // navigator.webdriver=false
      '--no-first-run',
      '--no-zygote',
    ],
  });
  return browserPromise;
}

async function renderPage(pageUrl, viewport = 'pc') {
  const vp = VIEWPORT_PRESETS[viewport] || VIEWPORT_PRESETS.pc;
  const browser = await getBrowser();
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport(vp);
    await page.setUserAgent(vp.isMobile ? MOBILE_USER_AGENT : USER_AGENT);

    const response = await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
      timeout: 50_000,
    }).catch(() => null);

    // Lazy-load 強制 + force-visible CSS 注入 (worker.js と同じロジック)
    await page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        try { img.loading = 'eager'; } catch (_) {}
      });
      const bgAttrs = ['data-bg', 'data-background-image', 'data-background', 'data-bg-image'];
      const sel = bgAttrs.map((a) => `[${a}]`).join(',');
      document.querySelectorAll(sel).forEach((el) => {
        for (const attr of bgAttrs) {
          const v = el.getAttribute(attr);
          if (!v) continue;
          const cur = el.getAttribute('style') || '';
          if (/background-image/i.test(cur)) break;
          const urlExpr = /^url\(/i.test(v) ? v : `url('${v}')`;
          const sep = cur && !cur.trim().endsWith(';') ? ';' : '';
          el.setAttribute('style', `${cur}${sep}background-image:${urlExpr};background-size:cover;background-position:center;`);
          break;
        }
      });
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

    // autoScroll で lazy-load を発火
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const distance = 600;
        const interval = 250;
        const settleAtBottom = 1000;
        let total = 0;
        const max = 15_000;
        const timer = setInterval(() => {
          const sh = document.body.scrollHeight;
          window.scrollBy(0, distance);
          total += distance;
          if (total >= sh + 500 || total >= max) {
            clearInterval(timer);
            setTimeout(resolve, settleAtBottom);
          }
        }, interval);
      });
    });

    try {
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 5000 });
    } catch (_) {}

    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));

    // 画像読込待ち (最大 3s)
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
        }))),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    });

    // ScrollReveal 系の hidden 解除
    await page.evaluate(() => {
      try { document.documentElement.classList.remove('sr'); } catch (_) {}
      const hiddenSel = '[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0"],[style*="opacity:0"]';
      document.querySelectorAll(hiddenSel).forEach((el) => {
        try {
          el.style.removeProperty('visibility');
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
        } catch (_) {}
      });
    });

    const finalUrl = page.url();

    // 外部 CSS をインライン化 (iframe srcDoc 表示時の CORS 回避)
    await page.evaluate(async () => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      await Promise.all(links.map(async (link) => {
        try {
          const href = link.href;
          if (!href || href.startsWith('data:') || href.startsWith('blob:')) return;
          const res = await fetch(href, { credentials: 'omit' });
          if (!res.ok) return;
          let css = await res.text();
          css = css.replace(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g, (m, q, u) => {
            if (/^(data:|https?:\/\/|\/\/|#|mailto:|tel:)/i.test(u)) return m;
            try { return `url(${q}${new URL(u, href).toString()}${q})`; }
            catch { return m; }
          });
          const style = document.createElement('style');
          style.setAttribute('data-inlined-from', href);
          style.textContent = css;
          link.replaceWith(style);
        } catch (_) {}
      }));
    });

    // (2026-05-11 削除): <video> 要素スクリーンショット → poster 焼込ロジック
    // フルスクリーン動画でオーバーレイ文字込みで撮れてしまうため不採用。

    // 全 <script> 削除 (iframe srcDoc で JS を再実行させない)
    await page.evaluate(() => {
      document.querySelectorAll('script').forEach((s) => {
        try { s.remove(); } catch (_) {}
      });
    });

    const html = await page.content();
    return {
      status: response?.status() || 200,
      html,
      finalUrl,
      viewport,
      byteLen: html.length,
      source: 'cloud-run',
    };
  } catch (err) {
    return { status: 500, error: `cloud-run-render: ${err.message}`, source: 'cloud-run' };
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.post('/render', async (req, res) => {
  const secret = req.get('X-Render-Secret') || '';
  if (!RENDER_SECRET || secret !== RENDER_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { url, viewport = 'pc' } = req.body || {};
  if (!url || !isAllowedTargetUrl(url)) {
    return res.status(400).json({ error: 'invalid or disallowed url' });
  }
  try {
    const result = await renderPage(url, viewport);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, source: 'cloud-run' });
  }
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'render-fallback' });
});

app.listen(PORT, () => {
  console.log(`render-fallback listening on :${PORT}`);
});
