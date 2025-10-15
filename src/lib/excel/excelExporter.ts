/**
 * エクセル出力ユーティリティ
 * 
 * 選択されたページのデータをエクセル形式で出力します
 */

export async function exportToExcel(
  pagePaths: string[], 
  router?: any,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<void> {
  try {
    console.log('📊 エクセル出力を開始:', pagePaths);

    // 動的にライブラリをインポート
    const XLSX = await import('xlsx');

    // ワークブックを作成
    const workbook = XLSX.utils.book_new();

    // 現在のページのパス
    const currentPath = window.location.pathname;

    // 各ページのデータを取得してシートを追加
    for (let i = 0; i < pagePaths.length; i++) {
      const pagePath = pagePaths[i];
      const sheetName = getSheetName(pagePath);
      console.log(`📄 [${i + 1}/${pagePaths.length}] シート作成中: ${sheetName}`);

      // プログレス更新
      if (onProgress) {
        onProgress(i + 1, pagePaths.length, `${sheetName} のデータを取得中...`);
      }

      // ページに遷移（現在のページでない場合）
      if (pagePath !== currentPath && router) {
        console.log(`🔄 ${pagePath} に遷移中...`);
        router.push(pagePath);
        
        // ページの読み込みを待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ページが完全に読み込まれるまで待つ
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 500);
          } else {
            window.addEventListener('load', () => {
              setTimeout(resolve, 500);
            });
          }
        });
      }

      // ページのデータを取得
      const data = await getPageData(pagePath);

      if (data && data.length > 0) {
        // データからワークシートを作成
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        console.log(`✅ ${sheetName}: ${data.length}行のデータを追加`);
      } else {
        console.log(`⚠️ ${sheetName}: データがありません`);
      }
    }

    // ファイル生成中のメッセージ
    if (onProgress) {
      onProgress(pagePaths.length, pagePaths.length, 'Excelファイルを生成中...');
    }

    // 元のページに戻る
    if (router && currentPath !== pagePaths[pagePaths.length - 1]) {
      console.log(`🔄 元のページ ${currentPath} に戻ります...`);
      router.push(currentPath);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // ファイル名を生成（日時付き）
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const fileName = `GrowReporter_${dateStr}_${timeStr}.xlsx`;

    // ファイルをダウンロード
    XLSX.writeFile(workbook, fileName);

    console.log('✅ エクセル出力完了:', fileName);
  } catch (error) {
    console.error('❌ エクセル出力エラー:', error);
    throw error;
  }
}

/**
 * ページパスからシート名を生成
 */
function getSheetName(pagePath: string): string {
  const sheetNames: Record<string, string> = {
    '/summary': '全体サマリー',
    '/users': 'ユーザー',
    '/acquisition': '集客チャネル',
    '/acquisition/organic-keywords': '流入キーワード元',
    '/acquisition/referrals': '被リンク元',
    '/engagement': 'ページ別エンゲージメント',
    '/engagement/landing-pages': 'ランディングページ',
    '/engagement/file-downloads': 'ファイルダウンロード',
    '/engagement/external-links': '外部リンククリック',
    '/conversion-events': 'コンバージョン一覧',
    '/conversion-events/funnel': '逆算フロー',
  };

  return sheetNames[pagePath] || pagePath.replace(/\//g, '_');
}

/**
 * ページのデータを取得
 */
async function getPageData(pagePath: string): Promise<any[]> {
  try {
    console.log(`📊 ${pagePath} のデータを取得中...`);

    // 現在表示されているページのデータをDOMから取得
    const data = await extractDataFromCurrentPage(pagePath);
    
    if (data && data.length > 0) {
      console.log(`✅ ${pagePath} のデータ取得成功: ${data.length}行`);
      return data;
    }

    // データが取得できない場合は空の配列を返す
    console.log(`⚠️ ${pagePath} のデータが見つかりませんでした`);
    return [];
  } catch (error) {
    console.error(`❌ ${pagePath} のデータ取得エラー:`, error);
    return [];
  }
}

/**
 * 現在表示されているページからデータを抽出
 */
async function extractDataFromCurrentPage(pagePath: string): Promise<any[]> {
  // テーブルを探す
  const tables = document.querySelectorAll('table');
  
  if (tables.length === 0) {
    console.log('テーブルが見つかりません');
    return [];
  }

  const data: any[] = [];

  // 最初のテーブルからデータを抽出
  const table = tables[0];
  const headers: string[] = [];
  
  // ヘッダーを取得
  const headerRows = table.querySelectorAll('thead tr');
  if (headerRows.length > 0) {
    const headerCells = headerRows[headerRows.length - 1].querySelectorAll('th');
    headerCells.forEach(cell => {
      const text = cell.textContent?.trim() || '';
      if (text) {
        headers.push(text);
      }
    });
  }

  // データ行を取得
  const bodyRows = table.querySelectorAll('tbody tr');
  bodyRows.forEach(row => {
    // 合計行やスタイルで非表示の行はスキップ
    const classList = row.className || '';
    if (classList.includes('total-row') || classList.includes('hidden')) {
      return;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;

    const rowData: any = {};
    cells.forEach((cell, index) => {
      const header = headers[index] || `列${index + 1}`;
      let value = cell.textContent?.trim() || '';
      
      // 数値に変換できる場合は変換
      const numValue = parseFloat(value.replace(/,/g, ''));
      if (!isNaN(numValue) && value.replace(/,/g, '') !== '') {
        rowData[header] = numValue;
      } else {
        rowData[header] = value;
      }
    });

    if (Object.keys(rowData).length > 0) {
      data.push(rowData);
    }
  });

  return data;
}

