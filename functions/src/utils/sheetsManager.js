import { google } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// サービスアカウントキーのパス
const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, '../../growgroupreporter-007e0991bce2.json');

// スプレッドシートID
const SPREADSHEET_ID = '1Gn9XIvyEwKuYBIgckj_wDA4cTcOZXu03ibwuIvKutIY';

// シート名
const SHEET_NAME = 'ベンチマークデータ';

/**
 * Google Sheets APIクライアントを取得
 */
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  return sheets;
}

/**
 * スプレッドシートにデータを追加
 * @param {Object} data - 追加するデータ
 * @param {string} data.siteId - サイトID
 * @param {string} data.siteName - サイト名
 * @param {string} data.siteType - サイト種別
 * @param {string} data.industry - 業種
 * @param {string} data.yearMonth - 年月（yyyy-MM形式）
 * @param {number} data.sessions - セッション数
 * @param {number} data.newUsers - 新規ユーザー数
 * @param {number} data.users - ユーザー数
 * @param {number} data.pageViews - ページビュー数
 * @param {number} data.avgPageViews - 平均ページビュー（PV/セッション）
 * @param {number} data.engagementRate - エンゲージメント率（%）
 * @param {number} data.conversions - コンバージョン数
 * @param {number} data.conversionRate - コンバージョン率（%）
 */
export async function appendBenchmarkData(data) {
  try {
    const sheets = await getSheetsClient();

    // データを配列形式に変換
    const values = [
      [
        new Date().toISOString(), // タイムスタンプ
        data.siteId,
        data.siteName,
        data.siteType || '',
        data.industry || '',
        data.yearMonth,
        data.sessions || 0,
        data.newUsers || 0,
        data.users || 0,
        data.pageViews || 0,
        data.avgPageViews || 0,
        data.engagementRate || 0,
        data.conversions || 0,
        data.conversionRate || 0,
      ]
    ];

    // スプレッドシートに追加
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[sheetsManager] データ追加成功: ${data.siteName} (${data.yearMonth})`);
    return response.data;
  } catch (error) {
    console.error('[sheetsManager] データ追加エラー:', error);
    throw error;
  }
}

/**
 * 複数のデータを一括追加
 * @param {Array<Object>} dataArray - データの配列
 */
export async function appendBenchmarkDataBatch(dataArray) {
  try {
    const sheets = await getSheetsClient();

    // データを配列形式に変換
    const values = dataArray.map(data => [
      new Date().toISOString(), // タイムスタンプ
      data.siteId,
      data.siteName,
      data.siteType || '',
      data.industry || '',
      data.yearMonth,
      data.sessions || 0,
      data.newUsers || 0,
      data.users || 0,
      data.pageViews || 0,
      data.avgPageViews || 0,
      data.engagementRate || 0,
      data.conversions || 0,
      data.conversionRate || 0,
    ]);

    // スプレッドシートに追加
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    console.log(`[sheetsManager] 一括データ追加成功: ${dataArray.length}件`);
    return response.data;
  } catch (error) {
    console.error('[sheetsManager] 一括データ追加エラー:', error);
    throw error;
  }
}

/**
 * 特定のサイト・年月のデータが既に存在するかチェック
 * @param {string} siteId - サイトID
 * @param {string} yearMonth - 年月（yyyy-MM形式）
 * @returns {boolean} - 存在する場合true
 */
export async function checkDataExists(siteId, yearMonth) {
  try {
    const sheets = await getSheetsClient();

    // データを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B:F`, // サイトID、サイト名、サイト種別、業種、年月
    });

    const rows = response.data.values || [];
    
    // ヘッダー行を除外してチェック
    const dataRows = rows.slice(1);
    const exists = dataRows.some(row => row[0] === siteId && row[4] === yearMonth);

    return exists;
  } catch (error) {
    console.error('[sheetsManager] データ存在チェックエラー:', error);
    return false; // エラー時は存在しないとみなす
  }
}

