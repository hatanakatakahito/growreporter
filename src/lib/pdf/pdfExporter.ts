/**
 * PDF出力ユーティリティ
 * html2canvasとjsPDFを使用して画面をPDF出力
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// 日本語フォント対応のための設定
// Note: jsPDFはデフォルトで日本語をサポートしていないため、画像として出力する方式を採用

export interface PDFExportOptions {
  filename?: string;
  element?: HTMLElement;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * 画面全体または指定した要素をPDFとして出力
 */
export async function exportToPDF(options: PDFExportOptions = {}): Promise<void> {
  const {
    filename = `report_${new Date().toISOString().split('T')[0]}.pdf`,
    element = document.body,
    format = 'a4',
    orientation = 'portrait'
  } = options;

  try {
    console.log('📄 PDF出力開始...');

    // 固定要素を一時的に非表示にする（AI分析ボタンなど）
    const fixedElements = element.querySelectorAll('[class*="fixed"]');
    const originalDisplays: string[] = [];
    fixedElements.forEach((el, index) => {
      originalDisplays[index] = (el as HTMLElement).style.display;
      (el as HTMLElement).style.display = 'none';
    });

    // html2canvasで画面をキャプチャ
    const canvas = await html2canvas(element, {
      scale: 2, // 高解像度
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // 固定要素を元に戻す
    fixedElements.forEach((el, index) => {
      (el as HTMLElement).style.display = originalDisplays[index];
    });

    // PDFドキュメントを作成
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

    // A4サイズの寸法（mm）
    const pdfWidth = orientation === 'portrait' ? 210 : 297;
    const pdfHeight = orientation === 'portrait' ? 297 : 210;

    // キャンバスのサイズ
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // 画像をPDFに追加
    let heightLeft = imgHeight;
    let position = 0;

    // 1ページ目
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // 複数ページに分割が必要な場合
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // PDFをダウンロード
    pdf.save(filename);

    console.log('✅ PDF出力完了:', filename);
  } catch (error) {
    console.error('❌ PDF出力エラー:', error);
    throw error;
  }
}

/**
 * 特定のページをPDF出力
 */
export async function exportPageToPDF(pageType: string): Promise<void> {
  const mainContent = document.querySelector('main');
  
  if (!mainContent) {
    throw new Error('メインコンテンツが見つかりません');
  }

  const pageTitles: Record<string, string> = {
    summary: '全体サマリー',
    users: 'ユーザー',
    'channels': '集客チャネル',
    'organic-keywords': 'オーガニック検索キーワード',
    'referrals': '参照元',
    'landing-pages': 'ランディングページ',
    'page-engagement': 'ページ別エンゲージメント',
    'file-downloads': 'ファイルダウンロード',
    'external-links': '外部リンククリック',
    'conversion-events': 'コンバージョン一覧',
    'funnel': '逆算フロー'
  };

  const filename = `${pageTitles[pageType] || pageType}_${new Date().toISOString().split('T')[0]}.pdf`;

  await exportToPDF({
    element: mainContent as HTMLElement,
    filename
  });
}

/**
 * 複数のページを1つのPDFに統合して出力
 */
export async function exportMultiplePagesToPDF(
  pagePaths: string[], 
  router: any
): Promise<void> {
  const pageTitles: Record<string, string> = {
    summary: '全体サマリー',
    users: 'ユーザー',
    acquisition: '集客',
    'organic-keywords': 'オーガニック検索キーワード',
    referrals: '参照元',
    engagement: 'エンゲージメント',
    'landing-pages': 'ランディングページ',
    'file-downloads': 'ファイルダウンロード',
    'external-links': '外部リンククリック',
    'conversion-events': 'コンバージョン一覧',
    funnel: '逆算フロー'
  };

  try {
    console.log('📄 複数ページPDF出力開始...', pagePaths);

    // PDFドキュメントを作成
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let isFirstPage = true;

    // 各ページを順番に処理
    for (let i = 0; i < pagePaths.length; i++) {
      const pagePath = pagePaths[i];
      const pageType = pagePath.split('/').filter(Boolean).pop() || 'summary';
      console.log(`📄 処理中 (${i + 1}/${pagePaths.length}): ${pageType} (${pagePath})`);

      // ページに移動
      console.log(`🔄 ページ遷移開始: ${pagePath}`);
      await router.push(pagePath);
      console.log(`✅ router.push完了`);

      // ページの読み込みを待つ（5秒に延長）
      console.log(`⏳ ページ読み込み待機中... (5秒)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`✅ 基本待機完了`);

      // 画像やチャートの読み込みを待つ
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          console.log(`✅ document.readyState === 'complete'`);
          setTimeout(resolve, 2000); // 追加の待機時間を2秒に延長
        } else {
          console.log(`⏳ load イベント待機中...`);
          window.addEventListener('load', () => {
            console.log(`✅ load イベント発火`);
            setTimeout(resolve, 2000);
          });
        }
      });
      console.log(`✅ チャート読み込み待機完了`);

      // メインコンテンツを取得
      const mainContent = document.querySelector('main');
      if (!mainContent) {
        console.warn(`⚠️ メインコンテンツが見つかりません: ${pagePath}`);
        continue;
      }
      console.log(`✅ mainContent取得成功:`, {
        scrollWidth: mainContent.scrollWidth,
        scrollHeight: mainContent.scrollHeight,
        clientWidth: mainContent.clientWidth,
        clientHeight: mainContent.clientHeight
      });

      // 固定要素を一時的に非表示にする
      const fixedElements = document.querySelectorAll('[class*="fixed"]');
      const originalDisplays: string[] = [];
      fixedElements.forEach((el, index) => {
        originalDisplays[index] = (el as HTMLElement).style.display;
        (el as HTMLElement).style.display = 'none';
      });
      console.log(`🔒 固定要素を非表示にしました (${fixedElements.length}個)`);

      // html2canvasで画面をキャプチャ
      console.log(`📸 html2canvasでキャプチャ開始...`);
      const canvas = await html2canvas(mainContent as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: mainContent.scrollWidth,
        windowHeight: mainContent.scrollHeight,
      });
      console.log(`✅ キャプチャ完了:`, {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });

      // 固定要素を元に戻す
      fixedElements.forEach((el, index) => {
        (el as HTMLElement).style.display = originalDisplays[index];
      });
      console.log(`🔓 固定要素を元に戻しました`);

      // A4サイズの寸法（mm）
      const pdfWidth = 210;
      const pdfHeight = 297;

      // キャンバスのサイズ
      const imgWidth = pdfWidth - 20; // 左右10mmずつマージン
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 画像データを取得
      const imgData = canvas.toDataURL('image/png');
      console.log(`📊 画像データ作成完了:`, {
        imgWidth,
        imgHeight,
        pages: Math.ceil(imgHeight / (pdfHeight - 20))
      });

      // 新しいページを追加（最初のページ以外）
      if (!isFirstPage) {
        console.log(`➕ 新しいページを追加`);
        pdf.addPage();
      } else {
        console.log(`📄 最初のページ`);
      }
      isFirstPage = false;

      // 画像をPDFに追加（マージン付き）
      let heightLeft = imgHeight;
      let position = 10; // 上マージン

      console.log(`📝 PDFに画像を追加 (position: ${position}, height: ${imgHeight})`);
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20); // 上下マージン分を引く

      // 複数ページに分割が必要な場合
      let splitPageCount = 0;
      while (heightLeft > 0) {
        splitPageCount++;
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        console.log(`📄 分割ページ追加 (${splitPageCount}ページ目)`);
      }

      console.log(`✅ ${pageType} を追加しました (PDFページ総数: ${pdf.getNumberOfPages()})`);
    }

    // PDFをダウンロード
    const filename = `report_${new Date().toISOString().split('T')[0]}.pdf`;
    const totalPages = pdf.getNumberOfPages();
    console.log(`💾 PDFをダウンロード: ${filename} (総ページ数: ${totalPages})`);
    pdf.save(filename);

    console.log('✅ 統合PDF出力完了:', filename);
  } catch (error) {
    console.error('❌ 統合PDF出力エラー:', error);
    throw error;
  }
}

