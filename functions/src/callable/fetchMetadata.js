import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { fetchViaCloudflareProxy, validateExternalFetchUrl } from '../utils/cloudflareProxy.js';

/**
 * サイトのメタデータを取得
 * 1. 素の fetch で取得を試みる
 * 2. 403等で失敗した場合、Puppeteer（Chromium）でフォールバック
 * 3. それでも駄目なら Cloudflare Workers プロキシでフォールバック
 *
 * セキュリティ:
 *  - 認証必須（誰でも呼べる「無料 SSRF プロキシ」化を防ぐ）
 *  - URL の SSRF 検証（http/https のみ、private/loopback/メタデータ IP を拒否）
 *  - リダイレクトは fetch 既定（最大 20 ホップ）から短縮、各ホップは Worker 側で最終 URL を返却
 *  - CF Proxy Secret は Firebase Secret Manager で管理（CF_PROXY_SECRET）
 */
export const fetchMetadataCallable = async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'fetchMetadata は認証が必要です');
  }

  const { siteUrl } = request.data || {};

  if (!siteUrl) {
    throw new HttpsError('invalid-argument', 'Site URL is required');
  }

  // URL 正規化（ユーザーが http(s):// なしで打ち込むケースのため）
  const normalizedUrl = siteUrl.startsWith('http://') || siteUrl.startsWith('https://')
    ? siteUrl
    : `https://${siteUrl}`;

  // SSRF 検証
  const validation = validateExternalFetchUrl(normalizedUrl);
  if (!validation.ok) {
    logger.warn('[fetchMetadata] SSRF 検証で拒否', { url: normalizedUrl, reason: validation.reason, uid: request.auth.uid });
    throw new HttpsError('invalid-argument', `指定された URL は取得できません: ${validation.reason}`);
  }

  try {
    logger.info(`[fetchMetadata] Fetching metadata for: ${normalizedUrl}`, { uid: request.auth.uid });

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
        const data = await fetchViaCloudflareProxy({ targetUrl: normalizedUrl, mode: 'html' });
        if (!data.html || data.status >= 400) {
          throw new Error(`target returned ${data.status}`);
        }
        html = data.html;
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
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to fetch metadata: ${error.message}`);
  }
};

/**
 * 素の HTTP fetch でHTML取得
 * リダイレクトは追従するが、最大 5 ホップに制限し、各ホップで再 SSRF 検証
 */
async function _fetchWithHttp(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    let currentUrl = url;
    for (let hop = 0; hop < 5; hop++) {
      const v = validateExternalFetchUrl(currentUrl);
      if (!v.ok) {
        throw new Error(`redirect to disallowed URL: ${v.reason}`);
      }
      const response = await fetch(currentUrl, {
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
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`HTTP ${response.status} without Location header`);
        }
        // 相対 URL を絶対化
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return await response.text();
    }
    throw new Error('Too many redirects (>5 hops)');
  } finally {
    clearTimeout(timeoutId);
  }
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
    // 加えて、リクエストごとに再 SSRF 検証してプライベート IP への遷移を防ぐ
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const reqUrl = req.url();
      const v = validateExternalFetchUrl(reqUrl);
      if (!v.ok && req.isNavigationRequest()) {
        req.abort('blockedbyclient');
        return;
      }
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
