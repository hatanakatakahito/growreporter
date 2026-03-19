/**
 * Puppeteer深掘りスクレイピングユーティリティ
 *
 * gr-collector.js のクライアントサイド抽出ロジックをサーバーサイドに移植。
 * 改善生成時に対象ページのコンテンツ・デザイン構造を詳細に取得する。
 *
 * 抽出項目:
 *   1. firstView — ファーストビューの見出し・CTA・ヒーロー画像
 *   2. designTokens — フォント・カラー・余白などの computed style
 *   3. keyElements — hero/cta/header の実 HTML + CSS
 *   4. sections — ページのセクション構造（h2/h3単位）
 *   5. forms — フォームの目的・フィールド・送信ボタン
 *   (fullPageHtml/inlineStylesは不要なため省略 — モックアップはkeyElements+designTokensで生成)
 */

const NAV_TIMEOUT_MS = 15_000;
const POST_NAV_WAIT_MS = 500;
const MAX_PAGES = 6;
const MAX_SCREENSHOT_HEIGHT = 5000; // スクリーンショット最大高さ（px）

/**
 * Puppeteerブラウザを起動する（captureScreenshot.js と同パターン）
 */
export async function launchBrowser() {
  const [{ default: puppeteer }, chromiumModule] = await Promise.all([
    import('puppeteer-core'),
    import('@sparticuz/chromium'),
  ]);
  const chromium = chromiumModule.default || chromiumModule;

  try { chromium.setGraphicsMode = false; } catch (_) {}

  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--lang=ja-JP',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process',
      '--no-zygote',
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

/**
 * リクエストインターセプション設定（トラッキング系ブロック）
 */
async function setupRequestInterception(page) {
  try {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
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
      } else {
        request.continue();
      }
    });
  } catch (err) {
    console.warn('[deepPageScraper] Request interception setup failed:', err.message);
  }
}

/**
 * 1ページの深掘りスクレイピング
 */
