/**
 * 閲覧リンク一覧取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminFirestore';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // ユーザーの閲覧リンク一覧を取得
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('shareLinks')
      .orderBy('createdAt', 'desc')
      .get();

    const shareLinks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ shareLinks });
  } catch (error: any) {
    console.error('❌ 閲覧リンク一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links', message: error.message },
      { status: 500 }
    );
  }
}

