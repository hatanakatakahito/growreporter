import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    console.log('📄 PDF生成API開始');
    const { pagePath } = await request.json();
    console.log('📄 リクエストされたページパス:', pagePath);

    if (!pagePath) {
      console.log('❌ ページパスが指定されていません');
      return NextResponse.json(
        { error: 'Page path is required' },
        { status: 400 }
      );
    }

    // Puppeteerでブラウザを起動
    console.log('🚀 Puppeteerブラウザを起動中...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ ブラウザ起動完了');

    const page = await browser.newPage();
    console.log('📄 新しいページを作成');

    // PDF専用ページにアクセス
    const pdfUrl = `http://localhost:3000/pdf${pagePath}`;
    console.log('🌐 PDF URL:', pdfUrl);

    console.log('🌐 ページにアクセス中...');
    try {
      await page.goto(pdfUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      console.log('✅ ページアクセス完了');
    } catch (gotoError) {
      console.error('❌ ページアクセスエラー:', gotoError);
      throw new Error(`ページアクセスに失敗しました: ${gotoError instanceof Error ? gotoError.message : String(gotoError)}`);
    }

    // 固定時間待機（静的なHTMLなので短縮）
    console.log('⏳ 1秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ローディング要素を強制的に非表示
    console.log('🧹 ローディング要素を非表示に...');
    await page.evaluate(() => {
      const loadingElements = document.querySelectorAll('[class*="pdfLoading"], [class*="loading"]');
      loadingElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
        el.remove();
      });
    });

    // PDFを生成
    console.log('📄 PDF生成中...');
    let pdf: Uint8Array;
    try {
      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        timeout: 30000 // 30秒のタイムアウト
      });
      console.log('✅ PDF生成完了, サイズ:', pdf.length, 'bytes');
    } catch (pdfError) {
      console.error('❌ PDF生成エラー:', pdfError);
      throw new Error(`PDF生成に失敗しました: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
    }

    await browser.close();
    console.log('🔒 ブラウザを閉じました');

    // PDFを返す
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="summary-${Date.now()}.pdf"`,
        'Content-Length': pdf.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ PDF生成エラー:', error);
    console.error('❌ エラータイプ:', typeof error);
    console.error('❌ エラーメッセージ:', error instanceof Error ? error.message : String(error));
    console.error('❌ エラースタック:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'PDF generation failed', 
        details: error instanceof Error ? error.message : String(error),
        type: typeof error
      },
      { status: 500 }
    );
  }
}