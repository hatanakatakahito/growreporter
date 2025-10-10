/**
 * 閲覧リンク検証API
 * トークンの有効性を確認し、閲覧数をカウント
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminFirestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'トークンが指定されていません' },
        { status: 400 }
      );
    }

    // トークン→ユーザーIDのマッピングをグローバルコレクションから検索
    console.log('🔍 トークン検証開始:', token);
    
    // まず、グローバルなshareLinksコレクションから検索
    const globalShareLinkDoc = await db.collection('shareLinks').doc(token).get();
    
    let shareLink = null;
    let userId = null;

    if (globalShareLinkDoc.exists) {
      const globalData = globalShareLinkDoc.data();
      shareLink = globalData;
      userId = globalData.userId;
      console.log('✅ グローバルコレクションから検出:', { userId, token });
    } else {
      // フォールバック: 全ユーザーを検索（後方互換性のため）
      console.log('⚠️ グローバルコレクションに存在しないため、全ユーザーを検索');
      const usersSnapshot = await db.collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const shareLinkDoc = await db
          .collection('users')
          .doc(userDoc.id)
          .collection('shareLinks')
          .doc(token)
          .get();
        
        if (shareLinkDoc.exists) {
          shareLink = shareLinkDoc.data();
          userId = userDoc.id;
          console.log('✅ ユーザーサブコレクションから検出:', { userId, token });
          break;
        }
      }
    }

    if (!shareLink) {
      console.error('❌ 閲覧リンクが見つかりません:', token);
      return NextResponse.json(
        { error: '閲覧リンクが見つかりません' },
        { status: 404 }
      );
    }

    // アクティブ状態を確認
    if (!shareLink.isActive) {
      return NextResponse.json(
        { error: 'この閲覧リンクは無効化されています' },
        { status: 403 }
      );
    }

    // 有効期限を確認
    const expiresAt = new Date(shareLink.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: '閲覧リンクの有効期限が切れています' },
        { status: 403 }
      );
    }

    // 閲覧数をカウント
    await db
      .collection('users')
      .doc(userId)
      .collection('shareLinks')
      .doc(token)
      .update({
        viewCount: (shareLink.viewCount || 0) + 1,
        lastViewedAt: new Date().toISOString()
      });

    console.log('✅ 閲覧リンク検証成功:', { token, userId });

    return NextResponse.json({
      shareLink: {
        ...shareLink,
        userId
      }
    });
  } catch (error: any) {
    console.error('❌ 閲覧リンク検証エラー:', error);
    return NextResponse.json(
      { error: '閲覧リンクの検証に失敗しました', message: error.message },
      { status: 500 }
    );
  }
}

