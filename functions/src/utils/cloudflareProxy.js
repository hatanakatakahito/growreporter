import { logger } from 'firebase-functions/v2';

/**
 * Cloudflare Workers プロキシ呼び出し用ユーティリティ
 *
 * Worker URL: process.env.CF_PROXY_URL（任意）。未設定時は本番値にフォールバック。
 * 認証秘密値: process.env.CF_PROXY_SECRET（必須・Firebase Secret Manager 経由で注入）
 *
 * 各 Callable / Trigger 側で以下を必ず宣言すること:
 *   secrets: ['CF_PROXY_SECRET']
 *
 * 旧来 4 ファイル（unifiedPageScraper.js / captureFullSnapshot.js / fetchMetadata.js /
 * scripts/scraping-diagnosis.js）にハードコードされていた値はすべて本ユーティリティ経由に統一済。
 */

const DEFAULT_PROXY_URL = 'https://growreporter-fetch-proxy.hatanaka-a1e.workers.dev';

export function getCloudflareProxyConfig() {
  const url = process.env.CF_PROXY_URL || DEFAULT_PROXY_URL;
  const secret = process.env.CF_PROXY_SECRET || '';
  return { url, secret };
}

/**
 * CF Worker プロキシ経由で URL の HTML/snapshot を取得する。
 *
 * @param {Object} params
 * @param {string} params.targetUrl - 取得対象 URL（事前に SSRF 検証済であること）
 * @param {'html'|'snapshot'} [params.mode='html']
 * @param {number} [params.timeoutMs=30000]
 * @returns {Promise<{status: number, html: string, stats?: object}>}
 */
export async function fetchViaCloudflareProxy({ targetUrl, mode = 'html', timeoutMs = 30_000 }) {
  const { url, secret } = getCloudflareProxyConfig();

  if (!secret) {
    throw new Error(
      'CF_PROXY_SECRET 未設定: Firebase Secret Manager 経由で設定してください。' +
      ' (firebase functions:secrets:set CF_PROXY_SECRET)'
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': secret,
      },
      body: JSON.stringify({ url: targetUrl, mode }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Cloudflare proxy returned ${res.status}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(`Cloudflare proxy error: ${data.error}`);
    }
    return data;
  } catch (err) {
    logger.warn('[cloudflareProxy] fetch failed', { url: targetUrl, mode, error: err?.message });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * URL が外部サーバ向け fetch に安全か検証する。SSRF 防止。
 * - http / https のみ許可
 * - private/loopback/link-local IP を含むホスト名を拒否（簡易判定: ホスト文字列にプライベート IP リテラルが入っているか）
 * - GCE メタデータサービスを拒否
 *
 * 注意: 完全な SSRF 防御には DNS 解決後の IP チェックも必要。本関数は第一防衛線。
 *
 * @param {string} url
 * @returns {{ ok: true, parsed: URL } | { ok: false, reason: string }}
 */
export function validateExternalFetchUrl(url) {
  if (!url || typeof url !== 'string') {
    return { ok: false, reason: 'URL is empty' };
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, reason: `Disallowed protocol: ${protocol}` };
  }
  const host = parsed.hostname.toLowerCase();
  // ループバック / リンクローカル / プライベート IP リテラル
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc[0-9a-f]{2}:/,
    /^fd[0-9a-f]{2}:/,
    /^fe80:/,
    // GCE / クラウドメタデータサービス
    /^metadata\.google\.internal$/,
    /^169\.254\.169\.254$/,
    /^metadata$/,
  ];
  for (const re of privatePatterns) {
    if (re.test(host)) {
      return { ok: false, reason: `Private/internal host blocked: ${host}` };
    }
  }
  return { ok: true, parsed };
}
