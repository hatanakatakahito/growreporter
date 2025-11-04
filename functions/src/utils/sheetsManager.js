import { google } from 'googleapis';

/**
 * Google Sheets Manager
 * Firebase Admin SDKの認証情報を使用してGoogle Sheets APIを操作
 */

// スプレッドシートID
const SPREADSHEET_ID = '1Gn9XIvyEwKuYBIgckj_wDA4cTcOZXu03ibwuIvKutIY';

/**
 * Google Sheets APIクライアントを初期化
 * Firebase Admin SDKのデフォルト認証情報を使用
 */
function getAuthClient() {
  return new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Google Sheets APIクライアントを取得
 */
async function getSheetsClient() {
  const auth = getAuthClient();
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * スプレッドシートにデータを追記
 * @param {Array<Array<any>>} rows - 追記する行データの配列
 * @returns {Promise<object>} - API レスポンス
 */
export async function appendRows(rows) {
  try {
    const sheets = await getSheetsClient();
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'シート1!A:N', // A列からN列まで
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows,
      },
    });

    console.log('[SheetsManager] データ追記成功:', {
      updatedRows: response.data.updates.updatedRows,
      updatedRange: response.data.updates.updatedRange,
    });

    return response.data;
  } catch (error) {
    console.error('[SheetsManager] データ追記エラー:', error);
    throw new Error(`スプレッドシートへのデータ追記に失敗しました: ${error.message}`);
  }
}

/**
 * スプレッドシートの全データを取得
 * @returns {Promise<Array<Array<any>>>} - スプレッドシートのデータ
 */
export async function getAllRows() {
  try {
    const sheets = await getSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'シート1!A:N', // A列からN列まで
    });

    return response.data.values || [];
  } catch (error) {
    console.error('[SheetsManager] データ取得エラー:', error);
    throw new Error(`スプレッドシートからのデータ取得に失敗しました: ${error.message}`);
  }
}

/**
 * 既存データの重複チェックと更新
 * @param {string} siteUrl - サイトURL
 * @param {string} targetMonth - 対象年月（例：2025-10）
 * @param {Array<any>} newRowData - 新しい行データ
 * @returns {Promise<boolean>} - 更新が必要な場合true、既存データがない場合false
 */
