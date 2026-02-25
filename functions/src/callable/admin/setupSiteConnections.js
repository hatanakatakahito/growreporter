/**
 * サイトにGA4とGSCを設定（管理者による設定）
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export async function setupSiteConnectionsCallable(request) {
  const db = getFirestore();
  const userId = request.auth?.uid;
  const { siteId, ga4PropertyId, gscSiteUrl } = request.data;

  if (!userId) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  if (!siteId) {
    throw new HttpsError('invalid-argument', 'siteIdは必須です');
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

    // サイトの存在確認
    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }

    // サイトドキュメントを更新
    const updateData = {};

    if (ga4PropertyId) {
      // 管理者のGA4トークンを取得
      const ga4TokenQuery = await db.collection('users').doc(userId).collection('oauth_tokens')
        .where('provider', '==', 'google_analytics')
        .limit(1)
        .get();
      
      if (ga4TokenQuery.empty) {
        throw new HttpsError(
          'not-found',
          'GA4認証情報が見つかりません。先にGA4を接続してください。'
        );
      }
      
      const ga4TokenId = ga4TokenQuery.docs[0].id;
      updateData.ga4PropertyId = ga4PropertyId;
      updateData.ga4TokenOwner = userId;
      updateData.ga4OauthTokenId = ga4TokenId;
    }

    if (gscSiteUrl) {
      // 管理者のGSCトークンを取得
      const gscTokenQuery = await db.collection('users').doc(userId).collection('oauth_tokens')
        .where('provider', '==', 'google_search_console')
        .limit(1)
        .get();
      
      if (gscTokenQuery.empty) {
        throw new HttpsError(
          'not-found',
          'Search Console認証情報が見つかりません。先にSearch Consoleを接続してください。'
        );
      }
      
      const gscTokenId = gscTokenQuery.docs[0].id;
      updateData.gscSiteUrl = gscSiteUrl;
      updateData.gscTokenOwner = userId;
      updateData.gscOauthTokenId = gscTokenId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'GA4またはSearch Consoleのいずれかを指定してください'
      );
    }

    await siteRef.update(updateData);

    return {
      success: true,
      message: 'サイトの接続設定が完了しました',
    };
  } catch (error) {
    console.error('[setupSiteConnections] エラー:', error);
    throw new HttpsError('internal', `設定の保存に失敗しました: ${error.message}`);
  }
}
