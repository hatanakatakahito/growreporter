/**
 * Cloud Run render-fallback service の呼び出しユーティリティ
 *
 * 用途: CF Browser Rendering が IP block 等で失敗した URL を、
 *       GCP IP からアクセスする Cloud Run の Chromium 経由で render する。
 *       captureBrowserRendering.js の L1 (CF BR) → L2 (Cloud Run) フォールバック層。
 *
 * 認証: Cloud Run service への ID token 取得 (GoogleAuth) +
 *       service 側で X-Render-Secret ヘッダ検証 (Secret Manager 経由で配布)
 *
 * 環境変数:
 *   - CLOUD_RUN_RENDER_URL: Cloud Run service base URL (e.g. https://render-fallback-xxx.run.app)
 *   - RENDER_SECRET: Cloud Run service の認証シークレット (Secret Manager から注入)
 */
import { GoogleAuth } from 'google-auth-library';
import { logger } from 'firebase-functions/v2';

const CLOUD_RUN_RENDER_URL = process.env.CLOUD_RUN_RENDER_URL || 'https://render-fallback-1014499109379.asia-northeast1.run.app';
const DEFAULT_TIMEOUT_MS = 90_000;

let cachedAuth = null;
function getAuth() {
  if (!cachedAuth) cachedAuth = new GoogleAuth();
  return cachedAuth;
}

let cachedIdTokenClient = null;
async function getIdToken() {
  if (!cachedIdTokenClient) {
    cachedIdTokenClient = await getAuth().getIdTokenClient(CLOUD_RUN_RENDER_URL);
  }
  return cachedIdTokenClient.idTokenProvider.fetchIdToken(CLOUD_RUN_RENDER_URL);
}

/**
 * Cloud Run の /render エンドポイントを叩いて HTML を取得する
 *
 * @param {Object} params
 * @param {string} params.url - 対象 URL (SSRF 検証は service 側でも実施)
 * @param {'pc'|'mobile'} [params.viewport='pc']
 * @param {number} [params.timeoutMs=90_000]
 * @returns {Promise<{ status: number, html?: string, finalUrl?: string, error?: string }|null>}
 */
export async function fetchViaCloudRun({ url, viewport = 'pc', timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const secret = process.env.RENDER_SECRET || '';
  if (!secret) {
    logger.warn('[cloudRunRender] RENDER_SECRET 未設定 (Secret Manager 連携必要)');
    return null;
  }

  let idToken;
  try {
    idToken = await getIdToken();
  } catch (err) {
    logger.error(`[cloudRunRender] ID token 取得失敗: ${err.message}`);
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${CLOUD_RUN_RENDER_URL}/render`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'X-Render-Secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, viewport }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloud Run /render HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn(`[cloudRunRender] timeout (${timeoutMs / 1000}s): ${url}`);
    } else {
      logger.warn(`[cloudRunRender] error: ${url} - ${err.message}`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
