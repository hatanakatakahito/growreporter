/**
 * 統合Puppeteerスクレイパー
 *
 * pageScraper.js（Cheerio）、deepPageScraper.js（Puppeteer詳細）、
 * pageScreenshotCapture.js（スクショ撮影）を1つに統合。
 *
 * 全ページ: Puppeteerでコンテンツ抽出（meta, 見出し, テキスト, 画像, リンク,
 *           CTA, フォーム, firstView, designTokens, keyElements, sections）
 * 上位Nページ: スクロール後スクショ撮影 + Firebase Storage保存
 *
 * 5並列タブで処理し、100ページを約90秒で完了。
 */

import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';

const NAV_TIMEOUT_MS = 8_000;
const POST_NAV_WAIT_MS = 200;
const CONCURRENCY = 5;
const SCREENSHOT_VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 1 };
const SCREENSHOT_QUALITY = 65;

// ========== ブラウザ起動 ==========

export async function launchBrowser() {
  const [{ default: puppeteer }, chromiumModule] = await Promise.all([
    import('puppeteer-core'),
    import('@sparticuz/chromium'),
  ]);
  const chromium = chromiumModule.default || chromiumModule;

  try { chromium.setGraphicsMode = false; } catch (_) {}

  const executablePath = await chromium.executablePath();

  // chromium.args から --single-process と --no-zygote を除外
  // Cloud Functions v2 (Cloud Run) はフルコンテナなのでマルチプロセスが使える
  const filteredArgs = chromium.args.filter(
    arg => arg !== '--single-process' && arg !== '--no-zygote'
  );

  const browser = await puppeteer.launch({
    args: [
      ...filteredArgs,
      '--lang=ja-JP',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--headless=shell',
    ],
    defaultViewport: null,
    executablePath,
    headless: 'shell',
    ignoreHTTPSErrors: true,
    dumpio: false,
    protocolTimeout: 60_000,
  });

  return browser;
}

// ========== リクエストインターセプション ==========

/**
 * @param {'content'|'screenshot'} mode
 *   content  — Phase A用: 画像・フォント・メディアもブロック（DOM抽出のみ）
 *   screenshot — Phase B用: トラッカーのみブロック（スクショ用に画像等は許可）
 */
async function setupRequestInterception(page, mode = 'screenshot') {
  try {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();

      // トラッカー・広告は常にブロック
      if (
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('facebook.com/tr') ||
        url.includes('doubleclick.net') ||
        url.includes('hotjar') ||
        url.includes('clarity.ms') ||
        url.includes('criteo') ||
        url.includes('adservice')
      ) {
        request.abort();
        return;
      }

      // Phase A（コンテンツ抽出のみ）: 画像・フォント・メディアをブロックしてメモリ節約
      if (mode === 'content') {
        if (['image', 'font', 'media'].includes(resourceType)) {
          request.abort();
          return;
        }
      }

      request.continue();
    });
  } catch (err) {
    logger.warn('[unifiedScraper] Request interception setup failed:', err.message);
  }
}

// ========== page.evaluate() で全データ抽出 ==========

/**
 * ブラウザコンテキスト内で実行される統合抽出関数
 * pageScraper.js の Cheerio 処理 + deepPageScraper.js の evaluate 処理を統合
 */
