import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import {
  createOAuth2Client,
  assertAdmin,
  validateRedirectUri,
  BENCHMARK_OAUTH_SCOPES,
} from '../../utils/benchmarkOAuthHelpers.js';

/**
 * lively-aggregating-bobcat: ベンチマーク用 OAuth 認可URLを生成
 *
 * 管理者が admin UI から「+ アカウント追加」または「再認証」ボタンを押すと呼び出される。
 * 返された authUrl にブラウザを遷移させ、ユーザーが Google で認証する。
 * その後 OAuth callback で `exchangeBenchmarkOAuthCode` が呼ばれてトークンが保存される。
 *
 * @param {object} request.data
 * @param {string} request.data.redirectUri - OAuth callback URI（許可リストでバリデーション）
 * @param {string} [request.data.email] - login_hint として渡す（既存トークンの再認証時）
 *
 * @returns {Promise<{ authUrl: string }>}
 */
export async function getBenchmarkOAuthUrlCallable(request) {
  await assertAdmin(request.auth?.uid);

  const { redirectUri, email } = request.data || {};
  if (!validateRedirectUri(redirectUri)) {
    throw new HttpsError('invalid-argument', `不正な redirectUri: ${redirectUri}`);
  }

  try {
    const oauth2Client = createOAuth2Client(redirectUri);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account consent', // アカウント選択画面を強制 + refresh_token を毎回返却
      scope: BENCHMARK_OAUTH_SCOPES,
      ...(email ? { login_hint: email } : {}),
      include_granted_scopes: false,
    });

    logger.info('[getBenchmarkOAuthUrl] 認可URL生成', {
      adminId: request.auth.uid,
      hasEmail: !!email,
    });

    return { success: true, authUrl };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('[getBenchmarkOAuthUrl] エラー', { error: err.message });
    throw new HttpsError('internal', `認可URL生成失敗: ${err.message}`);
  }
}
