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
export async function getSheetsClient() {
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
      range: 'シート1!A:O', // A列からO列（業界・業種・サイトの目的追加）
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
      range: 'シート1!A:O', // A列からO列（業界・業種・サイトの目的追加）
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
    
    // 既存データを検索（C列:URL、G列:対象年月）
    const existingRowIndex = dataRows.findIndex(row => {
      return row[2] === siteUrl && row[6] === targetMonth; // C列とG列
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
      range: `シート1!A${actualRowIndex}:O${actualRowIndex}`,
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
 * データ行を生成
 * @param {object} siteInfo - サイト情報
 * @param {object} monthlyData - 月次データ
 * @returns {Array<any>} - スプレッドシートの行データ
 */
/**
 * スプレッドシートのセル用にスカラー値に正規化（配列はカンマ区切り文字列に）
 */
function toCellValue(value, defaultStr = 'その他') {
  if (value == null || value === '') return defaultStr;
  if (Array.isArray(value)) return value.length ? value.join(', ') : defaultStr;
  return typeof value === 'string' ? value : String(value);
}

// サイト種別の value → 日本語ラベル マッピング
const SITE_TYPE_LABELS = {
  corporate: 'コーポレートサイト',
  service: 'サービスサイト',
  product: '製品サイト',
  recruit: '採用サイト',
  ir: 'IRサイト',
  lp: 'LPサイト',
  ec: 'ECサイト',
  owned_media: 'オウンドメディアサイト',
  intranet: '社内ポータルサイト',
  global: 'グローバルサイト',
  business_system: '業務系システムサイト',
  member: '会員サイト',
  other: 'その他',
};

// サイトの目的の value → 日本語ラベル マッピング
const SITE_PURPOSE_LABELS = {
  branding: '認知・ブランディング',
  lead: 'リード・問い合わせ獲得',
  sales: '販売',
  recruit: '採用',
  media: '情報発信',
  ir: '投資家向け（IR）',
  internal: '社内・業務利用',
  member: '会員獲得',
  other: 'その他',
};

/**
 * value コード配列を日本語ラベル配列に変換してセル値にする
 */
function toLabeledCellValue(values, labelMap, defaultStr = 'その他') {
  if (!Array.isArray(values) || values.length === 0) return defaultStr;
  const labels = values.map(v => labelMap[v] || v);
  return labels.join(', ');
}

export function createRowData(siteInfo, monthlyData) {
  const {
    siteName,
    siteUrl,
    industry = [],
    siteType = [],
    sitePurpose = [],
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

  // 平均PV = ページビュー数 / 訪問者数
  const avgPageViews = sessions > 0 ? (pageViews / sessions).toFixed(2) : 0;

  // CVR = コンバージョン数 / 訪問者数 * 100
  const cvr = sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : 0;

  return [
    new Date().toISOString(), // A: 登録日時
    toCellValue(siteName, ''),      // B: サイト名
    toCellValue(siteUrl, ''),      // C: URL
    toCellValue(industry),         // D: 業界・業種（配列の場合は結合）
    toLabeledCellValue(siteType, SITE_TYPE_LABELS),     // E: サイト種別
    toLabeledCellValue(sitePurpose, SITE_PURPOSE_LABELS), // F: サイトの目的
    yearMonth,                // G: 対象年月
    sessions,                 // H: 訪問者数
    newUsers,                 // I: 新規ユーザー
    users,                    // J: ユーザー数
    pageViews,                // K: PV数
    avgPageViews,             // L: 平均PV
    (engagementRate * 100).toFixed(2), // M: ENG率（%）
    conversions,              // N: CV数
    cvr,                      // O: CVR（%）
  ];
}

