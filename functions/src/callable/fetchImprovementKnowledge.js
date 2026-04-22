import { HttpsError } from 'firebase-functions/v2/https';
import { getSheetsClient } from '../utils/sheetsManager.js';

/**
 * 新 siteRole → 旧 siteType キーへの逆引きマップ
 * fetchImprovementKnowledge が参照する別スプレッドシート（改善施策ナレッジ）は
 * 旧 siteType キーで分類されているため、V2 側から検索する際に旧キーへ変換して使う。
 */
const SITE_ROLE_TO_LEGACY_TYPE = {
  corporate: 'corporate',
  service_product: 'service',
  ec: 'ec',
  owned_media: 'owned_media',
  recruit: 'recruit',
  closed: 'member',
  other: 'other',
};

/**
 * GrowGroupの改善施策ナレッジをスプレッドシートから取得
 * @param {object} request - リクエストオブジェクト
 * @param {string} [request.data.siteRole] - タクソノミー V2 のサイト役割（優先）
 * @param {string} [request.data.siteType] - V1 互換: 旧サイト種別キー
 * @returns {Promise<object>} - 改善施策データ
 */
export async function fetchImprovementKnowledgeCallable(request) {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteRole = '', siteType = '' } = request.data || {};

  // V2 の siteRole が指定されていれば旧 siteType キーに変換して使う。
  // 未指定の場合は V1 の siteType をそのまま使用（後方互換）。
  const effectiveSiteType = siteRole
    ? SITE_ROLE_TO_LEGACY_TYPE[siteRole] || ''
    : siteType;

  console.log('[fetchImprovementKnowledge] Start:', { siteRole, siteType, effectiveSiteType });

  try {
    const sheets = await getSheetsClient();

    // スプレッドシートID（GrowGroupの改善施策ナレッジ）
    const spreadsheetId = '1_WgELTNvnfZhPhnjrIlM77wZ2pyRKJw6GnFdhxphcho';
    const range = 'シート1!A2:D'; // ヘッダー行を除く

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    console.log('[fetchImprovementKnowledge] Retrieved rows:', rows.length);

    const knowledgeData = rows
      .filter((row) => row.length >= 4)
      .map((row) => ({
        siteType: row[0] || '',
        category: row[1] || '',
        title: row[2] || '',
        description: row[3] || '',
      }))
      .filter((item) => {
        if (effectiveSiteType && effectiveSiteType.trim() !== '') {
          return item.siteType.toLowerCase() === effectiveSiteType.toLowerCase();
        }
        return true; // 指定なしなら全件
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
