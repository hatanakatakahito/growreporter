/**
 * 管理者のGA4プロパティ一覧を取得
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';

export async function getAdminGA4PropertiesCallable(request) {
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

    // 管理者のOAuthトークンを取得（GA4用） users/{uid}/oauth_tokens
    const tokenQuery = await db.collection('users').doc(userId).collection('oauth_tokens')
      .where('provider', '==', 'google_analytics')
      .limit(1)
      .get();

    if (tokenQuery.empty) {
      throw new HttpsError(
        'not-found',
        'GA4認証情報が見つかりません。先にGA4を接続してください。'
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

    // GA4 Admin APIを使用してプロパティ一覧を取得
    const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth });
    const accountsResponse = await analyticsadmin.accounts.list();
    
    const properties = [];
    
    if (accountsResponse.data.accounts) {
      for (const account of accountsResponse.data.accounts) {
        const propertiesResponse = await analyticsadmin.properties.list({
          filter: `parent:${account.name}`,
        });
        
        if (propertiesResponse.data.properties) {
          for (const property of propertiesResponse.data.properties) {
            // プロパティIDを抽出（properties/123456789 → 123456789）
            const propertyId = property.name.split('/')[1];
            properties.push({
              propertyId: propertyId,
              displayName: property.displayName,
              accountName: account.displayName,
            });
          }
        }
      }
    }

    return {
      success: true,
      properties: properties,
    };
  } catch (error) {
    console.error('[getAdminGA4Properties] エラー:', error);
    throw new HttpsError('internal', `GA4プロパティの取得に失敗しました: ${error.message}`);
  }
}
