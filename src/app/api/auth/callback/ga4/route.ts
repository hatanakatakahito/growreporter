import { NextRequest, NextResponse } from 'next/server';
import { serverFirestore } from '@/lib/firebase/adminFirestore';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { encrypt } from '@/lib/security/encryption';

const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
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

    console.log('🔵 GA4 OAuth Callback受信:', {
      hasCode: !!code,
      hasState: !!state,
      error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ GA4 OAuthエラー:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=${encodeURIComponent(error)}&step=2`
      );
    }

    if (!code || !state) {
      console.error('❌ GA4 OAuth: codeまたはstateが不足');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=invalid_request&step=2`
      );
    }

    // stateをデコード
    let stateData: any;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('📋 GA4 State解析:', { userId: stateData.userId, returnUrl: stateData.returnUrl });
    } catch (err) {
      console.error('❌ GA4 State解析エラー:', err);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=invalid_state&step=2`
      );
    }

    const { userId, returnUrl } = stateData;
    if (!userId) {
      console.error('❌ GA4 OAuth: userIdが不足');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=missing_user&step=2`
      );
    }

    // 認証コードをトークンに交換
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_UNIFIED_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/ga4`;

    console.log('🔄 GA4 トークン交換開始');

    console.log('🔄 GA4 トークン交換リクエスト:', {
      redirectUri,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasCode: !!code
    });

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
      console.error('❌ GA4 トークン交換失敗:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorData
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=token_exchange_failed&detail=${encodeURIComponent(errorData)}&step=2`
      );
    }

    const tokens = await tokenResponse.json();
    console.log('✅ GA4 トークン取得成功');

    // GA4プロパティ一覧を取得
    const propertiesResponse = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      }
    );

    let ga4Properties: any[] = [];
    if (propertiesResponse.ok) {
      const propertiesData = await propertiesResponse.json();
      const propertySummaries = propertiesData.accountSummaries?.flatMap((account: any) =>
        account.propertySummaries?.map((prop: any) => ({
          name: prop.property,
          displayName: prop.displayName,
          account: account.displayName
        })) || []
      ) || [];

      console.log('📊 GA4プロパティ基本情報取得:', propertySummaries.length, '件');

      // 各プロパティのウェブストリーム（URL）を取得
      console.log('🔄 データストリーム取得開始:', propertySummaries.length, '件');
      
      ga4Properties = await Promise.all(
        propertySummaries.map(async (prop: any, index: any) => {
          try {
            // データストリーム一覧を取得
            const streamUrl = `https://analyticsadmin.googleapis.com/v1beta/${prop.name}/dataStreams`;
            
            const streamsResponse = await fetch(streamUrl, {
              headers: { Authorization: `Bearer ${tokens.access_token}` }
            });

            let websiteUrl = null;
            if (streamsResponse.ok) {
              const streamsData = await streamsResponse.json();
              // WEBストリームのURLを取得
              const webStream = streamsData.dataStreams?.find((stream: any) => stream.type === 'WEB_DATA_STREAM');
              if (webStream?.webStreamData?.defaultUri) {
                websiteUrl = webStream.webStreamData.defaultUri;
                if (index < 5) { // 最初の5件のみログ出力
                  console.log(`  ✅ [${index + 1}] ${prop.displayName}: ${websiteUrl}`);
                }
              } else {
                if (index < 5) {
                  console.log(`  ⚠️ [${index + 1}] ${prop.displayName}: WEBストリームなし`);
                }
              }
            } else {
              const errorText = await streamsResponse.text();
              if (index < 5) {
                console.error(`  ❌ [${index + 1}] ${prop.displayName}: API Error ${streamsResponse.status}`, errorText);
              }
            }

            return {
              name: prop.name,
              displayName: prop.displayName,
              account: prop.account,
              websiteUrl
            };
          } catch (error) {
            if (index < 5) {
              console.error(`  ❌ [${index + 1}] ${prop.displayName}: Exception`, error);
            }
            return {
              name: prop.name,
              displayName: prop.displayName,
              account: prop.account,
              websiteUrl: null
            };
          }
        })
      );

      console.log('✅ GA4プロパティ+URL取得完了:', ga4Properties.length, '件');
      console.log('📋 URL付きプロパティサンプル:', ga4Properties.slice(0, 3).map(p => ({ name: p.displayName, url: p.websiteUrl })));
    }

    // トークンを暗号化して保存
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    const tokenData: any = {
      ga4: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scopes: GA4_SCOPES,
        properties: ga4Properties,
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    const tokenRef = doc(serverFirestore, 'tokens', userId);
    await setDoc(tokenRef, tokenData, { merge: true });
    console.log('✅ GA4トークンをFirestoreに保存完了');

    // connectedPropertiesにもプロパティ一覧を保存（クライアント側で使用）
    const connectedPropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
    await setDoc(connectedPropertiesRef, {
      metadata: {
        totalCount: ga4Properties.length,
        lastFetched: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      },
      properties: ga4Properties,
      cache: {
        isPartial: false,
        nextPageToken: null,
        cachedAt: Timestamp.now(),
      },
    }, { merge: true });
    console.log('✅ GA4プロパティ一覧をconnectedPropertiesに保存完了');

    // 最初のプロパティを選択状態として保存
    if (ga4Properties.length > 0) {
      const profileRef = doc(serverFirestore, 'users', userId, 'profile', 'data');
      
      // undefinedフィールドを除外
      const ga4ConnectionData: any = {
        propertyId: ga4Properties[0].name, // idではなくnameを使用
        propertyName: ga4Properties[0].displayName,
        connectedAt: Timestamp.now()
      };
      
      // websiteUrlがある場合のみ追加
      if (ga4Properties[0].websiteUrl) {
        ga4ConnectionData.websiteUrl = ga4Properties[0].websiteUrl;
      }
      
      await setDoc(profileRef, {
        connections: {
          ga4: ga4ConnectionData
        }
      }, { merge: true });
      console.log('✅ GA4プロパティ選択を保存:', ga4Properties[0].displayName, '/', ga4Properties[0].websiteUrl || 'URL未取得');
    }

    // リダイレクト
    const redirectUrl = returnUrl || '/site-settings?step=2';
    console.log('✅ GA4認証完了 - リダイレクト:', redirectUrl);
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${redirectUrl}&status=success&service=ga4`
    );
  } catch (error: any) {
    console.error('❌ GA4 OAuth処理エラー:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/site-settings?status=error&error=${encodeURIComponent(error.message || 'unknown_error')}&step=2`
    );
  }
}

