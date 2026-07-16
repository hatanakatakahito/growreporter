import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { logUserActivity, ACTIVITY_ACTIONS } from '../utils/userActivityLogger.js';

/**
 * サイトの OAuth トークン参照先 (ga4TokenOwner / gscTokenOwner) を顧客自身に切替える。
 *
 * - 認証: 顧客本人 (sites.userId === request.auth.uid のときのみ)
 * - 前提: 顧客が自分の OAuth トークンを既に連携済 (users/{uid}/oauth_tokens にトークンがある)
 * - 動作: sites.{ga4TokenOwner|gscTokenOwner} = request.auth.uid + 対応する tokenId を更新
 * - admin が引き続き OAuth で運用したい場合は本 callable を呼ばないだけ
 *
 * @param {string} data.siteId
 * @param {'ga4'|'gsc'} data.provider - 切替対象のプロバイダ
 * @returns {{ success: boolean, provider: string, newTokenOwner: string }}
 */
export const claimSiteTokenOwnershipCallable = async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }

  const { siteId, provider } = request.data || {};

  if (!siteId || typeof siteId !== 'string') {
    throw new HttpsError('invalid-argument', 'siteId は必須です');
  }
  if (!provider || !['ga4', 'gsc'].includes(provider)) {
    throw new HttpsError('invalid-argument', 'provider は "ga4" または "gsc" のみ');
  }

  try {
    const db = getFirestore();

    // サイト存在確認 + 本人所有確認
    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'サイトが見つかりません');
    }
    const siteData = siteDoc.data();
    if (siteData.userId !== uid) {
      throw new HttpsError('permission-denied', '自分が所有するサイトのみ操作できます');
    }

    // 顧客自身の OAuth トークン doc 存在確認
    const tokenIdField = provider === 'ga4' ? 'ga4OauthTokenId' : 'gscOauthTokenId';
    const ownerField = provider === 'ga4' ? 'ga4TokenOwner' : 'gscTokenOwner';

    // 顧客の oauth_tokens サブコレクションから該当 provider のトークンを検索
    // exchangeOAuthCode.js では provider を 'google_analytics' / 'google_search_console' で保存している
    const dbProviderName = provider === 'ga4' ? 'google_analytics' : 'google_search_console';
    const tokensSnap = await db.collection('users').doc(uid).collection('oauth_tokens')
      .where('provider', '==', dbProviderName)
      .limit(1)
      .get();

    if (tokensSnap.empty) {
      throw new HttpsError(
        'failed-precondition',
        `先にアカウント設定で ${provider === 'ga4' ? 'Google Analytics 4' : 'Search Console'} を連携してください`
      );
    }

    const tokenDocId = tokensSnap.docs[0].id;

    // sites doc 更新
    await siteRef.update({
      [ownerField]: uid,
      [tokenIdField]: tokenDocId,
      [`_${ownerField}ClaimedAt`]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[claimSiteTokenOwnership] 顧客 OAuth 切替完了', {
      uid, siteId, provider, tokenDocId,
    });

    // 監査ログ (顧客操作)
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    await logUserActivity({
      userId: uid,
      userEmail: userData.email || '',
      userName: userData.displayName || userData.name || '',
      action: ACTIVITY_ACTIONS.SITE_TOKEN_OWNERSHIP_CLAIMED,
      details: {
        siteId,
        provider,
        previousTokenOwner: siteData[ownerField] || siteData.userId,
        newTokenOwner: uid,
      },
    });

    return {
      success: true,
      provider,
      newTokenOwner: uid,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[claimSiteTokenOwnership] エラー', {
      error: error.message,
      stack: error.stack,
      uid,
      siteId,
    });
    throw new HttpsError('internal', `OAuth 切替に失敗: ${error.message}`);
  }
};
