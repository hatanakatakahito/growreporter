import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * GSCのOAuthトークンを更新
 */
export async function refreshGSCToken(tokenId) {
  console.log(`[refreshGSCToken] トークンID: ${tokenId}`);

  try {
    const tokenDoc = await db.collection('oauth_tokens').doc(tokenId).get();

    if (!tokenDoc.exists) {
      throw new Error('Token not found');
    }

    const tokenData = tokenDoc.data();

    if (!tokenData.refresh_token) {
      throw new Error('Refresh token not found');
    }

    // Google OAuth2 Token Endpoint
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || tokenData.client_id,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || tokenData.client_secret,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
    }

    const newTokenData = await response.json();

    // 新しいトークンをFirestoreに保存
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + newTokenData.expires_in);

    await db.collection('oauth_tokens').doc(tokenId).update({
      access_token: newTokenData.access_token,
      expires_at: Timestamp.fromDate(expiresAt),
      updated_at: Timestamp.now(),
    });

    console.log(`[refreshGSCToken] トークン更新成功: ${tokenId}`);

    return {
      success: true,
      expiresAt,
    };
  } catch (error) {
    console.error(`[refreshGSCToken] エラー: ${tokenId}`, error);
    throw error;
  }
}

