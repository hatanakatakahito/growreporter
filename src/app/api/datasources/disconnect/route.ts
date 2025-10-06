import { NextRequest, NextResponse } from 'next/server';
import { AdminFirestoreService } from '@/lib/firebase/adminFirestore';

/**
 * データソース接続解除API
 * DELETE /api/datasources/disconnect
 */
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔧 データソース接続解除開始:', userId);

    // OAuthトークンを削除
    const { deleteDoc, doc } = await import('firebase/firestore');
    const { serverFirestore } = await import('@/lib/firebase/adminFirestore');
    
    const oauthTokensRef = doc(serverFirestore, 'users', userId, 'oauthTokens', 'google');
    await deleteDoc(oauthTokensRef);
    console.log('✅ OAuthトークン削除完了');

    // GA4プロパティを削除
    const ga4PropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
    await deleteDoc(ga4PropertiesRef);
    console.log('✅ GA4プロパティ削除完了');

    // GSCサイトを削除
    const gscSitesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'gscSites');
    await deleteDoc(gscSitesRef);
    console.log('✅ GSCサイト削除完了');

    return NextResponse.json({ success: true, message: 'データソースの接続を解除しました' });
  } catch (error) {
    console.error('❌ データソース接続解除APIエラー:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

