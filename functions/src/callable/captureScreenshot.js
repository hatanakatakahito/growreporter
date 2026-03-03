import { HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
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
const NAV_TIMEOUT_MS = 30000;

/**
 * スクリーンショット取得 Callable Function
 * オーバーライドなし・リソースブロックなしのシンプル方式。
 * networkidle2 で待ち → 5秒追加待機 → 撮影。
 */
export async function captureScreenshotCallable(request) {
  const { siteUrl, deviceType } = request.data;

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }
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
    const [{ default: puppeteer }, chromiumModule] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    const chromium = chromiumModule.default || chromiumModule;

    console.log(`[captureScreenshot] Start: ${siteUrl}, device: ${deviceType}, user: ${userId}`);

    try { chromium.setGraphicsMode = false; } catch (_) {}

    let executablePath;
    try {
      executablePath = await chromium.executablePath();
    } catch (pathErr) {
      throw new HttpsError('internal', `Chromium の準備に失敗しました: ${pathErr?.message || 'unknown'}`);
    }
    console.log(`[captureScreenshot] Chromium path: ${executablePath}`);

    // ─── ブラウザ起動（最小限のフラグ） ───
    browser = await puppeteer.launch({
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

    console.log(`[captureScreenshot] Browser launched in ${Date.now() - startTime}ms`);

    const page = await browser.newPage();

    // 言語設定
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });

    // ビューポート設定
    const viewport = SCREENSHOT_VIEWPORT[deviceType];
    await page.setViewport(viewport);
    console.log(`[captureScreenshot] Viewport: ${viewport.width}x${viewport.height} (${deviceType})`);

    // ─── トラッキング系のみブロック（フォント・CSS・画像はすべて通す） ───
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
    } catch (interceptErr) {
      console.warn(`[captureScreenshot] Request interception failed: ${interceptErr?.message}`);
    }

    // ─── ページ読み込み（networkidle2 でネットワーク静止を待つ） ───
    console.log(`[captureScreenshot] Navigating to ${siteUrl}...`);

    try {
      const response = await page.goto(siteUrl, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT_MS,
      });
      console.log(`[captureScreenshot] Navigation done: status=${response?.status()} in ${Date.now() - startTime}ms`);
    } catch (navErr) {
      if (navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout')) {
        console.log(`[captureScreenshot] Navigation timeout at ${Date.now() - startTime}ms, continuing with loaded content...`);
      } else {
        throw navErr;
      }
    }

    // 3秒待機（JS アニメーション完了を待つ）
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`[captureScreenshot] Waited 3s after navigation`);

    // ─── スクリーンショット撮影 ───
    console.log(`[captureScreenshot] Taking screenshot...`);
    const screenshotStartTime = Date.now();

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 75,
      fullPage: false,
    });

    console.log(`[captureScreenshot] Screenshot captured (${screenshot.length} bytes) in ${Date.now() - screenshotStartTime}ms`);

    // ─── sharp リサイズ ───
    const targetWidth = SCREENSHOT_OUTPUT_WIDTH[deviceType];
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

    // ─── Firebase Storage にアップロード ───
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

    await file.makePublic();

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
