import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';

/**
 * OAuthトークンを取得し、期限切れなら自動更新
 * @param {string} tokenId - トークンドキュメントID
 * @returns {Promise<{oauth2Client: OAuth2Client, tokenData: object}>}
 */
export async function getAndRefreshToken(tokenId) {
  const db = getFirestore();
  const tokenDoc = await db.collection('oauth_tokens').doc(tokenId).get();
  
  if (!tokenDoc.exists) {
    throw new Error('OAuth token not found');
  }

  const tokenData = tokenDoc.data();
  
  // OAuth2クライアントの作成
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  // トークンの有効期限チェック
  const expiresAt = tokenData.expires_at?.toDate ? tokenData.expires_at.toDate() : new Date(tokenData.expires_at);
  const now = new Date();

  // 期限切れまたは5分以内に期限切れの場合は更新
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  if (expiresAt <= fiveMinutesFromNow) {
    console.log(`[TokenManager] Token expired or expiring soon, refreshing... (tokenId: ${tokenId})`);
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // 更新されたトークンを保存
      const updateData = {
        access_token: credentials.access_token,
        expires_at: new Date(credentials.expiry_date),
        updated_at: FieldValue.serverTimestamp(),
      };

      // 新しいリフレッシュトークンが返された場合は更新
      if (credentials.refresh_token) {
        updateData.refresh_token = credentials.refresh_token;
        console.log(`[TokenManager] New refresh token received and will be updated (tokenId: ${tokenId})`);
      }

      await db.collection('oauth_tokens').doc(tokenId).update(updateData);

      oauth2Client.setCredentials(credentials);
      
      console.log(`[TokenManager] Token refreshed successfully (tokenId: ${tokenId})`);
    } catch (error) {
      console.error(`[TokenManager] Token refresh failed (tokenId: ${tokenId}):`, error);
      
      // invalid_grantの場合は、ユーザーに再認証を促す
      if (error.message && error.message.includes('invalid_grant')) {
        console.error(`[TokenManager] Refresh token is invalid, requires re-authentication (tokenId: ${tokenId})`);
        throw new Error('アクセストークンの有効期限が切れています。再接続してください。');
      }
      
      throw new Error('Failed to refresh OAuth token: ' + error.message);
    }
  }

  return { oauth2Client, tokenData };
}

/**
 * トークンの有効性をチェック
 * @param {string} tokenId - トークンドキュメントID
 * @returns {Promise<boolean>}
 */
export async function isTokenValid(tokenId) {
  try {
    const db = getFirestore();
    const tokenDoc = await db.collection('oauth_tokens').doc(tokenId).get();
    
    if (!tokenDoc.exists) {
      return false;
    }

    const tokenData = tokenDoc.data();
    const expiresAt = tokenData.expires_at?.toDate ? tokenData.expires_at.toDate() : new Date(tokenData.expires_at);
    const now = new Date();

    return expiresAt > now;
  } catch (error) {
    console.error('[TokenManager] Error checking token validity:', error);
    return false;
  }
}

