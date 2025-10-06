/**
 * データソース選択API
 * ユーザーが選択したGA4プロパティとGSCサイトを保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverFirestore } from '@/lib/firebase/adminFirestore';
import { doc, updateDoc } from 'firebase/firestore';

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
    const { ga4PropertyId, gscSiteUrl } = body;

    // GA4プロパティの選択を保存
    if (ga4PropertyId) {
      const ga4PropertiesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'ga4Properties');
      await updateDoc(ga4PropertiesRef, {
        'selected.propertyId': ga4PropertyId,
        'selected.selectedAt': new Date()
      });
    }

    // GSCサイトの選択を保存
    if (gscSiteUrl) {
      const gscSitesRef = doc(serverFirestore, 'users', userId, 'connectedProperties', 'gscSites');
      await updateDoc(gscSitesRef, {
        'selected.siteUrl': gscSiteUrl,
        'selected.selectedAt': new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'データソースの選択を保存しました'
    });

  } catch (error) {
    console.error('❌ データソース選択保存エラー:', error);
    return NextResponse.json(
      { error: 'Failed to save datasource selection' },
      { status: 500 }
    );
  }
}
