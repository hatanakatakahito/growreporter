import { logger } from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';
import { appendRows, getAllRows } from '../utils/sheetsManager.js';

/**
 * Google Sheets API接続テスト Callable Function
 * スプレッドシートへの読み書きが正しく動作するかテスト
 */
export async function testSheetsConnectionCallable(request) {
  const userId = request.auth?.uid;

  if (!userId) {
    logger.warn('[testSheetsConnection] 認証されていないリクエスト');
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }

  logger.info('[testSheetsConnection] テスト開始');

  try {
    // 1. データ読み取りテスト
    logger.info('[testSheetsConnection] データ読み取りテスト開始');
    const existingData = await getAllRows();
    logger.info('[testSheetsConnection] データ読み取り成功:', {
      rowCount: existingData.length,
    });

    // 2. データ書き込みテスト
    logger.info('[testSheetsConnection] データ書き込みテスト開始');
    const testRow = [
      new Date().toISOString(),
      'テストサイト',
      'https://test.example.com',
      'テスト',
      'テスト',
      '2025-01',
      100, // セッション数
      50,  // 新規ユーザー
      80,  // ユーザー数
      200, // PV数
      2.0, // 平均PV
      50.0, // ENG率
      10,   // CV数
      10.0, // CVR
    ];
    
    await appendRows([testRow]);
    logger.info('[testSheetsConnection] データ書き込み成功');

    return {
      success: true,
      message: 'Google Sheets API接続テスト成功',
      existingRowCount: existingData.length,
    };
  } catch (error) {
    logger.error('[testSheetsConnection] エラー:', {
      message: error.message,
      stack: error.stack,
    });
    throw new HttpsError('internal', `テスト失敗: ${error.message}`);
  }
}

