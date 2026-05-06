/**
 * OAuth 2.0 PKCE (RFC 7636) ヘルパ (Phase 4-B-1)
 *
 * authorization code 横取り攻撃を防ぐため、認可リクエストで code_challenge を送り、
 * トークン交換時に code_verifier を送って一致を検証する仕組み。
 *
 * 流れ:
 *   1. クライアント:
 *      - generateCodeVerifier() で 43〜128 文字のランダム文字列生成
 *      - sessionStorage に保存
 *      - createCodeChallenge(verifier) で SHA-256 → base64url
 *      - 認可 URL に code_challenge + code_challenge_method=S256 を付与
 *   2. ユーザー Google ログイン → 認可コードがリダイレクト
 *   3. クライアント:
 *      - sessionStorage から code_verifier を取り出して exchangeOAuthCode に渡す
 *   4. サーバー (exchangeOAuthCode.js):
 *      - oauth2Client.getToken({ code, codeVerifier }) で Google に code_verifier を送信
 *      - Google は事前の code_challenge と検証
 */

/**
 * RFC 7636 §4.1 に従った code_verifier を生成。
 * 43〜128 文字、unreserved 文字のみ。
 *
 * @returns {string} base64url 形式のランダム文字列
 */
export function generateCodeVerifier() {
  const arr = new Uint8Array(64); // 64 byte → base64url で 86 文字 (43-128 の範囲)
  window.crypto.getRandomValues(arr);
  return base64UrlEncode(arr);
}

/**
 * code_verifier から code_challenge (S256) を生成。
 * @param {string} verifier
 * @returns {Promise<string>}
 */
export async function createCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Uint8Array を base64url にエンコード（'+/' を '-_' に、末尾 '=' を除去）。
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
