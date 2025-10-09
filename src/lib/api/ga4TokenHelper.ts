/**
 * GA4トークンヘルパー
 * OAuth トークンの取得・復号化・リフレッシュを一元管理
 */

import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';
import { decryptTokens, isEncrypted } from '@/lib/security/encryption';

export interface GA4TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * 有効なGA4アクセストークンを取得
 * 必要に応じて自動的にリフレッシュを行う
 */
export async function getValidGA4Token(userId: string): Promise<GA4TokenResult> {
  console.log('🔐 GA4トークン取得開始:', { userId });

  // トークンを取得
  const tokensDoc = await AdminFirestoreService.getOAuthTokens(userId);
  
  if (!tokensDoc || !tokensDoc.unified) {
    console.error('❌ OAuth tokens not found for user:', userId);
    throw new Error('OAuth tokens not found. Please reconnect your Google account.');
  }

  let accessToken = '';
  let refreshToken = '';
  let expiresAt = 0;
  
  // 暗号化チェックと復号化
  if (isEncrypted(tokensDoc.unified)) {
    console.log('🔓 トークンを復号化中...');
    const decrypted = decryptTokens(tokensDoc.unified);
    accessToken = decrypted.accessToken;
    refreshToken = decrypted.refreshToken;
    expiresAt = decrypted.expiresAt;
  } else {
    console.log('⚠️ 暗号化されていないトークンを検出');
    accessToken = tokensDoc.unified.accessToken;
    refreshToken = tokensDoc.unified.refreshToken;
    expiresAt = tokensDoc.unified.expiresAt;
  }

  // Firestore Timestampの場合はミリ秒に変換
  if (expiresAt && typeof expiresAt === 'object' && 'toMillis' in expiresAt) {
    expiresAt = (expiresAt as any).toMillis();
  } else if (expiresAt && typeof expiresAt === 'object' && 'seconds' in expiresAt) {
    expiresAt = (expiresAt as any).seconds * 1000;
  } else if (typeof expiresAt !== 'number') {
    console.error('❌ 無効なexpiresAt形式:', expiresAt);
    expiresAt = 0;
  }

  // トークンの有効期限をチェック
  const now = Date.now();
  console.log('🔍 トークン有効期限チェック:', {
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'Invalid',
    now: new Date(now).toISOString(),
    isExpired: expiresAt < now,
    hasRefreshToken: !!refreshToken
  });
  
  if (expiresAt < now) {
    console.log('🔄 トークン期限切れ - リフレッシュ開始');
    
    if (!refreshToken) {
      console.error('❌ リフレッシュトークンが存在しません');
      throw new Error('Refresh token not found. Please reconnect your Google account.');
    }

    // トークンをリフレッシュ
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_UNIFIED_CLIENT_SECRET;

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('❌ トークンリフレッシュ失敗:', errorText);
      throw new Error('Failed to refresh OAuth token. Please reconnect your Google account.');
    }

    const refreshData = await refreshResponse.json();
    accessToken = refreshData.access_token;
    const newExpiresAt = Date.now() + refreshData.expires_in * 1000;

    // 新しいアクセストークンをFirestoreに保存
    await AdminFirestoreService.updateAccessToken(userId, 'google', accessToken, newExpiresAt);
    console.log('✅ アクセストークンをリフレッシュしました');
    
    expiresAt = newExpiresAt;
  } else {
    console.log('✅ トークンは有効です');
  }

  return {
    accessToken,
    refreshToken,
    expiresAt
  };
}
