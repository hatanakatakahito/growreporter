import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';

/**
 * トークンドキュメントを直接パスで取得（users/{userId}/oauth_tokens/{tokenId}）
 * collection group は documentId() に単純IDを渡すと「奇数セグメント」エラーになるため使用しない
 */
async function getTokenDoc(db, userId, tokenId) {
  const ref = db.collection('users').doc(userId).collection('oauth_tokens').doc(tokenId);
  const snap = await ref.get();
  return snap.exists ? snap : null;
}

/**
 * OAuthトークンを取得し、期限切れなら自動更新
 * @param {string} userId - トークン所有者のユーザーID（users/{userId}/oauth_tokens の userId）
 * @param {string} tokenId - トークンドキュメントID
 * @returns {Promise<{oauth2Client: OAuth2Client, tokenData: object}>}
 */
export async function getAndRefreshToken(userId, tokenId) {
  const db = getFirestore();
  const tokenDocSnap = await getTokenDoc(db, userId, tokenId);
  if (!tokenDocSnap) {
    throw new Error('OAuth token not found');
  }
  const tokenData = tokenDocSnap.data();
  
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

      const tokenRef = db.collection('users').doc(userId).collection('oauth_tokens').doc(tokenId);
      await tokenRef.update(updateData);

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
 * @param {string} userId - トークン所有者のユーザーID
 * @param {string} tokenId - トークンドキュメントID
 * @returns {Promise<boolean>}
 */
export async function isTokenValid(userId, tokenId) {
  try {
    const db = getFirestore();
    const tokenDocSnap = await getTokenDoc(db, userId, tokenId);
    if (!tokenDocSnap) {
      return false;
    }
    const tokenData = tokenDocSnap.data();
    const expiresAt = tokenData.expires_at?.toDate ? tokenData.expires_at.toDate() : new Date(tokenData.expires_at);
    const now = new Date();

    return expiresAt > now;
  } catch (error) {
    console.error('[TokenManager] Error checking token validity:', error);
    return false;
  }
}

