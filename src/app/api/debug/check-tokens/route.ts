/**
 * デバッグ用: トークン情報確認API
 * 本番環境では削除すること
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';
import { isEncrypted, decryptTokens } from '@/lib/security/encryption';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    console.log('🔍 トークン確認API呼び出し:', { userId });

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    // トークン情報を取得
    console.log('📊 Firestoreからトークン取得中...');
    const tokensDoc = await AdminFirestoreService.getOAuthTokens(userId);
    console.log('📊 トークンドキュメント取得結果:', { 
      hasDoc: !!tokensDoc, 
      hasUnified: !!tokensDoc?.unified 
    });

    if (!tokensDoc || !tokensDoc.unified) {
      return NextResponse.json({
        status: 'no_tokens',
        message: 'トークンが見つかりません'
      });
    }

    let tokenInfo: any = {};

    try {
      console.log('🔍 暗号化チェック中...');
      const encrypted = isEncrypted(tokensDoc.unified);
      console.log('🔍 暗号化状態:', encrypted);

      if (encrypted) {
        console.log('🔓 トークン復号化中...');
        const decrypted = decryptTokens(tokensDoc.unified);
        console.log('✅ 復号化成功');
        
        // expiresAtの型変換
        let expiresAtMs = 0;
        if (decrypted.expiresAt) {
          if (typeof decrypted.expiresAt === 'object' && 'toMillis' in decrypted.expiresAt) {
            expiresAtMs = (decrypted.expiresAt as any).toMillis();
          } else if (typeof decrypted.expiresAt === 'object' && 'seconds' in decrypted.expiresAt) {
            expiresAtMs = (decrypted.expiresAt as any).seconds * 1000;
          } else if (typeof decrypted.expiresAt === 'number') {
            expiresAtMs = decrypted.expiresAt;
          }
        }
        
        tokenInfo = {
          hasAccessToken: !!decrypted.accessToken,
          hasRefreshToken: !!decrypted.refreshToken,
          accessTokenLength: decrypted.accessToken?.length || 0,
          refreshTokenLength: decrypted.refreshToken?.length || 0,
          expiresAt: expiresAtMs,
          expiresAtDate: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
          isExpired: expiresAtMs ? expiresAtMs < Date.now() : null,
          encrypted: true
        };
      } else {
        console.log('📝 暗号化されていないトークンを処理中...');
        
        // expiresAtの型変換
        let expiresAtMs = 0;
        if (tokensDoc.unified.expiresAt) {
          if (typeof tokensDoc.unified.expiresAt === 'object' && 'toMillis' in tokensDoc.unified.expiresAt) {
            expiresAtMs = (tokensDoc.unified.expiresAt as any).toMillis();
          } else if (typeof tokensDoc.unified.expiresAt === 'object' && 'seconds' in tokensDoc.unified.expiresAt) {
            expiresAtMs = (tokensDoc.unified.expiresAt as any).seconds * 1000;
          } else if (typeof tokensDoc.unified.expiresAt === 'number') {
            expiresAtMs = tokensDoc.unified.expiresAt;
          }
        }
        
        tokenInfo = {
          hasAccessToken: !!tokensDoc.unified.accessToken,
          hasRefreshToken: !!tokensDoc.unified.refreshToken,
          accessTokenLength: tokensDoc.unified.accessToken?.length || 0,
          refreshTokenLength: tokensDoc.unified.refreshToken?.length || 0,
          expiresAt: expiresAtMs,
          expiresAtDate: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
          isExpired: expiresAtMs ? expiresAtMs < Date.now() : null,
          encrypted: false
        };
      }

      console.log('✅ トークン情報取得成功:', tokenInfo);

      return NextResponse.json({
        status: 'ok',
        userId,
        tokenInfo,
        currentTime: new Date().toISOString()
      });

    } catch (decryptError: any) {
      console.error('❌ トークン処理エラー:', decryptError);
      return NextResponse.json(
        { 
          error: 'Failed to process tokens', 
          message: decryptError.message,
          stack: decryptError.stack 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ トークン確認エラー:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check tokens', 
        message: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
