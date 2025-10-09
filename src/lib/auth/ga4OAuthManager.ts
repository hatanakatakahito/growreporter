/**
 * GA4専用のOAuth認証マネージャー
 */
export class GA4OAuthManager {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'openid',
    'email',
    'profile'
  ];

  /**
   * GA4 OAuth URLを生成
   */
  static generateOAuthURL(options: {
    userId?: string;
    returnUrl?: string;
  } = {}): { url: string; state: string } {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;

    if (!clientId) {
      throw new Error('NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID が設定されていません');
    }

    const redirectUri = `${appUrl}/api/auth/callback/ga4`;

    // 状態管理用のstate生成
    const stateData = {
      userId: options.userId || null,
      returnUrl: options.returnUrl || '/site-settings?step=2',
      service: 'ga4',
      timestamp: Date.now()
    };

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      state
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('🔵 GA4 OAuth URL生成:', {
      appUrl,
      redirectUri,
      clientId: clientId.substring(0, 20) + '...',
      userId: options.userId,
      returnUrl: options.returnUrl,
      scopes: this.SCOPES.length
    });

    return { url, state };
  }
}

