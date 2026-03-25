import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * AI改善案を生成して改善案一覧に追加する
 * サーバー側で一括処理（データ取得→AI生成→重複排除→保存）
 *
 * @param {string} siteId - サイトID
 * @param {string} currentUserEmail - 現在のユーザーのメールアドレス（未使用、後方互換）
 * @param {function} onStatusChange - ステータス変更時のコールバック
 * @param {{ improvementFocus?: string, userNote?: string, forceRegenerate?: boolean }} [options]
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
export async function generateAndAddImprovements(siteId, currentUserEmail, onStatusChange, options = {}) {
  if (onStatusChange) onStatusChange('loading');

  try {
    const generateImprovements = httpsCallable(functions, 'generateImprovements');
    const result = await generateImprovements({
      siteId,
      improvementFocus: options.improvementFocus || 'balance',
      userNote: options.userNote || '',
      forceRegenerate: options.forceRegenerate || false,
    });

    const count = result.data.count || 0;
    if (onStatusChange) onStatusChange('success', count);
    return { success: true, count };
  } catch (error) {
    const message = error.message || '改善案の生成に失敗しました';
    if (onStatusChange) onStatusChange('error', 0, message);
    return { success: false, count: 0, error: message };
  }
}
