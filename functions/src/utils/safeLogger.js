/**
 * 機微情報マスキング付きロガーユーティリティ
 *
 * Cloud Logging / Firestore error_logs に書込まれるテキストから、
 * OAuth トークン・API キー・AWS アクセスキー・JWT 等を自動的に [REDACTED] 化する。
 *
 * 旧実装の問題:
 *   functions/src/callable/exchangeOAuthCode.js:131-138 で `error.stack` を
 *   そのまま Firestore (error_logs) に保存していた。スタックには認可コード /
 *   トークン断片 / その他リクエストヘッダ値が混入する可能性があり、Firestore
 *   ダンプ流出時に二次被害を生む。
 *
 * 使い方:
 *   import { redactSensitive, safeLogError } from '../utils/safeLogger.js';
 *   logger.error('[xxx] error', redactSensitive(error.stack));
 *   safeLogError(logger, '[xxx] error', error, { userId, ... });
 */

/**
 * テキスト内の機微情報を [REDACTED] に置換する。
 * @param {unknown} input
 * @returns {string}
 */
export function redactSensitive(input) {
  if (input === null || input === undefined) return '';
  let s = typeof input === 'string' ? input : JSON.stringify(input);
  if (!s) return '';

  // OAuth アクセストークン
  s = s.replace(/ya29\.[A-Za-z0-9_\-]{20,}/g, '[REDACTED-OAUTH-ACCESS]');
  // OAuth リフレッシュトークン
  s = s.replace(/1\/\/[A-Za-z0-9_\-]{20,}/g, '[REDACTED-OAUTH-REFRESH]');
  // Google OAuth Client Secret
  s = s.replace(/GOCSPX-[A-Za-z0-9_\-]{20,}/g, '[REDACTED-GOOGLE-CLIENT-SECRET]');
  // Google API key
  s = s.replace(/AIza[A-Za-z0-9_\-]{30,}/g, '[REDACTED-GOOGLE-API-KEY]');
  // AWS Access Key ID
  s = s.replace(/(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/g, '[REDACTED-AWS-ACCESS-KEY]');
  // AWS SES SMTP password (40 文字 base64 風 + +/=)
  s = s.replace(/BHDM[A-Za-z0-9+\/=]{30,}/g, '[REDACTED-AWS-SES-PASSWORD]');
  // GitHub PAT
  s = s.replace(/ghp_[A-Za-z0-9]{20,}/g, '[REDACTED-GITHUB-PAT]');
  s = s.replace(/github_pat_[A-Za-z0-9_]{20,}/g, '[REDACTED-GITHUB-PAT]');
  // Stripe live/test key
  s = s.replace(/sk_(?:live|test)_[A-Za-z0-9]{20,}/g, '[REDACTED-STRIPE-KEY]');
  // Slack tokens
  s = s.replace(/xox[bp]-[A-Za-z0-9\-]{10,}/g, '[REDACTED-SLACK-TOKEN]');
  // Anthropic
  s = s.replace(/sk-ant-[A-Za-z0-9_\-]{20,}/g, '[REDACTED-ANTHROPIC-KEY]');
  // OpenAI
  s = s.replace(/sk-[A-Za-z0-9]{40,}/g, '[REDACTED-OPENAI-KEY]');
  // JWT (3 dot-separated base64url segments)
  s = s.replace(/eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[REDACTED-JWT]');
  // Basic auth header
  s = s.replace(/(authorization\s*[:=]\s*['"]?)(?:bearer|basic)\s+\S+/gi, '$1[REDACTED-AUTH]');
  // Inline Cloudflare Worker proxy secret (本番値)
  s = s.replace(/growreporter-proxy-[A-Za-z0-9_\-]+/g, '[REDACTED-CF-PROXY-SECRET]');
  // クレジットカード番号 (Visa/Master/JCB 等の 13-19 桁、ハイフン/空白可)
  s = s.replace(/\b(?:\d[ \-]*?){13,19}\b/g, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return m;
    return '[REDACTED-CARD]';
  });
  // 一般的な API キー風（"key": "..." または key=...）
  s = s.replace(/(["']?(?:api[_-]?key|apikey|secret|access[_-]?token|client[_-]?secret|password|passwd|pwd)["']?\s*[:=]\s*["']?)[A-Za-z0-9_\-+\/=]{16,}(["']?)/gi,
    '$1[REDACTED-CREDENTIAL]$2');

  return s;
}

/**
 * Error / オブジェクト全体を再帰的に redact しつつ logger.error する。
 * details の値もマスキング対象。
 *
 * @param {object} logger - firebase-functions logger（or console）
 * @param {string} message - ログメッセージ
 * @param {unknown} err - Error or 任意のエラー値
 * @param {object} [details]
 */
export function safeLogError(logger, message, err, details = {}) {
  const safeMessage = redactSensitive(message);
  const safeErrorMessage = err && err.message ? redactSensitive(err.message) : '';
  const safeStack = err && err.stack ? redactSensitive(err.stack) : '';
  const safeDetails = {};
  for (const [k, v] of Object.entries(details || {})) {
    safeDetails[k] = redactSensitive(v);
  }
  logger.error(safeMessage, {
    error: safeErrorMessage,
    stack: safeStack,
    ...safeDetails,
  });
}

/**
 * Firestore に書込む用に redact 済みオブジェクトを返す。
 * (error_logs などで stack を保存する箇所でこれを使う)
 *
 * @param {Error|unknown} err
 * @returns {{ message: string, stack: string }}
 */
export function safeErrorPayload(err) {
  if (!err) return { message: '', stack: '' };
  return {
    message: redactSensitive(err.message || String(err)),
    stack: redactSensitive(err.stack || ''),
  };
}
