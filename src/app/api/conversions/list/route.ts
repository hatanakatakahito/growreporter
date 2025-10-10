/**
 * コンバージョン定義一覧取得API
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

    console.log('📋 コンバージョン定義一覧取得:', { userId });

    // ユーザーのコンバージョン定義を取得
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('conversions')
      .get();

    const conversions = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((conv: any) => conv.isActive); // アクティブなもののみ

    console.log('✅ コンバージョン定義取得成功:', conversions.length, '件');

    return NextResponse.json({
      conversions
    });
  } catch (error: any) {
    console.error('❌ コンバージョン定義取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversions', message: error.message },
      { status: 500 }
    );
  }
}

