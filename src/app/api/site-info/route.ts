import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 401 }
      );
    }
    
    // サイト設定を取得
    const profileRef = doc(db, `users/${userId}/profile/data`);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      // プロファイルが存在しない場合はデフォルト値を返す
      return NextResponse.json({
        success: true,
        siteInfo: {
          siteName: '',
          siteUrl: '',
          businessType: 'btob',
          siteType: 'corporate'
        }
      });
    }
    
    const profileData = profileSnap.data();
    
    return NextResponse.json({
      success: true,
      siteInfo: {
        siteName: profileData.profile?.siteName || profileData.siteName || '',
        siteUrl: profileData.profile?.siteUrl || profileData.siteUrl || '',
        businessType: profileData.profile?.businessType || profileData.businessType || 'btob',
        siteType: profileData.profile?.siteType || profileData.siteType || 'corporate'
      }
    });
    
  } catch (error) {
    console.error('サイト情報取得エラー:', error);
    return NextResponse.json(
      { error: 'サイト情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