export async function updateRowIfExists(siteUrl, targetMonth, newRowData) {
  try {
    const allRows = await getAllRows();
    
    // ヘッダー行をスキップ（1行目）
    const dataRows = allRows.slice(1);
    
    // 既存データを検索（C列:URL、F列:対象年月）
    const existingRowIndex = dataRows.findIndex(row => {
      return row[2] === siteUrl && row[5] === targetMonth; // C列とF列
    });

    if (existingRowIndex === -1) {
      // 既存データがない場合はfalseを返す（追記が必要）
      return false;
    }

    // 既存データがある場合は更新
    const sheets = await getSheetsClient();
    const actualRowIndex = existingRowIndex + 2; // ヘッダー行 + 0-indexedを1-indexedに変換
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `シート1!A${actualRowIndex}:N${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRowData],
      },
    });

    console.log('[SheetsManager] データ更新成功:', {
      row: actualRowIndex,
      siteUrl,
      targetMonth,
    });

    return true;
  } catch (error) {
    console.error('[SheetsManager] データ更新エラー:', error);
    throw new Error(`スプレッドシートのデータ更新に失敗しました: ${error.message}`);
  }
}

/**
 * 複数行のデータを追記（重複チェック付き）
 * @param {Array<Array<any>>} rows - 追記する行データの配列
 * @returns {Promise<{inserted: number, updated: number}>} - 追加・更新された行数
 */
export async function appendOrUpdateRows(rows) {
  let insertedCount = 0;
  let updatedCount = 0;
  const rowsToInsert = [];

  for (const row of rows) {
    const siteUrl = row[2]; // C列: URL
    const targetMonth = row[5]; // F列: 対象年月
    
    const wasUpdated = await updateRowIfExists(siteUrl, targetMonth, row);
    
    if (wasUpdated) {
      updatedCount++;
    } else {
      rowsToInsert.push(row);
    }
  }

  // 新規データを一括追記
  if (rowsToInsert.length > 0) {
    await appendRows(rowsToInsert);
    insertedCount = rowsToInsert.length;
  }

  console.log('[SheetsManager] 処理完了:', {
    inserted: insertedCount,
    updated: updatedCount,
    total: rows.length,
  });

  return { inserted: insertedCount, updated: updatedCount };
}

/**
 * サイト種別ごとのベンチマークデータを取得
 * @param {string} siteType - サイト種別（例：'コーポレートサイト', 'service'など）
 * @returns {Promise<object>} - ベンチマークデータ（平均値、最大値など）
 */
export async function getBenchmarkData(siteType) {
  try {
    const allRows = await getAllRows();
    
    // ヘッダー行をスキップ
    const dataRows = allRows.slice(1);
    
    // サイト種別でフィルタリング
    const filteredRows = dataRows.filter(row => {
      const rowSiteType = row[3]; // D列: サイト種別
      return rowSiteType === siteType;
    });

    if (filteredRows.length === 0) {
      console.log(`[getBenchmarkData] No data found for siteType: ${siteType}`);
      return null;
    }

    // 各指標の平均値を計算
    const sessions = filteredRows.map(row => parseFloat(row[6]) || 0);
    const newUsers = filteredRows.map(row => parseFloat(row[7]) || 0);
    const users = filteredRows.map(row => parseFloat(row[8]) || 0);
    const pageViews = filteredRows.map(row => parseFloat(row[9]) || 0);
    const avgPageViews = filteredRows.map(row => parseFloat(row[10]) || 0);
    const engagementRate = filteredRows.map(row => parseFloat(row[11]) || 0);
    const conversions = filteredRows.map(row => parseFloat(row[12]) || 0);
    const cvr = filteredRows.map(row => parseFloat(row[13]) || 0);

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const max = (arr) => Math.max(...arr);
    const min = (arr) => Math.min(...arr);

    const benchmark = {
      siteType,
      sampleSize: filteredRows.length,
      sessions: {
        avg: Math.round(avg(sessions)),
        max: Math.round(max(sessions)),
        min: Math.round(min(sessions)),
      },
      newUsers: {
        avg: Math.round(avg(newUsers)),
        max: Math.round(max(newUsers)),
        min: Math.round(min(newUsers)),
      },
      users: {
        avg: Math.round(avg(users)),
        max: Math.round(max(users)),
        min: Math.round(min(users)),
      },
      pageViews: {
        avg: Math.round(avg(pageViews)),
        max: Math.round(max(pageViews)),
        min: Math.round(min(pageViews)),
      },
      avgPageViews: {
        avg: parseFloat(avg(avgPageViews).toFixed(2)),
        max: parseFloat(max(avgPageViews).toFixed(2)),
        min: parseFloat(min(avgPageViews).toFixed(2)),
      },
      engagementRate: {
        avg: parseFloat(avg(engagementRate).toFixed(2)),
        max: parseFloat(max(engagementRate).toFixed(2)),
        min: parseFloat(min(engagementRate).toFixed(2)),
      },
      conversions: {
        avg: Math.round(avg(conversions)),
        max: Math.round(max(conversions)),
        min: Math.round(min(conversions)),
      },
      cvr: {
        avg: parseFloat(avg(cvr).toFixed(2)),
        max: parseFloat(max(cvr).toFixed(2)),
        min: parseFloat(min(cvr).toFixed(2)),
      },
    };

    console.log(`[getBenchmarkData] Benchmark calculated for ${siteType}:`, {
      sampleSize: benchmark.sampleSize,
      avgEngagementRate: benchmark.engagementRate.avg,
      avgCVR: benchmark.cvr.avg,
    });

    return benchmark;
  } catch (error) {
    console.error('[getBenchmarkData] Error:', error);
    return null;
  }
}

/**
 * データ行を生成
 * @param {object} siteInfo - サイト情報
 * @param {object} monthlyData - 月次データ
 * @returns {Array<any>} - スプレッドシートの行データ
 */
export function createRowData(siteInfo, monthlyData) {
  const {
    siteName,
    siteUrl,
    siteType = 'その他',
    businessType = 'その他',
  } = siteInfo;

  const {
    yearMonth,
    sessions = 0,
    newUsers = 0,
    users = 0,
    pageViews = 0,
    engagementRate = 0,
    conversions = 0,
  } = monthlyData;

  // 平均PV = ページビュー数 / セッション数
  const avgPageViews = sessions > 0 ? (pageViews / sessions).toFixed(2) : 0;

  // CVR = コンバージョン数 / セッション数 * 100
  const cvr = sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : 0;

  return [
    new Date().toISOString(), // A: 登録日時
    siteName,                 // B: サイト名
    siteUrl,                  // C: URL
    siteType,                 // D: サイト種別
    businessType,             // E: ビジネス形態
    yearMonth,                // F: 対象年月
    sessions,                 // G: セッション数
    newUsers,                 // H: 新規ユーザー
    users,                    // I: ユーザー数
    pageViews,                // J: PV数
    avgPageViews,             // K: 平均PV
    (engagementRate * 100).toFixed(2), // L: ENG率（%）
    conversions,              // M: CV数
    cvr,                      // N: CVR（%）
  ];
}

