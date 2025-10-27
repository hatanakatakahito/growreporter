import { HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import sharp from 'sharp';

/**
 * スクリーンショット取得 Callable Function
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
  
  try {
    console.log(`[captureScreenshot] Start: ${siteUrl}, device: ${deviceType}, user: ${userId}`);
    
    // Chromiumの実行パスを取得
    const executablePath = await chromium.executablePath();
    console.log(`[captureScreenshot] Chromium path: ${executablePath}`);
    
    // Puppeteer起動（Cloud Functions Gen2用の設定）
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: 'new',
    });
    
    const page = await browser.newPage();
    
    // デバイス設定
    const viewport = deviceType === 'mobile' 
      ? { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
      : { width: 1920, height: 1080, deviceScaleFactor: 1 };
    
    await page.setViewport(viewport);
    
    console.log(`[captureScreenshot] Navigating to ${siteUrl}...`);
    
    // ページ読み込み（タイムアウト30秒）
    await page.goto(siteUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    console.log(`[captureScreenshot] Page loaded, taking screenshot...`);
    
    // スクリーンショット取得（ファーストビューのみ）
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: false, // ファーストビューのみ
    });
    
    console.log(`[captureScreenshot] Screenshot captured, resizing...`);
    
    // リサイズ（PC: 600px、スマホ: 400px）
    const targetWidth = deviceType === 'mobile' ? 400 : 600;
    const resizedImage = await sharp(screenshot)
      .resize({ width: targetWidth })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    console.log(`[captureScreenshot] Image resized to ${targetWidth}px, uploading to Storage...`);
    
    // Firebase Storageにアップロード
    const bucket = getStorage().bucket();
    const fileName = `screenshots/${userId}/${deviceType}_${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    
    await file.save(resizedImage, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000', // 1年キャッシュ
      },
    });
    
    // ファイルを公開設定にする
    await file.makePublic();
    
    // 公開URLを取得
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    console.log(`[captureScreenshot] Success: ${publicUrl}`);
    
    return { imageUrl: publicUrl };
    
  } catch (error) {
    console.error('[captureScreenshot] Error:', error);
    
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


