/**
 * データソースリスト取得API
 * GA4プロパティとGSCサイトのリストを返す
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

    // Firestoreからプロパティとサイトを取得
    const [ga4Properties, gscSites] = await Promise.all([
      AdminFirestoreService.getGA4Properties(userId),
      AdminFirestoreService.getGSCSites(userId)
    ]);

    // 選択されたプロパティとサイトの情報も取得
    const { doc, getDoc } = await import('firebase/firestore');
    const { serverFirestore } = await import('@/lib/firebase/adminFirestore');
    
    let selectedGA4PropertyId = null;
    let selectedGSCSiteUrl = null;
    
    try {
      const ga4PropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
      const ga4Doc = await getDoc(ga4PropertiesRef);
      if (ga4Doc.exists()) {
        selectedGA4PropertyId = ga4Doc.data()?.selected?.propertyId || null;
      }
    } catch (err) {
      console.error('GA4選択情報取得エラー:', err);
    }
    
    try {
      const gscSitesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'gscSites');
      const gscDoc = await getDoc(gscSitesRef);
      if (gscDoc.exists()) {
        selectedGSCSiteUrl = gscDoc.data()?.selected?.siteUrl || null;
      }
    } catch (err) {
      console.error('GSC選択情報取得エラー:', err);
    }

    return NextResponse.json({
      ga4Properties,
      gscSites,
      selectedGA4PropertyId,
      selectedGSCSiteUrl
    });

  } catch (error) {
    console.error('❌ データソースリスト取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to get datasource list' },
      { status: 500 }
    );
  }
}
