/**
 * 🔄 OAuth トークンリフレッシュ API
 * クライアントシークレットを安全に使用してトークンを更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedOAuthManager } from '@/lib/auth/unifiedOAuthManager';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, refreshToken } = body;

    if (!userId || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing userId or refreshToken' },
        { status: 400 }
      );
    }

    console.log('🔄 サーバーサイドでトークンリフレッシュ開始:', { userId });

    // サーバーサイドでリフレッシュトークンを使用してアクセストークンを更新
    const refreshedTokens = await UnifiedOAuthManager.refreshAccessToken(refreshToken);

    // 新しいアクセストークンをFirestoreに保存
    await AdminFirestoreService.updateAccessToken(
      userId,
      refreshedTokens.access_token,
      refreshedTokens.expires_in
    );

    console.log('✅ サーバーサイドトークンリフレッシュ成功');

    return NextResponse.json({
      success: true,
      accessToken: refreshedTokens.access_token,
      expiresIn: refreshedTokens.expires_in
    });

  } catch (error) {
    console.error('❌ サーバーサイドトークンリフレッシュエラー:', error);
    
    return NextResponse.json(
      { 
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


