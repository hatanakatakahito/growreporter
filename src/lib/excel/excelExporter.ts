/**
 * エクセル出力ユーティリティ
 * 
 * 選択されたページのデータをエクセル形式で出力します
 */

export async function exportToExcel(pagePaths: string[]): Promise<void> {
  try {
    console.log('📊 エクセル出力を開始:', pagePaths);

    // 動的にライブラリをインポート
    const XLSX = await import('xlsx');

    // ワークブックを作成
    const workbook = XLSX.utils.book_new();

    // 各ページのデータを取得してシートを追加
    for (const pagePath of pagePaths) {
      const sheetName = getSheetName(pagePath);
      console.log(`📄 シート作成中: ${sheetName}`);

      // ページのデータを取得
      const data = await getPageData(pagePath);

      if (data && data.length > 0) {
        // データからワークシートを作成
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
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
 * 
 * 注意: この関数は現在の実装では空のデータを返します。
 * 実際の実装では、各ページのAPIエンドポイントからデータを取得する必要があります。
 */
async function getPageData(pagePath: string): Promise<any[]> {
  // TODO: 各ページのAPIエンドポイントからデータを取得
  // 現在はプレースホルダーデータを返す
  
  console.log(`⚠️ ${pagePath} のデータ取得は未実装です`);
  
  // プレースホルダーデータ
  return [
    {
      'ページ': pagePath,
      '状態': 'データ取得未実装',
      '備考': 'APIエンドポイントからデータを取得する実装が必要です'
    }
  ];
}

