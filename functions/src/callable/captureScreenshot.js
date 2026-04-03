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

    // デバイスタイプに応じたUser-Agentを設定（WAFボット判定回避）
    const userAgent = deviceType === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);

    // 言語設定
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });

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

    let navStatus = 200;
    try {
      const response = await page.goto(siteUrl, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT_MS,
      });
      navStatus = response?.status() || 200;
      console.log(`[captureScreenshot] Navigation done: status=${navStatus} in ${Date.now() - startTime}ms`);
    } catch (navErr) {
      if (navErr?.name === 'TimeoutError' || navErr?.message?.includes('timeout')) {
        console.log(`[captureScreenshot] Navigation timeout at ${Date.now() - startTime}ms, continuing with loaded content...`);
      } else {
        throw navErr;
      }
    }

    // 403/503等のブロックを検知 → PageSpeed Insights APIにフォールバック
    if (navStatus === 403 || navStatus === 503) {
      console.log(`[captureScreenshot] Status ${navStatus} detected, trying PageSpeed Insights API fallback...`);
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
      browser = null;

      const psiResult = await _fetchScreenshotFromPSI(siteUrl, deviceType, userId);
      if (psiResult) return psiResult;
      // PSI も失敗した場合は通常フローに戻さず例外
      throw new Error(`Site returned ${navStatus} and PSI fallback also failed`);
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

/**
 * PageSpeed Insights API でスクリーンショットを取得（403等のフォールバック用）
 * GoogleのLighthouseクローラーはWAFにブロックされにくい
 */
async function _fetchScreenshotFromPSI(siteUrl, deviceType, userId) {
  try {
    const psiApiKey = process.env.PSI_API_KEY;
    if (!psiApiKey) {
      console.warn('[captureScreenshot] PSI_API_KEY not set, skipping PSI fallback');
      return null;
    }

    const strategy = deviceType === 'mobile' ? 'mobile' : 'desktop';
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(siteUrl)}&strategy=${strategy}&category=performance&key=${psiApiKey}`;

    console.log(`[captureScreenshot] PSI fallback: fetching ${strategy}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const res = await fetch(psiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[captureScreenshot] PSI fallback failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const base64Data = data.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
    if (!base64Data) {
      console.warn('[captureScreenshot] PSI fallback: no screenshot in response');
      return null;
    }

    // base64 → Buffer（"data:image/jpeg;base64,..." 形式）
    const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Str, 'base64');

    console.log(`[captureScreenshot] PSI fallback: got ${imageBuffer.length} bytes, uploading...`);

    // Firebase Storage にアップロード
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage().bucket();
    const fileName = `screenshots/${userId}/${deviceType}_${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
      resumable: false,
    });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log(`[captureScreenshot] PSI fallback success: ${publicUrl}`);
    return { imageUrl: publicUrl };
  } catch (e) {
    console.warn(`[captureScreenshot] PSI fallback error: ${e.message}`);
    return null;
  }
}
