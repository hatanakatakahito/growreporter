/**
 * スクレイピング診断スクリプト
 *
 * 複数サイトに対して、取得方法ごとにHTTPステータスと成功/失敗を検証する。
 * 目的: どの取得方式がどのサイトに有効かパターンを見つける。
 *
 * 検証する方式:
 *   1. plain fetch (User-Agent なし)
 *   2. fetch with Chrome UA + フルブラウザヘッダ
 *   3. Cloudflare Workers プロキシ経由
 *
 * 実行: node functions/scripts/scraping-diagnosis.js
 */

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
  'User-Agent': BROWSER_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

const CF_PROXY_URL = 'https://growreporter-fetch-proxy.hatanaka-a1e.workers.dev';
const CF_PROXY_SECRET = '[REDACTED-CF-PROXY-SECRET]';

const SITES = {
  'dormybiz': {
    root: 'https://www.dormybiz.com/',
    samples: [
      'https://www.dormybiz.com/lp/longstay/',
      'https://www.dormybiz.com/service/',
      'https://www.dormybiz.com/contact/',
      'https://www.dormybiz.com/faq/',
    ],
  },
  'grow-group': {
    root: 'https://grow-group.jp/',
    samples: [
      'https://grow-group.jp/company/',
      'https://grow-group.jp/service/',
      'https://grow-group.jp/recruit/',
      'https://grow-group.jp/contact/',
    ],
  },
  'tsubame-g': {
    root: 'https://tsubame-g.com/',
    samples: [
      'https://tsubame-g.com/company/',
      'https://tsubame-g.com/recruit/',
      'https://tsubame-g.com/contact/',
      'https://tsubame-g.com/interview/',
    ],
  },
};

async function tryPlainFetch(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    return {
      method: 'plain',
      status: res.status,
      bodyLength: text.length,
      titleExtract: extractTitle(text),
      ok: res.ok && text.length > 500,
    };
  } catch (e) {
    return { method: 'plain', status: null, error: e.message, ok: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryBrowserFetch(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal });
    const text = await res.text();
    return {
      method: 'browser-ua',
      status: res.status,
      bodyLength: text.length,
      titleExtract: extractTitle(text),
      ok: res.ok && text.length > 500,
    };
  } catch (e) {
    return { method: 'browser-ua', status: null, error: e.message, ok: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryCfProxy(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(CF_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': CF_PROXY_SECRET,
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { method: 'cf-proxy', status: res.status, error: `CF ${res.status}`, ok: false };
    }
    const data = await res.json();
    return {
      method: 'cf-proxy',
      status: data.status,
      bodyLength: data.html?.length || 0,
      titleExtract: extractTitle(data.html || ''),
      ok: data.status >= 200 && data.status < 400 && (data.html?.length || 0) > 500,
    };
  } catch (e) {
    return { method: 'cf-proxy', status: null, error: e.message, ok: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractTitle(html) {
  const m = (html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim().substring(0, 80) : '(no title)';
}

async function diagnoseUrl(url) {
  console.log(`\n  ▼ ${url}`);
  const results = await Promise.all([
    tryPlainFetch(url),
    tryBrowserFetch(url),
    tryCfProxy(url),
  ]);
  for (const r of results) {
    const mark = r.ok ? '✅' : '❌';
    const status = r.status ?? 'ERR';
    const len = r.bodyLength !== undefined ? `${r.bodyLength}b` : '-';
    const info = r.titleExtract ? `"${r.titleExtract}"` : (r.error ? `err: ${r.error}` : '-');
    console.log(`    ${mark} ${r.method.padEnd(12)} HTTP ${String(status).padEnd(4)} ${len.padStart(10)}  ${info}`);
  }
  return results;
}

async function main() {
  console.log('🔬 スクレイピング診断開始\n');
  console.log('検証方式:');
  console.log('  - plain: User-Agent なしの素の fetch');
  console.log('  - browser-ua: Chrome 125 UA + フルブラウザヘッダ');
  console.log('  - cf-proxy: Cloudflare Workers プロキシ経由');
  console.log('='.repeat(80));

  const summary = {};

  for (const [siteName, site] of Object.entries(SITES)) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 ${siteName}  ( ${site.root} )`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    summary[siteName] = { plain: 0, browser: 0, cf: 0, total: 0 };

    const allUrls = [site.root, ...site.samples];
    for (const url of allUrls) {
      const [plain, browser, cf] = await diagnoseUrl(url);
      summary[siteName].total += 1;
      if (plain.ok) summary[siteName].plain += 1;
      if (browser.ok) summary[siteName].browser += 1;
      if (cf.ok) summary[siteName].cf += 1;
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 集計サマリー');
  console.log('='.repeat(80));
  console.log('サイト            plain    browser-ua   cf-proxy');
  for (const [siteName, s] of Object.entries(summary)) {
    const p = `${s.plain}/${s.total}`.padEnd(8);
    const b = `${s.browser}/${s.total}`.padEnd(12);
    const c = `${s.cf}/${s.total}`.padEnd(10);
    console.log(`${siteName.padEnd(18)}${p}${b}${c}`);
  }
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
