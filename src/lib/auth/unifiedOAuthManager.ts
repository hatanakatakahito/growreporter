/**
 * 統合OAuth管理システム (Faroパターン準拠)
 * GA4 + Search Console を一括認証
 */

import { v4 as uuidv4 } from 'uuid';

export interface UnifiedOAuthConfig {
  client_id: string;
  redirect_uri: string;
  scope: string[];
  access_type: 'offline';
  prompt: 'consent select_account';
  response_type: 'code';
  state: string;
}

export interface UnifiedOAuthState {
  sessionId: string;
  userId?: string;
  timestamp: number;
  returnUrl?: string;
}

/**
 * 統合OAuth設定管理
 */
export class UnifiedOAuthManager {
  private static readonly GOOGLE_OAUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly TOKEN_EXCHANGE_URL = 'https://oauth2.googleapis.com/token';
  
  // Faroパターンに準拠したスコープ設定
  private static readonly UNIFIED_SCOPES = [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.manage.users.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly'
  ];

  /**
   * 統合OAuth URL生成
   */
  static generateOAuthURL(options: {
    userId?: string;
    returnUrl?: string;
  } = {}): { url: string; state: string } {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;

    // より詳細なデバッグ情報を追加
    console.log('🔧 UnifiedOAuth環境変数デバッグ:', {
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'undefined',
      rawClientId: clientId,
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_GOOGLE')),
      allEnvVarsValues: Object.keys(process.env)
        .filter(key => key.startsWith('NEXT_PUBLIC_GOOGLE'))
        .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {}),
      nodeEnv: process.env.NODE_ENV,
      processEnvKeys: Object.keys(process.env).length
    });

    if (!clientId) {
      console.error('❌ クライアントIDが見つかりません:', {
        expectedKey: 'NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID',
        actualValue: clientId,
        typeof: typeof clientId
      });
      throw new Error('NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID が設定されていません');
    }

    // 状態管理用のstate生成
    const stateData: UnifiedOAuthState = {
      sessionId: uuidv4(),
      userId: options.userId,
      timestamp: Date.now(),
      returnUrl: options.returnUrl
    };

    // ブラウザ対応のためbase64urlをマニュアルで実装
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const config: UnifiedOAuthConfig = {
      client_id: clientId,
      redirect_uri: `${appUrl}/api/auth/callback/google`,
      scope: this.UNIFIED_SCOPES,
      access_type: 'offline',
      prompt: 'consent select_account',
      response_type: 'code',
      state
    };

    // OAuth URL構築
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      scope: config.scope.join(' '),
      access_type: config.access_type,
      prompt: config.prompt,
      response_type: config.response_type,
      state: config.state
    });

    const url = `${this.GOOGLE_OAUTH_BASE_URL}?${params.toString()}`;

    return { url, state };
  }

  /**
   * State検証
   */
  static validateState(state: string): UnifiedOAuthState | null {
    try {
      // base64urlデコードをマニュアルで実装
      const base64 = state.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      const stateData: UnifiedOAuthState = JSON.parse(decoded);

      // 有効期限チェック (10分)
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10分

      if (now - stateData.timestamp > maxAge) {
        console.warn('OAuth state expired');
        return null;
      }

      return stateData;
    } catch (error) {
      console.error('Invalid OAuth state:', error);
      return null;
    }
  }

  /**
   * 認証コードをトークンに交換
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_UNIFIED_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl}/api/auth/callback/google`,
      code
    });

    const response = await fetch(this.TOKEN_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token exchange error:', errorData);
      throw new Error(`Token exchange failed: ${errorData.error_description || 'Unknown error'}`);
    }

    const tokenData = await response.json();

    console.log('🔧 統合OAuth Token Exchange Success:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope
    });

    return tokenData;
  }

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }> {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_UNIFIED_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    });

    console.log('🔄 リフレッシュトークンを使用してアクセストークンを更新中...');

    const response = await fetch(this.TOKEN_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Token refresh error:', errorData);
      throw new Error(`Token refresh failed: ${errorData.error_description || 'Unknown error'}`);
    }

    const tokenData = await response.json();

    console.log('✅ アクセストークン更新成功:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    });

    return tokenData;
  }

  /**
   * スコープ検証
   */
  static validateScopes(receivedScopes: string): {
    hasGA4: boolean;
    hasGSC: boolean;
    hasProfile: boolean;
    missingScopes: string[];
  } {
    const scopeArray = receivedScopes.split(' ');
    
    const hasGA4 = scopeArray.some(scope => 
      scope.includes('analytics.readonly') || scope.includes('analytics.manage')
    );
    
    const hasGSC = scopeArray.some(scope => 
      scope.includes('webmasters')
    );
    
    const hasProfile = scopeArray.includes('openid') && 
                      (scopeArray.includes('profile') || scopeArray.includes('https://www.googleapis.com/auth/userinfo.profile')) && 
                      (scopeArray.includes('email') || scopeArray.includes('https://www.googleapis.com/auth/userinfo.email'));

    const missingScopes: string[] = [];
    
    if (!hasGA4) {
      missingScopes.push('Google Analytics');
    }
    if (!hasGSC) {
      missingScopes.push('Search Console');
    }
    if (!hasProfile) {
      missingScopes.push('Profile');
    }

    return {
      hasGA4,
      hasGSC,
      hasProfile,
      missingScopes
    };
  }
}

export default UnifiedOAuthManager;
