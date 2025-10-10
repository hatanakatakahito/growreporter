/**
 * 閲覧リンク削除（無効化）API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminFirestore';

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
    const { shareToken } = body;

    if (!shareToken) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    // リンクを無効化
    const updateData = {
      isActive: false,
      revokedAt: new Date().toISOString()
    };
    
    // ユーザーサブコレクションを更新
    await db
      .collection('users')
      .doc(userId)
      .collection('shareLinks')
      .doc(shareToken)
      .update(updateData);
    
    // グローバルコレクションも更新
    try {
      await db
        .collection('shareLinks')
        .doc(shareToken)
        .update(updateData);
    } catch (error) {
      console.warn('⚠️ グローバルコレクション更新スキップ（存在しない可能性）:', error);
    }

    console.log('🔒 閲覧リンク無効化成功:', { shareToken });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ 閲覧リンク無効化エラー:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share link', message: error.message },
      { status: 500 }
    );
  }
}

