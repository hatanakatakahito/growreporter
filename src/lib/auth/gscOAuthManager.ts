/**
 * Search Console専用のOAuth認証マネージャー
 */
export class GSCOAuthManager {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'openid',
    'email',
    'profile'
  ];

  /**
   * GSC OAuth URLを生成
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

    // 状態管理用のstate生成
    const stateData = {
      userId: options.userId || null,
      returnUrl: options.returnUrl || '/site-settings?step=3',
      service: 'gsc',
      timestamp: Date.now()
    };

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${appUrl}/api/auth/callback/gsc`,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      state
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('🟢 GSC OAuth URL生成:', {
      userId: options.userId,
      returnUrl: options.returnUrl,
      scopes: this.SCOPES.length
    });

    return { url, state };
  }
}



