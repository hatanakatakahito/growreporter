/**
 * PDF出力ユーティリティ
 * html2canvasとjsPDFを使用して画面をPDF出力
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

    // html2canvasで画面をキャプチャ
    const canvas = await html2canvas(element, {
      scale: 2, // 高解像度
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
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
    for (const pagePath of pagePaths) {
      const pageType = pagePath.split('/').filter(Boolean).pop() || 'summary';
      console.log(`📄 処理中: ${pageType} (${pagePath})`);

      // ページに移動
      router.push(pagePath);

      // ページの読み込みを待つ
      await new Promise(resolve => setTimeout(resolve, 2500));

      // メインコンテンツを取得
      const mainContent = document.querySelector('main');
      if (!mainContent) {
        console.warn(`⚠️ メインコンテンツが見つかりません: ${pagePath}`);
        continue;
      }

      // html2canvasで画面をキャプチャ
      const canvas = await html2canvas(mainContent as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // A4サイズの寸法（mm）
      const pdfWidth = 210;
      const pdfHeight = 297;

      // キャンバスのサイズ
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // 画像データを取得
      const imgData = canvas.toDataURL('image/png');

      // 新しいページを追加（最初のページ以外）
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      // ページタイトルを追加
      pdf.setFontSize(16);
      pdf.text(pageTitles[pageType] || pageType, 10, 10);

      // 画像をPDFに追加
      let heightLeft = imgHeight;
      let position = 15; // タイトルの下から開始

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - position);

      // 複数ページに分割が必要な場合
      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      console.log(`✅ ${pageType} を追加しました`);
    }

    // PDFをダウンロード
    const filename = `report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

    console.log('✅ 統合PDF出力完了:', filename);
  } catch (error) {
    console.error('❌ 統合PDF出力エラー:', error);
    throw error;
  }
}

