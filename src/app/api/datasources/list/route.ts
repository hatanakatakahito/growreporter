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

    console.log('📊 /api/datasources/list 取得データ:', {
      ga4PropertiesCount: ga4Properties.length,
      firstProperty: ga4Properties[0],
      hasWebsiteUrl: !!ga4Properties[0]?.websiteUrl
    });

    // 選択されたプロパティとサイトの情報をprofile/dataから取得
    const { doc, getDoc } = await import('firebase/firestore');
    const { serverFirestore } = await import('@/lib/firebase/adminFirestore');
    
    let selectedGA4PropertyId = null;
    let selectedGSCSiteUrl = null;
    
    try {
      const profileRef = doc(serverFirestore, 'users', userId, 'profile', 'data');
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        selectedGA4PropertyId = profileData?.connections?.ga4?.propertyId || null;
        selectedGSCSiteUrl = profileData?.connections?.gsc?.siteUrl || null;
        console.log('📋 プロフィールから取得:', {
          ga4PropertyId: selectedGA4PropertyId,
          gscSiteUrl: selectedGSCSiteUrl
        });
      }
    } catch (err) {
      console.error('プロフィール情報取得エラー:', err);
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
