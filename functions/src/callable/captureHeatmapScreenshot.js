import { HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

const db = getFirestore();

/**
 * ヒートマップ用スクリーンショット設定
 * 既存カバー用（PC 1870×1210 / Mobile 350×550）とは別サイズ
 * 高さはページ依存（fullPage: true で自動決定）
 */
const HEATMAP_VIEWPORT = {
  pc: { width: 1280, height: 800, deviceScaleFactor: 1 },
  mobile: { width: 375, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
};

const NAV_TIMEOUT_MS = 20000;
const IMAGE_LOAD_TIMEOUT_MS = 4000;
const POST_RENDER_DELAY_MS = 800;
const IMAGE_SINGLE_TIMEOUT_MS = 1500;

/**
 * ページ URL → ドキュメント ID を生成（collectHeatmapData と同じロジック）
 */
function pageUrlToDocId(pageUrl, device) {
  let encoded = pageUrl.replace(/\//g, '_');
  if (encoded.length > 200) {
    encoded = createHash('md5').update(pageUrl).digest('hex');
  }
  return `${encoded}_${device}`;
}

/**
 * ヒートマップ用フルページスクリーンショット取得
 * @param {object} request - Cloud Functions onCall リクエスト
 */
export async function captureHeatmapScreenshotCallable(request) {
  const { siteId, pageUrl, deviceType } = request.data;

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  // 入力バリデーション
  if (!siteId || !pageUrl || !deviceType) {
    throw new HttpsError('invalid-argument', 'siteId, pageUrl, deviceType are required');
  }

  if (!['pc', 'mobile'].includes(deviceType)) {
    throw new HttpsError('invalid-argument', 'deviceType must be "pc" or "mobile"');
  }

  // サイト存在確認 & URL 取得
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    throw new HttpsError('not-found', 'サイトが見つかりません');
  }

  const siteData = siteDoc.data();
  const siteUrl = siteData.siteUrl || siteData.url;
  if (!siteUrl) {
    throw new HttpsError('failed-precondition', 'サイトURLが設定されていません');
  }

  // フルURL を組み立て
  let fullUrl = siteUrl.replace(/\/$/, '') + pageUrl;
  if (!fullUrl.startsWith('http')) {
    fullUrl = 'https://' + fullUrl;
  }

  let browser = null;
  const startTime = Date.now();

  try {
    const [{ default: puppeteer }, chromiumModule] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    const chromium = chromiumModule.default || chromiumModule;

    console.log(`[captureHeatmapScreenshot] Start: ${fullUrl}, device: ${deviceType}`);

    try { chromium.setGraphicsMode = false; } catch (_) { /* non-extensible module namespace */ }

    let executablePath;
    try {
      executablePath = await chromium.executablePath();
    } catch (pathErr) {
      throw new HttpsError('internal', `Chromium の準備に失敗しました: ${pathErr?.message || 'unknown'}`);
    }

    const extraArgs = ['--lang=ja-JP'];
    const launchArgs = typeof puppeteer.defaultArgs === 'function'
      ? puppeteer.defaultArgs({ args: [...chromium.args, ...extraArgs], headless: 'shell' })
      : [...chromium.args, ...extraArgs, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--headless=shell'];

    browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: null,
      executablePath,
      headless: 'shell',
      ignoreHTTPSErrors: true,
      dumpio: true,
    });

    console.log(`[captureHeatmapScreenshot] Browser launched in ${Date.now() - startTime}ms`);

    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    // 言語設定（日本語優先）
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });

    // ビューポート設定（高さは仮値、fullPage: true で無視される）
    const viewport = HEATMAP_VIEWPORT[deviceType];
    await page.setViewport(viewport);

    // アニメーション停止 & IntersectionObserver を即時トリガーに置換
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          animation-fill-mode: forwards !important;
          transition-duration: 0.001s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head?.appendChild(style) || setTimeout(() => document.head.appendChild(style), 0);

      // IntersectionObserver を即時「表示済み」で発火させる（遅延読み込み画像対応）
      window.IntersectionObserver = class {
        constructor(callback, options) {
          this._callback = callback;
          this._options = options;
        }
        observe(target) {
          // すべてのターゲットを即座に「交差している」として報告
          requestAnimationFrame(() => {
            this._callback([{
              target,
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
              time: performance.now(),
            }], this);
          });
        }
        unobserve() {}
        disconnect() {}
      };
    });

    // 不要リソースブロック（フォント・メディア・トラッキング系をブロック）
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      if (
        resourceType === 'media' ||
        resourceType === 'websocket' ||
        resourceType === 'manifest' ||
        resourceType === 'font' ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('facebook.com') ||
        url.includes('doubleclick.net') ||
        url.includes('analytics') ||
        url.includes('tracking') ||
        url.includes('hotjar') ||
        url.includes('clarity.ms') ||
        url.includes('criteo') ||
        url.includes('adservice') ||
        url.includes('fonts.googleapis.com') ||
        url.includes('fonts.gstatic.com')
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log(`[captureHeatmapScreenshot] Navigating to ${fullUrl}...`);

    try {
      await page.goto(fullUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_MS,
      });
    } catch (navErr) {
      if (navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout')) {
        console.log(`[captureHeatmapScreenshot] Navigation timeout, continuing with loaded content...`);
      } else {
        throw navErr;
      }
    }

    // system-uiフォールバックで日本語表示（外部フォント読み込み不要）
    await page.addStyleTag({
      content: 'body, html { font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", system-ui, sans-serif !important; }',
    });

    // loading="lazy" を eager に書き換えて即時読み込み
    await page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.loading = 'eager';
      });
    });

    // ページ内画像の読み込みを待つ（フルページなので上位 20 枚まで）
    await page.evaluate((imageLoadTimeoutMs, imageSingleTimeoutMs) => {
      return new Promise((resolve) => {
        const images = Array.from(document.querySelectorAll('img')).slice(0, 20);
        if (images.length === 0) { resolve(); return; }
        const promises = images.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(imgResolve => {
            img.addEventListener('load', imgResolve);
            img.addEventListener('error', imgResolve);
            setTimeout(imgResolve, imageSingleTimeoutMs);
          });
        });
        Promise.race([
          Promise.all(promises),
          new Promise(r => setTimeout(r, imageLoadTimeoutMs)),
        ]).then(resolve);
      });
    }, IMAGE_LOAD_TIMEOUT_MS, IMAGE_SINGLE_TIMEOUT_MS);

    // 遅延読み込み画像をトリガーするため、ページ全体をスクロール（高速化）
    await page.evaluate(async () => {
      const totalHeight = document.documentElement.scrollHeight;
      const step = window.innerHeight;
      for (let y = 0; y < totalHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    });

    await new Promise(resolve => setTimeout(resolve, POST_RENDER_DELAY_MS));

    // ビューポートを再適用
    await page.setViewport(viewport);

    console.log(`[captureHeatmapScreenshot] Taking full-page screenshot...`);

    // フルページスクリーンショット
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: true,
    });

    console.log(`[captureHeatmapScreenshot] Screenshot captured (${screenshot.length} bytes) in ${Date.now() - startTime}ms`);

    // Firebase Storage にアップロード
    const bucket = getStorage().bucket();
    const docId = pageUrlToDocId(pageUrl, deviceType);
    const fileName = `heatmaps/${siteId}/${docId}.jpg`;
    const file = bucket.file(fileName);

    await file.save(screenshot, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
      },
      resumable: false,
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Firestore にスクリーンショット URL を保存
    const heatmapDocRef = db.collection('sites').doc(siteId).collection('heatmapPages').doc(docId);
    await heatmapDocRef.set({
      screenshotUrl: publicUrl,
      screenshotCapturedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`[captureHeatmapScreenshot] Success: ${publicUrl} (total: ${Date.now() - startTime}ms)`);

    return { screenshotUrl: publicUrl };

  } catch (error) {
    const errMsg = error?.message || String(error);
    console.error('[captureHeatmapScreenshot] Error:', errMsg);

    let errorMessage = 'スクリーンショットの取得に失敗しました';
    if (error?.name === 'TimeoutError') {
      errorMessage = 'ページの読み込みがタイムアウトしました。';
    } else if (errMsg.includes('net::ERR')) {
      errorMessage = 'サイトにアクセスできませんでした。URLを確認してください。';
    } else if (errMsg.includes('Chromium') || errMsg.includes('Failed to launch')) {
      errorMessage = 'ブラウザの起動に失敗しました。しばらく経ってから再試行してください。';
    }
    throw new HttpsError('internal', errorMessage);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
