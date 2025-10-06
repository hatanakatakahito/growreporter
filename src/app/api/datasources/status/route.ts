/**
 * データソース接続状態API
 * サーバーサイドでトークンを復号化して接続状態を返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Firestoreからトークンとデータソース情報を取得
    const [tokens, ga4Data, gscData] = await Promise.allSettled([
      AdminFirestoreService.getOAuthTokens(userId),
      AdminFirestoreService.getGA4Properties(userId),
      AdminFirestoreService.getGSCSites(userId)
    ]);

    const isConnected = tokens.status === 'fulfilled' && tokens.value !== null;
    const ga4Count = ga4Data.status === 'fulfilled' ? ga4Data.value.length : 0;
    const gscCount = gscData.status === 'fulfilled' ? gscData.value.length : 0;
    
    let lastUpdated = '-';
    if (tokens.status === 'fulfilled' && tokens.value) {
      const grantedAt = tokens.value.unified?.grantedAt;
      if (grantedAt) {
        lastUpdated = new Date(grantedAt).toLocaleString('ja-JP');
      }
    }

    return NextResponse.json({
      isConnected,
      ga4Count,
      gscCount,
      lastUpdated
    });

  } catch (error) {
    console.error('❌ データソース状態取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to get datasource status' },
      { status: 500 }
    );
  }
}
