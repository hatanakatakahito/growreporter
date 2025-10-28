import { HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import sharp from 'sharp';

/**
 * スクリーンショット取得 Callable Function（最適化版）
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
    
    // Puppeteer起動（最適化版）
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        
        // 🔥 最適化: 不要な機能を徹底的に無効化
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
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: 'shell', // 🔥 最適化: 旧ヘッドレスモード（CPU効率UP）
      ignoreHTTPSErrors: true,
    });
    
    console.log(`[captureScreenshot] Browser launched in ${Date.now() - startTime}ms`);
    const pageStartTime = Date.now();
    
    const page = await browser.newPage();
    
    // 🔥 最適化: キャッシュ無効化
    await page.setCacheEnabled(false);
    
    // デバイス設定（元の縦サイズに戻す）
    const viewport = deviceType === 'mobile' 
      ? { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }  // 元に戻す
      : { width: 1920, height: 1080, deviceScaleFactor: 1 };  // 元に戻す
    
    await page.setViewport(viewport);
    
    // 🔥 最適化2: CSSアニメーション無効化（レンダリング高速化）
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.innerHTML = '* { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);
    });
    
    // 🔥 最適化: 不要なリソースをブロック（50-70%高速化）
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
    
    // 🔥 最適化: domcontentloaded（networkidle2より10-30秒早い）
    await page.goto(siteUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,  // 45秒 → 30秒
    });
    
    console.log(`[captureScreenshot] Navigation completed in ${Date.now() - navStartTime}ms`);
    
    // 🔥 最適化: レンダリング完了を確実に待つ
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    });
    
    // さらに2秒待機してレンダリングを完全に完了させる
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[captureScreenshot] Page rendered, taking screenshot...`);
    const screenshotStartTime = Date.now();
    
    // 🔥 最適化4: リサイズを小さく（ファイルサイズ削減）
    const targetWidth = deviceType === 'mobile' ? 300 : 500;  // 400/600 → 300/500
    
    // 🔥 最適化3: JPEG品質を60に（ファイルサイズ30-40%削減）
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 60,  // 70 → 60
      fullPage: false,
    });
    
    console.log(`[captureScreenshot] Screenshot captured in ${Date.now() - screenshotStartTime}ms`);
    
    // 高速リサイズ
    const resizedImage = await sharp(screenshot, {
      failOnError: false,
    })
      .resize(targetWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .jpeg({ 
        quality: 60,  // 70 → 60
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();
    
    console.log(`[captureScreenshot] Image resized, uploading to Storage...`);
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
    console.error('[captureScreenshot] Error:', error);
    console.error(`[captureScreenshot] Failed after ${Date.now() - startTime}ms`);
    
    // エラーメッセージをユーザーフレンドリーに
    let errorMessage = 'スクリーンショットの取得に失敗しました';
    
    if (error.name === 'TimeoutError') {
      errorMessage = 'ページの読み込みがタイムアウトしました。サイトの応答が遅い可能性があります。';
    } else if (error.message.includes('net::ERR')) {
      errorMessage = 'サイトにアクセスできませんでした。URLを確認してください。';
    }
    
    throw new HttpsError('internal', errorMessage);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[captureScreenshot] Browser closed');
    }
  }
}


