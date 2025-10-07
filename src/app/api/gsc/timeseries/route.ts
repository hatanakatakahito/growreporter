import { NextRequest, NextResponse } from 'next/server';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';
import { decryptTokens, isEncrypted } from '@/lib/security/encryption';

export async function POST(request: NextRequest) {
  try {
    const { userId, siteUrl, startDate, endDate } = await request.json();

    if (!userId || !siteUrl || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🔍 GSC 時系列データ取得開始:', { siteUrl, startDate, endDate });

    // トークンを取得
    const tokensDoc = await AdminFirestoreService.getOAuthTokens(userId);
    
    if (!tokensDoc || !tokensDoc.unified) {
      return NextResponse.json(
        { error: 'OAuth tokens not found. Please reconnect your Google account.' },
        { status: 404 }
      );
    }

    let accessToken = '';
    let refreshToken = '';
    let expiresAt: any = 0;
    
    if (isEncrypted(tokensDoc.unified)) {
      const decrypted = decryptTokens(tokensDoc.unified);
      accessToken = decrypted.accessToken;
      refreshToken = decrypted.refreshToken;
      expiresAt = decrypted.expiresAt;
    } else {
      accessToken = tokensDoc.unified.accessToken;
      refreshToken = tokensDoc.unified.refreshToken;
      expiresAt = tokensDoc.unified.expiresAt;
    }

    // Firestore Timestampの場合はミリ秒に変換
    if (expiresAt && typeof expiresAt === 'object' && 'toMillis' in expiresAt) {
      expiresAt = expiresAt.toMillis();
    } else if (expiresAt && typeof expiresAt === 'object' && 'seconds' in expiresAt) {
      expiresAt = expiresAt.seconds * 1000;
    } else if (typeof expiresAt !== 'number') {
      console.error('❌ 無効なexpiresAt形式:', expiresAt);
      expiresAt = 0;
    }

    // トークンの有効期限をチェック
    const now = Date.now();
    
    if (expiresAt < now && refreshToken) {
      console.log('⚠️ トークン期限切れ - リフレッシュ開始 (GSC時系列)');
      
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID!,
            client_secret: process.env.GOOGLE_UNIFIED_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          console.error('❌ トークンリフレッシュ失敗:', errorText);
          return NextResponse.json(
            { error: 'Failed to refresh OAuth token. Please reconnect your Google account.' },
            { status: 401 }
          );
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        const newExpiresAt = now + (refreshData.expires_in * 1000);

        console.log('✅ トークンリフレッシュ成功 (GSC時系列)');
        await AdminFirestoreService.updateAccessToken(userId, 'google', accessToken, newExpiresAt);
      } catch (refreshError) {
        console.error('❌ トークンリフレッシュエラー:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh OAuth token. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
    }

    // Search Console API にリクエスト
    const gscResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['date'],
          rowLimit: 1000
        })
      }
    );

    if (!gscResponse.ok) {
      const errorText = await gscResponse.text();
      console.error('❌ GSC API エラー (時系列):', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch GSC time series data', details: errorText },
        { status: gscResponse.status }
      );
    }

    const gscData = await gscResponse.json();
    
    // データを整形
    const timeSeries = gscData.rows?.map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })) || [];

    return NextResponse.json({ timeSeries });

  } catch (error: any) {
    console.error('❌ GSC時系列データ取得エラー (catch):', error);
    console.error('❌ エラースタック:', error?.stack);
    console.error('❌ エラーメッセージ:', error?.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch GSC time series data', 
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

