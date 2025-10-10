/**
 * 閲覧リンク生成API
 * レポートを外部と共有するための読み取り専用リンクを生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminFirestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  console.log('📋 API: generate-link リクエスト受信');
  
  try {
    const userId = request.headers.get('x-user-id');
    console.log('📋 API: userId:', userId);
    
    if (!userId) {
      console.error('📋 API: User ID が見つかりません');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📋 API: リクエストボディ:', body);
    
    const { 
      title = 'レポート閲覧',
      expiresInDays = 30,
      allowedPages = [] 
    } = body;

    // ユニークなシェアトークンを生成
    const shareToken = uuidv4();
    console.log('📋 API: 生成されたトークン:', shareToken);
    
    // 有効期限を設定（デフォルト30日）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Firestoreに保存
    const shareData = {
      userId,
      shareToken,
      title,
      allowedPages: allowedPages.length > 0 ? allowedPages : ['all'],
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true,
      viewCount: 0
    };

    console.log('📋 API: Firestoreに保存するデータ:', shareData);

    try {
      // ユーザーのサブコレクションに保存
      await db
        .collection('users')
        .doc(userId)
        .collection('shareLinks')
        .doc(shareToken)
        .set(shareData);
      
      console.log('📋 API: ユーザーサブコレクションに保存成功');
      
      // グローバルコレクションにも保存（検索を高速化）
      await db
        .collection('shareLinks')
        .doc(shareToken)
        .set(shareData);
      
      console.log('📋 API: グローバルコレクションに保存成功');
    } catch (firestoreError) {
      console.error('📋 API: Firestore保存エラー:', firestoreError);
      throw firestoreError;
    }

    // 閲覧用URLを生成
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    console.log('📋 閲覧リンク生成成功:', { shareToken, expiresAt: expiresAt.toISOString() });

    return NextResponse.json({
      shareUrl,
      shareToken,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: any) {
    console.error('❌ 閲覧リンク生成エラー:', error);
    return NextResponse.json(
      { error: 'Failed to generate share link', message: error.message },
      { status: 500 }
    );
  }
}

