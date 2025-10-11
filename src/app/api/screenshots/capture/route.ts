import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const maxDuration = 60; // Vercel timeout設定

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 401 }
      );
    }
    
    const { siteUrl, device = 'desktop' } = await request.json();
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'サイトURLが必要です' },
        { status: 400 }
      );
    }
    
    console.log('🖼️ スクリーンショット撮影開始:', { siteUrl, device });
    
    // Puppeteerでスクリーンショットを撮影
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // デバイス設定
    if (device === 'mobile') {
      await page.setViewport({
        width: 375,
        height: 812,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      });
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    } else {
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      });
    }
    
    // ページを開く
    await page.goto(siteUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // スクリーンショットを撮影
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false // ファーストビューのみ
    });
    
    await browser.close();
    
    console.log('✅ スクリーンショット撮影完了');
    
    // 一時的に、base64エンコードしてデータURLとして返す
    // Firebase Storageのセットアップ完了後は、Storageにアップロードする方式に変更
    const base64Screenshot = screenshot.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Screenshot}`;
    
    console.log('✅ スクリーンショットをbase64エンコード完了');
    
    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: `${device}_${Date.now()}.png`,
      device,
      capturedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ スクリーンショット撮影エラー:', {
      message: error?.message,
      stack: error?.stack
    });
    
    return NextResponse.json(
      { 
        error: 'スクリーンショットの撮影に失敗しました',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

