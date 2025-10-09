/**
 * デバッグ用: トークンを強制的に期限切れにする
 * 本番環境では削除すること
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    console.log('⚠️ トークンを強制的に期限切れにします:', userId);

    // 過去の日時（1970年1月1日）に設定
    await AdminFirestoreService.updateAccessToken(userId, 'google', 'expired_token', 0);

    console.log('✅ トークンを期限切れにしました');

    return NextResponse.json({
      status: 'ok',
      message: 'トークンを期限切れにしました。次回のAPI呼び出しでリフレッシュが試行されます。'
    });

  } catch (error: any) {
    console.error('❌ トークン期限切れ設定エラー:', error);
    return NextResponse.json(
      { error: 'Failed to expire token', message: error.message },
      { status: 500 }
    );
  }
}

