import * as cheerio from 'cheerio';
import { logger } from 'firebase-functions/v2';

/**
 * 個別ページをスクレイピング（fetch + Cheerio / ブラウザ不使用）
 * @param {string} url - スクレイピング対象のURL
 * @param {object} options - オプション（timeout のみ使用、browser は無視）
 * @returns {Promise<object>} スクレイピング結果（従来と同じ形状）
 */
export async function scrapePage(url, options = {}) {
  const { timeout = 15000 } = options;
  const startTime = Date.now();

  try {
    logger.info(`[pageScraper] スクレイピング開始: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const urlObj = new URL(url);
    const origin = urlObj.origin;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': origin + '/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${text ? `: ${text.substring(0, 100)}` : ''}`);
    }

    const html = await response.text();
    const loadTime = Date.now() - startTime;
    const $ = cheerio.load(html);

    // メタ情報
    const metaTitle = $('title').text().trim() || '';
    const metaDescription =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      '';

    // 見出し構造
    const headingStructure = {
      h1: $('h1').length,
      h2: $('h2').length,
      h3: $('h3').length,
      h4: $('h4').length,
    };

    // メインコンテンツのテキスト抽出
    let mainText = '';
    const mainElement = $('main, article, [role="main"], .main-content, #main-content').first();
    if (mainElement.length) {
      mainText = mainElement.text().trim().replace(/\s+/g, ' ');
    } else {
      const body = $('body').clone();
      body.find('header, footer, nav, script, style, noscript').remove();
      mainText = body.text().trim().replace(/\s+/g, ' ');
    }
    const textLength = mainText.length;

    // 画像情報
    const images = $('img[src]');
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;
    images.each((_, el) => {
      const alt = $(el).attr('alt');
      if (alt && alt.trim() !== '') {
        imagesWithAlt++;
      } else {
        imagesWithoutAlt++;
      }
    });

    // リンク情報
    const links = $('a[href]');
    let internalLinks = 0;
    let externalLinks = 0;
    try {
      const currentHost = new URL(url).hostname;
      links.each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        try {
          const linkUrl = new URL(href, url);
          if (linkUrl.hostname === currentHost) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        } catch {
          // 無効なURLはスキップ
        }
      });
    } catch (e) {
      logger.warn('[pageScraper] リンク解析エラー', { url, message: e.message });
    }

    // CTA検出
    const ctaButtons = [];
    const ctaPatterns =
      /お問い合わせ|資料請求|無料相談|申し込み|購入|ダウンロード|登録|contact|download|register|sign up|buy now/i;
    $('button, a.btn, a.button, [role="button"], a').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const href = $el.attr('href') || $el.attr('data-href') || '';
      if (!text) return;
      if (
        ctaPatterns.test(text) ||
        $el.hasClass('cta') ||
        ($el.is('button') && ctaPatterns.test(text))
      ) {
        if (!ctaButtons.some((cta) => cta.text === text)) {
          ctaButtons.push({ text, href });
        }
      }
    });
    const ctaButtonsSlice = ctaButtons.slice(0, 10);

    // フォーム分析
    const forms = $('form');
    const hasForm = forms.length > 0;
    const formFields = [];
    if (hasForm) {
      forms.each((_, formEl) => {
        $(formEl)
          .find('input, textarea, select')
          .each((__, inputEl) => {
            const $input = $(inputEl);
            const type = $input.attr('type') || $input.prop('tagName').toLowerCase();
            const name = $input.attr('name') || $input.attr('id') || '';
            const required = $input.attr('required') != null;
            if (name && type !== 'hidden' && type !== 'submit') {
              formFields.push({ type, name, required });
            }
          });
      });
    }
    const formFieldsSlice = formFields.slice(0, 20);

    // レスポンシブ判定
    const viewportMeta = $('meta[name="viewport"]');
    const isResponsive = viewportMeta.length > 0;

    const pageData = {
      metaTitle,
      metaDescription,
      headingStructure,
      textLength,
      mainText: mainText.substring(0, 2000),
      imagesWithAlt,
      imagesWithoutAlt,
      internalLinks,
      externalLinks,
      ctaButtons: ctaButtonsSlice,
      hasForm,
      formFields: formFieldsSlice,
      isResponsive,
    };

    const pageType = detectPageType(url, pageData);

    logger.info(`[pageScraper] スクレイピング成功: ${url} (${loadTime}ms)`);

    return {
      success: true,
      url,
      loadTime,
      pageType,
      ...pageData,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    logger.error(`[pageScraper] スクレイピングエラー: ${url}`, error);
    return {
      success: false,
      url,
      error: error.message,
      loadTime,
      scrapedAt: new Date().toISOString(),
    };
  }
}

/**
 * ページタイプを自動判定
 */
function detectPageType(url, pageData) {
  const path = url.toLowerCase();

  if (path === '/' || path.endsWith('/index.html') || path.endsWith('/index.php')) {
    return 'home';
  }
  if (path.includes('/blog/') || path.includes('/news/') || path.includes('/article/')) {
    return 'article';
  }
  if (path.includes('/product/') || path.includes('/service/')) {
    return 'product';
  }
  if (path.includes('/contact') || path.includes('/form/') || path.includes('/inquiry')) {
    return 'contact';
  }
  if (path.includes('/about') || path.includes('/company/') || path.includes('/profile')) {
    return 'about';
  }
  if (path.includes('/lp/') || path.includes('/landing')) {
    return 'landing';
  }

  if (pageData.hasForm && pageData.formFields && pageData.formFields.length > 3) {
    return 'contact';
  }

  return 'other';
}

/**
 * URLを正規化（重複防止）
 */
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);

    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

    let pathname = urlObj.pathname;
    if (!pathname.endsWith('/') && !pathname.includes('.')) {
      pathname += '/';
    }

    urlObj.hostname = urlObj.hostname.toLowerCase();
    urlObj.pathname = pathname;

    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * robots.txtをチェック
 */
export async function checkRobotsTxt(url) {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

    const response = await fetch(robotsUrl);
    if (!response.ok) {
      return { allowed: true, reason: 'robots.txt not found' };
    }

    const robotsTxt = await response.text();
    const lines = robotsTxt.split('\n');

    let userAgentMatch = false;
    const disallowedPaths = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('User-agent:')) {
        const agent = trimmed.substring('User-agent:'.length).trim();
        userAgentMatch = agent === '*' || agent.toLowerCase().includes('googlebot');
      }

      if (userAgentMatch && trimmed.startsWith('Disallow:')) {
        const path = trimmed.substring('Disallow:'.length).trim();
        if (path) {
          disallowedPaths.push(path);
        }
      }
    }

    for (const disallowedPath of disallowedPaths) {
      if (urlObj.pathname.startsWith(disallowedPath)) {
        return { allowed: false, reason: `Disallowed by robots.txt: ${disallowedPath}` };
      }
    }

    return { allowed: true, reason: 'Allowed by robots.txt' };
  } catch (e) {
    logger.warn('[checkRobotsTxt] エラー', e);
    return { allowed: true, reason: 'Error checking robots.txt, allowing by default' };
  }
}
