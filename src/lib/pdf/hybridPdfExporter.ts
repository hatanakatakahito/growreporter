/**
 * ハイブリッド式PDF出力ユーティリティ
 * テキストはjsPDFで直接出力、グラフは画像として出力
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface HybridPDFExportOptions {
  filename?: string;
  onProgress?: (current: number, total: number, message: string) => void;
}

/**
 * 複数のページを1つのPDFに統合して出力（ハイブリッド方式）
 */
export async function exportMultiplePagesToPDFHybrid(
  pagePaths: string[],
  router: any,
  options: HybridPDFExportOptions = {}
): Promise<void> {
  const {
    filename = `report_${new Date().toISOString().split('T')[0]}.pdf`,
    onProgress
  } = options;

  const pageTitles: Record<string, string> = {
    summary: '全体サマリー',
    users: 'ユーザー',
    dashboard: 'ダッシュボード',
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
    console.log('📄 ハイブリッドPDF出力開始...', pagePaths);
    onProgress?.(0, pagePaths.length, 'PDF生成を開始しています...');

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
      const pageTitle = pageTitles[pageType] || pageType;
      
      console.log(`📄 処理中 (${i + 1}/${pagePaths.length}): ${pageTitle} (${pagePath})`);
      onProgress?.(i + 1, pagePaths.length, `${pageTitle}を処理中...`);

      // ページに移動
      console.log(`🔄 ページ遷移開始: ${pagePath}`);
      await router.push(pagePath);
      console.log(`✅ router.push完了`);

      // ページの読み込みを待つ（5秒）
      console.log(`⏳ ページ読み込み待機中... (5秒)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`✅ 基本待機完了`);

      // 画像やチャートの読み込みを待つ
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          console.log(`✅ document.readyState === 'complete'`);
          setTimeout(resolve, 2000);
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

      // 新しいページを追加（最初のページ以外）
      if (!isFirstPage) {
        console.log(`➕ 新しいページを追加`);
        pdf.addPage();
      } else {
        console.log(`📄 最初のページ`);
      }
      isFirstPage = false;

      let yPosition = 20; // 上マージン

      // ページタイトルを追加
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text(pageTitle, 20, yPosition);
      yPosition += 15;

      // 日付を追加
      const dateStr = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(dateStr, 20, yPosition);
      yPosition += 15;

      // グラフやチャートをキャプチャ
      const charts = mainContent.querySelectorAll('.apexcharts-canvas, canvas, [class*="chart"]');
      console.log(`📊 チャート要素: ${charts.length}個`);

      if (charts.length > 0) {
        // グラフがある場合は画像として追加
        const fixedElements = document.querySelectorAll('[class*="fixed"]');
        const originalDisplays: string[] = [];
        fixedElements.forEach((el, index) => {
          originalDisplays[index] = (el as HTMLElement).style.display;
          (el as HTMLElement).style.display = 'none';
        });

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

        fixedElements.forEach((el, index) => {
          (el as HTMLElement).style.display = originalDisplays[index];
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 170; // PDFの幅（マージン考慮）
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        console.log(`📐 画像サイズ: 幅=${imgWidth}mm, 高さ=${imgHeight}mm`);

        // 画像をPDFに追加
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        
        // 画像が1ページに収まらない場合、複数ページに分割
        let heightLeft = imgHeight - (297 - yPosition);
        let position = yPosition;
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
          heightLeft -= 297;
        }
      } else {
        // グラフがない場合はテキスト抽出を試みる
        const textElements = mainContent.querySelectorAll('h1, h2, h3, p, td, th');
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);

        textElements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text && yPosition < 270) {
            // テキストを追加（簡易版）
            const maxWidth = 170;
            const splitText = pdf.splitTextToSize(text, maxWidth);
            
            if (yPosition + (splitText.length * 7) > 270) {
              pdf.addPage();
              yPosition = 20;
            }

            pdf.text(splitText, 20, yPosition);
            yPosition += splitText.length * 7 + 3;
          }
        });
      }

      console.log(`✅ ${pageTitle} を追加しました (PDFページ総数: ${pdf.getNumberOfPages()})`);
    }

    // PDFをダウンロード
    const totalPages = pdf.getNumberOfPages();
    console.log(`💾 PDFをダウンロード: ${filename} (総ページ数: ${totalPages})`);
    onProgress?.(pagePaths.length, pagePaths.length, 'PDF生成が完了しました');
    
    pdf.save(filename);

    console.log('✅ ハイブリッドPDF出力完了:', filename);
  } catch (error) {
    console.error('❌ ハイブリッドPDF出力エラー:', error);
    throw error;
  }
}