export async function deepScrapePage(browser, pageUrl) {
  const startTime = Date.now();
  console.log(`[deepScrapePage] Start: ${pageUrl}`);

  const page = await browser.newPage();

  try {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await setupRequestInterception(page);

    // ページ読み込み
    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    } catch (navErr) {
      if (navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout')) {
        console.log(`[deepScrapePage] Navigation timeout for ${pageUrl}, continuing...`);
      } else {
        throw navErr;
      }
    }

    // JS描画完了待機
    await new Promise(resolve => setTimeout(resolve, POST_NAV_WAIT_MS));

    // Beforeスクリーンショット撮影（JPEG, quality 40, 高さ制限付き）
    let screenshotBase64 = '';
    try {
      // ページ全体の高さを取得し、上限を適用
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight || 0);
      const clipHeight = Math.min(bodyHeight || 800, MAX_SCREENSHOT_HEIGHT);
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 40,
        clip: { x: 0, y: 0, width: 1280, height: clipHeight },
      });
      screenshotBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;
    } catch (ssErr) {
      console.warn(`[deepScrapePage] Screenshot failed: ${ssErr.message}`);
    }

    // page.evaluate() で構造化データ抽出
    const extractedData = await page.evaluate(() => {
      // ========== ヘルパー関数 ==========
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

      // ========== 1. ファーストビュー ==========
      function extractFirstView() {
        const result = { headline: '', subheadline: '', cta: null, heroImage: null };

        // h1見出し（viewport内）
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

        // CTA（viewport内のリンク/ボタン）
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

        // ヒーロー画像（300x150以上）
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

      // ========== 2. デザイントークン ==========
      function extractDesignTokens() {
        const tokens = {};
        try {
          const body = document.body;
          const bodyStyle = window.getComputedStyle(body);

          // フォント
          const fontFamily = bodyStyle.fontFamily || '';
          tokens.fonts = fontFamily.split(',').slice(0, 3).map(f => f.trim().replace(/['"]/g, ''));
          tokens.bodyFontSize = bodyStyle.fontSize;
          tokens.bodyBgColor = bodyStyle.backgroundColor;

          // プライマリカラー（ボタン要素から）
          const btnSelectors = 'a.btn, a.button, button.btn, button.button, .btn-primary, [class*="btn-"], [class*="button-"]';
          const primaryBtn = document.querySelector(btnSelectors);
          if (primaryBtn) {
            const btnStyle = window.getComputedStyle(primaryBtn);
            tokens.primaryColor = btnStyle.backgroundColor;
            tokens.primaryTextColor = btnStyle.color;
          }

          // コンテナ幅
          const containerSelectors = '.container, .wrapper, main, [class*="container"]';
          const container = document.querySelector(containerSelectors);
          if (container) {
            tokens.maxWidth = window.getComputedStyle(container).maxWidth;
          }
        } catch { /* ignore */ }
        return tokens;
      }

      // ========== 3. キー要素 ==========
      function extractKeyElements() {
        const elements = [];
        const maxElements = 5;

        // Hero
        const heroSelectors = '[class*="hero"], [class*="banner"], [class*="jumbotron"], [class*="main-visual"], [class*="mv-"], section:first-of-type';
        const hero = document.querySelector(heroSelectors);
        if (hero) {
          elements.push({
            type: 'hero',
            html: sanitizeHtml(hero.outerHTML, 2000),
            styles: getComputedStyles(hero),
          });
        }

        // CTA
        const ctaSelectors = 'a.btn-primary, a[class*="cta"], button[class*="cta"], a[class*="btn-primary"], .btn-primary a, [class*="hero"] a[href]';
        const cta = document.querySelector(ctaSelectors);
        if (cta && elements.length < maxElements) {
          elements.push({
            type: 'cta',
            html: sanitizeHtml(cta.outerHTML, 500),
            styles: getComputedStyles(cta),
          });
        }

        // Header
        const header = document.querySelector('header');
        if (header && elements.length < maxElements) {
          elements.push({
            type: 'header',
            html: sanitizeHtml(header.outerHTML, 2000),
            styles: getComputedStyles(header),
          });
        }

        return elements;
      }

      // ========== 4. セクション構造 ==========
      function extractSections() {
        const sections = [];
        const headings = document.querySelectorAll('h2, h3');

        for (let i = 0; i < Math.min(headings.length, 30); i++) {
          const h = headings[i];
          const text = (h.textContent || '').trim();
          if (!text || text.length > 200) continue;

          const parent = h.closest('section') || h.closest('article') || h.closest('div');
          const ctaRegex = /お問い合わせ|資料|無料|申し込|登録|相談|見積|体験|ダウンロード|contact|free|signup|trial|start|get|try/i;

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

      // ========== 5. フォーム ==========
      function extractForms() {
        const forms = [];
        const formElements = document.querySelectorAll('form');

        for (const form of formElements) {
          const formText = (form.textContent || '').toLowerCase();

          // 目的自動判定
          let purpose = 'その他';
          if (/お問い合わせ|contact|inquiry/.test(formText)) purpose = 'お問い合わせ';
          else if (/資料|ダウンロード|download/.test(formText)) purpose = '資料請求';
          else if (/登録|signup|register/.test(formText)) purpose = '会員登録';
          else if (/見積|quote|estimate/.test(formText)) purpose = 'お見積もり';
          else if (/検索|search/.test(formText)) purpose = '検索';
          else if (/ログイン|login|signin/.test(formText)) purpose = 'ログイン';

          // フィールド
          const fields = [];
          const inputs = form.querySelectorAll('input, select, textarea');
          for (let i = 0; i < Math.min(inputs.length, 10); i++) {
            const input = inputs[i];
            if (input.type === 'hidden' || input.type === 'password') continue;

            const label = input.labels?.[0]?.textContent?.trim()
              || input.placeholder
              || input.name
              || input.type;
            fields.push(truncate(label, 50));
          }

          // 送信ボタン
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
          const submitText = submitBtn
            ? truncate(submitBtn.textContent || submitBtn.value || '送信', 50)
            : '';

          forms.push({ purpose, fields, submitText });
        }

        return forms;
      }

      // ========== 実行 ==========
      return {
        firstView: extractFirstView(),
        designTokens: extractDesignTokens(),
        keyElements: extractKeyElements(),
        sections: extractSections(),
        forms: extractForms(),
      };
    });

    console.log(`[deepScrapePage] Done: ${pageUrl} in ${Date.now() - startTime}ms`);

    return {
      pageUrl,
      scrapedAt: new Date().toISOString(),
      source: 'deep_scrape',
      screenshot: screenshotBase64,
      ...extractedData,
    };
  } catch (err) {
    console.error(`[deepScrapePage] Error for ${pageUrl}:`, err.message);
    throw err;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * 複数ページの深掘りスクレイピング
 * @param {string[]} pageUrls - スクレイピング対象URL（最大5ページ）
 * @returns {Promise<Array>} - 各ページの深掘り結果
 */
export async function deepScrapePages(pageUrls) {
  const urls = pageUrls.slice(0, MAX_PAGES);
  console.log(`[deepScrapePages] Starting deep scrape for ${urls.length} pages`);

  let browser = null;
  const results = [];

  try {
    browser = await launchBrowser();
    console.log('[deepScrapePages] Browser launched');

    // 並列スクレイピング（最大3ページ同時）
    const CONCURRENCY = 3;
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(url => deepScrapePage(browser, url))
      );
      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          console.error(`[deepScrapePages] Skipping ${batch[j]}:`, r.reason?.message);
          results.push({
            pageUrl: batch[j],
            scrapedAt: new Date().toISOString(),
            source: 'deep_scrape',
            error: r.reason?.message || 'unknown error',
          });
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      console.log('[deepScrapePages] Browser closed');
    }
  }

  console.log(`[deepScrapePages] Completed: ${results.filter(r => !r.error).length}/${urls.length} succeeded`);
  return results;
}
