import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';

/**
 * OAuth 2.0 認可コードをアクセストークンとリフレッシュトークンに交換
 * 
 * @param {object} request.data
 * @param {string} request.data.code - OAuth 2.0 認可コード
 * @param {string} request.data.provider - プロバイダー ('ga4' または 'gsc')
 * @param {string} request.data.redirectUri - リダイレクトURI
 * @param {string} request.data.googleAccount - Googleアカウントのメールアドレス（オプション）
 * 
 * @returns {Promise<{tokenId: string, googleAccount: string}>}
 */
export async function exchangeOAuthCodeCallable(request) {
  const db = getFirestore();
  
  // 入力バリデーション
  const { code, provider, redirectUri, googleAccount } = request.data || {};
  
  if (!code || !provider || !redirectUri) {
    throw new HttpsError(
      'invalid-argument',
      'code, provider, redirectUri are required'
    );
  }
  
  if (!['ga4', 'gsc'].includes(provider)) {
    throw new HttpsError(
      'invalid-argument',
      'provider must be "ga4" or "gsc"'
    );
  }
  
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'ユーザー認証が必要です'
    );
  }
  
  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;
  
  logger.info(`[exchangeOAuthCode] Start: userId=${userId}, provider=${provider}`);
  
  try {
    // OAuth2クライアントの設定
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    // 認可コードをトークンに交換
    logger.info(`[exchangeOAuthCode] Exchanging authorization code...`);
    
    const { tokens } = await oauth2Client.getToken(code);
    
    logger.info(`[exchangeOAuthCode] Token exchange successful`);
    
    if (!tokens.access_token) {
      throw new Error('アクセストークンが取得できませんでした');
    }
    
    if (!tokens.refresh_token) {
      throw new Error('リフレッシュトークンが取得できませんでした。再度認証を行ってください。');
    }
    
    // トークンの有効期限を計算
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
    
    // Googleアカウント情報を取得（未提供の場合）
    let accountEmail = googleAccount;
    if (!accountEmail) {
      try {
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        accountEmail = userInfo.data.email;
        logger.info(`[exchangeOAuthCode] Google account retrieved: ${accountEmail}`);
      } catch (error) {
        logger.warn(`[exchangeOAuthCode] Failed to get user info:`, error);
        accountEmail = 'unknown';
      }
    }
    
    // プロバイダー名の設定
    const providerName = provider === 'ga4' 
      ? 'google_analytics' 
      : 'google_search_console';
    
    // Firestoreにトークンを保存
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      expires_at: expiresAt,
      scope: tokens.scope,
      provider: providerName,
      google_account: accountEmail,
      user_uid: userId,
      created_by: userEmail,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    
    logger.info(`[exchangeOAuthCode] Saving token to Firestore...`);
    
    const docRef = await db.collection('oauth_tokens').add(tokenData);
    
    logger.info(`[exchangeOAuthCode] Token saved successfully: tokenId=${docRef.id}`);
    
    return {
      success: true,
      tokenId: docRef.id,
      googleAccount: accountEmail,
      expiresAt: expiresAt.toISOString(),
    };
    
  } catch (error) {
    logger.error('[exchangeOAuthCode] Error:', error);
    
    // エラーログをFirestoreに保存
    try {
      await db.collection('error_logs').add({
        type: 'oauth_exchange_error',
        provider,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      logger.error('[exchangeOAuthCode] Error logging failed:', logError);
    }
    
    // HttpsErrorの場合はそのまま投げる
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // 特定のエラーメッセージをチェック
    if (error.message && error.message.includes('invalid_grant')) {
      throw new HttpsError(
        'invalid-argument',
        '認可コードが無効または期限切れです。もう一度認証を行ってください。'
      );
    }
    
    if (error.message && error.message.includes('redirect_uri_mismatch')) {
      throw new HttpsError(
        'invalid-argument',
        'リダイレクトURIが一致しません。Google Cloud Consoleの設定を確認してください。'
      );
    }
    
    // その他のエラーは internal エラーとして投げる
    throw new HttpsError(
      'internal',
      'トークンの取得に失敗しました: ' + error.message
    );
  }
}


