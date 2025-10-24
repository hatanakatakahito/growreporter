import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

/**
 * Firebase Functionsインスタンス
 */
const functions = getFunctions(app);

/**
 * 手動でGA4/GSCデータを取得
 * @param {string} siteId - サイトID
 * @returns {Promise<Object>} 取得結果
 */
export async function manualFetchData(siteId) {
  try {
    const manualDataFetch = httpsCallable(functions, 'manualDataFetch');
    const result = await manualDataFetch({ siteId });
    
    console.log('[manualFetchData] 成功:', result.data);
    return result.data;
  } catch (error) {
    console.error('[manualFetchData] エラー:', error);
    throw error;
  }
}

/**
 * OAuthトークンを更新
 * @param {string} tokenId - トークンID
 * @param {'ga4'|'gsc'} type - トークンタイプ
 * @returns {Promise<Object>} 更新結果
 */
export async function refreshToken(tokenId, type) {
  try {
    const refreshTokens = httpsCallable(functions, 'refreshTokens');
    const result = await refreshTokens({ tokenId, type });
    
    console.log('[refreshToken] 成功:', result.data);
    return result.data;
  } catch (error) {
    console.error('[refreshToken] エラー:', error);
    throw error;
  }
}

