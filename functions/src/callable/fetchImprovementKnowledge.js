import { HttpsError } from 'firebase-functions/v2/https';
import { getSheetsClient } from '../utils/sheetsManager.js';

/**
 * GrowGroupの改善施策ナレッジをスプレッドシートから取得
 * @param {object} request - リクエストオブジェクト
 * @returns {Promise<object>} - 改善施策データ
 */
export async function fetchImprovementKnowledgeCallable(request) {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'ユーザー認証が必要です'
    );
  }

  const { siteType = '' } = request.data || {};

  console.log('[fetchImprovementKnowledge] Start:', { siteType });

  try {
    // Google Sheets APIクライアントを取得
    const sheets = await getSheetsClient();

    // スプレッドシートID（GrowGroupの改善施策ナレッジ）
    const spreadsheetId = '1_WgELTNvnfZhPhnjrIlM77wZ2pyRKJw6GnFdhxphcho';
    const range = 'シート1!A2:D'; // ヘッダー行を除く

    // スプレッドシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    console.log('[fetchImprovementKnowledge] Retrieved rows:', rows.length);

    // データを整形
    const knowledgeData = rows
      .filter(row => row.length >= 4) // 4列すべてのデータがある行のみ
      .map(row => ({
        siteType: row[0] || '',
        category: row[1] || '',
        title: row[2] || '',
        description: row[3] || '',
      }))
      .filter(item => {
        // siteTypeが指定されている場合はフィルタリング
        if (siteType && siteType.trim() !== '') {
          return item.siteType.toLowerCase() === siteType.toLowerCase();
        }
        return true; // siteType未指定の場合は全件返す
      });

    console.log('[fetchImprovementKnowledge] Filtered data:', knowledgeData.length, 'items');

    return {
      success: true,
      data: knowledgeData,
      count: knowledgeData.length,
    };
  } catch (error) {
    console.error('[fetchImprovementKnowledge] Error:', error);
    throw new HttpsError(
      'internal',
      `改善施策ナレッジの取得に失敗しました: ${error.message}`
    );
  }
}

