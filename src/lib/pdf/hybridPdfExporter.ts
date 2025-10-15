/**
 * ハイブリッドPDF出力ユーティリティ
 * - テキスト・表組: jsPDF + autoTable（選択可能）
 * - グラフ: html2canvasで画像として埋め込み
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface HybridPDFExportOptions {
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface PageData {
  title: string;
  subtitle?: string;
  charts?: HTMLElement[];
  tables?: TableData[];
  sections?: SectionData[];
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

export interface SectionData {
  title: string;
  content: string;
}

/**
 * ApexChartsのグラフを画像として取得
 */
async function captureChartAsImage(chartElement: HTMLElement): Promise<string> {
  try {
    console.log('📊 グラフをキャプチャ中...', {
      width: chartElement.offsetWidth,
      height: chartElement.offsetHeight
    });

    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    console.log('✅ グラフキャプチャ完了');
    return imgData;
  } catch (error) {
    console.error('❌ グラフキャプチャエラー:', error);
    throw error;
  }
}

/**
 * ページからデータを抽出
 */
export function extractPageData(pageType: string): PageData {
  console.log(`📄 ページデータ抽出開始: ${pageType}`);

  const pageTitles: Record<string, string> = {
    dashboard: 'ダッシュボード',
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

  const title = pageTitles[pageType] || pageType;

  // チャートを取得
  const charts: HTMLElement[] = [];
  const chartElements = document.querySelectorAll('.apexcharts-canvas');
  chartElements.forEach((el) => {
    charts.push(el.parentElement as HTMLElement);
  });

  // テーブルを取得
  const tables: TableData[] = [];
  const tableElements = document.querySelectorAll('table');
  tableElements.forEach((table) => {
    const headers: string[] = [];
    const rows: (string | number)[][] = [];

    // ヘッダーを取得
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach((th) => {
      headers.push(th.textContent?.trim() || '');
    });

    // データ行を取得
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach((tr) => {
      const row: (string | number)[] = [];
      const cells = tr.querySelectorAll('td');
      cells.forEach((td) => {
        const text = td.textContent?.trim() || '';
        // 数値かどうかを判定
        const num = parseFloat(text.replace(/,/g, ''));
        row.push(isNaN(num) ? text : text);
      });
      if (row.length > 0) {
        rows.push(row);
      }
    });

    if (headers.length > 0 && rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  console.log(`✅ ページデータ抽出完了:`, {
    title,
    chartsCount: charts.length,
    tablesCount: tables.length
  });

  return {
    title,
    charts,
    tables
  };
}

/**
 * 複数ページを1つのハイブリッドPDFに統合して出力
 */
export async function exportMultiplePagesToHybridPDF(
  pagePaths: string[],
  router: any,
  options?: HybridPDFExportOptions
): Promise<void> {
  try {
    console.log('📄 ハイブリッドPDF出力開始...', pagePaths);

    // PDFドキュメントを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // フォント設定（デフォルトフォントを使用）
    doc.setFont('helvetica', 'normal');

    let isFirstPage = true;
    const pageMargin = 15;
    const pageWidth = 210; // A4幅
    const pageHeight = 297; // A4高さ
    const contentWidth = pageWidth - (pageMargin * 2);
    let currentY = pageMargin;

    // 現在のページを保存
    const currentPath = window.location.pathname;
    console.log(`📍 現在のページを保存: ${currentPath}`);

    // 各ページを順番に処理
    for (let i = 0; i < pagePaths.length; i++) {
      const pagePath = pagePaths[i];
      const pageType = pagePath.split('/').filter(Boolean).pop() || 'summary';

      // 進捗更新
      if (options?.onProgress) {
        options.onProgress(i + 1, pagePaths.length, `${pageType}を処理中...`);
      }

      console.log(`📄 処理中 (${i + 1}/${pagePaths.length}): ${pageType} (${pagePath})`);

      // ページに移動
      console.log(`🔄 ページ遷移開始: ${pagePath}`);
      await router.push(pagePath);
      console.log(`✅ router.push完了`);

      // ページの読み込みを待つ
      console.log(`⏳ ページ読み込み待機中... (5秒)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`✅ 基本待機完了`);

      // チャートの読み込みを追加で待つ
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`✅ チャート読み込み待機完了`);

      // ページデータを抽出
      const pageData = extractPageData(pageType);

      // 新しいページを追加（最初のページ以外）
      if (!isFirstPage) {
        doc.addPage();
        currentY = pageMargin;
      }
      isFirstPage = false;

      // ページタイトルを追加
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(pageData.title, pageMargin, currentY);
      currentY += 10;

      // グラフを追加
      for (const chart of pageData.charts || []) {
        try {
          const imgData = await captureChartAsImage(chart);
          const chartWidth = contentWidth;
          const chartHeight = (chart.offsetHeight / chart.offsetWidth) * chartWidth;

          // ページをまたぐ場合は新しいページ
          if (currentY + chartHeight > pageHeight - pageMargin) {
            doc.addPage();
            currentY = pageMargin;
          }

          doc.addImage(imgData, 'PNG', pageMargin, currentY, chartWidth, chartHeight);
          currentY += chartHeight + 5;
        } catch (error) {
          console.error('グラフの追加でエラー:', error);
        }
      }

      // テーブルを追加
      for (const table of pageData.tables || []) {
        try {
          // ページをまたぐ可能性があるため、autoTableに任せる
          autoTable(doc, {
            head: [table.headers],
            body: table.rows,
            startY: currentY,
            margin: { left: pageMargin, right: pageMargin },
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 8,
              cellPadding: 2,
              halign: 'center',
              valign: 'middle',
            },
            headStyles: {
              fillColor: [59, 130, 246], // primary color
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center',
            },
            // 年月列は左寄せ
            columnStyles: {
              0: { halign: 'left' },
            },
          });

          // autoTableの終了位置を取得
          currentY = (doc as any).lastAutoTable.finalY + 10;
        } catch (error) {
          console.error('テーブルの追加でエラー:', error);
        }
      }

      console.log(`✅ ${pageType} を追加しました (PDFページ総数: ${doc.getNumberOfPages()})`);
    }

    // 元のページに戻る
    if (currentPath !== window.location.pathname) {
      console.log(`🔙 元のページに戻ります: ${currentPath}`);
      await router.push(currentPath);
    }

    // PDFをダウンロード
    const filename = `report_${new Date().toISOString().split('T')[0]}.pdf`;
    const totalPages = doc.getNumberOfPages();
    console.log(`💾 PDFをダウンロード: ${filename} (総ページ数: ${totalPages})`);
    doc.save(filename);

    // ダウンロードが開始されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ ハイブリッドPDF出力完了:', filename);
  } catch (error) {
    console.error('❌ ハイブリッドPDF出力エラー:', error);
    throw error;
  }
}


 * ハイブリッドPDF出力ユーティリティ
 * - テキスト・表組: jsPDF + autoTable（選択可能）
 * - グラフ: html2canvasで画像として埋め込み
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface HybridPDFExportOptions {
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface PageData {
  title: string;
  subtitle?: string;
  charts?: HTMLElement[];
  tables?: TableData[];
  sections?: SectionData[];
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

export interface SectionData {
  title: string;
  content: string;
}

/**
 * ApexChartsのグラフを画像として取得
 */
async function captureChartAsImage(chartElement: HTMLElement): Promise<string> {
  try {
    console.log('📊 グラフをキャプチャ中...', {
      width: chartElement.offsetWidth,
      height: chartElement.offsetHeight
    });

    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    console.log('✅ グラフキャプチャ完了');
    return imgData;
  } catch (error) {
    console.error('❌ グラフキャプチャエラー:', error);
    throw error;
  }
}

/**
 * ページからデータを抽出
 */
export function extractPageData(pageType: string): PageData {
  console.log(`📄 ページデータ抽出開始: ${pageType}`);

  const pageTitles: Record<string, string> = {
    dashboard: 'ダッシュボード',
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

  const title = pageTitles[pageType] || pageType;

  // チャートを取得
  const charts: HTMLElement[] = [];
  const chartElements = document.querySelectorAll('.apexcharts-canvas');
  chartElements.forEach((el) => {
    charts.push(el.parentElement as HTMLElement);
  });

  // テーブルを取得
  const tables: TableData[] = [];
  const tableElements = document.querySelectorAll('table');
  tableElements.forEach((table) => {
    const headers: string[] = [];
    const rows: (string | number)[][] = [];

    // ヘッダーを取得
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach((th) => {
      headers.push(th.textContent?.trim() || '');
    });

    // データ行を取得
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach((tr) => {
      const row: (string | number)[] = [];
      const cells = tr.querySelectorAll('td');
      cells.forEach((td) => {
        const text = td.textContent?.trim() || '';
        // 数値かどうかを判定
        const num = parseFloat(text.replace(/,/g, ''));
        row.push(isNaN(num) ? text : text);
      });
      if (row.length > 0) {
        rows.push(row);
      }
    });

    if (headers.length > 0 && rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  console.log(`✅ ページデータ抽出完了:`, {
    title,
    chartsCount: charts.length,
    tablesCount: tables.length
  });

  return {
    title,
    charts,
    tables
  };
}

/**
 * 複数ページを1つのハイブリッドPDFに統合して出力
 */
export async function exportMultiplePagesToHybridPDF(
  pagePaths: string[],
  router: any,
  options?: HybridPDFExportOptions
): Promise<void> {
  try {
    console.log('📄 ハイブリッドPDF出力開始...', pagePaths);

    // PDFドキュメントを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // フォント設定（デフォルトフォントを使用）
    doc.setFont('helvetica', 'normal');

    let isFirstPage = true;
    const pageMargin = 15;
    const pageWidth = 210; // A4幅
    const pageHeight = 297; // A4高さ
    const contentWidth = pageWidth - (pageMargin * 2);
    let currentY = pageMargin;

    // 現在のページを保存
    const currentPath = window.location.pathname;
    console.log(`📍 現在のページを保存: ${currentPath}`);

    // 各ページを順番に処理
    for (let i = 0; i < pagePaths.length; i++) {
      const pagePath = pagePaths[i];
      const pageType = pagePath.split('/').filter(Boolean).pop() || 'summary';

      // 進捗更新
      if (options?.onProgress) {
        options.onProgress(i + 1, pagePaths.length, `${pageType}を処理中...`);
      }

      console.log(`📄 処理中 (${i + 1}/${pagePaths.length}): ${pageType} (${pagePath})`);

      // ページに移動
      console.log(`🔄 ページ遷移開始: ${pagePath}`);
      await router.push(pagePath);
      console.log(`✅ router.push完了`);

      // ページの読み込みを待つ
      console.log(`⏳ ページ読み込み待機中... (5秒)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`✅ 基本待機完了`);

      // チャートの読み込みを追加で待つ
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`✅ チャート読み込み待機完了`);

      // ページデータを抽出
      const pageData = extractPageData(pageType);

      // 新しいページを追加（最初のページ以外）
      if (!isFirstPage) {
        doc.addPage();
        currentY = pageMargin;
      }
      isFirstPage = false;

      // ページタイトルを追加
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(pageData.title, pageMargin, currentY);
      currentY += 10;

      // グラフを追加
      for (const chart of pageData.charts || []) {
        try {
          const imgData = await captureChartAsImage(chart);
          const chartWidth = contentWidth;
          const chartHeight = (chart.offsetHeight / chart.offsetWidth) * chartWidth;

          // ページをまたぐ場合は新しいページ
          if (currentY + chartHeight > pageHeight - pageMargin) {
            doc.addPage();
            currentY = pageMargin;
          }

          doc.addImage(imgData, 'PNG', pageMargin, currentY, chartWidth, chartHeight);
          currentY += chartHeight + 5;
        } catch (error) {
          console.error('グラフの追加でエラー:', error);
        }
      }

      // テーブルを追加
      for (const table of pageData.tables || []) {
        try {
          // ページをまたぐ可能性があるため、autoTableに任せる
          autoTable(doc, {
            head: [table.headers],
            body: table.rows,
            startY: currentY,
            margin: { left: pageMargin, right: pageMargin },
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 8,
              cellPadding: 2,
              halign: 'center',
              valign: 'middle',
            },
            headStyles: {
              fillColor: [59, 130, 246], // primary color
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center',
            },
            // 年月列は左寄せ
            columnStyles: {
              0: { halign: 'left' },
            },
          });

          // autoTableの終了位置を取得
          currentY = (doc as any).lastAutoTable.finalY + 10;
        } catch (error) {
          console.error('テーブルの追加でエラー:', error);
        }
      }

      console.log(`✅ ${pageType} を追加しました (PDFページ総数: ${doc.getNumberOfPages()})`);
    }

    // 元のページに戻る
    if (currentPath !== window.location.pathname) {
      console.log(`🔙 元のページに戻ります: ${currentPath}`);
      await router.push(currentPath);
    }

    // PDFをダウンロード
    const filename = `report_${new Date().toISOString().split('T')[0]}.pdf`;
    const totalPages = doc.getNumberOfPages();
    console.log(`💾 PDFをダウンロード: ${filename} (総ページ数: ${totalPages})`);
    doc.save(filename);

    // ダウンロードが開始されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ ハイブリッドPDF出力完了:', filename);
  } catch (error) {
    console.error('❌ ハイブリッドPDF出力エラー:', error);
    throw error;
  }
}

