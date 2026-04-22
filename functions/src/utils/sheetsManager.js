import { google } from 'googleapis';
import {
  BUSINESS_MODEL_LABELS,
  INDUSTRY_MAJOR_LABELS,
  SITE_ROLE_LABELS,
} from '../constants/siteOptionsV2.js';

/**
 * Google Sheets Manager（タクソノミー V2 対応）
 * Firebase Admin SDKの認証情報を使用してGoogle Sheets APIを操作
 *
 * 列構成（V2, A:P 16列）:
 *   A: 登録日時
 *   B: サイト名
 *   C: URL
 *   D: ビジネスモデル
 *   E: 業種大分類
 *   F: 業種小分類
 *   G: サイト役割
 *   H: 対象年月
 *   I: セッション数
 *   J: 新規ユーザー
 *   K: ユーザー数
 *   L: ページビュー
 *   M: 1セッションあたりPV
 *   N: エンゲージメント率
 *   O: コンバージョン数
 *   P: コンバージョン率
 *
 * 運用: 既存スプレッドシートのヘッダー行はデプロイ前に手動で書き換えること。
 *       手順は docs/taxonomy-v2-migration.md を参照。
 */

// スプレッドシートID
const SPREADSHEET_ID = '1Gn9XIvyEwKuYBIgckj_wDA4cTcOZXu03ibwuIvKutIY';

// 範囲定義（1 箇所で管理）
const RANGE = 'シート1!A:P';

// 列番号（0-indexed）
const COL_URL = 2; // C列
const COL_TARGET_MONTH = 7; // H列（V2 で 1 列シフト）

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
      range: RANGE,
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
      range: RANGE,
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

    // 既存データを検索（C列:URL, H列:対象年月）
    const existingRowIndex = dataRows.findIndex((row) => {
      return row[COL_URL] === siteUrl && row[COL_TARGET_MONTH] === targetMonth;
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
      range: `シート1!A${actualRowIndex}:P${actualRowIndex}`,
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
    const siteUrl = row[COL_URL];
    const targetMonth = row[COL_TARGET_MONTH];

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
 * スプレッドシートのセル用にスカラー値に正規化
 * （V2: siteInfo は単一文字列フィールドを渡す前提）
 */
function toCellValue(value, defaultStr = '') {
  if (value == null || value === '') return defaultStr;
  if (Array.isArray(value)) return value.length ? value.join(', ') : defaultStr;
  return typeof value === 'string' ? value : String(value);
}

/**
 * value を labelMap で日本語ラベルに変換
 */
function toLabeledCellValue(value, labelMap, defaultStr = '未設定') {
  if (!value) return defaultStr;
  return labelMap[value] || value;
}

/**
 * データ行を生成（タクソノミー V2 スキーマ）
 *
 * @param {object} siteInfo - サイト情報（V2 単一文字列フィールド）
 * @param {string} siteInfo.siteName
 * @param {string} siteInfo.siteUrl
 * @param {string} [siteInfo.businessModel]
 * @param {string} [siteInfo.industryMajor]
 * @param {string} [siteInfo.industryMinor]
 * @param {string} [siteInfo.siteRole]
 * @param {object} monthlyData - 月次データ
 * @returns {Array<any>} - スプレッドシートの行データ（A:P, 16列）
 */
export function createRowData(siteInfo, monthlyData) {
  const {
    siteName,
    siteUrl,
    businessModel = '',
    industryMajor = '',
    industryMinor = '',
    siteRole = '',
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

  // 1セッションあたりPV = ページビュー数 / セッション数
  const avgPageViews = sessions > 0 ? (pageViews / sessions).toFixed(2) : 0;

  // コンバージョン率 = コンバージョン数 / セッション数 * 100
  const cvr = sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : 0;

  return [
    new Date().toISOString(), // A: 登録日時
    toCellValue(siteName, ''), // B: サイト名
    toCellValue(siteUrl, ''), // C: URL
    toLabeledCellValue(businessModel, BUSINESS_MODEL_LABELS), // D: ビジネスモデル
    toLabeledCellValue(industryMajor, INDUSTRY_MAJOR_LABELS), // E: 業種大分類
    toCellValue(industryMinor, '未設定'), // F: 業種小分類
    toLabeledCellValue(siteRole, SITE_ROLE_LABELS), // G: サイト役割
    yearMonth, // H: 対象年月
    sessions, // I: セッション数
    newUsers, // J: 新規ユーザー
    users, // K: ユーザー数
    pageViews, // L: ページビュー
    avgPageViews, // M: 1セッションあたりPV
    (engagementRate * 100).toFixed(2), // N: エンゲージメント率（%）
    conversions, // O: コンバージョン数
    cvr, // P: コンバージョン率（%）
  ];
}
