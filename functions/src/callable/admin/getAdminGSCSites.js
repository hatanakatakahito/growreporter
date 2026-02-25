/**
 * 管理者のGoogle Search Consoleサイト一覧を取得
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';

export async function getAdminGSCSitesCallable(request) {
  const db = getFirestore();
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  try {
    // 管理者権限チェック
    const adminDoc = await db.collection('adminUsers').doc(userId).get();
    if (!adminDoc.exists || !['admin', 'editor'].includes(adminDoc.data().role)) {
      throw new HttpsError(
        'permission-denied',
        '管理者または編集者権限が必要です'
      );
    }

    // 管理者のOAuthトークンを取得（GSC用）
    const tokenQuery = await db.collection('users').doc(userId).collection('oauth_tokens')
      .where('provider', '==', 'google_search_console')
      .limit(1)
      .get();

    if (tokenQuery.empty) {
      throw new HttpsError(
        'not-found',
        'Search Console認証情報が見つかりません。先にSearch Consoleを接続してください。'
      );
    }

    const tokenData = tokenQuery.docs[0].data();
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_at?.toDate ? tokenData.expires_at.toDate().getTime() : new Date(tokenData.expires_at).getTime(),
    });

    // Search Console APIを使用してサイト一覧を取得
    const webmasters = google.webmasters({ version: 'v3', auth });
    const sitesResponse = await webmasters.sites.list();
    
    const sites = [];
    
    if (sitesResponse.data.siteEntry) {
      for (const site of sitesResponse.data.siteEntry) {
        sites.push({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel,
        });
      }
    }

    return {
      success: true,
      sites: sites,
    };
  } catch (error) {
    console.error('[getAdminGSCSites] エラー:', error);
    throw new HttpsError('internal', `Search Consoleサイトの取得に失敗しました: ${error.message}`);
  }
}
