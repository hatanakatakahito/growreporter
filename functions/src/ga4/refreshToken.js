import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * GA4のOAuthトークンを更新
 */
export async function refreshGA4Token(tokenId) {
  console.log(`[refreshGA4Token] トークンID: ${tokenId}`);

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

    console.log(`[refreshGA4Token] トークン更新成功: ${tokenId}`);

    return {
      success: true,
      expiresAt,
    };
  } catch (error) {
    console.error(`[refreshGA4Token] エラー: ${tokenId}`, error);
    throw error;
  }
}

