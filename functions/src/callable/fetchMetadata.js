import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/**
 * サイトのメタデータを取得
 * 1. 素の fetch で取得を試みる
 * 2. 403等で失敗した場合、Puppeteer（Chromium）でフォールバック
 */
export const fetchMetadataCallable = async (request) => {
  const { siteUrl } = request.data;

  if (!siteUrl) {
    throw new HttpsError('invalid-argument', 'Site URL is required');
  }

  try {
    const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    logger.info(`[fetchMetadata] Fetching metadata for: ${normalizedUrl}`);

    // Step 1: 素の fetch で試行
    let html = null;
    try {
      html = await _fetchWithHttp(normalizedUrl);
    } catch (fetchErr) {
      logger.warn(`[fetchMetadata] HTTP fetch failed (${fetchErr.message}), trying Puppeteer fallback...`);
    }

    // Step 2: 失敗時は Puppeteer でフォールバック
    if (!html) {
      try {
        html = await _fetchWithPuppeteer(normalizedUrl);
      } catch (puppeteerErr) {
        logger.warn(`[fetchMetadata] Puppeteer fallback also failed (${puppeteerErr.message}), trying Cloudflare proxy...`);
      }
    }

    // Step 3: Cloudflare Workers プロキシでフォールバック（Google Cloud IP ブロック回避）
    if (!html) {
      try {
        html = await _fetchWithCloudflareProxy(normalizedUrl);
      } catch (cfErr) {
        logger.error(`[fetchMetadata] Cloudflare proxy also failed: ${cfErr.message}`);
        throw new Error(`All fetch methods failed for ${normalizedUrl}`);
      }
    }

    if (!html) {
      throw new Error('No HTML content retrieved');
    }

    const metadata = extractMetadata(html);
    logger.info(`[fetchMetadata] Successfully extracted metadata`, {
      title: !!metadata.title,
      description: !!metadata.description,
    });

    return { success: true, metadata };
  } catch (error) {
    logger.error('[fetchMetadata] Error:', error);
    throw new HttpsError('internal', `Failed to fetch metadata: ${error.message}`);
  }
};

/**
 * 素の HTTP fetch でHTML取得
 */
async function _fetchWithHttp(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Puppeteer（Chromium）でHTML取得 — WAF/bot判定を回避
 */
async function _fetchWithPuppeteer(url) {
  let browser = null;
  try {
    const [{ default: puppeteer }, chromiumModule] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    const chromium = chromiumModule.default || chromiumModule;
    try { chromium.setGraphicsMode = false; } catch (_) {}
    const executablePath = await chromium.executablePath();
    const filteredArgs = chromium.args.filter(
      (a) => a !== '--single-process' && a !== '--no-zygote'
    );

    browser = await puppeteer.launch({
      args: [...filteredArgs, '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: 'shell',
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    // ページ読み込み（画像・フォント等は不要なのでブロック）
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    const status = response?.status() || 0;
    if (status >= 400) {
      throw new Error(`Puppeteer got HTTP ${status}`);
    }

    const html = await page.content();
    logger.info(`[fetchMetadata] Puppeteer fallback success: status=${status}, html=${html.length} bytes`);
    return html;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * HTMLからメタデータを抽出
 */
function extractMetadata(html) {
  const metadata = {
    title: '',
    description: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  };

  try {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = decodeHtmlEntities(titleMatch[1].trim());
    }

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) {
      metadata.description = decodeHtmlEntities(descMatch[1].trim());
    }

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      metadata.ogTitle = decodeHtmlEntities(ogTitleMatch[1].trim());
    }

    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      metadata.ogDescription = decodeHtmlEntities(ogDescMatch[1].trim());
    }

    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      metadata.ogImage = ogImageMatch[1].trim();
    }

    if (!metadata.title && metadata.ogTitle) {
      metadata.title = metadata.ogTitle;
    }
    if (!metadata.description && metadata.ogDescription) {
      metadata.description = metadata.ogDescription;
    }
  } catch (error) {
    logger.error('[extractMetadata] Error:', error);
  }

  return metadata;
}

function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
  };
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

/**
 * Cloudflare Workers プロキシ経由でHTML取得
 * Google Cloud IPがブロックされるサイトに対してCloudflareのIPで回避
 */
const CF_PROXY_URL = 'https://growreporter-fetch-proxy.hatanaka-a1e.workers.dev';
const CF_PROXY_SECRET = 'growreporter-proxy-2026';

async function _fetchWithCloudflareProxy(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const res = await fetch(CF_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Proxy-Secret': CF_PROXY_SECRET,
    },
    body: JSON.stringify({ url }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Cloudflare proxy returned ${res.status}`);
  }

  const data = await res.json();
  if (!data.html || data.status >= 400) {
    throw new Error(`Cloudflare proxy: target returned ${data.status}`);
  }

  logger.info(`[fetchMetadata] Cloudflare proxy success: ${data.html.length} bytes`);
  return data.html;
}
