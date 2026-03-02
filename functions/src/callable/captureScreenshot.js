import { HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import sharp from 'sharp';

/**
 * スクショの統一設定（STEP1・サイト登録時・refresh・onSiteChanged すべて同じ）
 * ビューポート＝そのまま保存（PC 1870×1210 / スマホ 350×550）。
 */
const SCREENSHOT_VIEWPORT = {
  pc:    { width: 1870, height: 1210, deviceScaleFactor: 1 },
  mobile: { width: 350, height: 550, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
};
/** 保存時の画像幅（キャプチャと同一でそのまま保存） */
const SCREENSHOT_OUTPUT_WIDTH = { pc: 1870, mobile: 350 };

/** ページ読み込みタイムアウト（ms） */
const NAV_TIMEOUT_MS = 20000;
/** ファーストビュー内画像の読み込み待ち最大（ms） */
const IMAGE_LOAD_TIMEOUT_MS = 5000;
/** スクショ直前の待機（アニメーション停止の反映用）（ms） */
const POST_RENDER_DELAY_MS = 1500;
/** 1枚あたりの画像読み込み待ち最大（ms） */
const IMAGE_SINGLE_TIMEOUT_MS = 2000;

/**
 * スクリーンショット取得 Callable Function
 * ビューポート＝保存サイズ（PC 1870×1210 / スマホ 350×550）でキャプチャし JPEG 保存。
 *
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - スクリーンショットURL
 */
export async function captureScreenshotCallable(request) {
  const { siteUrl, deviceType } = request.data; // 'pc' or 'mobile'

  // 認証チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  // 入力バリデーション
  if (!siteUrl || !deviceType) {
    throw new HttpsError('invalid-argument', 'siteUrl and deviceType are required');
  }

  if (!['pc', 'mobile'].includes(deviceType)) {
    throw new HttpsError('invalid-argument', 'deviceType must be "pc" or "mobile"');
  }

  const userId = request.auth.uid;
  let browser = null;
  const startTime = Date.now();

  try {
    console.log(`[captureScreenshot] Start: ${siteUrl}, device: ${deviceType}, user: ${userId}`);

    // Chromiumの実行パスを取得
    const executablePath = await chromium.executablePath();
    console.log(`[captureScreenshot] Chromium path: ${executablePath}`);

    // Puppeteer起動（v5.0.0と同じアプローチ）
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-default-apps',
        '--no-first-run',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--disable-component-extensions-with-background-pages',
        '--disable-software-rasterizer',
        '--disable-features=Vulkan',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: 'shell',
      ignoreHTTPSErrors: true,
    });

    console.log(`[captureScreenshot] Browser launched in ${Date.now() - startTime}ms`);
    const pageStartTime = Date.now();

    const page = await browser.newPage();

    // キャッシュ無効化
    await page.setCacheEnabled(false);

    // デバイス設定（STEP1・トリガー共通の統一サイズ）
    const viewport = deviceType === 'mobile'
      ? SCREENSHOT_VIEWPORT.mobile
      : SCREENSHOT_VIEWPORT.pc;
    await page.setViewport(viewport);
    console.log(`[captureScreenshot] Viewport: ${viewport.width}x${viewport.height} (${deviceType})`);

    // アニメーション完全停止（強化版）
    await page.evaluateOnNewDocument(() => {
      // CSS アニメーション完全停止
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation: none !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition: none !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head?.appendChild(style) || setTimeout(() => document.head.appendChild(style), 0);

      // JavaScript アニメーション最適化
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

      // IntersectionObserver無効化（遅延読み込み対策）
      window.IntersectionObserver = class {
        constructor() {}
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    });

    // 不要なリソースをブロック（50-70%高速化）
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();

      // スクリーンショットに不要なリソースをブロック
      if (
        resourceType === 'font' ||           // フォント
        resourceType === 'media' ||          // 動画/音声
        resourceType === 'websocket' ||      // WebSocket
        resourceType === 'manifest' ||       // マニフェスト
        resourceType === 'texttrack' ||      // 字幕
        url.includes('google-analytics') ||  // GA
        url.includes('googletagmanager') ||  // GTM
        url.includes('facebook.com') ||      // Facebook Pixel
        url.includes('doubleclick.net') ||   // 広告
        url.includes('analytics') ||         // アナリティクス
        url.includes('tracking') ||          // トラッキング
        url.includes('hotjar') ||            // Hotjar
        url.includes('clarity.ms') ||        // Microsoft Clarity
        url.includes('mouseflow') ||         // Mouseflow
        url.includes('criteo') ||            // Criteo広告
        url.includes('adservice')            // 広告サービス
      ) {
        request.abort();  // ブロック
      } else {
        request.continue();  // 通す
      }
    });

    console.log(`[captureScreenshot] Navigating to ${siteUrl}...`);
    const navStartTime = Date.now();

    // domcontentloaded（networkidle2より10-30秒早い）
    await page.goto(siteUrl, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT_MS,
    });

    console.log(`[captureScreenshot] Navigation completed in ${Date.now() - navStartTime}ms`);

    // ファーストビューの画像読み込みを待つ
    await page.evaluate((imageLoadTimeoutMs, imageSingleTimeoutMs) => {
      return new Promise((resolve) => {
        const viewportHeight = window.innerHeight;
        const images = Array.from(document.querySelectorAll('img')).filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.top < viewportHeight * 1.5;
        }).slice(0, 8);
        if (images.length === 0) {
          resolve();
          return;
        }
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

    await new Promise(resolve => setTimeout(resolve, POST_RENDER_DELAY_MS));

    // スクショ直前にビューポートを再適用
    await page.setViewport(viewport);

    console.log(`[captureScreenshot] Page rendered, taking screenshot...`);
    const screenshotStartTime = Date.now();

    const targetWidth = deviceType === 'mobile' ? SCREENSHOT_OUTPUT_WIDTH.mobile : SCREENSHOT_OUTPUT_WIDTH.pc;

    // ビューポート＝保存サイズでキャプチャ
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 75,
      fullPage: false,
    });

    console.log(`[captureScreenshot] Screenshot captured in ${Date.now() - screenshotStartTime}ms`);

    const resizedPipeline = sharp(screenshot, { failOnError: false })
      .resize(targetWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .jpeg({
        quality: 75,
        progressive: true,
        mozjpeg: true,
      });
    const { data: resizedImage, info } = await resizedPipeline.toBuffer({ resolveWithObject: true });
    console.log(`[captureScreenshot] Image size: ${info.width}x${info.height} (target width: ${targetWidth}), uploading...`);
    const uploadStartTime = Date.now();

    // Firebase Storageにアップロード
    const bucket = getStorage().bucket();
    const fileName = `screenshots/${userId}/${deviceType}_${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    await file.save(resizedImage, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
      resumable: false,
    });

    // ファイルを公開設定にする
    await file.makePublic();

    // 公開URLを取得
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const totalTime = Date.now() - startTime;
    const uploadTime = Date.now() - uploadStartTime;

    console.log(`[captureScreenshot] Success: ${publicUrl}`);
    console.log(`[captureScreenshot] Total time: ${totalTime}ms (Upload: ${uploadTime}ms)`);

    return { imageUrl: publicUrl };

  } catch (error) {
    const errMsg = error?.message || String(error);
    const errName = error?.name || 'Error';
    console.error('[captureScreenshot] Error:', errName, errMsg);
    console.error('[captureScreenshot] Stack:', error?.stack);
    console.error(`[captureScreenshot] Failed after ${Date.now() - startTime}ms`);

    let errorMessage = 'スクリーンショットの取得に失敗しました';
    if (errName === 'TimeoutError') {
      errorMessage = 'ページの読み込みがタイムアウトしました。サイトの応答が遅い可能性があります。';
    } else if (errMsg.includes('net::ERR')) {
      errorMessage = 'サイトにアクセスできませんでした。URLを確認してください。';
    } else if (errMsg.includes('executablePath') || errMsg.includes('Chromium') || errMsg.includes('Failed to launch')) {
      errorMessage = 'ブラウザの起動に失敗しました。しばらく経ってから再試行するか、手動で画像をアップロードしてください。';
    }
    throw new HttpsError('internal', errorMessage);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[captureScreenshot] Browser closed');
    }
  }
}
