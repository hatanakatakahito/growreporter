import { NextRequest, NextResponse } from 'next/server';
import { serverFirestore } from '@/lib/firebase/adminFirestore';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { encrypt } from '@/lib/security/encryption';

const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'openid',
  'email',
  'profile'
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('🟢 GSC OAuth Callback受信:', {
      hasCode: !!code,
      hasState: !!state,
      error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ GSC OAuthエラー:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=${encodeURIComponent(error)}&step=3`
      );
    }

    if (!code || !state) {
      console.error('❌ GSC OAuth: codeまたはstateが不足');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=invalid_request&step=3`
      );
    }

    // stateをデコード
    let stateData: any;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('📋 GSC State解析:', { userId: stateData.userId, returnUrl: stateData.returnUrl });
    } catch (err) {
      console.error('❌ GSC State解析エラー:', err);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=invalid_state&step=3`
      );
    }

    const { userId, returnUrl } = stateData;
    if (!userId) {
      console.error('❌ GSC OAuth: userIdが不足');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=missing_user&step=3`
      );
    }

    // 認証コードをトークンに交換
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gsc`;

    console.log('🔄 GSC トークン交換開始');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ GSC トークン交換失敗:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=token_exchange_failed&step=3`
      );
    }

    const tokens = await tokenResponse.json();
    console.log('✅ GSC トークン取得成功');

    // GSCサイト一覧を取得
    const sitesResponse = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      }
    );

    let gscSites: any[] = [];
    if (sitesResponse.ok) {
      const sitesData = await sitesResponse.json();
      gscSites = sitesData.siteEntry?.map((site: any) => ({
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel
      })) || [];
      console.log('✅ GSCサイト取得:', gscSites.length, '件');
    }

    // トークンを暗号化して保存
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    const tokenData: any = {
      gsc: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scopes: GSC_SCOPES,
        sites: gscSites,
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    const tokenRef = doc(serverFirestore, 'tokens', userId);
    await setDoc(tokenRef, tokenData, { merge: true });
    console.log('✅ GSCトークンをFirestoreに保存完了');

    // ユーザープロフィールから登録済みサイトURLを取得
    let selectedSite = gscSites[0]; // デフォルトは最初のサイト
    
    if (gscSites.length > 0) {
      const profileRef = doc(serverFirestore, 'users', userId, 'profile', 'data');
      const { getDoc } = await import('firebase/firestore');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        const registeredUrl = profileData?.profile?.siteUrl;
        
        console.log('🔍 登録済みサイトURL:', registeredUrl);
        console.log('📋 GSCサイト一覧:', gscSites.map(s => s.siteUrl));
        
        if (registeredUrl) {
          // 登録URLを正規化（末尾のスラッシュを統一）
          const normalizeUrl = (url: string) => {
            try {
              const urlObj = new URL(url);
              return urlObj.origin + urlObj.pathname.replace(/\/+$/, '') + '/';
            } catch {
              return url.replace(/\/+$/, '') + '/';
            }
          };
          
          const normalizedRegisteredUrl = normalizeUrl(registeredUrl);
          
          // 一致するサイトを検索
          const matchedSite = gscSites.find(site => {
            const normalizedSiteUrl = normalizeUrl(site.siteUrl);
            return normalizedSiteUrl === normalizedRegisteredUrl;
          });
          
          if (matchedSite) {
            selectedSite = matchedSite;
            console.log('✅ 登録URLと一致するGSCサイトを発見:', matchedSite.siteUrl);
          } else {
            console.log('⚠️ 登録URLと一致するGSCサイトが見つかりません。最初のサイトを選択:', selectedSite.siteUrl);
          }
        }
      }
      
      // 選択されたサイトを保存
      await setDoc(profileRef, {
        connections: {
          gsc: {
            siteUrl: selectedSite.siteUrl,
            permissionLevel: selectedSite.permissionLevel,
            connectedAt: Timestamp.now()
          }
        }
      }, { merge: true });
      console.log('✅ GSCサイト選択を保存:', selectedSite.siteUrl);
    }

    // リダイレクト
    const redirectUrl = returnUrl || '/site-settings?step=3';
    console.log('✅ GSC認証完了 - リダイレクト:', redirectUrl);
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${redirectUrl}&status=success&service=gsc`
    );
  } catch (error: any) {
    console.error('❌ GSC OAuth処理エラー:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=${encodeURIComponent(error.message || 'unknown_error')}&step=3`
    );
  }
}

