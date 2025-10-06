/**
 * 統合Google OAuth コールバック
 * GA4 + Search Console 同時認証
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';
import { getGA4Properties } from '@/lib/api/googleAnalytics';
import { getGSCSites } from '@/lib/api/searchConsole';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // エラーハンドリング
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard?error=oauth_error&message=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_callback&message=Missing+parameters', request.url)
      );
    }

    // State検証
    const stateData = UnifiedOAuthManager.validateState(state);
    if (!stateData) {
      console.error('Invalid or expired state');
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_state&message=Invalid+or+expired+state', request.url)
      );
    }

    console.log('🔧 統合OAuth コールバック開始:', {
      hasCode: !!code,
      stateSessionId: stateData.sessionId,
      userId: stateData.userId
    });

    // 認証コードをトークンに交換
    const tokenData = await UnifiedOAuthManager.exchangeCodeForTokens(code);

    // スコープ検証
    const scopeValidation = UnifiedOAuthManager.validateScopes(tokenData.scope);
    
    if (scopeValidation.missingScopes.length > 0) {
      console.warn('Missing required scopes:', scopeValidation.missingScopes);
      return NextResponse.redirect(
        new URL(`/dashboard?error=insufficient_scopes&message=${encodeURIComponent('必要な権限が不足しています: ' + scopeValidation.missingScopes.join(', '))}`, request.url)
      );
    }

    console.log('🔧 統合OAuth スコープ検証完了:', scopeValidation);

    // GA4とGSCのデータを並行取得
    const [ga4Data, gscData] = await Promise.allSettled([
      scopeValidation.hasGA4 ? getGA4Properties(tokenData.access_token) : Promise.resolve([]),
      scopeValidation.hasGSC ? getGSCSites(tokenData.access_token) : Promise.resolve([])
    ]);

    // 結果処理
    const ga4Properties = ga4Data.status === 'fulfilled' ? ga4Data.value : [];
    const gscSites = gscData.status === 'fulfilled' ? gscData.value : [];

    if (ga4Data.status === 'rejected') {
      console.error('GA4データ取得エラー:', ga4Data.reason);
    }
    if (gscData.status === 'rejected') {
      console.error('GSCデータ取得エラー:', gscData.reason);
    }

    console.log('🔧 統合OAuth データ取得完了:', {
      ga4PropertiesCount: ga4Properties.length,
      gscSitesCount: gscSites.length
    });

    // 🚀 Standard Edition Firestoreに直接保存
    console.log('🔧 Firestore保存開始:', { userId: stateData.userId });
    
    try {
      // Admin Firestore サービスを使用（サーバーサイド）
      
      // OAuthトークンを保存
      await AdminFirestoreService.saveOAuthTokens(
        stateData.userId,
        {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token, // undefinedの場合はundefined
          expiresIn: tokenData.expires_in || 3600,
          scope: tokenData.scope?.split(' ') || []
        },
        scopeValidation,
        {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      );

      // GA4プロパティとGSCサイトを保存
      await Promise.all([
        AdminFirestoreService.saveGA4Properties(stateData.userId, ga4Properties),
        AdminFirestoreService.saveGSCSites(stateData.userId, gscSites)
      ]);

      console.log('✅ Admin Firestore保存完了');
      
      // 🎯 returnUrlがあればそこへ、なければダッシュボードへリダイレクト
      const redirectUrl = stateData.returnUrl || '/dashboard';
      return NextResponse.redirect(
        new URL(`${redirectUrl}?unified_oauth_success=true&ga4_count=${ga4Properties.length}&gsc_count=${gscSites.length}`, request.url)
      );
      
    } catch (firestoreError) {
      console.error('❌ Admin Firestore保存エラー:', firestoreError);
      
      // Firestoreエラー時はエラーページにリダイレクト
      return NextResponse.redirect(
        new URL(`/dashboard?error=firestore_error&message=${encodeURIComponent(String(firestoreError))}`, request.url)
      );
    }

  } catch (error) {
    console.error('統合OAuth Callback Error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=callback_error&message=${encodeURIComponent(String(error))}`, request.url)
    );
  }
}
