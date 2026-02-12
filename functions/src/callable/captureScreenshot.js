import { HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import sharp from 'sharp';

/**
 * スクリーンショット取得 Callable Function（ファーストビュー特化版）
 * 
 * 改善内容：
 * - ファーストビュー+セカンドビュー（モバイル1200px、PC1400px）に最適化
 * - アニメーション完全停止（CSS + JavaScript + IntersectionObserver無効化）
 * - 賢い画像読み込み待機（ファーストビュー内の画像のみ、最大5秒）
 * - 最小限の待機時間（500ms）
 * - 品質向上（JPEG 75%）
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
    
    // デバイス設定（ファーストビュー+セカンドビュー特化）
    const viewport = deviceType === 'mobile' 
      ? { width: 375, height: 1200, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }  // 1200px（ファーストビュー+α）
      : { width: 1920, height: 1400, deviceScaleFactor: 1 };  // 1400px（ファーストビュー+α）
    
    await page.setViewport(viewport);
    
    // 🔥 最適化2: アニメーション完全停止（強化版）
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
      timeout: 20000,  // 20秒（ファーストビュー用に短縮）
    });
    
    console.log(`[captureScreenshot] Navigation completed in ${Date.now() - navStartTime}ms`);
    
    // 🔥 最適化: ファーストビューの画像読み込みを賢く待つ
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // ファーストビュー+αの画像のみを対象
        const viewportHeight = window.innerHeight;
        const images = Array.from(document.querySelectorAll('img')).filter(img => {
          const rect = img.getBoundingClientRect();
          // ファーストビュー+セカンドビュー（1.5倍）内の画像のみ
          return rect.top < viewportHeight * 1.5;
        }).slice(0, 8);  // 最大8枚
        
        if (images.length === 0) {
          resolve();
          return;
        }
        
        const promises = images.map(img => {
          if (img.complete && img.naturalHeight !== 0) {
            return Promise.resolve();
          }
          return new Promise(imgResolve => {
            img.addEventListener('load', imgResolve);
            img.addEventListener('error', imgResolve);
            // 各画像2秒でタイムアウト
            setTimeout(imgResolve, 2000);
          });
        });
        
        // 全体で5秒でタイムアウト
        Promise.race([
          Promise.all(promises),
          new Promise(timeoutResolve => setTimeout(timeoutResolve, 5000))
        ]).then(resolve);
      });
    });
    
    // 最小限の待機（アニメーション停止の効果を確実にするため）
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`[captureScreenshot] Page rendered, taking screenshot...`);
    const screenshotStartTime = Date.now();
    
    // ファーストビュー用の適切なサイズ（プレビューに十分な品質）
    const targetWidth = deviceType === 'mobile' ? 375 : 600;
    
    // ファーストビュー用の適切な品質（プレビューに十分）
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 75,  // ファーストビュー用に品質を少し上げる
      fullPage: false,
    });
    
    console.log(`[captureScreenshot] Screenshot captured in ${Date.now() - screenshotStartTime}ms`);
    
    // 高速リサイズ（ファーストビュー用最適化）
    const resizedImage = await sharp(screenshot, {
      failOnError: false,
    })
      .resize(targetWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .jpeg({ 
        quality: 75,  // ファーストビュー用に品質を保持
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