function extractAllPageData() {
  // ヘルパー
  function truncate(str, maxLen) {
    if (!str) return '';
    const trimmed = str.trim();
    return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + '...' : trimmed;
  }

  function sanitizeHtml(html, maxLen) {
    if (!html) return '';
    let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/\s*on\w+="[^"]*"/gi, '');
    cleaned = cleaned.replace(/\s*on\w+='[^']*'/gi, '');
    return cleaned.length > maxLen ? cleaned.substring(0, maxLen) : cleaned;
  }

  function getComputedStyles(el) {
    if (!el) return {};
    try {
      const s = window.getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
        color: s.color,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        borderRadius: s.borderRadius,
      };
    } catch { return {}; }
  }

  const vh = window.innerHeight || document.documentElement.clientHeight;
  const currentUrl = window.location.href;
  const currentHost = window.location.hostname;

  // ===== pageScraper由来: meta, 見出し, テキスト, 画像, リンク, CTA, フォーム, レスポンシブ =====

  const metaTitle = (document.title || '').trim();
  const metaDescEl = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
  const metaDescription = metaDescEl ? (metaDescEl.getAttribute('content') || '').trim() : '';

  // 見出し構造
  const headingStructure = {
    h1: document.querySelectorAll('h1').length,
    h2: document.querySelectorAll('h2').length,
    h3: document.querySelectorAll('h3').length,
    h4: document.querySelectorAll('h4').length,
  };

  // メインテキスト抽出
  let mainText = '';
  const mainEl = document.querySelector('main, article, [role="main"], .main-content, #main-content');
  if (mainEl) {
    mainText = mainEl.textContent.trim().replace(/\s+/g, ' ');
  } else if (document.body) {
    const bodyClone = document.body.cloneNode(true);
    bodyClone.querySelectorAll('header, footer, nav, script, style, noscript').forEach(el => el.remove());
    mainText = bodyClone.textContent.trim().replace(/\s+/g, ' ');
  }
  const textLength = mainText.length;

  // 画像alt
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  document.querySelectorAll('img[src]').forEach(img => {
    const alt = img.getAttribute('alt');
    if (alt && alt.trim() !== '') imagesWithAlt++;
    else imagesWithoutAlt++;
  });

  // リンク
  let internalLinks = 0;
  let externalLinks = 0;
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      const linkUrl = new URL(href, currentUrl);
      if (linkUrl.hostname === currentHost) internalLinks++;
      else externalLinks++;
    } catch {}
  });

  // CTA検出
  const ctaPatterns = /お問い合わせ|資料請求|無料相談|申し込み|購入|ダウンロード|登録|contact|download|register|sign up|buy now/i;
  const ctaButtons = [];
  document.querySelectorAll('button, a.btn, a.button, [role="button"], a').forEach(el => {
    const text = (el.textContent || '').trim();
    const href = el.getAttribute('href') || el.getAttribute('data-href') || '';
    if (!text || text.length > 100) return;
    if (ctaPatterns.test(text) || el.classList.contains('cta')) {
      if (!ctaButtons.some(cta => cta.text === text)) {
        ctaButtons.push({ text, href });
      }
    }
  });

  // フォーム分析（pageScraper互換: type, name, required, label）
  const formElements = document.querySelectorAll('form');
  const hasForm = formElements.length > 0;
  const formFields = [];
  formElements.forEach(form => {
    const seenNames = new Set();
    form.querySelectorAll('input, textarea, select').forEach(input => {
      const type = input.getAttribute('type') || input.tagName.toLowerCase();
      const name = input.getAttribute('name') || input.getAttribute('id') || '';
      const required = input.hasAttribute('required');
      if (!name || ['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) return;
      if ((type === 'radio' || type === 'checkbox') && seenNames.has(name)) return;
      seenNames.add(name);

      // ラベル検出
      let label = '';
      const inputId = input.getAttribute('id');
      if (inputId) {
        const labelEl = document.querySelector(`label[for="${inputId}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label) {
        const parentLabel = input.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) label = input.getAttribute('placeholder') || input.getAttribute('aria-label') || '';
      if (!label) {
        const prev = input.previousElementSibling;
        if (prev && ['SPAN', 'DIV', 'P', 'TH', 'DT', 'LABEL'].includes(prev.tagName)) {
          const t = prev.textContent.trim();
          if (t && t.length <= 30) label = t;
        }
      }
      if (!label) {
        const parent = input.parentElement;
        if (parent) {
          const directText = Array.from(parent.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent.trim())
            .filter(t => t.length > 0 && t.length <= 30)
            .join('');
          if (directText) label = directText;
        }
      }
      if (label.length > 50) label = label.substring(0, 50);

      const displayName = label || name;
      const isGarbled = /^[a-zA-Z0-9_-]{1,30}$/.test(displayName) && !/^(name|email|tel|phone|address|company|message|subject|url|zip|city|prefecture|comment|inquiry|category|content|body|title|firstname|lastname|fax|department)/.test(displayName.toLowerCase());
      if (!label && isGarbled) return;

      formFields.push({ type, name, required, label: label || name });
    });
  });

  // レスポンシブ判定
  const isResponsive = !!document.querySelector('meta[name="viewport"]');

  // ===== deepPageScraper由来: firstView, designTokens, keyElements, sections, forms(詳細) =====

  // 1. ファーストビュー
  function extractFirstView() {
    const result = { headline: '', subheadline: '', cta: null, heroImage: null };
    const headings = document.querySelectorAll('h1, h2');
    for (const h of headings) {
      const rect = h.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        if (h.tagName === 'H1' && !result.headline) {
          result.headline = truncate(h.textContent, 200);
        } else if (h.tagName === 'H2' && !result.subheadline) {
          result.subheadline = truncate(h.textContent, 200);
        }
      }
    }
    const ctaRegex = /お問い合わせ|資料|無料|申し込|登録|相談|見積|体験|ダウンロード|contact|free|signup|trial|start|get|try/i;
    const clickables = document.querySelectorAll('a, button');
    for (let i = 0; i < Math.min(clickables.length, 50); i++) {
      const el = clickables[i];
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        const text = (el.textContent || '').trim();
        if (text.length < 100 && ctaRegex.test(text)) {
          result.cta = { text: truncate(text, 100), href: el.href || '' };
          break;
        }
      }
    }
    const images = document.querySelectorAll('img');
    for (let i = 0; i < Math.min(images.length, 20); i++) {
      const img = images[i];
      if (img.naturalWidth > 300 && img.naturalHeight > 150) {
        const rect = img.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) {
          result.heroImage = { src: img.src };
          break;
        }
      }
    }
    return result;
  }

  // 2. デザイントークン
  function extractDesignTokens() {
    const tokens = {};
    try {
      const bodyStyle = window.getComputedStyle(document.body);
      const fontFamily = bodyStyle.fontFamily || '';
      tokens.fonts = fontFamily.split(',').slice(0, 3).map(f => f.trim().replace(/['"]/g, ''));
      tokens.bodyFontSize = bodyStyle.fontSize;
      tokens.bodyBgColor = bodyStyle.backgroundColor;

      const btnSelectors = 'a.btn, a.button, button.btn, button.button, .btn-primary, [class*="btn-"], [class*="button-"]';
      const primaryBtn = document.querySelector(btnSelectors);
      if (primaryBtn) {
        const btnStyle = window.getComputedStyle(primaryBtn);
        tokens.primaryColor = btnStyle.backgroundColor;
        tokens.primaryTextColor = btnStyle.color;
      }

      const container = document.querySelector('.container, .wrapper, main, [class*="container"]');
      if (container) {
        tokens.maxWidth = window.getComputedStyle(container).maxWidth;
      }
    } catch {}
    return tokens;
  }

  // 3. キー要素
  function extractKeyElements() {
    const elements = [];
    const maxElements = 5;

    const hero = document.querySelector('[class*="hero"], [class*="banner"], [class*="jumbotron"], [class*="main-visual"], [class*="mv-"], section:first-of-type');
    if (hero) {
      elements.push({ type: 'hero', html: sanitizeHtml(hero.outerHTML, 2000), styles: getComputedStyles(hero) });
    }

    const ctaSel = 'a.btn-primary, a[class*="cta"], button[class*="cta"], a[class*="btn-primary"], .btn-primary a, [class*="hero"] a[href]';
    const cta = document.querySelector(ctaSel);
    if (cta && elements.length < maxElements) {
      elements.push({ type: 'cta', html: sanitizeHtml(cta.outerHTML, 500), styles: getComputedStyles(cta) });
    }

    const header = document.querySelector('header');
    if (header && elements.length < maxElements) {
      elements.push({ type: 'header', html: sanitizeHtml(header.outerHTML, 2000), styles: getComputedStyles(header) });
    }

    return elements;
  }

  // 4. セクション構造
  function extractSections() {
    const sections = [];
    const headingsEls = document.querySelectorAll('h2, h3');
    const ctaRegex = /お問い合わせ|資料|無料|申し込|登録|相談|見積|体験|ダウンロード|contact|free|signup|trial|start|get|try/i;

    for (let i = 0; i < Math.min(headingsEls.length, 30); i++) {
      const h = headingsEls[i];
      const text = (h.textContent || '').trim();
      if (!text || text.length > 200) continue;

      const parent = h.closest('section') || h.closest('article') || h.closest('div');
      const sectionCtas = [];
      if (parent) {
        const links = parent.querySelectorAll('a, button');
        for (let j = 0; j < Math.min(links.length, 10); j++) {
          const linkText = (links[j].textContent || '').trim();
          if (linkText.length < 50 && ctaRegex.test(linkText)) {
            sectionCtas.push({ text: truncate(linkText, 80), href: links[j].href || '' });
          }
        }
      }

      sections.push({
        heading: truncate(text, 150),
        tag: h.tagName.toLowerCase(),
        contentSummary: parent ? truncate(parent.textContent, 200) : '',
        imageCount: parent ? parent.querySelectorAll('img').length : 0,
        ctas: sectionCtas.slice(0, 5),
      });
    }
    return sections;
  }

  // 5. フォーム詳細（deepPageScraper互換: purpose, fields, submitText）
  function extractFormsDetailed() {
    const forms = [];
    document.querySelectorAll('form').forEach(form => {
      const formText = (form.textContent || '').toLowerCase();
      let purpose = 'その他';
      if (/お問い合わせ|contact|inquiry/.test(formText)) purpose = 'お問い合わせ';
      else if (/資料|ダウンロード|download/.test(formText)) purpose = '資料請求';
      else if (/登録|signup|register/.test(formText)) purpose = '会員登録';
      else if (/見積|quote|estimate/.test(formText)) purpose = 'お見積もり';
      else if (/検索|search/.test(formText)) purpose = '検索';
      else if (/ログイン|login|signin/.test(formText)) purpose = 'ログイン';

      const fields = [];
      const inputs = form.querySelectorAll('input, select, textarea');
      for (let i = 0; i < Math.min(inputs.length, 10); i++) {
        const input = inputs[i];
        if (['hidden', 'password', 'submit', 'reset', 'button', 'image'].includes(input.type)) continue;
        let label = input.labels?.[0]?.textContent?.trim();
        if (!label) label = input.getAttribute('aria-label');
        if (!label && input.getAttribute('aria-labelledby')) {
          const ref = document.getElementById(input.getAttribute('aria-labelledby'));
          if (ref) label = ref.textContent?.trim();
        }
        if (!label) label = input.placeholder;
        if (!label) {
          const prev = input.previousElementSibling;
          if (prev && ['SPAN', 'DIV', 'P', 'TH', 'DT', 'LABEL'].includes(prev.tagName)) {
            const t = prev.textContent?.trim();
            if (t && t.length <= 30) label = t;
          }
        }
        if (!label) {
          const parent = input.parentElement;
          if (parent) {
            const directText = Array.from(parent.childNodes)
              .filter(n => n.nodeType === 3)
              .map(n => n.textContent.trim())
              .filter(t => t.length > 0 && t.length <= 30)
              .join('');
            if (directText) label = directText;
          }
        }
        if (!label) label = input.name || '';
        if (!label) continue;
        fields.push(truncate(label, 50));
      }

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      const submitText = submitBtn ? truncate(submitBtn.textContent || submitBtn.value || '送信', 50) : '';

      forms.push({ purpose, fields, submitText });
    });
    return forms;
  }

  return {
    // pageScraper由来
    metaTitle,
    metaDescription,
    headingStructure,
    textLength,
    mainText: mainText.substring(0, 2000),
    imagesWithAlt,
    imagesWithoutAlt,
    internalLinks,
    externalLinks,
    ctaButtons: ctaButtons.slice(0, 10),
    hasForm,
    formFields: formFields.slice(0, 20),
    isResponsive,
    // deepPageScraper由来
    firstView: extractFirstView(),
    designTokens: extractDesignTokens(),
    keyElements: extractKeyElements(),
    sections: extractSections(),
    forms: extractFormsDetailed(),
  };
}

// ========== ページタイプ判定 ==========

function detectPageType(url, pageData) {
  const path = url.toLowerCase();
  if (path === '/' || path.endsWith('/index.html') || path.endsWith('/index.php')) return 'home';
  if (path.includes('/blog/') || path.includes('/news/') || path.includes('/article/')) return 'article';
  if (path.includes('/product/') || path.includes('/service/')) return 'product';
  if (path.includes('/contact') || path.includes('/form/') || path.includes('/inquiry')) return 'contact';
  if (path.includes('/about') || path.includes('/company/') || path.includes('/profile')) return 'about';
  if (path.includes('/lp/') || path.includes('/landing')) return 'landing';
  if (pageData.hasForm && pageData.formFields && pageData.formFields.length > 3) return 'contact';
  return 'other';
}

// ========== スクロール + 遅延読み込み対策 ==========

async function scrollAndWaitForLazyLoad(page) {
  await page.evaluate(async () => {
    const distance = 500;
    const delay = 50;
    const maxScrolls = 60; // 無限スクロール対策
    let scrollCount = 0;
    while (window.scrollY + window.innerHeight < document.body.scrollHeight && scrollCount < maxScrolls) {
      window.scrollBy(0, distance);
      await new Promise(r => setTimeout(r, delay));
      scrollCount++;
    }
    window.scrollTo(0, 0);
  });
  // 全画像の読み込み完了を待機（最大3秒）
  await page.evaluate(() => {
    return Promise.race([
      Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))
      ),
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);
  });
}

// ========== スクリーンショット撮影 + Storage保存 ==========

const SCREENSHOT_MAX_HEIGHT = 5000;

async function captureAndUploadScreenshot(page, siteId, pagePath) {
  const bucket = getStorage().bucket();

  // ページ全体の高さを取得し、上限を設ける（メモリ爆発防止）
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  const captureHeight = Math.min(bodyHeight, SCREENSHOT_MAX_HEIGHT);

  const screenshotBuffer = await page.screenshot({
    type: 'jpeg',
    quality: SCREENSHOT_QUALITY,
    clip: { x: 0, y: 0, width: SCREENSHOT_VIEWPORT.width, height: captureHeight },
  });

  const safePath = encodeURIComponent((pagePath || '/').replace(/\//g, '_'));
  const fileName = `page-screenshots/${siteId}/${Date.now()}_${safePath}.jpg`;
  const file = bucket.file(fileName);
  await file.save(screenshotBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=2592000',
    },
    resumable: false,
  });
  await file.makePublic();

  return {
    screenshotUrl: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
    imageSize: screenshotBuffer.length,
  };
}

// ========== 1ページの統合スクレイピング ==========

async function scrapeSinglePage(page, pageUrl, options = {}) {
  const { takeScreenshot = false, siteId = '', waitUntil = 'networkidle2' } = options;
  const startTime = Date.now();

  try {
    // ページ遷移
    try {
      await page.goto(pageUrl, { waitUntil, timeout: NAV_TIMEOUT_MS });
    } catch (navErr) {
      if (navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout')) {
        logger.info(`[unifiedScraper] Timeout (continuing): ${pageUrl}`);
      } else {
        throw navErr;
      }
    }

    await new Promise(resolve => setTimeout(resolve, POST_NAV_WAIT_MS));

    // コンテンツ抽出（全ページ共通）
    const extractedData = await page.evaluate(extractAllPageData);
    const pageType = detectPageType(pageUrl, extractedData);
    const loadTime = Date.now() - startTime;

    return {
      success: true,
      url: pageUrl,
      loadTime,
      pageType,
      scrapedAt: new Date().toISOString(),
      screenshotUrl: null,
      imageSize: 0,
      ...extractedData,
    };
  } catch (err) {
    const loadTime = Date.now() - startTime;
    logger.warn(`[unifiedScraper] Error: ${pageUrl} - ${err.message}`);
    return {
      success: false,
      url: pageUrl,
      error: err.message,
      loadTime,
      scrapedAt: new Date().toISOString(),
    };
  }
}

// ========== メイン: 全ページを並列スクレイピング ==========

/**
 * @param {import('puppeteer-core').Browser} browser
 * @param {Array<{pagePath: string, pageUrl: string, pageViews?: number, users?: number, engagementRate?: number}>} pageInfos
 * @param {object} options
 * @param {string} options.siteId - サイトID（スクショ保存パスに使用）
 * @param {number} [options.screenshotTopN=30] - スクショ撮影するページ数（PV上位N件）
 * @param {function} [options.onProgress] - 進捗コールバック({phase, message})
 * @returns {Promise<Array>} 全ページの結果
 */
export async function scrapeAllPages(browser, pageInfos, options = {}) {
  const { siteId, screenshotTopN = 30, onProgress } = options;
  const startTime = Date.now();

  logger.info(`[unifiedScraper] Start: ${pageInfos.length} pages, screenshots top ${screenshotTopN}, concurrency ${CONCURRENCY}`);

  // ===== Phase A: 全ページのコンテンツ抽出（5並列タブ、画像ブロック） =====
  const PHASE_A_CONCURRENCY = 5;

  const phaseAPages = [];
  for (let i = 0; i < PHASE_A_CONCURRENCY; i++) {
    const p = await browser.newPage();
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });
    await p.setViewport(SCREENSHOT_VIEWPORT);
    await setupRequestInterception(p, 'content'); // 画像・フォント・メディアをブロック
    phaseAPages.push(p);
  }

  const results = [];
  let queueIndex = 0;

  async function worker(page) {
    while (true) {
      const idx = queueIndex++;
      if (idx >= pageInfos.length) break;
      const info = pageInfos[idx];

      const result = await scrapeSinglePage(page, info.pageUrl, { waitUntil: 'domcontentloaded' });
      result.pagePath = info.pagePath;
      result.pageViews = info.pageViews ?? 0;
      result.users = info.users ?? 0;
      result.engagementRate = info.engagementRate ?? 0;
      results.push(result);

      if ((idx + 1) % 10 === 0) {
        const successCount = results.filter(r => r.success).length;
        logger.info(`[unifiedScraper] Phase A: ${idx + 1}/${pageInfos.length} (success: ${successCount})`);
      }
    }
  }

  await Promise.all(phaseAPages.map(p => worker(p)));
  await Promise.all(phaseAPages.map(p => p.close().catch(() => {})));

  const phaseASuccess = results.filter(r => r.success).length;
  const phaseAFailed = results.filter(r => !r.success).length;
  const phaseADuration = Date.now() - startTime;
  logger.info(`[unifiedScraper] Phase A done: ${phaseASuccess}/${pageInfos.length} in ${phaseADuration}ms`);

  // 進捗通知: ページ情報の取得完了
  if (onProgress) {
    const screenshotCount = Math.min(phaseASuccess, screenshotTopN);
    await onProgress({
      phase: 'screenshots',
      message: `ページ情報の取得が完了しました（成功: ${phaseASuccess}、失敗: ${phaseAFailed}）。スクリーンショットを撮影中...（${screenshotCount}ページ）`,
      completedPages: phaseASuccess,
      failedPages: phaseAFailed,
    });
  }

  // ===== Phase B: 上位ページのスクショ撮影（1タブ、逐次処理） =====

  const screenshotTargets = results
    .filter(r => r.success)
    .slice(0, screenshotTopN);

  if (screenshotTargets.length > 0 && siteId) {
    const ssPage = await browser.newPage();
    await ssPage.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });
    await ssPage.setViewport(SCREENSHOT_VIEWPORT);
    await setupRequestInterception(ssPage, 'screenshot'); // 画像許可（スクショ用）

    let ssCount = 0;
    for (const result of screenshotTargets) {
      try {
        try {
          await ssPage.goto(result.url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
        } catch (navErr) {
          if (!(navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout'))) throw navErr;
        }
        await scrollAndWaitForLazyLoad(ssPage);
        const pagePath = new URL(result.url).pathname;
        const ssResult = await captureAndUploadScreenshot(ssPage, siteId, pagePath);
        result.screenshotUrl = ssResult.screenshotUrl;
        result.imageSize = ssResult.imageSize;
        ssCount++;
      } catch (ssErr) {
        logger.warn(`[unifiedScraper] Screenshot failed: ${result.url} - ${ssErr.message}`);
      }
    }

    await ssPage.close().catch(() => {});
    logger.info(`[unifiedScraper] Phase B done: ${ssCount}/${screenshotTargets.length} screenshots`);

    // 進捗通知: スクリーンショット撮影完了
    if (onProgress) {
      await onProgress({
        phase: 'saving',
        message: `スクリーンショット撮影が完了しました（${ssCount}/${screenshotTargets.length}ページ）。データを保存中...`,
        completedPages: phaseASuccess,
        failedPages: phaseAFailed,
        screenshotCount: ssCount,
      });
    }
  } else if (onProgress) {
    // スクショ対象なしの場合
    await onProgress({
      phase: 'saving',
      message: 'データを保存中...',
      completedPages: phaseASuccess,
      failedPages: phaseAFailed,
      screenshotCount: 0,
    });
  }

  const totalSuccess = results.filter(r => r.success).length;
  const totalDuration = Date.now() - startTime;
  logger.info(`[unifiedScraper] Done: ${totalSuccess}/${pageInfos.length} pages in ${totalDuration}ms`);

  return results;
}

// ========== ユーティリティ（pageScraper.jsから移植） ==========

/**
 * URLを正規化（重複防止）
 */
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    let pathname = urlObj.pathname;
    if (!pathname.endsWith('/') && !pathname.includes('.')) {
      pathname += '/';
    }
    urlObj.hostname = urlObj.hostname.toLowerCase();
    urlObj.pathname = pathname;
    return urlObj.toString();
  } catch {
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
        if (path) disallowedPaths.push(path);
      }
    }
    for (const disallowedPath of disallowedPaths) {
      if (urlObj.pathname.startsWith(disallowedPath)) {
        return { allowed: false, reason: `Disallowed by robots.txt: ${disallowedPath}` };
      }
    }
    return { allowed: true, reason: 'Allowed by robots.txt' };
  } catch (e) {
    logger.warn('[checkRobotsTxt] Error', e);
    return { allowed: true, reason: 'Error checking robots.txt, allowing by default' };
  }
}
