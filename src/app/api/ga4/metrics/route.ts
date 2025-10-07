/**
 * GA4メトリクス取得API
 * GA4 Data API を使用して基本的なメトリクスを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';
import { decryptTokens, isEncrypted } from '@/lib/security/encryption';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    let { propertyId, startDate = '30daysAgo', endDate = 'today' } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // propertyIdの形式を確認（数値のみの場合は "properties/" プレフィックスを削除）
    // GA4 Data APIは数値のみのpropertyIdを期待
    if (propertyId.startsWith('properties/')) {
      propertyId = propertyId.replace('properties/', '');
    }
    
    console.log('📊 GA4 メトリクス取得開始:', { propertyId, startDate, endDate });

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
    let expiresAt = 0;
    
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

    console.log('🔍 生のトークン情報:', {
      expiresAtType: typeof expiresAt,
      expiresAtValue: expiresAt,
      hasToMillis: expiresAt && typeof expiresAt === 'object' && 'toMillis' in expiresAt,
    });

    // Firestore Timestampの場合はミリ秒に変換
    if (expiresAt && typeof expiresAt === 'object' && 'toMillis' in expiresAt) {
      expiresAt = (expiresAt as any).toMillis();
    } else if (expiresAt && typeof expiresAt === 'object' && 'seconds' in expiresAt) {
      // Timestamp形式の場合
      expiresAt = (expiresAt as any).seconds * 1000;
    } else if (typeof expiresAt === 'number') {
      // すでに数値の場合はそのまま使用
    } else {
      console.error('❌ 無効なexpiresAt形式:', expiresAt);
      expiresAt = 0;
    }

    // トークンの有効期限をチェック
    const now = Date.now();
    console.log('🔍 トークン有効期限チェック:', {
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'Invalid',
      now: new Date(now).toISOString(),
      isExpired: expiresAt < now,
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    if (expiresAt < now) {
      console.log('⚠️ トークン期限切れ - リフレッシュ開始');
      
      if (!refreshToken) {
        console.error('❌ リフレッシュトークンが存在しません');
        return NextResponse.json(
          { error: 'Refresh token not found. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
      
      // トークンをリフレッシュ
      try {
        console.log('📤 Google OAuth2 トークンリフレッシュリクエスト送信中...');
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
          console.error('❌ トークンリフレッシュ失敗 (Status:', refreshResponse.status, '):', errorText);
          
          // エラーの詳細をパース
          let errorDetails = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson.error_description || errorJson.error || errorText;
          } catch (e) {
            // JSON パースエラーは無視
          }
          
          return NextResponse.json(
            { 
              error: 'Failed to refresh OAuth token. Please reconnect your Google account.', 
              details: errorDetails,
              status: refreshResponse.status 
            },
            { status: 401 }
          );
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        const newExpiresAt = now + (refreshData.expires_in * 1000);

        console.log('✅ トークンリフレッシュ成功');

        // 新しいトークンを保存
        await AdminFirestoreService.updateAccessToken(userId, 'google', accessToken, newExpiresAt);
      } catch (refreshError) {
        console.error('❌ トークンリフレッシュエラー:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh OAuth token. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
    }

    // 日付形式を変換（YYYYMMDDをYYYY-MM-DDまたはNdaysAgo形式に）
    let formattedStartDate = startDate;
    let formattedEndDate = endDate;
    
    // YYYYMMDDの数値形式の場合はYYYY-MM-DD形式に変換
    if (startDate && /^\d{8}$/.test(startDate)) {
      formattedStartDate = `${startDate.substring(0, 4)}-${startDate.substring(4, 6)}-${startDate.substring(6, 8)}`;
    }
    if (endDate && /^\d{8}$/.test(endDate)) {
      formattedEndDate = `${endDate.substring(0, 4)}-${endDate.substring(4, 6)}-${endDate.substring(6, 8)}`;
    }
    
    console.log('📊 GA4 API リクエスト日付:', { 
      original: { startDate, endDate },
      formatted: { formattedStartDate, formattedEndDate }
    });

    // GA4 Data API にリクエスト
    const ga4Response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: formattedStartDate, endDate: formattedEndDate }],
          metrics: [
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'activeUsers' },
            { name: 'eventCount' },
            { name: 'conversions' }
          ]
        })
      }
    );

    if (!ga4Response.ok) {
      const errorText = await ga4Response.text();
      console.error('❌ GA4 API エラー:', errorText);
      console.error('❌ GA4 API ステータス:', ga4Response.status);
      console.error('❌ Property ID:', propertyId);
      return NextResponse.json(
        { error: 'Failed to fetch GA4 data', details: errorText, propertyId },
        { status: ga4Response.status }
      );
    }

    const ga4Data = await ga4Response.json();
    
    // データを整形
    const row = ga4Data.rows?.[0];
    const metrics = {
      newUsers: parseInt(row?.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row?.metricValues?.[1]?.value || '0'),
      totalUsers: parseInt(row?.metricValues?.[2]?.value || '0'),
      activeUsers: parseInt(row?.metricValues?.[3]?.value || '0'),
      keyEvents: parseInt(row?.metricValues?.[5]?.value || '0'),
      keyEventRate: 0
    };

    // キーイベント率を計算
    if (metrics.sessions > 0) {
      metrics.keyEventRate = (metrics.keyEvents / metrics.sessions) * 100;
    }

    return NextResponse.json({ metrics });

  } catch (error: any) {
    console.error('❌ GA4メトリクス取得エラー (catch):', error);
    console.error('❌ エラースタック:', error?.stack);
    console.error('❌ エラーメッセージ:', error?.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch GA4 metrics', 
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

