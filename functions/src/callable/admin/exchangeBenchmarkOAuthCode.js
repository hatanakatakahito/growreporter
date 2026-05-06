import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  createOAuth2Client,
  assertAdmin,
  validateRedirectUri,
  decodeIdTokenEmail,
} from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth callback でコードを交換
 *
 * OAuth callback ページから呼び出される。受け取った authorization code を
 * access_token + refresh_token に交換し、id_token から email を抽出して
 * `serviceTokens/{email}` に保存する。
 *
 * @param {object} request.data
 * @param {string} request.data.code - OAuth 2.0 authorization code
 * @param {string} request.data.redirectUri - OAuth callback URI（getBenchmarkOAuthUrl と一致必須）
 *
 * @returns {Promise<{ success, email, hasRefreshToken }>}
 */
export async function exchangeBenchmarkOAuthCodeCallable(request) {
  const adminData = await assertAdmin(request.auth?.uid);
  const adminEmail = request.auth.token?.email || adminData.email || 'unknown';

  const { code, redirectUri } = request.data || {};
  if (!code) {
    throw new HttpsError('invalid-argument', 'code が必要です');
  }
  if (!validateRedirectUri(redirectUri)) {
    throw new HttpsError('invalid-argument', `不正な redirectUri: ${redirectUri}`);
  }

  try {
    const oauth2Client = createOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('access_token が取得できませんでした');
    }
    if (!tokens.refresh_token) {
      throw new Error(
        'refresh_token が取得できませんでした。' +
        'Google アカウント設定で当該アプリの権限を一度取り消してから再認証してください。'
      );
    }

    // id_token から email を抽出（openid + email スコープ含むため取得できる）
    const accountEmail = decodeIdTokenEmail(tokens.id_token);
    if (!accountEmail) {
      throw new Error('id_token から email を取得できませんでした（scope に openid email が必要）');
    }

    // トークンの有効期限
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // serviceTokens/{email} に保存（ドキュメントID = email、重複防止）
    const db = getFirestore();
    const tokenRef = db.collection('serviceTokens').doc(accountEmail);
    const existing = await tokenRef.get();

    const tokenData = {
      email: accountEmail,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_at: expiresAt,
      scope: tokens.scope || '',
      status: 'active',
      addedBy: adminEmail,
      ...(existing.exists ? {} : { addedAt: FieldValue.serverTimestamp() }),
      lastRefreshedAt: FieldValue.serverTimestamp(),
      lastFailedAt: null,
      failureReason: null,
      consecutiveFailures: 0,
      // 既存ドキュメントへの上書きでも、lastBatchStats や lastUsedAt は触らない
    };

    await tokenRef.set(tokenData, { merge: true });

    // adminActivityLogs に記録
    try {
      await db.collection('adminActivityLogs').add({
        action: 'benchmark_oauth_added',
        targetType: 'serviceTokens',
        targetId: accountEmail,
        adminId: request.auth.uid,
        adminEmail,
        details: { isReauth: existing.exists },
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (logErr) {
      logger.warn('[exchangeBenchmarkOAuthCode] activity log 記録失敗', { error: logErr.message });
    }

    logger.info('[exchangeBenchmarkOAuthCode] トークン保存', {
      adminId: request.auth.uid,
      accountEmail,
      isReauth: existing.exists,
    });

    return {
      success: true,
      email: accountEmail,
      hasRefreshToken: true,
      isReauth: existing.exists,
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('[exchangeBenchmarkOAuthCode] エラー', { error: err.message });
    if (err.message?.includes('invalid_grant')) {
      throw new HttpsError(
        'invalid-argument',
        '認可コードが無効または期限切れです。再認証してください。'
      );
    }
    throw new HttpsError('internal', `トークン交換失敗: ${err.message}`);
  }
}
